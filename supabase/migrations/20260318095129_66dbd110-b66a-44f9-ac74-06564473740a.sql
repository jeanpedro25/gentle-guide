
-- Create cache type enum
CREATE TYPE public.cache_data_type AS ENUM ('jogos', 'odds', 'resultado', 'liga', 'time', 'estatistica', 'livescores');

-- Create api_cache table
CREATE TABLE public.api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text UNIQUE NOT NULL,
  dados jsonb NOT NULL,
  tipo public.cache_data_type NOT NULL DEFAULT 'jogos',
  expira_em timestamp with time zone NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  total_hits integer NOT NULL DEFAULT 0
);

-- Index for fast lookup and cleanup
CREATE INDEX idx_api_cache_chave ON public.api_cache (chave);
CREATE INDEX idx_api_cache_expira ON public.api_cache (expira_em);

-- RLS: allow all access (shared cache across users)
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to api_cache"
  ON public.api_cache
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
