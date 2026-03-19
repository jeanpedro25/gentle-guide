import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'running' | 'done';

export interface LoadingStep {
  icon: string;
  text: string;
  status: StepStatus;
}

interface Props {
  steps: LoadingStep[];
}

export function LoadingSteps({ steps }: Props) {
  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = (doneCount / steps.length) * 100;

  return (
    <div className="py-10 space-y-6">
      {/* Progress bar */}
      <div className="w-full max-w-sm mx-auto">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          {doneCount} de {steps.length} etapas
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2 max-w-sm mx-auto">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              step.status === 'running' ? 'bg-primary/10 border border-primary/30' :
              step.status === 'done' ? 'bg-secondary/30' : 'opacity-40'
            }`}
          >
            <span className="text-base">{step.icon}</span>
            <span className={`flex-1 ${
              step.status === 'done' ? 'text-primary' :
              step.status === 'running' ? 'text-foreground font-bold' : 'text-muted-foreground'
            }`}>
              {step.text}
            </span>
            {step.status === 'done' && <Check className="w-4 h-4 text-primary" />}
            {step.status === 'running' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          </div>
        ))}
      </div>
    </div>
  );
}
