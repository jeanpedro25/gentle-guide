import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeMatch } from '@/lib/jogueAgora';
import { fetchTodayMatches, fetchWeekMatches } from '@/services/footballApi';
import type { ApiFixture } from '@/types/fixture';

type DiagnosticoOdds = {
  origem_odd: string;
  odd_casa: number | null;
  odd_empate: number | null;
  odd_fora: number | null;
  ev: number | null;
  prob_casa: number | null;
  prob_empate: number | null;
  prob_fora: number | null;
  quando_buscou: string | null;
  fonte_url: string | null;
  fixture_info: string;
};

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@profetabet.com';

async function buscarPrimeiroJogoDisponivel(): Promise<ApiFixture | null> {
  const hoje = await fetchTodayMatches();
  if (hoje.length > 0) return hoje[0];
  const semana = await fetchWeekMatches();
  return semana[0] ?? null;
}

function verificarOrigemOdd(): string {
  return '⚠️ ODDS SIMULADAS — estimateOdds() em src/lib/jogueAgora.ts';
}

export default function DebugApiPage() {
  const { user } = useAuth();
  const [resultado, setResultado] = useState<DiagnosticoOdds | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const isAllowed = user?.email === ADMIN_EMAIL;

  async function testarOrigem() {
    setLoading(true);
    setErro(null);

    try {
      const jogo = await buscarPrimeiroJogoDisponivel();
      if (!jogo) {
        setResultado(null);
        setErro('Nenhum jogo disponível para diagnóstico.');
        return;
      }

      const analise = analyzeMatch(jogo);
      const fixture_info = `${jogo.teams.home.name} x ${jogo.teams.away.name} • ${jogo.league.name} • ID ${jogo.fixture.id}`;

      const diagnostico: DiagnosticoOdds = {
        origem_odd: verificarOrigemOdd(),
        odd_casa: analise.odd_casa,
        odd_empate: analise.odd_empate,
        odd_fora: analise.odd_fora,
        ev: analise.melhor_ev,
        prob_casa: analise.prob_casa * 100,
        prob_empate: analise.prob_empate * 100,
        prob_fora: analise.prob_fora * 100,
        quando_buscou: null,
        fonte_url: 'estimateOdds() em src/lib/jogueAgora.ts',
        fixture_info,
      };

      setResultado(diagnostico);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao executar diagnóstico.');
    } finally {
      setLoading(false);
    }
  }

  if (!isAllowed) {
    return (
      <div style={{ padding: '24px', background: '#111', minHeight: '100vh' }}>
        <h1 style={{ color: '#C9A84C', fontSize: '20px', fontWeight: 700 }}>Acesso restrito</h1>
        <p style={{ color: '#999', marginTop: '8px' }}>Esta página é exclusiva para administração.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#111', minHeight: '100vh' }}>
      <h1 style={{ color: '#C9A84C', fontSize: '22px', fontWeight: 800 }}>Diagnóstico de Odds</h1>
      <p style={{ color: '#999', marginTop: '6px', marginBottom: '18px' }}>
        Mostra a origem real das odds usadas no sistema neste momento.
      </p>

      <button
        onClick={testarOrigem}
        style={{
          background: '#C9A84C',
          color: '#000',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          border: 'none',
          marginBottom: '20px',
        }}
      >
        {loading ? 'Verificando...' : 'VERIFICAR ORIGEM DAS ODDS'}
      </button>

      {erro && (
        <div style={{ background: '#3D1A0F', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <p style={{ color: '#FFD7C2', fontSize: '13px', fontWeight: 700 }}>{erro}</p>
        </div>
      )}

      {resultado && (
        <div style={{ background: '#1A1A1A', padding: '20px', borderRadius: '12px' }}>
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: resultado.origem_odd.includes('✅') ? '#0F3D2E' : '#3D1A0F',
          }}>
            <p style={{ color: 'white', fontSize: '15px', fontWeight: 'bold' }}>{resultado.origem_odd}</p>
            <p style={{ color: '#C7C7C7', fontSize: '12px', marginTop: '6px' }}>{resultado.fixture_info}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {[
              ['Odd Casa', resultado.odd_casa?.toFixed(2)],
              ['Odd Empate', resultado.odd_empate?.toFixed(2)],
              ['Odd Fora', resultado.odd_fora?.toFixed(2)],
              ['EV Calculado', resultado.ev !== null ? `${resultado.ev.toFixed(2)}%` : null],
              ['Prob. Casa', resultado.prob_casa !== null ? `${resultado.prob_casa.toFixed(2)}%` : null],
              ['Prob. Empate', resultado.prob_empate !== null ? `${resultado.prob_empate.toFixed(2)}%` : null],
              ['Prob. Fora', resultado.prob_fora !== null ? `${resultado.prob_fora.toFixed(2)}%` : null],
              ['Ultima atualização', resultado.quando_buscou || 'Não registrada'],
              ['URL da fonte', resultado.fonte_url || 'Não registrada'],
            ].map(([label, valor]) => (
              <tr key={label} style={{ borderBottom: '0.5px solid #333' }}>
                <td style={{ padding: '10px', color: '#888', fontSize: '13px' }}>{label}</td>
                <td style={{ padding: '10px', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
                  {valor || '—'}
                </td>
              </tr>
            ))}
          </table>

          <div style={{ marginTop: '18px', padding: '12px', background: '#151515', borderRadius: '8px' }}>
            <p style={{ color: '#C9A84C', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
              SQL para validar no Supabase
            </p>
            <pre style={{ color: '#C7C7C7', fontSize: '11px', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
{`SELECT 
  home_team,
  away_team,
  odd_home,
  odd_draw, 
  odd_away,
  odds_source,
  odds_updated_at,
  CASE 
    WHEN odd_home IS NULL THEN 'SEM ODDS'
    WHEN odds_source IS NULL THEN 'ORIGEM DESCONHECIDA'
    ELSE odds_source
  END as diagnostico
FROM fixtures
ORDER BY created_at DESC
LIMIT 10;`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
