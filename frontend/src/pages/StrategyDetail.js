import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { Card, Button, Badge, Input, Select, Label } from "../components/ui";
import { ProfitChart } from "../components/Charts";
import { buildSeries, computeKpis, fmtDate, fmtMoney, fmtPct } from "../lib/utils";
import {
  ArrowLeft, PencilSimple, Trash, CheckCircle, XCircle, Clock, Plus, MagnifyingGlass,
  TrendUp, TrendDown, Gift,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function StrategyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { strategies, bets, bonuses, updateBet, deleteBet, deleteBonus, createBonus, deleteStrategy, updateStrategy } = useData();
  const strategy = strategies.find((s) => s.id === id);

  const myBets = useMemo(() => bets.filter((b) => b.strategy_id === id), [bets, id]);
  const myBonuses = useMemo(() => bonuses.filter((b) => b.strategy_id === id), [bonuses, id]);
  const [view, setView] = useState("cumulative");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingBet, setEditingBet] = useState(null);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showEditStr, setShowEditStr] = useState(false);

  const series = useMemo(() => buildSeries(myBets, myBonuses, view === "cumulative" ? "cumulative" : view), [myBets, myBonuses, view]);
  const kpi = useMemo(() => computeKpis(strategy, myBets, myBonuses), [strategy, myBets, myBonuses]);

  const filteredBets = useMemo(() => {
    return myBets
      .filter((b) => (filter === "all" ? true : b.result === filter))
      .filter((b) => (search ? (b.event || "").toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [myBets, filter, search]);

  if (!strategy) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-12 text-center">
        <div className="text-muted">Strategia non trovata.</div>
        <Link to="/strategies"><Button className="mt-4" size="sm">Torna alle strategie</Button></Link>
      </div>
    );
  }

  const handleResultChange = async (bet, newResult) => {
    try {
      await updateBet(bet.id, { ...bet, result: newResult });
      toast.success("Bet aggiornata");
    } catch (e) {
      toast.error("Errore aggiornamento");
    }
  };

  const handleDeleteBet = async (bet) => {
    if (!window.confirm(`Eliminare la bet "${bet.event}"?`)) return;
    try {
      await deleteBet(bet.id);
      toast.success("Bet eliminata");
    } catch {
      toast.error("Errore");
    }
  };

  const handleDeleteStrategy = async () => {
    if (!window.confirm(`Eliminare la strategia "${strategy.name}" e tutte le sue bet?`)) return;
    try {
      await deleteStrategy(strategy.id);
      toast.success("Strategia eliminata");
      nav("/");
    } catch { toast.error("Errore"); }
  };

  const handleToggleArchive = async () => {
    try {
      await updateStrategy(strategy.id, { ...strategy, archived: !strategy.archived });
      toast.success(strategy.archived ? "Riattivata" : "Archiviata");
    } catch { toast.error("Errore"); }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white font-body" data-testid="back-home"><ArrowLeft size={14} /> Home</Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold flex items-center gap-2">
            Strategia {strategy.type === "bonus" && <Badge variant="warning">BONUS</Badge>}
            {strategy.archived && <Badge>Archiviata</Badge>}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mt-1">{strategy.name}</h1>
          <div className="text-soft font-body text-sm mt-1">Bankroll iniziale: <span className="number text-white">€{strategy.starting_bankroll?.toLocaleString?.() || 0}</span></div>
        </div>
        <div className="flex gap-2">
          <Link to={`/add-bet?strategy=${strategy.id}`}><Button size="sm" data-testid="add-bet-strategy"><Plus size={14} /> Nuova Bet</Button></Link>
          {strategy.type === "bonus" && (
            <Button variant="outline" size="sm" onClick={() => setShowBonusModal(true)} data-testid="add-bonus-btn"><Gift size={14} /> Bonus</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowEditStr(true)} data-testid="edit-strategy-btn"><PencilSimple size={14} /> Modifica</Button>
          <Button variant="outline" size="sm" onClick={handleToggleArchive} data-testid="archive-btn">{strategy.archived ? "Ripristina" : "Archivia"}</Button>
          <Button variant="danger" size="sm" onClick={handleDeleteStrategy} data-testid="delete-strategy-btn"><Trash size={14} /></Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden border border-border">
        <Kpi label="P&L" value={fmtMoney(kpi.totalProfit)} tone={kpi.totalProfit >= 0 ? "success" : "danger"} />
        <Kpi label="ROI" value={fmtPct(kpi.roi)} tone={kpi.roi >= 0 ? "success" : "danger"} />
        <Kpi label="Yield" value={fmtPct(kpi.yieldPct)} tone={kpi.yieldPct >= 0 ? "success" : "danger"} />
        <Kpi label="Win Rate" value={fmtPct(kpi.winRate, 1)} />
        <Kpi label="Quota Media" value={kpi.avgOdds ? kpi.avgOdds.toFixed(2) : "—"} />
        <Kpi label="Max DD" value={fmtMoney(kpi.maxDrawdown)} tone="danger" />
        <Kpi label="Max Losing Streak" value={`${kpi.maxLossStreak}`} />
        <Kpi label="Bet / Pending" value={`${kpi.totalBets} / ${kpi.pendingBets}`} />
      </div>

      {/* Chart */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Andamento</div>
            <h2 className="font-heading text-xl font-bold text-white mt-1">P&L {view === "cumulative" ? "cumulativo" : `per ${view === "daily" ? "giorno" : view === "weekly" ? "settimana" : "mese"}`}</h2>
          </div>
          <div className="flex bg-bg border border-border rounded p-0.5">
            {[
              { k: "cumulative", l: "Cumulativo" },
              { k: "daily", l: "Giornaliero" },
              { k: "weekly", l: "Settimanale" },
              { k: "monthly", l: "Mensile" },
            ].map((v) => (
              <button
                key={v.k}
                onClick={() => setView(v.k)}
                data-testid={`view-${v.k}`}
                className={`px-3 h-8 text-xs font-heading font-semibold tracking-tight rounded ${view === v.k ? "bg-primary text-white" : "text-soft hover:text-white"}`}
              >
                {v.l}
              </button>
            ))}
          </div>
        </div>
        <ProfitChart data={series} height={360} type={view === "cumulative" ? "area" : "line"} />
      </Card>

      {/* Bonuses list (if bonus strategy) */}
      {strategy.type === "bonus" && myBonuses.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading text-lg font-bold mb-3">Bonus</h3>
          <div className="divide-y divide-border">
            {myBonuses.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((bo) => (
              <div key={bo.id} className="py-2.5 flex items-center gap-3">
                <div className="text-soft text-sm font-mono w-32">{fmtDate(bo.date)}</div>
                <div className="text-white font-body flex-1">{bo.note || "Bonus"}</div>
                <div className="number font-heading font-semibold text-success">{fmtMoney(bo.amount)}</div>
                <button className="text-muted hover:text-danger ml-2" onClick={() => deleteBonus(bo.id)} data-testid={`del-bonus-${bo.id}`}><Trash size={14} /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bets table */}
      <Card>
        <div className="p-5 border-b border-border flex flex-wrap items-center gap-3 justify-between">
          <h3 className="font-heading text-lg font-bold">Bet ({filteredBets.length})</h3>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca evento…" className="pl-8 h-8 text-xs w-48" data-testid="search-bets" />
            </div>
            <div className="flex bg-bg border border-border rounded p-0.5">
              {[
                { k: "all", l: "Tutte" },
                { k: "pending", l: "Pending" },
                { k: "won", l: "Vinte" },
                { k: "lost", l: "Perse" },
                { k: "void", l: "Void" },
              ].map((f) => (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  data-testid={`filter-${f.k}`}
                  className={`px-2.5 h-7 text-[11px] font-heading font-semibold tracking-tight rounded ${filter === f.k ? "bg-primary text-white" : "text-soft hover:text-white"}`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted font-heading">
                <th className="text-left px-5 py-3 font-semibold">Data</th>
                <th className="text-left px-5 py-3 font-semibold">Evento</th>
                <th className="text-right px-5 py-3 font-semibold">Quota</th>
                <th className="text-right px-5 py-3 font-semibold">Unit %</th>
                <th className="text-right px-5 py-3 font-semibold">Puntata</th>
                <th className="text-center px-5 py-3 font-semibold">Risultato</th>
                <th className="text-right px-5 py-3 font-semibold">P&L</th>
                <th className="text-right px-5 py-3 font-semibold w-28">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredBets.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted font-body">Nessuna bet trovata.</td></tr>
              )}
              {filteredBets.map((b, idx) => (
                <tr key={b.id} className={`border-t border-border ${idx % 2 === 0 ? "bg-bg/40" : ""} hover:bg-white/5`} data-testid={`bet-row-${b.id}`}>
                  <td className="px-5 py-2.5 text-soft font-mono text-xs whitespace-nowrap">{fmtDate(b.date)}</td>
                  <td className="px-5 py-2.5 text-white font-body">{b.event}</td>
                  <td className="px-5 py-2.5 text-right number">{b.odds?.toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-right number text-soft">{b.unit}%</td>
                  <td className="px-5 py-2.5 text-right number">{fmtMoney(b.bet)}</td>
                  <td className="px-5 py-2.5 text-center">
                    <ResultButtons bet={b} onChange={handleResultChange} />
                  </td>
                  <td className="px-5 py-2.5 text-right number font-semibold" style={{ color: b.result === "won" ? "#00FF88" : b.result === "lost" ? "#FF3B30" : "#737373" }}>
                    {b.result === "pending" ? "—" : fmtMoney(b.profit)}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button className="text-muted hover:text-white mr-2" onClick={() => setEditingBet(b)} data-testid={`edit-bet-${b.id}`}><PencilSimple size={14} /></button>
                    <button className="text-muted hover:text-danger" onClick={() => handleDeleteBet(b)} data-testid={`del-bet-${b.id}`}><Trash size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {editingBet && <EditBetModal bet={editingBet} onClose={() => setEditingBet(null)} />}
        {showBonusModal && <BonusModal strategyId={strategy.id} onClose={() => setShowBonusModal(false)} />}
        {showEditStr && <EditStrategyModal strategy={strategy} onClose={() => setShowEditStr(false)} />}
      </AnimatePresence>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-white";
  return (
    <div className="bg-surface p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-heading font-semibold">{label}</div>
      <div className={`mt-1.5 font-heading font-bold text-lg md:text-xl number ${color}`}>{value}</div>
    </div>
  );
}

function ResultButtons({ bet, onChange }) {
  const opts = [
    { k: "pending", icon: <Clock size={12} />, label: "P", color: "text-warning" },
    { k: "won", icon: <CheckCircle size={12} weight="fill" />, label: "W", color: "text-success" },
    { k: "lost", icon: <XCircle size={12} weight="fill" />, label: "L", color: "text-danger" },
    { k: "void", icon: <XCircle size={12} />, label: "V", color: "text-muted" },
  ];
  return (
    <div className="inline-flex bg-bg border border-border rounded p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          className={`w-7 h-7 inline-flex items-center justify-center text-xs rounded font-heading font-semibold ${bet.result === o.k ? "bg-white/10 " + o.color : "text-muted hover:text-white"}`}
          onClick={(e) => { e.stopPropagation(); onChange(bet, o.k); }}
          data-testid={`result-${bet.id}-${o.k}`}
          title={o.k}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function Modal({ children, onClose, title, maxW = "max-w-md" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface border border-border rounded w-full ${maxW} p-6 shadow-glow`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-white" data-testid="modal-close"><XCircle size={20} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function EditBetModal({ bet, onClose }) {
  const { updateBet } = useData();
  const [form, setForm] = useState({ ...bet });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await updateBet(bet.id, {
        ...form,
        odds: parseFloat(form.odds),
        unit: parseFloat(form.unit),
        bet: parseFloat(form.bet),
      });
      toast.success("Bet aggiornata");
      onClose();
    } catch { toast.error("Errore"); } finally { setSaving(false); }
  };
  return (
    <Modal title="Modifica Bet" onClose={onClose} maxW="max-w-lg">
      <div className="space-y-3">
        <div><Label>Evento</Label><Input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} data-testid="edit-event" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Data</Label><Input type="datetime-local" value={(form.date || "").slice(0, 16)} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="edit-date" /></div>
          <div><Label>Quota</Label><Input type="number" step="0.01" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} data-testid="edit-odds" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Unit %</Label><Input type="number" step="0.01" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} data-testid="edit-unit" /></div>
          <div><Label>Puntata €</Label><Input type="number" step="0.01" value={form.bet} onChange={(e) => setForm({ ...form, bet: e.target.value })} data-testid="edit-bet-amount" /></div>
        </div>
        <div><Label>Risultato</Label>
          <Select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} data-testid="edit-result">
            <option value="pending">Pending</option><option value="won">Won</option><option value="lost">Lost</option><option value="void">Void</option>
          </Select>
        </div>
        <div><Label>Bookmaker</Label><Input value={form.bookmaker || ""} onChange={(e) => setForm({ ...form, bookmaker: e.target.value })} /></div>
      </div>
      <div className="mt-6 flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={save} disabled={saving} data-testid="save-edit-bet">{saving ? "Salvataggio…" : "Salva"}</Button>
      </div>
    </Modal>
  );
}

function BonusModal({ strategyId, onClose }) {
  const { createBonus } = useData();
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: "", note: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await createBonus({ strategy_id: strategyId, date: form.date, amount: parseFloat(form.amount), note: form.note });
      toast.success("Bonus aggiunto"); onClose();
    } catch { toast.error("Errore"); } finally { setSaving(false); }
  };
  return (
    <Modal title="Aggiungi Bonus" onClose={onClose}>
      <div className="space-y-3">
        <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="bonus-date" /></div>
        <div><Label>Importo €</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="bonus-amount" /></div>
        <div><Label>Nota</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
      </div>
      <div className="mt-6 flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={save} disabled={saving} data-testid="save-bonus">Salva</Button>
      </div>
    </Modal>
  );
}

function EditStrategyModal({ strategy, onClose }) {
  const { updateStrategy } = useData();
  const [form, setForm] = useState({ ...strategy });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await updateStrategy(strategy.id, { ...form, starting_bankroll: parseFloat(form.starting_bankroll) });
      toast.success("Strategia aggiornata"); onClose();
    } catch { toast.error("Errore"); } finally { setSaving(false); }
  };
  return (
    <Modal title="Modifica Strategia" onClose={onClose}>
      <div className="space-y-3">
        <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="edit-str-name" /></div>
        <div><Label>Bankroll iniziale €</Label><Input type="number" step="0.01" value={form.starting_bankroll} onChange={(e) => setForm({ ...form, starting_bankroll: e.target.value })} /></div>
        <div><Label>Tipo</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="default">Default</option><option value="bonus">Bonus</option></Select>
        </div>
      </div>
      <div className="mt-6 flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={save} disabled={saving} data-testid="save-edit-str">Salva</Button>
      </div>
    </Modal>
  );
}
