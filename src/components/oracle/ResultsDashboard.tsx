import { MatchAnalysis } from '@/types/prediction';
import { VerdictCard } from './VerdictCard';
import { ProbabilityBars } from './ProbabilityBars';
import { AnalysisBreakdown } from './AnalysisBreakdown';
import { BettingInsight } from './BettingInsight';
import { LoadingState } from './LoadingState';
import { Zap } from 'lucide-react';

interface ResultsDashboardProps {
  analysis: MatchAnalysis | null;
  isLoading: boolean;
}

export function ResultsDashboard({ analysis, isLoading }: ResultsDashboardProps) {
  if (isLoading) return <LoadingState />;

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <Zap className="w-16 h-16 text-oracle-muted opacity-30" />
        <p className="font-display text-2xl text-oracle-muted tracking-wider">
          SELECIONE UMA PARTIDA
        </p>
        <p className="text-sm font-body text-oracle-muted max-w-sm">
          Escolha os times e clique em "ANALISAR PARTIDA" para receber a previsão do Oracle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VerdictCard
        result={analysis.result}
        homeTeam={analysis.homeTeam}
        awayTeam={analysis.awayTeam}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProbabilityBars
          result={analysis.result}
          homeTeam={analysis.homeTeam}
          awayTeam={analysis.awayTeam}
        />
        <AnalysisBreakdown result={analysis.result} />
      </div>
      <BettingInsight result={analysis.result} />
    </div>
  );
}
