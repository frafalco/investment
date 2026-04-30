import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, Button, Input, Label, Select, Badge } from "../components/ui";
import { ProfitChart } from "../components/Charts";
import { fmtMoney, fmtPct, fmtDate } from "../lib/utils";
import {
  Flask, Play, ArrowLeft, CheckCircle, XCircle, Warning, Trophy, Target, MagnifyingGlass,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function NHLBacktest() {
  const [seasons, setSeasons] = useState([]);
  const [season, setSeason] = useState("");
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState([]);
  const [seasonRange, setSeasonRange] = useState({ min: "", max: "" });
  const [startDate, setStartDate] = useState("");
  const [initialStake, setInitialStake] = useState(1);
  const [bankroll, setBankroll] = useState(1000);
  const [maxCap, setMaxCap] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => { api.get("/nhl/seasons").then(({ data }) => { setSeasons(data); if (data.length && !season) setSeason(data[0]); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!season) return;
    setSelected([]);
    Promise.all([
      api.get(`/nhl/teams?season=${encodeURIComponent(season)}`),
      api.get(`/nhl/season-range?season=${encodeURIComponent(season)}`),
    ]).then(([t, r]) => {
      setTeams(t.data);
      setSeasonRange(r.data);
      setStartDate(r.data.min || "");
    }).catch(() => toast.error("Errore caricamento dati stagione"));
  }, [season]);

  const toggleTeam = (name) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((x) => x !== name);
      if (prev.length >= 4) { toast("Massimo 4 squadre", { icon: "⚠️" }); return prev; }
      return [...prev, name];
    });
  };

  const runBacktest = async () => {
    if (!season) return toast.error("Seleziona una stagione");
    if (selected.length === 0) return toast.error("Seleziona almeno una squadra");
    if (!startDate) return toast.error("Inserisci la data di partenza");
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/backtest/nhl", {
        season,
        start_date: startDate,
        teams: selected,
        initial_stake: parseFloat(initialStake),
        starting_bankroll: parseFloat(bankroll),
        max_consecutive_losses: parseInt(maxCap) || 0,
      });
      setResult(data);
      toast.success("Backtest completato");
    } catch (e) {
      const d = e?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Errore backtest");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = useMemo(
    () => teams.filter((t) => t.toLowerCase().includes(teamFilter.toLowerCase())),
    [teams, teamFilter]
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white font-body"><ArrowLeft size={14} /> Home</Link>

      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold flex items-center gap-2">
            <Flask size={14} className="text-primary" weight="fill" /> Lab
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mt-1">NHL Backtest — Martingale</h1>
          <p className="text-soft font-body text-sm mt-1 max-w-2xl">
            Seleziona 4 squadre e una data di partenza. Se la squadra è favorita scommetto su <span className="text-white font-semibold">AH -1.5</span> (vittoria reg. ≥2), altrimenti su <span className="text-white font-semibold">moneyline</span>. Puntata iniziale <span className="number">1</span>, raddoppia dopo ogni sconfitta, reset alla vittoria. Cap: se raggiunto, la progressione busta (registro l'intera perdita) e riparte da 1.
          </p>
        </div>
      </div>

      {/* FORM */}
      <Card className="p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <Label>Stagione</Label>
            <Select value={season} onChange={(e) => setSeason(e.target.value)} data-testid="bt-season">
              {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <Label>Data di partenza</Label>
            <Input type="date" min={seasonRange.min} max={seasonRange.max} value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="bt-start-date" />
            {seasonRange.min && <div className="text-[10px] text-muted mt-1 font-mono">{seasonRange.min} → {seasonRange.max}</div>}
          </div>
          <div>
            <Label>Stake iniziale</Label>
            <Input type="number" step="0.1" value={initialStake} onChange={(e) => setInitialStake(e.target.value)} data-testid="bt-stake" />
          </div>
          <div>
            <Label>Bankroll (unit)</Label>
            <Input type="number" value={bankroll} onChange={(e) => setBankroll(e.target.value)} data-testid="bt-bankroll" />
          </div>
          <div>
            <Label>Cap perdite consecutive</Label>
            <Input type="number" min="0" value={maxCap} onChange={(e) => setMaxCap(e.target.value)} data-testid="bt-cap" />
            <div className="text-[10px] text-muted mt-1 font-body">0 = illimitato. Max stake = 2^(cap-1)</div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <Label className="mb-0">Squadre ({selected.length}/4)</Label>
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} placeholder="Filtra squadre…" className="pl-8 h-8 text-xs w-64" data-testid="bt-filter-teams" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredTeams.map((t) => {
              const active = selected.includes(t);
              const disabled = !active && selected.length >= 4;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTeam(t)}
                  data-testid={`bt-team-${t.replace(/\s+/g, "-")}`}
                  className={`text-left px-3 py-2 rounded border text-xs font-heading font-semibold tracking-tight transition-all ${
                    active
                      ? "bg-primary/20 border-primary text-white"
                      : disabled
                      ? "bg-bg border-border text-muted cursor-not-allowed opacity-50"
                      : "bg-bg border-border text-soft hover:border-white/30 hover:text-white"
                  }`}
                >
                  {active && "✓ "}{t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex flex-wrap gap-2">
            {selected.map((t) => <Badge key={t} variant="primary">{t}</Badge>)}
          </div>
          <Button size="lg" onClick={runBacktest} disabled={loading || selected.length === 0} data-testid="bt-run-btn">
            <Play size={16} weight="fill" /> {loading ? "Elaborazione…" : "Esegui backtest"}
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {result && <Results result={result} key={JSON.stringify(result.params)} />}
      </AnimatePresence>
    </div>
  );
}

function Results({ result }) {
  const { aggregate, per_team, params } = result;
  const s = aggregate.stats;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Aggregate KPIs */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Risultati aggregati</div>
        <h2 className="font-heading text-2xl font-bold text-white mt-1 mb-4">4 squadre · {params.teams.length} attive</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden border border-border">
          <KpiCell label="P&L" value={fmtMoney(s.total_profit)} tone={s.total_profit >= 0 ? "success" : "danger"} testid="bt-kpi-pnl" />
          <KpiCell label="Bankroll Finale" value={fmtMoney(s.final_bankroll)} tone={s.final_bankroll >= params.starting_bankroll ? "success" : "danger"} testid="bt-kpi-final" />
          <KpiCell label="ROI" value={fmtPct(s.roi)} tone={s.roi >= 0 ? "success" : "danger"} testid="bt-kpi-roi" />
          <KpiCell label="Yield" value={fmtPct(s.yield_pct)} tone={s.yield_pct >= 0 ? "success" : "danger"} testid="bt-kpi-yield" />
          <KpiCell label="Win Rate" value={fmtPct(s.win_rate, 1)} testid="bt-kpi-wr" />
          <KpiCell label="Bet Totali" value={`${s.total_bets}`} sub={`${s.total_wins}W / ${s.total_losses}L`} testid="bt-kpi-bets" />
          <KpiCell label="Totale Stakato" value={fmtMoney(s.total_staked)} testid="bt-kpi-staked" />
          <KpiCell label="Max Stake / Bust" value={`${fmtMoney(s.max_stake)}`} sub={`${s.total_busts} bust`} tone={s.total_busts > 0 ? "danger" : "default"} testid="bt-kpi-bust" />
        </div>
      </div>

      {/* Aggregate chart */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">P&L Aggregato</div>
            <h3 className="font-heading text-lg font-bold text-white mt-1">Andamento cumulativo</h3>
          </div>
          <Badge variant={s.total_profit >= 0 ? "success" : "danger"}>{fmtMoney(s.total_profit)}</Badge>
        </div>
        <ProfitChart data={aggregate.series} height={340} />
      </Card>

      {/* Per team */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {per_team.map((t) => <TeamResult key={t.team} data={t} />)}
      </div>
    </motion.div>
  );
}

function TeamResult({ data }) {
  const { team, bets, series, stats } = data;
  const [expand, setExpand] = useState(false);
  const positive = stats.total_profit >= 0;
  const visibleBets = expand ? bets : bets.slice(0, 20);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-warning" weight="fill" />
            <h3 className="font-heading text-lg font-bold text-white">{team}</h3>
          </div>
          <div className="text-xs text-muted font-body mt-1">{stats.total_bets} bet · {fmtPct(stats.win_rate, 1)} WR · max streak {stats.max_losing_streak}</div>
        </div>
        <Badge variant={positive ? "success" : "danger"}>{fmtMoney(stats.total_profit)}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4 border-t border-b border-border py-3">
        <Mini label="Yield" value={fmtPct(stats.yield_pct)} tone={stats.yield_pct >= 0 ? "success" : "danger"} />
        <Mini label="Stakato" value={fmtMoney(stats.total_staked, 0)} />
        <Mini label="Max Stake" value={fmtMoney(stats.max_stake, 0)} />
        <Mini label="Busts" value={`${stats.busts}`} tone={stats.busts > 0 ? "danger" : "default"} />
      </div>

      <div className="h-[180px]">
        <ProfitChart data={series} height={180} />
      </div>

      {/* Bet details */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted font-heading font-semibold">
            Dettaglio Bet ({bets.length})
          </div>
          {bets.length > 20 && (
            <button className="text-xs text-primary hover:underline font-body" onClick={() => setExpand(!expand)}>
              {expand ? "Mostra meno" : `Mostra tutte (${bets.length})`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.1em] text-muted font-heading">
                <th className="text-left px-5 py-1.5">Data</th>
                <th className="text-left px-2 py-1.5">Vs</th>
                <th className="text-center px-1 py-1.5">Risultato</th>
                <th className="text-left px-1 py-1.5">Mercato</th>
                <th className="text-right px-1 py-1.5">Quota</th>
                <th className="text-right px-1 py-1.5">Step</th>
                <th className="text-right px-1 py-1.5">Stake</th>
                <th className="text-right px-2 py-1.5">P&L</th>
                <th className="text-center px-5 py-1.5 w-8">Esito</th>
              </tr>
            </thead>
            <tbody>
              {visibleBets.map((b, i) => (
                <tr key={i} className={`border-t border-border ${b.bust ? "bg-danger/10" : i % 2 ? "bg-bg/30" : ""}`}>
                  <td className="px-5 py-1.5 font-mono text-muted whitespace-nowrap">{b.date}</td>
                  <td className="px-2 py-1.5 text-white">{b.is_home ? "🏠 " : "✈️ "}{b.opponent}</td>
                  <td className="px-1 py-1.5 text-center font-mono number">
                    {b.team_score}-{b.opp_score}{b.is_draw_regulation && <span className="text-[9px] text-muted ml-0.5">OT</span>}
                  </td>
                  <td className="px-1 py-1.5">
                    {b.is_favorite ? <Badge variant="primary" className="text-[9px]">F</Badge> : <Badge variant="default" className="text-[9px]">U</Badge>}
                    <span className="text-muted ml-1.5 font-body">{b.market}</span>
                  </td>
                  <td className="px-1 py-1.5 text-right number">{b.odds.toFixed(2)}</td>
                  <td className="px-1 py-1.5 text-right number text-muted">{b.step}</td>
                  <td className="px-1 py-1.5 text-right number">{b.stake.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right number font-semibold" style={{ color: b.won ? "#00FF88" : b.bust ? "#F59E0B" : "#FF3B30" }}>
                    {b.won ? "+" : ""}{b.profit.toFixed(2)}
                  </td>
                  <td className="px-5 py-1.5 text-center">
                    {b.bust ? <Warning size={14} className="text-warning inline" weight="fill" title="BUST" /> :
                      b.won ? <CheckCircle size={14} className="text-success inline" weight="fill" /> :
                      <XCircle size={14} className="text-danger inline" weight="fill" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function KpiCell({ label, value, tone, sub, testid }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-white";
  return (
    <div className="bg-surface p-4" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-heading font-semibold">{label}</div>
      <div className={`mt-1.5 font-heading font-bold text-lg md:text-xl number ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5 font-body">{sub}</div>}
    </div>
  );
}

function Mini({ label, value, tone }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-white";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-heading">{label}</div>
      <div className={`font-heading font-semibold text-sm number mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
