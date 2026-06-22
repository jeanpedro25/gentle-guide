import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// ─── Helpers ──────────────────────────────────────────────────────────────
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

// XAUUSD: 1 lote padrão = 100 oz, 1 ponto ($0.01) = $1/lote; $1.00 de preço = $100/lote
const PIP_VALUE_PER_LOT = 100; // $ por 1.00 de movimento de preço por lote
const POINTS_PER_DOLLAR = 100; // 1.00 = 100 pontos

// ─── Dados simulados de equity (30 dias) ───────────────────────────────────
const equityData = (() => {
  let v = 22800;
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    v += (Math.sin(i / 3) * 120) + (Math.random() * 260 - 60) + 35;
    values.push(Math.round(v));
  }
  values[values.length - 1] = 25430.68;
  return { labels, values };
})();

// ─── Histórico de trades XAUUSD ─────────────────────────────────────────────
type Trade = {
  date: string;
  dir: "BUY" | "SELL";
  lot: number;
  entry: number;
  sl: number;
  tp: number;
  exit: number;
  result: "WIN" | "LOSS";
  pips: number;
  pl: number;
};

const trades: Trade[] = [
  { date: "22/06 09:14", dir: "BUY", lot: 0.5, entry: 2318.4, sl: 2312.0, tp: 2332.0, exit: 2332.0, result: "WIN", pips: 1360, pl: 680 },
  { date: "21/06 14:02", dir: "SELL", lot: 0.3, entry: 2356.8, sl: 2363.0, tp: 2342.0, exit: 2363.0, result: "LOSS", pips: -620, pl: -186 },
  { date: "21/06 10:48", dir: "BUY", lot: 0.4, entry: 2341.2, sl: 2335.5, tp: 2354.0, exit: 2354.0, result: "WIN", pips: 1280, pl: 512 },
  { date: "20/06 16:30", dir: "SELL", lot: 0.6, entry: 2372.5, sl: 2378.0, tp: 2360.0, exit: 2360.0, result: "WIN", pips: 1250, pl: 750 },
  { date: "20/06 11:15", dir: "BUY", lot: 0.2, entry: 2305.0, sl: 2299.0, tp: 2318.0, exit: 2299.0, result: "LOSS", pips: -600, pl: -120 },
  { date: "19/06 13:50", dir: "SELL", lot: 0.5, entry: 2364.0, sl: 2370.0, tp: 2350.0, exit: 2350.0, result: "WIN", pips: 1400, pl: 700 },
];

const totals = (() => {
  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const grossWin = wins.reduce((s, t) => s + t.pl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pl, 0));
  return {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length / trades.length) * 100,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin,
    net: trades.reduce((s, t) => s + t.pl, 0),
  };
})();

// ─── UI Components ──────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <Card className="p-4 glass-card">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-display mt-1">{value}</p>
      {sub && (
        <p className={cn("text-xs mt-1 font-semibold", positive === undefined ? "text-muted-foreground" : positive ? "text-[hsl(var(--oracle-win))]" : "text-destructive")}>
          {sub}
        </p>
      )}
    </Card>
  );
}

