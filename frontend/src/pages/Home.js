import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { Card, Badge, Button } from "../components/ui";
import { ProfitChart, Sparkline } from "../components/Charts";
import { aggregateSeries, buildSeries, computeKpis, fmtDate, fmtMoney, fmtPct } from "../lib/utils";
import { TrendUp, TrendDown, Archive, Plus, Medal } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export default function Home() {
  const { strategies, bets, bonuses, loaded } = useData();
  const [showArchived, setShowArchived] = useState(false);

  const visibleStrategies = useMemo(
    () => strategies.filter((s) => (showArchived ? true : !s.archived)),
    [strategies, showArchived]
  );

  const aggregate = useMemo(() => {
    const per = visibleStrategies.map((s) => ({
      bets: bets.filter((b) => b.strategy_id === s.id),
      bonuses: bonuses.filter((bo) => bo.strategy_id === s.id),
    }));
    return aggregateSeries(per);
  }, [visibleStrategies, bets, bonuses]);

  const kpis = useMemo(() => {
    let totalBankroll = 0;
    let totalProfit = 0;
    let totalWagered = 0;
    let totalBets = 0;
    let pending = 0;
    let wins = 0, losses = 0;
    visibleStrategies.forEach((s) => {
      const sb = bets.filter((b) => b.strategy_id === s.id);
      const bo = bonuses.filter((x) => x.strategy_id === s.id);
      const k = computeKpis(s, sb, bo);
      totalBankroll += s.starting_bankroll;
      totalProfit += k.totalProfit;
      totalWagered += k.totalWagered;
      totalBets += k.totalBets;
      pending += k.pendingBets;
      wins += k.wins;
      losses += k.losses;
    });
    const wl = wins + losses;
    return {
      totalBankroll,
      totalProfit,
      totalWagered,
      totalBets,
      pending,
      roi: totalBankroll ? totalProfit / totalBankroll : 0,
      yieldPct: totalWagered ? totalProfit / totalWagered : 0,
      winRate: wl ? wins / wl : 0,
      activeStrategies: visibleStrategies.length,
      currentBalance: totalBankroll + totalProfit,
    };
  }, [visibleStrategies, bets, bonuses]);

  if (!loaded) return <SkeletonPage />;

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header metric row */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Panoramica</div>
            <h1 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mt-1">Cruscotto aggregato</h1>
          </div>
          <Link to="/add-bet"><Button size="md" data-testid="home-add-bet"><Plus size={16} weight="bold" /> Nuova Bet</Button></Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-border rounded overflow-hidden border border-border">
          <Metric label="Bankroll Corrente" value={fmtMoney(kpis.currentBalance)} tone={kpis.currentBalance >= kpis.totalBankroll ? "success" : "danger"} testid="kpi-balance" />
          <Metric label="P&L Totale" value={fmtMoney(kpis.totalProfit)} tone={kpis.totalProfit >= 0 ? "success" : "danger"} icon={kpis.totalProfit >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />} testid="kpi-pnl" />
          <Metric label="ROI" value={fmtPct(kpis.roi)} tone={kpis.roi >= 0 ? "success" : "danger"} testid="kpi-roi" />
          <Metric label="Yield" value={fmtPct(kpis.yieldPct)} tone={kpis.yieldPct >= 0 ? "success" : "danger"} testid="kpi-yield" />
          <Metric label="Win Rate" value={fmtPct(kpis.winRate, 1)} testid="kpi-winrate" />
          <Metric label="Bet Totali" value={`${kpis.totalBets}`} sub={`${kpis.pending} in attesa`} testid="kpi-bets" />
        </div>
      </section>

      {/* Main chart */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="p-5 md:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">P&L Cumulativo</div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-white tracking-tight mt-1">Andamento aggregato</h2>
            </div>
            <Badge variant={kpis.totalProfit >= 0 ? "success" : "danger"}>
              {kpis.totalProfit >= 0 ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />}
              {fmtMoney(kpis.totalProfit)}
            </Badge>
          </div>
          <ProfitChart data={aggregate} height={360} />
        </Card>
      </motion.section>

      {/* Strategies grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Portfolio</div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-white tracking-tight mt-1">Strategie</h2>
          </div>
          <div className="flex gap-2">
            <Button variant={showArchived ? "primary" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)} data-testid="toggle-archived">
              <Archive size={14} /> {showArchived ? "Nascondi archiviate" : "Mostra archiviate"}
            </Button>
            <Link to="/strategies"><Button variant="outline" size="sm" data-testid="go-strategies">Gestisci</Button></Link>
          </div>
        </div>

        {visibleStrategies.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-muted font-body">Nessuna strategia attiva. Crea la tua prima strategia per iniziare.</div>
            <Link to="/strategies" className="inline-block mt-4"><Button variant="primary" size="sm">Crea strategia</Button></Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleStrategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, sub, tone, icon, testid }) {
  const toneColor = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-white";
  return (
    <div className="bg-surface p-4 md:p-5" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-heading font-semibold">{label}</div>
      <div className={`mt-2 font-heading font-bold text-xl md:text-2xl number flex items-center gap-1.5 ${toneColor}`}>
        {icon}{value}
      </div>
      {sub && <div className="text-[11px] text-muted mt-1 font-body">{sub}</div>}
    </div>
  );
}

function StrategyCard({ strategy }) {
  const { bets, bonuses } = useData();
  const sb = useMemo(() => bets.filter((b) => b.strategy_id === strategy.id), [bets, strategy.id]);
  const bo = useMemo(() => bonuses.filter((b) => b.strategy_id === strategy.id), [bonuses, strategy.id]);
  const series = useMemo(() => buildSeries(sb, bo, "cumulative"), [sb, bo]);
  const kpi = useMemo(() => computeKpis(strategy, sb, bo), [strategy, sb, bo]);

  const lastBet = useMemo(() => {
    if (!sb.length) return null;
    return sb.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  }, [sb]);

  const positive = kpi.totalProfit >= 0;
  return (
    <Link
      to={`/strategy/${strategy.id}`}
      data-testid={`strategy-card-${strategy.id}`}
      className="block hover-lift bg-surface border border-border rounded p-5 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {strategy.type === "bonus" && <Medal size={14} className="text-warning" weight="fill" />}
            <h3 className="font-heading font-bold text-white text-lg truncate">{strategy.name}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {strategy.archived && <Badge variant="default">Archiviata</Badge>}
            <span className="text-[11px] text-muted font-body">Bankroll €{strategy.starting_bankroll?.toLocaleString?.() || 0}</span>
          </div>
        </div>
        <Badge variant={positive ? "success" : "danger"}>
          {positive ? <TrendUp size={10} weight="bold" /> : <TrendDown size={10} weight="bold" />}
          {fmtMoney(kpi.totalProfit)}
        </Badge>
      </div>

      <div className="mt-4 h-[70px]">
        <Sparkline data={series} height={70} positive={positive} />
      </div>

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2">
        <Micro label="ROI" value={fmtPct(kpi.roi)} tone={kpi.roi >= 0 ? "success" : "danger"} />
        <Micro label="Bet" value={`${kpi.totalBets}`} sub={`${kpi.pendingBets} pending`} />
        <Micro label="Ultima" value={lastBet ? fmtDate(lastBet.date) : "—"} />
      </div>
    </Link>
  );
}

function Micro({ label, value, sub, tone }) {
  const toneColor = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-white";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-heading">{label}</div>
      <div className={`font-heading font-semibold text-sm number mt-0.5 ${toneColor}`}>{value}</div>
      {sub && <div className="text-[9px] text-muted">{sub}</div>}
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="h-20 bg-surface border border-border rounded animate-pulse" />
      <div className="h-[400px] bg-surface border border-border rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (<div key={i} className="h-[220px] bg-surface border border-border rounded animate-pulse" />))}
      </div>
    </div>
  );
}
