-- Duitku v4 migration: balance-based model
-- goals (wishlist + utang), app_settings (daily allowance config), transactions.source marker

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  kind TEXT NOT NULL CHECK (kind IN ('wish','debt')) DEFAULT 'wish',
  status TEXT NOT NULL CHECK (status IN ('active','done')) DEFAULT 'active',
  paid BIGINT NOT NULL DEFAULT 0 CHECK (paid >= 0),
  due DATE,
  note TEXT NOT NULL DEFAULT '',
  tx_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id, status);

DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goals_own ON public.goals;
CREATE POLICY goals_own ON public.goals
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS app_settings_own ON public.app_settings;
CREATE POLICY app_settings_own ON public.app_settings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
