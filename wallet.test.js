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
test('legacy transactions and new regular transactions affect cash/DANA once', () => {
  const transactions = [
    { id: 'legacy', type: 'income', amount: 1000 },
    { id: 'new', type: 'expense', amount: 300 },
  ];
  const events = [eventForTransaction(transactions[1], 'DANA')];
  assert.deepEqual(balances(transactions, events), { cash: 76000, DANA: 113700, receivable: 0, total: 189700 });
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
