const test = require('node:test');
const assert = require('node:assert/strict');
const { balances, applyEvent, eventForTransaction } = require('./wallet.js');

test('starts with confirmed cash and DANA opening balances', () => {
  assert.deepEqual(balances([], []), { cash: 75000, DANA: 114000, receivable: 0, total: 189000 });
});
test('wallet events reconcile transfer, loan, repayment and adjustment', () => {
  const events = [
    { kind: 'transfer', wallet: 'cash', to_wallet: 'DANA', amount: 10000 },
    { kind: 'lend', wallet: 'cash', amount: 5000 },
    { kind: 'repayment', wallet: 'DANA', amount: 2000 },
    { kind: 'reconcile', wallet: 'cash', amount: -1000 },
  ];
  assert.deepEqual(balances([], events), { cash: 59000, DANA: 126000, receivable: 3000, total: 185000 });
});
test('legacy wallet-less transactions stay inside the opening snapshot, not on top of it', () => {
  const transactions = [
    { id: 'legacy-in', type: 'income', amount: 200000 },
    { id: 'legacy-out', type: 'expense', amount: 11000 },
    { id: 'new-dana', type: 'expense', amount: 300, wallet: 'DANA' },
  ];
  assert.deepEqual(balances(transactions, []), { cash: 75000, DANA: 113700, receivable: 0, total: 188700 });
});
test('new regular transactions dated in the past still adjust their wallet', () => {
  const transactions = [{ id: 'old-but-wallet', type: 'income', amount: 4000, wallet: 'cash', date: '2020-01-01' }];
  assert.deepEqual(balances(transactions, []), { cash: 79000, DANA: 114000, receivable: 0, total: 193000 });
});
test('a transaction linked to a ledger event is never counted twice', () => {
  const tx = { id: 'dup', type: 'expense', amount: 500, wallet: 'cash' };
  const events = [eventForTransaction(tx, 'cash')];
  assert.deepEqual(balances([tx], events), { cash: 74500, DANA: 114000, receivable: 0, total: 188500 });
});
test('reconciliation deltas allow upward and downward corrections', () => {
  const events = [
    { kind: 'reconcile', wallet: 'cash', amount: -5000 },
    { kind: 'reconcile', wallet: 'cash', amount: 10000 },
  ];
  assert.deepEqual(balances([], events), { cash: 80000, DANA: 114000, receivable: 0, total: 194000 });
});
test('event application is immutable and preserves income/expense report classification', () => {
  const tx = { id: 'one', type: 'income', amount: 500, category_id: 'c' };
  const event = eventForTransaction(tx, 'DANA');
  assert.equal(event.kind, 'income');
  assert.equal(tx.wallet, undefined);
  assert.equal(applyEvent({ cash: 0, DANA: 0, receivable: 0 }, event).DANA, 500);
});
