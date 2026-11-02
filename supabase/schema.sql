-- ============================================================
-- DuitKu — Skema Database Supabase Lengkap
--
-- File ini menggabungkan seluruh tabel, index, RLS, dan realtime
-- ke dalam satu skrip yang aman dijalankan di Supabase SQL Editor.
-- ============================================================

-- 1. Helper function untuk updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Tabel categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, name)
);

-- 3. Tabel transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  wallet TEXT CHECK (wallet IN ('cash', 'DANA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions (category_id);

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Tabel budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (user_id, month, category_id)
);

-- 5. Tabel goals (wishlist & utang)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  kind TEXT NOT NULL CHECK (kind IN ('wish', 'debt')) DEFAULT 'wish',
  status TEXT NOT NULL CHECK (status IN ('active', 'done')) DEFAULT 'active',
  paid BIGINT NOT NULL DEFAULT 0 CHECK (paid >= 0),
  due DATE,
  note TEXT NOT NULL DEFAULT '',
  tx_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id, status);

DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Tabel app_settings (konfigurasi per-user, uang saku harian)
CREATE TABLE IF NOT EXISTS public.app_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Tabel ledger_events (mutasi saldo dompet riil)
CREATE TABLE IF NOT EXISTS public.ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'transfer', 'lend', 'repayment', 'reconcile')),
  wallet TEXT NOT NULL CHECK (wallet IN ('cash', 'DANA')),
  to_wallet TEXT CHECK (to_wallet IN ('cash', 'DANA')),
  amount BIGINT NOT NULL CHECK (amount <> 0),
  note TEXT NOT NULL DEFAULT '',
  tx_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'reconcile') OR amount > 0),
  CHECK ((kind = 'transfer' AND to_wallet IS NOT NULL AND to_wallet <> wallet)
      OR (kind <> 'transfer' AND to_wallet IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_events_user_tx ON public.ledger_events (user_id, tx_id) WHERE tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_user_date ON public.ledger_events (user_id, date DESC);

-- 8. Row Level Security (RLS) di seluruh tabel
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_own ON public.categories;
CREATE POLICY categories_own ON public.categories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS transactions_own ON public.transactions;
CREATE POLICY transactions_own ON public.transactions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS budgets_own ON public.budgets;
CREATE POLICY budgets_own ON public.budgets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS goals_own ON public.goals;
CREATE POLICY goals_own ON public.goals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS app_settings_own ON public.app_settings;
CREATE POLICY app_settings_own ON public.app_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ledger_events_own ON public.ledger_events;
CREATE POLICY ledger_events_own ON public.ledger_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 9. Realtime Publication
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
ALTER TABLE public.ledger_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'budgets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'goals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ledger_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_events;
  END IF;
END $$;
