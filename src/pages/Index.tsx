import { useState, useCallback } from 'react';
import { Header } from '@/components/oracle/Header';
import { InputPanel } from '@/components/oracle/InputPanel';
import { ResultsDashboard } from '@/components/oracle/ResultsDashboard';
import { HistoryPanel } from '@/components/oracle/HistoryPanel';
import { MatchAnalysis, PredictionResult } from '@/types/prediction';
import { Team, Sport } from '@/data/teams';
import { toast } from 'sonner';

// Mock prediction for now (will be replaced with AI call)
function generateMockPrediction(homeTeam: string, awayTeam: string): PredictionResult {
  const homeWin = Math.floor(Math.random() * 40) + 20;
  const draw = Math.floor(Math.random() * 25) + 10;
  const awayWin = 100 - homeWin - draw;

  const maxVal = Math.max(homeWin, draw, awayWin);
  const prediction = maxVal === homeWin ? 'HOME_WIN' as const :
    maxVal === draw ? 'DRAW' as const : 'AWAY_WIN' as const;

  const confidences = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
  const risks = ['LOW', 'MEDIUM', 'HIGH'] as const;

  return {
    homeWinPercent: homeWin,
    drawPercent: draw,
    awayWinPercent: awayWin,
    prediction,
    confidence: confidences[Math.floor(Math.random() * 4)],
    reasoning: `Baseado na análise histórica, ${homeTeam} possui vantagem de mandante significativa contra ${awayTeam}. A forma recente e estatísticas de confronto direto indicam uma tendência clara nesta partida.`,
    keyFactors: [
      'Forma recente do mandante',
      'Histórico de confrontos',
      'Jogadores lesionados',
      'Desempenho em casa/fora',
      'Motivação competitiva',
    ].slice(0, Math.floor(Math.random() * 3) + 3),
    riskLevel: risks[Math.floor(Math.random() * 3)],
    suggestedBet: `Vitória do ${prediction === 'HOME_WIN' ? homeTeam : prediction === 'AWAY_WIN' ? awayTeam : 'Empate'} com handicap`,
    oddsTrend: 'Odds estáveis com leve tendência de queda para o favorito',
  };
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<MatchAnalysis | null>(null);
  const [history, setHistory] = useState<MatchAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleAnalyze = useCallback(async (data: {
    homeTeam: Team;
    awayTeam: Team;
    sport: Sport;
    league: string;
    date: string;
  }) => {
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const result = generateMockPrediction(data.homeTeam.name, data.awayTeam.name);

      const analysis: MatchAnalysis = {
        id: crypto.randomUUID(),
        homeTeam: data.homeTeam.name,
        awayTeam: data.awayTeam.name,
        sport: data.sport,
        league: data.league,
        date: data.date,
        result,
        timestamp: Date.now(),
      };

      setCurrentAnalysis(analysis);
      setHistory(prev => [analysis, ...prev].slice(0, 5));
      toast.success('Análise concluída!');
    } catch {
      toast.error('Erro ao analisar partida. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectHistory = useCallback((analysis: MatchAnalysis) => {
    setCurrentAnalysis(analysis);
  }, []);

  return (
    <div className="min-h-screen bg-oracle-bg">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4">
        <Header onToggleHistory={() => setShowHistory(v => !v)} historyCount={history.length} />

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Input Panel */}
          <div className="w-full lg:w-96 lg:shrink-0">
            <InputPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
          </div>

          {/* Results Dashboard */}
          <div className="flex-1 min-w-0">
            <ResultsDashboard analysis={currentAnalysis} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onSelect={handleSelectHistory}
      />
    </div>
  );
};

export default Index;
