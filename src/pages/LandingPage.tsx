import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  Zap,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Clock3,
  Target,
  Sparkles,
  BadgeDollarSign,
  TimerReset,
} from 'lucide-react';
import profetaLogo from '@/assets/profeta-bet-logo.png';

const FEATURES = [
  { icon: TrendingUp, title: 'EV Positivo', desc: 'Modelo Poisson calcula probabilidades reais e identifica apostas com valor esperado acima de +5%.' },
  { icon: Shield, title: 'Stop Loss 3 Camadas', desc: 'Proteção automática: stop diário, semanal e total. Sua banca nunca vai a zero.' },
  { icon: Zap, title: 'Kelly Criterion', desc: 'Gestão de banca automática — nunca mais de 2% por aposta. Disciplina matemática.' },
  { icon: BarChart3, title: 'Resolução Automática', desc: 'Apostas resolvidas automaticamente via API quando o jogo termina.' },
];

const HOW_IT_WORKS = [
  {
    icon: Sparkles,
    title: 'Leitura instantânea do mercado',
    desc: 'Odds, contexto e estatísticas são consolidados antes de cada recomendação aparecer.',
  },
  {
    icon: Target,
    title: 'Filtro por valor esperado',
    desc: 'O sistema destaca somente cenários com assimetria favorável e risco controlado.',
  },
  {
    icon: TimerReset,
    title: 'Execução com disciplina',
    desc: 'Stake recomendada, limites de perda e resolução automática mantêm a banca protegida.',
  },
];

