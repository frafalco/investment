import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { Card, Button, Input, Label } from "../components/ui";
import { User, LockKey, Database, DownloadSimple } from "@phosphor-icons/react";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, setUser } = useAuth();
  const { strategies, bets, bonuses } = useData();
  const [username, setUsername] = useState(user?.username || "");
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const updateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.patch("/auth/profile", { username });
      setUser(data);
      toast.success("Profilo aggiornato");
    } catch {
      toast.error("Errore aggiornamento");
    } finally { setSavingProfile(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (newPw !== newPw2) return toast.error("Le password non coincidono");
    if (newPw.length < 4) return toast.error("Minimo 4 caratteri");
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: newPw });
      toast.success("Password aggiornata");
      setCurrent(""); setNewPw(""); setNewPw2("");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Errore");
    } finally { setSavingPw(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted font-heading font-semibold">Account</div>
        <h1 className="font-heading text-3xl md:text-4xl font-black text-white tracking-tight mt-1">Profilo</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-primary" />
            <h2 className="font-heading text-lg font-bold">Informazioni account</h2>
          </div>
          <form onSubmit={updateProfile} className="space-y-3">
            <div><Label>Email</Label><Input disabled value={user?.email || ""} /></div>
            <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} data-testid="profile-username" /></div>
            <Button type="submit" disabled={savingProfile} data-testid="save-profile">{savingProfile ? "Salvataggio…" : "Aggiorna"}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <LockKey size={18} className="text-primary" />
            <h2 className="font-heading text-lg font-bold">Cambia password</h2>
          </div>
          <form onSubmit={changePw} className="space-y-3">
            <div><Label>Password attuale</Label><Input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} data-testid="cur-pw" /></div>
            <div><Label>Nuova password</Label><Input type="password" required value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="new-pw" /></div>
            <div><Label>Conferma nuova password</Label><Input type="password" required value={newPw2} onChange={(e) => setNewPw2(e.target.value)} data-testid="new-pw-2" /></div>
            <Button type="submit" disabled={savingPw} data-testid="save-pw">{savingPw ? "Aggiornamento…" : "Cambia password"}</Button>
          </form>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-primary" />
          <h2 className="font-heading text-lg font-bold">Dati</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Strategie" value={strategies.length} />
          <Stat label="Bet" value={bets.length} />
          <Stat label="Bonus" value={bonuses.length} />
        </div>
        <div className="mt-5 pt-5 border-t border-border flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            data-testid="export-json-btn"
            onClick={async () => {
              try {
                const { data } = await api.get("/export");
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `betstracker-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Export scaricato");
              } catch {
                toast.error("Errore export");
              }
            }}
          ><DownloadSimple size={14} /> Esporta JSON</Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="export-csv-btn"
            onClick={() => {
              const rows = [["date","strategy","event","bookmaker","odds","unit","bet","result","profit"]];
              const sMap = new Map(strategies.map(s => [s.id, s.name]));
              bets.forEach(b => rows.push([
                b.date || "", sMap.get(b.strategy_id) || "", (b.event || "").replaceAll('"', '""'),
                b.bookmaker || "", b.odds, b.unit, b.bet, b.result, b.profit,
              ]));
              const csv = rows.map(r => r.map(c => `"${String(c)}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `betstracker-bets-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Bet CSV scaricate");
            }}
          ><DownloadSimple size={14} /> Esporta Bet CSV</Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-bg border border-border rounded p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-heading font-semibold">{label}</div>
      <div className="font-heading text-2xl font-bold number mt-1">{value}</div>
    </div>
  );
}
