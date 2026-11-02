-- DuitKu wallet event ledger. Run in Supabase SQL Editor after schema.sql and migration_v4.sql.
-- Opening balances (cash Rp75,000 and DANA Rp114,000) are client-side defaults,
-- not ledger entries, so old transactions remain reports-only and count as cash.
CREATE TABLE IF NOT EXISTS public.ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense','transfer','lend','repayment','reconcile')),
  wallet TEXT NOT NULL CHECK (wallet IN ('cash','DANA')),
  to_wallet TEXT CHECK (to_wallet IN ('cash','DANA')),
  amount BIGINT NOT NULL CHECK (amount <> 0),
  note TEXT NOT NULL DEFAULT '',
  tx_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'reconcile') OR amount > 0),
  CHECK ((kind = 'transfer' AND to_wallet IS NOT NULL AND to_wallet <> wallet)
      OR (kind <> 'transfer' AND to_wallet IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_events_user_tx ON public.ledger_events(user_id, tx_id) WHERE tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_user_date ON public.ledger_events(user_id, date DESC);
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ledger_events_own ON public.ledger_events;
CREATE POLICY ledger_events_own ON public.ledger_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER TABLE public.ledger_events REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ledger_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_events;
  END IF;
END $$;
COMMENT ON TABLE public.ledger_events IS 'Wallet accounting events, separate from income/expense report transactions';
