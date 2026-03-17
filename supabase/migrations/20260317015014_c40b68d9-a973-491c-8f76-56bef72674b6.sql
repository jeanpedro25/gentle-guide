
CREATE TABLE public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team text NOT NULL,
  away_team text NOT NULL,
  league text NOT NULL DEFAULT '',
  fixture_id integer,
  prediction text NOT NULL CHECK (prediction IN ('1', 'X', '2')),
  stake numeric NOT NULL DEFAULT 0,
  potential_profit numeric NOT NULL DEFAULT 0,
  odd numeric NOT NULL DEFAULT 1.5,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  actual_result text,
  actual_score text,
  profit_loss numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to bets" ON public.bets FOR ALL TO public USING (true) WITH CHECK (true);
