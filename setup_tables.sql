-- Execute este código no "SQL Editor" do seu painel Supabase

-- 1. Criar tabela de apostas (bets)
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    league TEXT NOT NULL,
    fixture_id INTEGER,
    prediction TEXT NOT NULL,
    stake NUMERIC NOT NULL,
    potential_profit NUMERIC NOT NULL,
    odd NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    actual_result TEXT,
    actual_score TEXT,
    profit_loss NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Criar tabela de banca (bankroll)
CREATE TABLE IF NOT EXISTS public.bankroll (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    initial_amount NUMERIC NOT NULL DEFAULT 0,
    profile TEXT DEFAULT 'moderado',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
