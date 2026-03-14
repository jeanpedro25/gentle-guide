import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STEPS = [
  { icon: '⚽', text: 'Buscando dados da partida...' },
  { icon: '📊', text: 'Calculando modelo de Poisson...' },
  { icon: '🧮', text: 'Analisando Expected Value...' },
  { icon: '🥅', text: 'Avaliando goleiros e jogadores-chave...' },
  { icon: '🎯', text: 'Oracle calibrando Kelly Criterion...' },
  { icon: '🧠', text: 'Gerando análise final...' },
  { icon: '✅', text: 'Edge calculado!' },
];

export function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Spinning icon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="text-6xl"
      >
        {STEPS[currentStep].icon}
      </motion.div>

      {/* Current step text */}
      <motion.p
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-xl tracking-widest text-oracle-win text-center"
      >
        {STEPS[currentStep].text}
      </motion.p>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        <p className="text-xs font-body text-oracle-muted text-center mt-2">
          Etapa {currentStep + 1} de {STEPS.length}
        </p>
      </div>

      {/* Steps timeline */}
      <div className="w-full max-w-md space-y-2">
        {STEPS.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: i <= currentStep ? 1 : 0.3,
              x: 0,
            }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              i === currentStep ? 'bg-primary/10 border border-primary/30' :
              i < currentStep ? 'bg-secondary/30' : ''
            }`}
          >
            <span className="text-lg">{step.icon}</span>
            <span className={`text-sm font-body ${
              i < currentStep ? 'text-oracle-win' :
              i === currentStep ? 'text-foreground' : 'text-oracle-muted'
            }`}>
              {step.text}
            </span>
            {i < currentStep && (
              <span className="ml-auto text-xs text-oracle-win font-display">✓</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
