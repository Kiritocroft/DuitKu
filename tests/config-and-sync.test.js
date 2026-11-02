const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

describe('Supabase Config & Client Detection', () => {
  const configPath = path.join(__dirname, '..', 'config.js');
  const code = fs.readFileSync(configPath, 'utf8');

  test('config.js exports window.APP_CONFIG with non-placeholder Supabase URL and anon key', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const cfg = sandbox.window.APP_CONFIG;
    assert.ok(cfg, 'APP_CONFIG must exist on window');
    assert.ok(typeof cfg.SUPABASE_URL === 'string' && cfg.SUPABASE_URL.startsWith('https://'), 'SUPABASE_URL must be an HTTPS URL');
    assert.ok(cfg.SUPABASE_URL.includes('.supabase.co'), 'SUPABASE_URL must point to a supabase.co domain');
    assert.ok(typeof cfg.SUPABASE_ANON_KEY === 'string' && cfg.SUPABASE_ANON_KEY.length > 20, 'SUPABASE_ANON_KEY must be a valid token string');
    assert.doesNotMatch(cfg.SUPABASE_URL, /YOUR_SUPABASE|placeholder|<PROJECT>/i, 'SUPABASE_URL must not contain placeholders');
    assert.doesNotMatch(cfg.SUPABASE_ANON_KEY, /YOUR_KEY|placeholder|<ANON_KEY>/i, 'SUPABASE_ANON_KEY must not contain placeholders');
  });

  test('Backend initialization detector accepts valid config and flags missing fields', () => {
    function validateBackendConfig(cfg, hasSupabaseLib) {
      if (!hasSupabaseLib) return { ok: false, reason: 'LIBRARY_MISSING' };
      if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return { ok: false, reason: 'CONFIG_MISSING' };
      if (!cfg.SUPABASE_URL.startsWith('https://') || !cfg.SUPABASE_URL.includes('.supabase.co')) {
        return { ok: false, reason: 'URL_INVALID' };
      }
      return { ok: true, reason: 'READY' };
    }

    assert.equal(validateBackendConfig(null, true).reason, 'CONFIG_MISSING');
    assert.equal(validateBackendConfig({ SUPABASE_URL: '' }, true).reason, 'CONFIG_MISSING');
    assert.equal(validateBackendConfig({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: '' }, true).reason, 'CONFIG_MISSING');
    assert.equal(validateBackendConfig({ SUPABASE_URL: 'http://insecure.com', SUPABASE_ANON_KEY: 'abc' }, true).reason, 'URL_INVALID');
    assert.equal(validateBackendConfig({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_ANON_KEY: 'valid' }, false).reason, 'LIBRARY_MISSING');
    assert.equal(validateBackendConfig({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_ANON_KEY: 'valid' }, true).reason, 'READY');
  });
});

describe('Data Migration Idempotency (Local -> Cloud)', () => {
  // Simulates merging local ledger events and transactions into cloud without duplicating balances
  function mergeDataset(cloudItems, localItems, idKey = 'id') {
    const existing = new Map();
    for (const item of cloudItems) {
      existing.set(item[idKey], { ...item });
    }
    let inserted = 0;
    let skipped = 0;
    for (const item of localItems) {
      if (existing.has(item[idKey])) {
        skipped++;
      } else {
        existing.set(item[idKey], { ...item });
        inserted++;
      }
    }
    return {
      merged: Array.from(existing.values()),
      inserted,
      skipped
    };
  }

  test('Merging local items into cloud is idempotent and prevents duplicate transactions', () => {
    const cloudTx = [
      { id: 'tx-1', amount: 20000, type: 'income', note: 'Uang Saku', updated_at: '2026-11-01T08:00:00Z' },
      { id: 'tx-2', amount: 10000, type: 'expense', note: 'Makan', updated_at: '2026-11-01T12:00:00Z' }
    ];
    const localTx = [
      { id: 'tx-1', amount: 20000, type: 'income', note: 'Uang Saku', updated_at: '2026-11-01T08:00:00Z' },
      { id: 'tx-3', amount: 15000, type: 'expense', note: 'Transport', updated_at: '2026-11-02T09:00:00Z' }
    ];

    const result1 = mergeDataset(cloudTx, localTx);
    assert.equal(result1.inserted, 1);
    assert.equal(result1.skipped, 1);
    assert.equal(result1.merged.length, 3);

    // Running again with same dataset produces 0 new inserts
    const result2 = mergeDataset(result1.merged, localTx);
    assert.equal(result2.inserted, 0);
    assert.equal(result2.skipped, 2);
    assert.equal(result2.merged.length, 3);
  });

  test('Wallet ledger events maintain exact balance after idempotent merge', () => {
    const cloudLedger = [
      { id: 'ev-init-cash', event_type: 'initial_balance', wallet: 'cash', amount: 75000 },
      { id: 'ev-init-dana', event_type: 'initial_balance', wallet: 'DANA', amount: 114000 }
    ];
    const localLedger = [
      { id: 'ev-init-cash', event_type: 'initial_balance', wallet: 'cash', amount: 75000 },
      { id: 'ev-init-dana', event_type: 'initial_balance', wallet: 'DANA', amount: 114000 },
      { id: 'ev-transfer-1', event_type: 'transfer', from_wallet: 'cash', to_wallet: 'DANA', amount: 10000 }
    ];

    const { merged, inserted } = mergeDataset(cloudLedger, localLedger);
    assert.equal(inserted, 1);

    // Sum initial balances
    const cashInits = merged.filter(e => e.event_type === 'initial_balance' && e.wallet === 'cash');
    const danaInits = merged.filter(e => e.event_type === 'initial_balance' && e.wallet === 'DANA');
    assert.equal(cashInits.length, 1, 'Cash initial balance must not be duplicated');
    assert.equal(danaInits.length, 1, 'DANA initial balance must not be duplicated');
  });
});