const TRUST_PILLARS = [
  { label: 'Recomendação por jogo', value: '1 tese objetiva' },
  { label: 'Tempo de leitura', value: '< 30 segundos' },
  { label: 'Stake sugerida', value: 'ate 2% da banca' },
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

const OUTCOMES = [
  {
    title: 'Sem Profeta Bet',
    accent: 'text-destructive',
    border: 'border-destructive/30',
    items: [
      'Aposta por feeling sem processo repetivel',
      'Stake muda conforme a emocao do dia',
      'Mercados ruins parecem oportunidades',
      'Nao existe historico claro do que funcionou',
    ],
  },
  {
    title: 'Com Profeta Bet',
    accent: 'text-primary',
    border: 'border-primary/30',
    items: [
      'Entrada baseada em probabilidade real e EV',
      'Stake automatizada com Kelly limitada',
      'Bloqueios de perda evitam tilt e overbet',
      'Historico ajuda a repetir padroes lucrativos',
    ],
  },
];

const FAQS = [
  {
    q: 'Preciso entender estatistica para usar?',
    a: 'Nao. O sistema traduz os modelos em recomendacoes simples, com nivel de confianca, stake e leitura de risco.',
  },
  {
    q: 'As apostas sao executadas automaticamente?',
    a: 'Nao. A plataforma entrega a tese e a gestao recomendada para voce decidir com clareza e disciplina.',
  },
  {
    q: 'Serve para quem esta comecando?',
    a: 'Sim. A experiencia foi desenhada para reduzir impulsividade, limitar exposicao e ensinar consistencia desde o inicio.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55 },
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -left-24 top-72 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%),linear-gradient(180deg,rgba(10,10,10,0.35),rgba(10,10,10,0.96))]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={profetaLogo} alt="ProfetaBet" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-extrabold tracking-tight gold-gradient-text">PROFETABET</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <span className="text-sm text-muted-foreground">Metodo orientado por dados</span>
            <span className="text-sm text-muted-foreground">Banca protegida</span>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Teste gratis por 7 dias
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Entrar
            </button>
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Começar grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 pb-16 pt-14 md:pb-24 md:pt-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Inteligencia esportiva aplicada
            </span>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              A pagina agora vende
              <span className="gold-gradient-text"> disciplina, clareza e vantagem</span>
              {' '}em vez de promessa vazia.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-xl md:leading-9">
              O Profeta Bet combina leitura de mercado, modelo probabilistico e gestao automatizada para transformar apostas em decisoes racionais e repetiveis.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 neon-glow-amber"
              >
                Ativar teste gratis <ArrowRight className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 backdrop-blur">
                <Clock3 className="h-4 w-4 text-primary" />
                Setup imediato, sem cartao e sem configuracao complexa
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {TRUST_PILLARS.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-primary/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111]/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Painel em tempo real</p>
                  <h2 className="mt-2 text-2xl font-extrabold">Operacao guiada por EV</h2>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  Online
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Melhor oportunidade</p>
                      <p className="mt-2 text-lg font-bold">Over 1.5 gols</p>
                      <p className="mt-1 text-sm text-zinc-300">EV positivo, tendencia ofensiva e risco controlado.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Confianca</p>
                      <p className="text-2xl font-extrabold text-primary">82%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <BadgeDollarSign className="h-4 w-4 text-primary" /> Stake sugerida
                    </div>
                    <p className="mt-3 text-3xl font-extrabold gold-gradient-text">1.8%</p>
                    <p className="mt-1 text-sm text-muted-foreground">Limitada para preservar crescimento consistente.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Shield className="h-4 w-4 text-primary" /> Stop loss
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-foreground">3 niveis</p>
                    <p className="mt-1 text-sm text-muted-foreground">Bloqueio diario, semanal e total para evitar escalada de risco.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Checklist antes da entrada</span>
                    <span className="font-semibold text-primary">3/3 validado</span>
                  </div>
                  <div className="space-y-2 text-sm text-zinc-300">
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> Probabilidade acima da odd implicita</div>
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> Exposicao dentro do limite da banca</div>
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> Cenario confirmado por dados recentes</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.03] py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="text-center"
            >
              <p className="text-2xl md:text-3xl font-extrabold gold-gradient-text">{stat.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Fluxo claro</p>
            <h2 className="mt-4 text-3xl font-extrabold md:text-5xl">Da leitura do jogo ate a execucao da aposta</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300 md:text-lg">
              A estrutura agora mostra como a plataforma pensa, decide e protege a banca em cada partida.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">0{i + 1}</span>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-zinc-300">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-extrabold">
            Por que o <span className="gold-gradient-text">Profeta Bet</span> é diferente
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="glass-card rounded-[1.5rem] p-6"
              >
                <feat.icon className="mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-bold">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section className="border-y border-white/10 bg-card/40 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold">
            Antes vs <span className="gold-gradient-text">Depois</span>
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {OUTCOMES.map((column) => (
              <motion.div
                key={column.title}
                {...fadeUp}
                className={`glass-card rounded-[1.5rem] border p-6 ${column.border} ${column.title.includes('Com') ? 'neon-glow-amber' : ''}`}
              >
                <h3 className={`mb-4 text-lg font-bold ${column.accent}`}>{column.title}</h3>
                <ul className="space-y-3 text-sm leading-7 text-zinc-300">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-extrabold">Escolha seu plano</h2>
          <p className="mb-10 text-center text-muted-foreground">7 dias grátis em qualquer plano — sem cartão</p>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className={`relative rounded-[1.5rem] p-6 glass-card ${plan.popular ? 'border-primary/40 neon-glow-amber' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    MAIS POPULAR
                  </span>
                )}
                <h3 className="mb-1 text-lg font-bold">{plan.name}</h3>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold gold-gradient-text">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="mb-6 space-y-2">
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

      {/* FAQ */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <motion.div {...fadeUp} className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Perguntas frequentes</p>
            <h2 className="mt-4 text-3xl font-extrabold">Objeções respondidas antes do cadastro</h2>
          </motion.div>
          <div className="mt-10 grid gap-4">
            {FAQS.map((item, i) => (
              <motion.div
                key={item.q}
                {...fadeUp}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl bg-primary/12 p-2 text-primary">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{item.q}</h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-300">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(236,200,19,0.14),rgba(255,255,255,0.04))] px-6 py-12 text-center shadow-[0_10px_60px_rgba(236,200,19,0.08)] md:px-12">
          <h2 className="mb-4 text-3xl font-extrabold">
            Pronto para <span className="gold-gradient-text">parar de perder?</span>
          </h2>
          <p className="mb-8 text-muted-foreground">
            Junte-se aos apostadores que usam matemática, processo e controle de risco em vez de sorte.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="rounded-lg bg-primary px-8 py-3 text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90 neon-glow-amber"
          >
            Começar agora — 7 dias grátis
          </button>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-300">
            <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Sem cartao</span>
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Gestao protegida</span>
            <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Foco em EV positivo</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <img src={profetaLogo} alt="ProfetaBet" className="w-6 h-6 rounded" />
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
