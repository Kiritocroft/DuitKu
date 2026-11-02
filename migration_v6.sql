-- DuitKu v6: persist the wallet on each transaction row.
-- Applied to project ejtdkjkktpgbshsmmfwf on 2026-11-02.
-- NULL wallet means the row predates the ledger and is already inside the
-- confirmed opening snapshot (cash 75,000 + DANA 114,000).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS wallet TEXT CHECK (wallet IN ('cash', 'DANA'));

COMMENT ON COLUMN public.transactions.wallet IS
  'Wallet the money moved through; NULL for rows that predate the ledger.';
