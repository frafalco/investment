import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { Card, Button, Input, Label, Select } from "../components/ui";
import { fmtMoney } from "../lib/utils";
import { ArrowLeft, Calculator } from "@phosphor-icons/react";
import toast from "react-hot-toast";

export default function AddBet() {
  const { strategies, createBet } = useData();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const preselect = params.get("strategy");

  const activeStrategies = useMemo(
    () => strategies.filter((s) => !s.archived && s.type !== "bonus"),
    [strategies]
  );

  const [form, setForm] = useState({
    strategy_id: preselect || "",
    date: new Date().toISOString().slice(0, 16),
    event: "",
    bookmaker: "",
    odds: "",
    unit: "",
    bet: "",
    result: "pending",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedStrategy = strategies.find((s) => s.id === form.strategy_id);
  const bankroll = selectedStrategy?.starting_bankroll || 0;

  useEffect(() => {
    if (form.unit !== "" && bankroll > 0) {
      const bet = (bankroll * parseFloat(form.unit) * 0.01).toFixed(2);
      setForm((f) => ({ ...f, bet }));
    }
  }, [form.unit, bankroll]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.strategy_id) return toast.error("Seleziona una strategia");
    setSaving(true);
    try {
      await createBet({
        ...form,
        odds: parseFloat(form.odds),
        unit: parseFloat(form.unit),
        bet: parseFloat(form.bet),
      });
      toast.success("Bet aggiunta");
      nav(`/strategy/${form.strategy_id}`);
    } catch (err) {
      toast.error("Errore. Controlla i campi.");
    } finally {
      setSaving(false);
    }
  };

  const potentialWin = parseFloat(form.bet || 0) * (parseFloat(form.odds || 0) - 1);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white font-body mb-4"><ArrowLeft size={14} /> Home</Link>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Tracking</div>
        <h1 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mt-1">Nuova Bet</h1>
        <p className="text-soft mt-1 font-body text-sm">Inserisci i dettagli della scommessa. Il profitto si calcola in automatico.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Strategia</Label>
            <Select required value={form.strategy_id} onChange={(e) => setForm({ ...form, strategy_id: e.target.value })} data-testid="select-strategy">
              <option value="">— Seleziona —</option>
              {activeStrategies.map((s) => (<option key={s.id} value={s.id}>{s.name} (€{s.starting_bankroll})</option>))}
            </Select>
          </div>

          <div>
            <Label>Evento</Label>
            <Input required value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} placeholder="es. Inter - Juventus 1X" data-testid="input-event" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data e ora</Label>
              <Input required type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-date" />
            </div>
            <div>
              <Label>Bookmaker (opzionale)</Label>
              <Input value={form.bookmaker} onChange={(e) => setForm({ ...form, bookmaker: e.target.value })} placeholder="es. Bet365" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Quota</Label>
              <Input required type="number" step="0.01" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} placeholder="1.80" data-testid="input-odds" />
            </div>
            <div>
              <Label>Unit (%)</Label>
              <Input required type="number" step="0.01" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="3" data-testid="input-unit" />
            </div>
            <div>
              <Label>Puntata €</Label>
              <Input required type="number" step="0.01" value={form.bet} onChange={(e) => setForm({ ...form, bet: e.target.value })} placeholder="90" data-testid="input-bet" />
            </div>
          </div>

          <div>
            <Label>Risultato</Label>
            <Select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} data-testid="input-result">
              <option value="pending">Pending</option>
              <option value="won">Vinta</option>
              <option value="lost">Persa</option>
              <option value="void">Void</option>
            </Select>
          </div>

          {form.bet && form.odds && (
            <div className="flex items-center gap-3 bg-bg border border-border rounded p-4 text-sm">
              <Calculator size={18} className="text-primary" />
              <div className="font-body">
                <span className="text-muted">Vincita potenziale: </span>
                <span className="number text-success font-semibold">{fmtMoney(potentialWin)}</span>
                <span className="text-muted mx-2">•</span>
                <span className="text-muted">Incasso: </span>
                <span className="number text-white font-semibold">{fmtMoney(potentialWin + parseFloat(form.bet || 0))}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => nav(-1)}>Annulla</Button>
            <Button type="submit" disabled={saving} data-testid="submit-bet">{saving ? "Salvataggio…" : "Salva Bet"}</Button>
          </div>
        </form>
      </Card>

      {activeStrategies.length === 0 && (
        <Card className="mt-4 p-5 text-center">
          <div className="text-soft font-body text-sm">Non hai strategie attive. <Link to="/strategies" className="text-primary hover:underline">Creane una</Link> per iniziare.</div>
        </Card>
      )}
    </div>
  );
}
