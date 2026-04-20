import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { Card, Button, Input, Label, Select, Badge } from "../components/ui";
import { computeKpis, fmtMoney, fmtPct } from "../lib/utils";
import { Plus, Archive, Trash, PencilSimple, XCircle } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Strategies() {
  const { strategies, bets, bonuses, createStrategy, updateStrategy, deleteStrategy } = useData();
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const list = strategies.filter((s) => (showArchived ? true : !s.archived));

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Portfolio</div>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mt-1">Strategie</h1>
        </div>
        <div className="flex gap-2">
          <Button variant={showArchived ? "primary" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)} data-testid="toggle-archived-str">
            <Archive size={14} /> {showArchived ? "Nascondi archiviate" : "Mostra archiviate"}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} data-testid="create-strategy-btn"><Plus size={14} /> Nuova Strategia</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted font-heading">
                <th className="text-left px-5 py-3 font-semibold">Nome</th>
                <th className="text-left px-5 py-3 font-semibold">Tipo</th>
                <th className="text-right px-5 py-3 font-semibold">Bankroll</th>
                <th className="text-right px-5 py-3 font-semibold">Bet</th>
                <th className="text-right px-5 py-3 font-semibold">P&L</th>
                <th className="text-right px-5 py-3 font-semibold">ROI</th>
                <th className="text-right px-5 py-3 font-semibold">Yield</th>
                <th className="text-right px-5 py-3 font-semibold w-32">Stato</th>
                <th className="text-right px-5 py-3 font-semibold w-32">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-muted font-body">Nessuna strategia.</td></tr>}
              {list.map((s, i) => {
                const k = computeKpis(s, bets.filter((b) => b.strategy_id === s.id), bonuses.filter((b) => b.strategy_id === s.id));
                return (
                  <tr key={s.id} className={`border-t border-border ${i % 2 === 0 ? "bg-bg/40" : ""} hover:bg-white/5`} data-testid={`str-row-${s.id}`}>
                    <td className="px-5 py-3">
                      <Link to={`/strategy/${s.id}`} className="font-heading font-semibold text-white hover:text-primary">{s.name}</Link>
                    </td>
                    <td className="px-5 py-3"><Badge variant={s.type === "bonus" ? "warning" : "default"}>{s.type}</Badge></td>
                    <td className="px-5 py-3 text-right number">€{s.starting_bankroll?.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right number text-soft">{k.totalBets}</td>
                    <td className="px-5 py-3 text-right number font-semibold" style={{ color: k.totalProfit >= 0 ? "#00FF88" : "#FF3B30" }}>{fmtMoney(k.totalProfit)}</td>
                    <td className="px-5 py-3 text-right number" style={{ color: k.roi >= 0 ? "#00FF88" : "#FF3B30" }}>{fmtPct(k.roi)}</td>
                    <td className="px-5 py-3 text-right number" style={{ color: k.yieldPct >= 0 ? "#00FF88" : "#FF3B30" }}>{fmtPct(k.yieldPct)}</td>
                    <td className="px-5 py-3 text-right">{s.archived ? <Badge>Archiviata</Badge> : <Badge variant="success">Attiva</Badge>}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        className="text-muted hover:text-white mr-2"
                        onClick={() => updateStrategy(s.id, { ...s, archived: !s.archived }).then(() => toast.success(s.archived ? "Riattivata" : "Archiviata"))}
                        title={s.archived ? "Ripristina" : "Archivia"}
                        data-testid={`toggle-arch-${s.id}`}
                      ><Archive size={14} /></button>
                      <button
                        className="text-muted hover:text-danger"
                        onClick={() => { if (window.confirm(`Eliminare "${s.name}" e tutte le sue bet?`)) deleteStrategy(s.id).then(() => toast.success("Eliminata")); }}
                        title="Elimina"
                        data-testid={`del-str-${s.id}`}
                      ><Trash size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showCreate && <CreateStrategyModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function CreateStrategyModal({ onClose }) {
  const { createStrategy } = useData();
  const [form, setForm] = useState({ name: "", starting_bankroll: "", type: "default" });
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createStrategy({ name: form.name, starting_bankroll: parseFloat(form.starting_bankroll) || 0, type: form.type, archived: false });
      toast.success("Strategia creata");
      onClose();
    } catch { toast.error("Errore"); } finally { setSaving(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.form
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
        onSubmit={save} onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded w-full max-w-md p-6 shadow-glow">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-xl font-bold text-white">Nuova Strategia</h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-white"><XCircle size={20} /></button>
        </div>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="es. Dark Horse 2026" data-testid="create-str-name" /></div>
          <div><Label>Bankroll iniziale (€)</Label><Input required type="number" step="0.01" value={form.starting_bankroll} onChange={(e) => setForm({ ...form, starting_bankroll: e.target.value })} data-testid="create-str-bankroll" /></div>
          <div><Label>Tipo</Label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} data-testid="create-str-type">
              <option value="default">Default — traccia bet</option>
              <option value="bonus">Bonus — traccia bonus</option>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" disabled={saving} data-testid="save-create-str">{saving ? "Creazione…" : "Crea"}</Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