export default function XauusdDashboard() {
  // Calculadora
  const [entry, setEntry] = useState(2340);
  const [sl, setSl] = useState(2330);
  const [tp, setTp] = useState(2365);
  const [risk, setRisk] = useState(2);
  const [capital, setCapital] = useState(25430.68);

  // Gerenciamento de risco
  const [maxDailyRisk, setMaxDailyRisk] = useState(800);
  const dailyTarget = 600;
  const accumulatedToday = 680;
  const openTrades = 1;

  const calc = useMemo(() => {
    const slDist = Math.abs(entry - sl);
    const tpDist = Math.abs(tp - entry);
    const slPoints = slDist * POINTS_PER_DOLLAR;
    const tpPoints = tpDist * POINTS_PER_DOLLAR;
    const riskAmount = capital * (risk / 100);
    const lossPerLot = slDist * PIP_VALUE_PER_LOT;
    const lot = lossPerLot > 0 ? riskAmount / lossPerLot : 0;
    const margin = (lot * 100 * entry) / 100; // alavancagem 1:100 estimada
    const rr = slDist > 0 ? tpDist / slDist : 0;
    return { slPoints, tpPoints, riskAmount, lot, margin, rr };
  }, [entry, sl, tp, risk, capital]);

  const targetProgress = Math.min((accumulatedToday / dailyTarget) * 100, 100);
  const lossProgress = Math.min((Math.max(-accumulatedToday, 0) / maxDailyRisk) * 100, 100);
  const stopGreen = accumulatedToday >= dailyTarget;
  const stopRed = accumulatedToday <= -maxDailyRisk;

  const chartData = {
    labels: equityData.labels,
    datasets: [
      {
        label: "Equity",
        data: equityData.values,
        borderColor: "hsl(49, 85%, 50%)",
        backgroundColor: (ctx: { chart: ChartJS }) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return "rgba(236,200,19,0.1)";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(236,200,19,0.35)");
          g.addColorStop(1, "rgba(236,200,19,0)");
          return g;
        },
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.4)", maxTicksLimit: 8 } },
      y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.4)" } },
    },
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display gold-gradient-text">Gerenciamento de Banca</h1>
          <p className="text-sm text-muted-foreground">XAUUSD · Ouro · Painel do Trader</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-secondary text-primary font-semibold">XAUUSD</span>
      </header>

      {/* ─── Cards de Resumo ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <MetricCard label="Saldo Total" value={brl(capital)} sub={`${pct(2.75)} · ${brl(680)}`} positive />
        <MetricCard label="Capital Alocado" value={brl(12500)} sub="2 posições" />
        <MetricCard label="Lucro do Mês" value={brl(4230.5)} sub={pct(19.9)} positive />
        <MetricCard label="ROI" value={pct(19.9)} sub="mês atual" positive />
        <MetricCard label="Trades do Mês" value="38" sub="22 win / 16 loss" />
        <MetricCard label="Win Rate" value={`${totals.winRate.toFixed(0)}%`} sub="histórico recente" positive />
        <MetricCard label="Profit Factor" value={totals.profitFactor.toFixed(2)} sub="ganho/perda" positive={totals.profitFactor >= 1} />
      </div>

      {/* ─── Grid principal ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Gerenciamento de Risco (esquerda) */}
        <Card className="xl:col-span-3 p-5 glass-card space-y-5">
          <h2 className="font-display text-lg">Gerenciamento de Risco</h2>

          <div>
            <Label className="text-xs">% Risco por Trade: <span className="text-primary font-bold">{risk.toFixed(1)}%</span></Label>
            <Slider value={[risk]} onValueChange={(v) => setRisk(v[0])} min={0.5} max={5} step={0.5} className="mt-3" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Acumulado Hoje</p>
              <p className={cn("text-lg font-display", accumulatedToday >= 0 ? "text-[hsl(var(--oracle-win))]" : "text-destructive")}>{brl(accumulatedToday)}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Trades Abertos</p>
              <p className="text-lg font-display">{openTrades}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Máx. Risco Diário</Label>
            <Input type="number" value={maxDailyRisk} onChange={(e) => setMaxDailyRisk(+e.target.value)} className="mt-1" />
          </div>

          <div className={cn("rounded-lg p-3 text-center font-display text-lg border", stopGreen ? "border-[hsl(var(--oracle-win))] text-[hsl(var(--oracle-win))] bg-[hsl(var(--oracle-win))/0.1]" : stopRed ? "border-destructive text-destructive bg-destructive/10" : "border-border text-muted-foreground")}>
            {stopGreen ? "🟢 STOP GREEN — Meta atingida" : stopRed ? "🔴 STOP RED — Limite atingido" : "⚪ Operando"}
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Meta de Lucro</span>
              <span className="text-[hsl(var(--oracle-win))]">{brl(accumulatedToday)} / {brl(dailyTarget)}</span>
            </div>
            <Progress value={targetProgress} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Limite de Perda</span>
              <span className="text-destructive">{brl(Math.max(-accumulatedToday, 0))} / {brl(maxDailyRisk)}</span>
            </div>
            <Progress value={lossProgress} className="h-2 [&>div]:bg-destructive" />
          </div>
        </Card>

        {/* Gráfico de Equity (centro) */}
        <Card className="xl:col-span-6 p-5 glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Curva de Equity</h2>
            <span className="text-xs text-muted-foreground">Últimos 30 dias</span>
          </div>
          <div className="h-[340px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>

        {/* Calculadora de Lote (direita) */}
        <Card className="xl:col-span-3 p-5 glass-card space-y-4">
          <h2 className="font-display text-lg">Calculadora de Lote</h2>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Preço de Entrada</Label>
              <Input type="number" value={entry} step={0.1} onChange={(e) => setEntry(+e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Stop Loss</Label>
                <Input type="number" value={sl} step={0.1} onChange={(e) => setSl(+e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Take Profit</Label>
                <Input type="number" value={tp} step={0.1} onChange={(e) => setTp(+e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">% Risco: <span className="text-primary font-bold">{risk.toFixed(1)}%</span></Label>
              <Slider value={[risk]} onValueChange={(v) => setRisk(v[0])} min={0.5} max={5} step={0.5} className="mt-3" />
            </div>
            <div>
              <Label className="text-xs">Capital da Banca</Label>
              <Input type="number" value={capital} step={0.01} onChange={(e) => setCapital(+e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border text-sm">
            {[
              ["Distância SL", `${calc.slPoints.toFixed(0)} pts`],
              ["Distância TP", `${calc.tpPoints.toFixed(0)} pts`],
              ["Valor em Risco", brl(calc.riskAmount)],
              ["Tamanho do Lote", calc.lot.toFixed(2)],
              ["Margem Necessária", brl(calc.margin)],
              ["Risco : Retorno", `1 : ${calc.rr.toFixed(2)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── Histórico de Trades ─── */}
      <Card className="p-5 glass-card">
        <h2 className="font-display text-lg mb-4">Histórico de Trades</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                <th className="text-left py-2 px-2">Data/Hora</th>
                <th className="text-left py-2 px-2">Ativo</th>
                <th className="text-left py-2 px-2">Direção</th>
                <th className="text-right py-2 px-2">Lote</th>
                <th className="text-right py-2 px-2">Entrada</th>
                <th className="text-right py-2 px-2">SL</th>
                <th className="text-right py-2 px-2">TP</th>
                <th className="text-right py-2 px-2">Saída</th>
                <th className="text-center py-2 px-2">Resultado</th>
                <th className="text-right py-2 px-2">Pips</th>
                <th className="text-right py-2 px-2">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="py-2 px-2 whitespace-nowrap">{t.date}</td>
                  <td className="py-2 px-2">XAUUSD</td>
                  <td className="py-2 px-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", t.dir === "BUY" ? "bg-[hsl(var(--oracle-blue))/0.15] text-[hsl(var(--oracle-blue))]" : "bg-destructive/15 text-destructive")}>
                      {t.dir}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">{t.lot.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{t.entry.toFixed(1)}</td>
                  <td className="py-2 px-2 text-right">{t.sl.toFixed(1)}</td>
                  <td className="py-2 px-2 text-right">{t.tp.toFixed(1)}</td>
                  <td className="py-2 px-2 text-right">{t.exit.toFixed(1)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", t.result === "WIN" ? "bg-[hsl(var(--oracle-win))/0.15] text-[hsl(var(--oracle-win))]" : "bg-destructive/15 text-destructive")}>
                      {t.result}
                    </span>
                  </td>
                  <td className={cn("py-2 px-2 text-right", t.pips >= 0 ? "text-[hsl(var(--oracle-win))]" : "text-destructive")}>{t.pips}</td>
                  <td className={cn("py-2 px-2 text-right font-semibold", t.pl >= 0 ? "text-[hsl(var(--oracle-win))]" : "text-destructive")}>{brl(t.pl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totalizadores */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border text-center">
          <div><p className="text-xs text-muted-foreground">Total</p><p className="font-display text-lg">{totals.total}</p></div>
          <div><p className="text-xs text-muted-foreground">Vencedores</p><p className="font-display text-lg text-[hsl(var(--oracle-win))]">{totals.wins}</p></div>
          <div><p className="text-xs text-muted-foreground">Perdedores</p><p className="font-display text-lg text-destructive">{totals.losses}</p></div>
          <div><p className="text-xs text-muted-foreground">Win Rate</p><p className="font-display text-lg">{totals.winRate.toFixed(0)}%</p></div>
          <div><p className="text-xs text-muted-foreground">Profit Factor</p><p className="font-display text-lg">{totals.profitFactor.toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground">Líquido Total</p><p className={cn("font-display text-lg", totals.net >= 0 ? "text-[hsl(var(--oracle-win))]" : "text-destructive")}>{brl(totals.net)}</p></div>
        </div>
      </Card>
    </div>
  );
}
