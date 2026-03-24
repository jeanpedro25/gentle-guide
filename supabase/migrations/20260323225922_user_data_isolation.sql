-- Add user_id columns for data isolation
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.bet_results ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.bankroll ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill bankroll rows when id already matches auth user id
UPDATE public.bankroll
SET user_id = id
WHERE user_id IS NULL
  AND id IN (SELECT id FROM auth.users);

-- Set default user_id for new rows
ALTER TABLE public.bets ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.predictions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.bet_results ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.bankroll ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Indexes for faster per-user queries
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets (user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions (user_id);
CREATE INDEX IF NOT EXISTS idx_bet_results_user_id ON public.bet_results (user_id);
CREATE INDEX IF NOT EXISTS idx_bankroll_user_id ON public.bankroll (user_id);

-- Ensure one bankroll row per user
ALTER TABLE public.bankroll
  ADD CONSTRAINT bankroll_user_id_unique UNIQUE (user_id);

-- RLS: enforce per-user access
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to bets" ON public.bets;
DROP POLICY IF EXISTS "Allow all access to predictions" ON public.predictions;
DROP POLICY IF EXISTS "Allow all access to bet_results" ON public.bet_results;
DROP POLICY IF EXISTS "Allow all access to bankroll" ON public.bankroll;

CREATE POLICY "Users can view own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bets" ON public.bets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bets" ON public.bets
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own predictions" ON public.predictions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bet_results" ON public.bet_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bet_results" ON public.bet_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bet_results" ON public.bet_results
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bet_results" ON public.bet_results
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bankroll" ON public.bankroll
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bankroll" ON public.bankroll
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bankroll" ON public.bankroll
  FOR UPDATE USING (auth.uid() = user_id);

-- Update user creation hook to initialize bankroll per user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.bankroll (user_id, amount)
  VALUES (NEW.id, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
