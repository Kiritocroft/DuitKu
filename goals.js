// Wishlist & debt payment model.
// A goal is paid in one or more legs; every leg is an expense transaction bound
// to a real wallet, so the goal ledger and the wallet ledger can never drift.
(function (root) {
  const SOURCE_PREFIX = 'goal:';
  const WALLETS = ['cash', 'DANA'];

  function sourceFor(goalId) {
    return SOURCE_PREFIX + String(goalId);
  }

  function goalIdFromSource(source) {
    const s = String(source || '');
    if (!s.startsWith(SOURCE_PREFIX)) return null;
    const id = s.slice(SOURCE_PREFIX.length);
    return id || null;
  }

  function isWallet(w) {
    return WALLETS.indexOf(w) !== -1;
  }

  function legsFor(goalId, transactions) {
    const id = String(goalId || '');
    if (!id) return [];
    return (transactions || []).filter(tx =>
      tx.type === 'expense' &&
      isWallet(tx.wallet) &&
      Number(tx.amount) > 0 &&
      goalIdFromSource(tx.source) === id
    );
  }

  function sumLegs(legs) {
    return legs.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  }

  // `paid` is cumulative: it keeps the legacy base from earlier versions and
  // every wallet leg recorded since. Legs alone cover goals created after the
  // migration; max() makes both shapes read the same total without double
  // counting a fully leg-backed goal.
  function paid(goal, transactions) {
    if (!goal) return 0;
    const stored = Math.max(0, Number(goal.paid) || 0);
    return Math.max(stored, sumLegs(legsFor(goal.id, transactions)));
  }

  function remaining(goal, transactions) {
    const target = Math.max(0, Number(goal && goal.amount) || 0);
    return Math.max(0, target - paid(goal, transactions));
  }

  function breakdown(goalId, transactions) {
    const out = { cash: 0, DANA: 0 };
    for (const tx of legsFor(goalId, transactions)) out[tx.wallet] += Number(tx.amount) || 0;
    return out;
  }

  function allocate(amount, balances) {
    let left = Math.max(0, Math.floor(Number(amount) || 0));
    const plan = { cash: 0, DANA: 0 };
    for (const w of WALLETS) {
      const have = Math.max(0, Math.floor(Number(balances && balances[w]) || 0));
      const take = Math.min(left, have);
      plan[w] = take;
      left -= take;
    }
    return { plan, short: left };
  }

  function validate(remainingAmount, allocations, balances) {
    const rem = Math.max(0, Math.floor(Number(remainingAmount) || 0));
    const entries = [];
    let total = 0;
    let insufficient = false;
    for (const w of WALLETS) {
      const raw = Math.floor(Number(allocations && allocations[w]) || 0);
      if (raw < 0) return { ok: false, code: 'NEGATIVE', total: 0, entries: [] };
      if (raw === 0) continue;
      if (raw > Math.max(0, Number(balances && balances[w]) || 0)) insufficient = true;
      entries.push({ wallet: w, amount: raw });
      total += raw;
    }
    if (!entries.length) return { ok: false, code: 'EMPTY', total, entries };
    if (total > rem) return { ok: false, code: 'OVERPAY', total, entries };
    if (insufficient) return { ok: false, code: 'INSUFFICIENT', total, entries };
    return { ok: true, code: total === rem ? 'FULL' : 'PARTIAL', total, entries };
  }

  function buildLegs(goal, entries, opts) {
    const o = opts || {};
    const ids = Array.isArray(o.ids) ? o.ids : [];
    return (entries || []).map((entry, i) => ({
      id: ids[i] || (String(goal.id) + '-pay-' + i + '-' + Date.now()),
      date: o.date,
      type: 'expense',
      amount: Number(entry.amount) || 0,
      category_id: o.categoryId || '',
      note: o.note || goal.name || '',
      wallet: entry.wallet,
      source: sourceFor(goal.id),
      created_at: o.timestamp,
      updated_at: o.timestamp,
    }));
  }

  function afterPayment(goal, transactions, newLegs, timestamp) {
    const target = Math.max(0, Number(goal && goal.amount) || 0);
    const total = paid(goal, transactions) + sumLegs(newLegs || []);
    const done = total >= target;
    return {
      paid: total,
      remaining: Math.max(0, target - total),
      status: done ? 'done' : 'active',
      doneAt: done ? timestamp : null,
    };
  }

  function history(goalId, transactions) {
    return legsFor(goalId, transactions)
      .slice()
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  }

  const api = {
    SOURCE_PREFIX,
    WALLETS,
    sourceFor,
    goalIdFromSource,
    isWallet,
    legsFor,
    paid,
    remaining,
    breakdown,
    allocate,
    validate,
    buildLegs,
    afterPayment,
    history,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DuitKuGoals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
