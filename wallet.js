(function (root) {
  const DEFAULT_OPENING = { cash: 75000, DANA: 114000 };
  function applyEvent(b, e) {
    const next = { ...b };
    const amount = Number(e.amount) || 0;
    if (e.kind === 'transfer') { next[e.wallet] -= amount; next[e.to_wallet] += amount; }
    else if (e.kind === 'lend') { next[e.wallet] -= amount; next.receivable += amount; }
    else if (e.kind === 'repayment') { next[e.wallet] += amount; next.receivable -= amount; }
    else if (e.kind === 'reconcile') next[e.wallet] += amount;
    else if (e.kind === 'income') next[e.wallet] += amount;
    else if (e.kind === 'expense') next[e.wallet] -= amount;
    return next;
  }
  function isWallet(w) { return w === 'cash' || w === 'DANA'; }
  function balances(transactions = [], events = [], opening) {
    const op = opening || DEFAULT_OPENING;
    let b = { cash: op.cash || 0, DANA: op.DANA || 0, receivable: op.receivable || 0 };
    const linked = new Set(events.filter(e => e.tx_id).map(e => e.tx_id));
    for (const tx of transactions) {
      // Rows without a wallet predate the ledger: their net effect is already
      // baked into the confirmed opening snapshot, so counting them again
      // inflates cash (189k report + 189k legacy = 378k wallets).
      if (!isWallet(tx.wallet)) continue;
      if (linked.has(tx.id)) continue;
      b = applyEvent(b, { kind: tx.type, wallet: tx.wallet, amount: tx.amount });
    }
    const orderedEvents = [...events].sort((a, c) => (a.date || '').localeCompare(c.date || '') || (a.created_at || '').localeCompare(c.created_at || ''));
    for (const e of orderedEvents) b = applyEvent(b, e);
    return { ...b, total: b.cash + b.DANA };
  }
  function eventForTransaction(tx, wallet) { return { id: tx.id, tx_id: tx.id, date: tx.date, created_at: tx.created_at, kind: tx.type, wallet, amount: Number(tx.amount), note: tx.note || '' }; }
  const api = { balances, applyEvent, eventForTransaction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DuitKuWallet = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
