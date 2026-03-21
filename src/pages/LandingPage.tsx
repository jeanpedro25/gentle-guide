import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Zap, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: TrendingUp, title: 'EV Positivo', desc: 'Modelo Poisson calcula probabilidades reais e identifica apostas com valor esperado acima de +5%.' },
  { icon: Shield, title: 'Stop Loss 3 Camadas', desc: 'Proteção automática: stop diário, semanal e total. Sua banca nunca vai a zero.' },
  { icon: Zap, title: 'Kelly Criterion', desc: 'Gestão de banca automática — nunca mais de 2% por aposta. Disciplina matemática.' },
  { icon: BarChart3, title: 'Resolução Automática', desc: 'Apostas resolvidas automaticamente via API quando o jogo termina.' },
];

const PLANS = [
  {
    name: 'Iniciante',
    price: 'R$ 29',
    period: '/mês',
    features: ['Até 5 jogos/dia', 'Gestão de banca básica', 'Suporte FAQ'],
    popular: false,
  },
  {
    name: 'Pro',
    price: 'R$ 59',
    period: '/mês',
    features: ['Jogos ilimitados', 'Jogue Agora com EV', 'Resolução automática', 'Todas as ligas', 'Simulador 30 dias'],
    popular: true,
  },
  {
    name: 'Premium',
    price: 'R$ 99',
    period: '/mês',
    features: ['Tudo do Pro', 'Alertas tempo real', 'Relatório PDF mensal', 'Múltiplas bancas', 'Suporte WhatsApp'],
    popular: false,
  },
];

const STATS = [
  { value: '90%+', label: 'Apostadores perdem dinheiro' },
  { value: '+26%', label: 'EV médio das indicações' },
  { value: '2%', label: 'Risco por aposta (Kelly)' },
  { value: '3 camadas', label: 'de proteção automática' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://ai.gateway.lovable.dev/v1/storage/v1/object/public/project-assets/s65smus65smus65s.png" 
              alt="ProfetaBet" 
              className="h-10 object-contain" 
            />
            <span className="text-lg font-extrabold tracking-tight gold-gradient-text hidden sm:block">PROFETABET</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Entrar
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Começar grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8">
              🇧🇷 1º Sistema de Inteligência Esportiva do Brasil
            </span>
            
            <div className="mb-12 max-w-3xl mx-auto">
              <img 
                src="https://ai.gateway.lovable.dev/v1/storage/v1/object/public/project-assets/s65smus65smus65s.png" 
                alt="Profeta Bet Banner" 
                className="w-full max-h-[400px] object-contain drop-shadow-[0_0_30px_rgba(236,200,19,0.3)]" 
              />
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Pare de perder.{' '}
              <span className="gold-gradient-text">Comece a ganhar.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Matemática e dados reais para proteger sua banca e maximizar seus lucros. Modelo Poisson + Kelly Criterion + Stop Loss automático.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors flex items-center gap-2 neon-glow-amber"
              >
                Teste 7 dias grátis <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-sm text-muted-foreground">Sem cartão necessário</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-2xl md:text-3xl font-extrabold gold-gradient-text">{stat.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-12">
            Por que o <span className="gold-gradient-text">Profeta Bet</span> é diferente
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 rounded-xl"
              >
                <feat.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section className="py-16 px-4 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-10">
            Antes vs <span className="gold-gradient-text">Depois</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-xl border-destructive/30">
              <h3 className="font-bold text-destructive mb-4">❌ Sem Profeta Bet</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Aposta por feeling sem análise</li>
                <li>• Sem gestão de banca — aposta valores aleatórios</li>
                <li>• Dobra apostas para recuperar prejuízo</li>
                <li>• Perde 90%+ do investimento</li>
                <li>• Zero controle emocional</li>
              </ul>
            </div>
            <div className="glass-card p-6 rounded-xl border-primary/30 neon-glow-amber">
              <h3 className="font-bold text-primary mb-4">✅ Com Profeta Bet</h3>
              <ul className="space-y-2 text-sm text-foreground">
                <li>• Análise matemática com Poisson + EV</li>
                <li>• Kelly Criterion — max 2% por aposta</li>
                <li>• Stop Loss automático em 3 camadas</li>
                <li>• Banca cresce de forma consistente</li>
                <li>• Disciplina forçada pelo sistema</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-4">Escolha seu plano</h2>
          <p className="text-muted-foreground text-center mb-10">7 dias grátis em qualquer plano — sem cartão</p>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-6 rounded-xl relative ${plan.popular ? 'border-primary/40 neon-glow-amber' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    MAIS POPULAR
                  </span>
                )}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-extrabold gold-gradient-text">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                  }`}
                >
                  Começar grátis
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-t from-primary/5 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-4">
            Pronto para <span className="gold-gradient-text">parar de perder?</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Junte-se aos apostadores que usam matemática, não sorte.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors neon-glow-amber"
          >
            Começar agora — 7 dias grátis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://ai.gateway.lovable.dev/v1/storage/v1/object/public/project-assets/s65smus65smus65s.png" 
              alt="ProfetaBet" 
              className="h-8 object-contain" 
            />
            <span className="text-sm font-bold gold-gradient-text">PROFETABET</span>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-md">
            O Profeta Bet é uma ferramenta de análise e gestão financeira. Não garantimos lucro. Apostas envolvem risco. Jogue com responsabilidade. Proibido para menores de 18 anos.
          </p>
        </div>
      </footer>
    </div>
  );
}