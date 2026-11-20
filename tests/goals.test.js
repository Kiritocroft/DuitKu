const test = require('node:test');
const assert = require('node:assert/strict');
const goals = require('../goals.js');
const wallet = require('../wallet.js');

const jersey = {
  id: 'g-jersey',
  name: 'Jersey AW',
  kind: 'wish',
  amount: '175000',
  paid: '0',
  status: 'active',
};
const leg = (walletName, amount, id = walletName + '-' + amount) => ({
  id,
  date: '2026-11-20',
  type: 'expense',
  amount,
  category_id: 'cat',
  note: 'Jersey AW',
  wallet: walletName,
  source: goals.sourceFor(jersey.id),
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
});

test('goal source round-trips and legacy "goal" rows do not impersonate a goal id', () => {
  assert.equal(goals.sourceFor('abc'), 'goal:abc');
  assert.equal(goals.goalIdFromSource('goal:abc'), 'abc');
  assert.equal(goals.goalIdFromSource('goal'), null);
  assert.equal(goals.goalIdFromSource('goal:'), null);
  assert.equal(goals.goalIdFromSource(undefined), null);
});

test('goal payments are scoped to their own goal id', () => {
  const txs = [leg('cash', 70000), leg('DANA', 100000)];
  const other = leg('cash', 50000, 'other-leg');
  other.source = goals.sourceFor('g-other');
  txs.push(other);
  assert.equal(goals.paid(jersey, txs), 170000);
  assert.equal(goals.paid({ ...jersey, id: 'g-empty', paid: 0 }, txs), 0);
});

test('a full split payment settles the goal across cash and DANA', () => {
  const txs = [];
  const legs = [leg('DANA', 100000), leg('cash', 75000)];
  const next = goals.afterPayment(jersey, txs, legs, '2026-11-20T10:00:00Z');
  assert.deepEqual(next, { paid: 175000, remaining: 0, status: 'done', doneAt: '2026-11-20T10:00:00Z' });
});

test('a partial payment keeps the goal active with the right remainder', () => {
  const next = goals.afterPayment(jersey, [leg('cash', 50000)], [leg('DANA', 100000)], '2026-11-20T10:00:00Z');
  assert.equal(next.paid, 150000);
  assert.equal(next.remaining, 25000);
  assert.equal(next.status, 'active');
  assert.equal(next.doneAt, null);
});

test('split wallet payment moves both wallets and total balance by exactly the goal amount', () => {
  const legs = [leg('DANA', 100000), leg('cash', 75000)];
  const withoutEvents = wallet.balances(legs, []);
  assert.deepEqual(withoutEvents, { cash: 0, DANA: 14000, receivable: 0, total: 14000 });
  const events = legs.map(tx => wallet.eventForTransaction(tx, tx.wallet));
  const withEvents = wallet.balances(legs, events);
  assert.deepEqual(withEvents, withoutEvents);
  // Opposing invariant: the old approveGoal wrote an expense with no wallet,
  // so the same amount vanished from the report but not from the wallets.
  const legacy = wallet.balances([{ id: 'orphan', type: 'expense', amount: 175000, date: '2026-11-20' }], []);
  assert.deepEqual(legacy, { cash: 75000, DANA: 114000, receivable: 0, total: 189000 });
});

test('validation rejects overpayment, insufficient cash and empty plans', () => {
  const balances = { cash: 75000, DANA: 114000 };
  assert.deepEqual(goals.validate(170000, { cash: 0, DANA: 0 }, balances).code, 'EMPTY');
  assert.deepEqual(goals.validate(170000, { cash: 70000, DANA: 110000 }, balances).code, 'OVERPAY');
  assert.deepEqual(goals.validate(170000, { cash: 80000, DANA: 0 }, balances).code, 'INSUFFICIENT');
  assert.deepEqual(goals.validate(170000, { cash: 75000, DANA: 95000 }, balances).code, 'FULL');
  assert.deepEqual(goals.validate(170000, { cash: 70000, DANA: 0 }, balances).code, 'PARTIAL');
});

test('allocation fills cash first, then DANA, and reports the shortfall', () => {
  assert.deepEqual(goals.allocate(170000, { cash: 75000, DANA: 114000 }), {
    plan: { cash: 75000, DANA: 95000 },
    short: 0,
  });
  assert.deepEqual(goals.allocate(300000, { cash: 75000, DANA: 114000 }), {
    plan: { cash: 75000, DANA: 114000 },
    short: 111000,
  });
});

test('built legs are expense rows tagged to the goal and the chosen wallet', () => {
  const legs = goals.buildLegs(jersey, [{ wallet: 'cash', amount: 70000 }, { wallet: 'DANA', amount: 100000 }], {
    ids: ['t1', 't2'],
    categoryId: 'cat-lain',
    date: '2026-11-20',
    timestamp: '2026-11-20T10:00:00Z',
    note: 'Jersey AW retal',
  });
  assert.equal(legs.length, 2);
  assert.equal(legs[0].id, 't1');
  assert.equal(legs[0].wallet, 'cash');
  assert.equal(legs[0].type, 'expense');
  assert.equal(legs[0].source, 'goal:g-jersey');
  assert.equal(legs[0].category_id, 'cat-lain');
  assert.equal(legs[0].note, 'Jersey AW retal');
  assert.equal(legs[1].wallet, 'DANA');
  assert.equal(legs[1].amount, 100000);
});

test('legacy wallet-less goal rows fall back to the stored paid column', () => {
  const legacy = { ...jersey, status: 'done', paid: '175000', tx_id: 'old-1' };
  assert.equal(goals.paid(legacy, [{ id: 'old-1', type: 'expense', amount: 175000, date: '2026-11-01' }]), 175000);
  assert.equal(goals.remaining(legacy, []), 0);
  assert.deepEqual(goals.breakdown('g-jersey', []), { cash: 0, DANA: 0 });
});

test('a legacy paid base survives the first wallet legs and is not counted twice', () => {
  const goal = { ...jersey, paid: 10000 };
  assert.equal(goals.paid(goal, [leg('cash', 50000, 'a')]), 50000);
  assert.equal(goals.afterPayment(goal, [], [leg('cash', 50000, 'a')], '2026-11-20T10:00:00Z').paid, 60000);
  const cumulative = { ...goal, paid: 60000 };
  assert.equal(goals.paid(cumulative, [leg('cash', 50000, 'a')]), 60000);
});

test('income rows tagged to a goal never count as payments', () => {
  const refund = { ...leg('cash', 50000, 'refund'), type: 'income' };
  assert.equal(goals.paid(jersey, [refund]), 0);
  assert.deepEqual(goals.legsFor('g-jersey', [refund]), []);
});

test('breakdown and history read legs in date order', () => {
  const a = leg('cash', 20000, 'a');
  const b = { ...leg('cash', 30000, 'b'), date: '2026-11-19' };
  assert.deepEqual(goals.breakdown('g-jersey', [a, b]), { cash: 50000, DANA: 0 });
  assert.deepEqual(goals.history('g-jersey', [a, b]).map(t => t.id), ['b', 'a']);
});
