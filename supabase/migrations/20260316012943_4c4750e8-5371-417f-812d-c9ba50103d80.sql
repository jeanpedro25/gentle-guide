
-- Predictions table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id INTEGER NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  predicted_score TEXT,
  predicted_winner TEXT,
  confidence INTEGER DEFAULT 0,
  recommended_market TEXT,
  min_odd NUMERIC(5,2),
  stake_pct NUMERIC(5,2),
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  oracle_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bankroll table
CREATE TABLE public.bankroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bet results table
CREATE TABLE public.bet_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES public.predictions(id) ON DELETE CASCADE NOT NULL,
  actual_score TEXT,
  won BOOLEAN,
  profit_loss NUMERIC(12,2),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default bankroll
INSERT INTO public.bankroll (amount) VALUES (1000);

-- Disable RLS for public access (no auth required for this app)
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_results ENABLE ROW LEVEL SECURITY;

-- Public access policies (this is a public-facing app without auth)
CREATE POLICY "Allow all access to predictions" ON public.predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bankroll" ON public.bankroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bet_results" ON public.bet_results FOR ALL USING (true) WITH CHECK (true);
