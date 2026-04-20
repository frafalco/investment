import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Card } from "../components/ui";
import { Lightning, Eye, EyeSlash } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (user && user.id) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, username || null);
      }
      toast.success("Benvenuto!");
      nav("/");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Errore. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-bg border-r border-border overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(600px circle at 20% 30%, rgba(0,122,255,0.25), transparent 70%), radial-gradient(500px circle at 80% 70%, rgba(0,255,136,0.15), transparent 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-primary flex items-center justify-center shadow-glow">
              <Lightning size={22} weight="fill" className="text-white" />
            </div>
            <div>
              <div className="font-heading font-black text-xl text-white tracking-tight">BETS<span className="text-primary">TRACKER</span></div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted mt-0.5">Performance Pro</div>
            </div>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-heading text-4xl xl:text-5xl font-black tracking-tight text-white max-w-lg leading-[1.05]"
            >
              Traccia ogni<br />
              <span className="text-primary">giocata</span>, misura<br />
              ogni <span className="text-success">strategia</span>.
            </motion.h1>
            <p className="mt-6 text-soft max-w-md font-body">
              Un cruscotto in tempo reale per monitorare bankroll, ROI, drawdown e sincronizzato su tutti i tuoi dispositivi.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: "2.758", v: "Bet storicizzate" },
                { k: "44", v: "Strategie" },
                { k: "Live", v: "Multi-device sync" },
              ].map((s) => (
                <div key={s.v} className="border-l border-border pl-3">
                  <div className="font-heading text-2xl font-bold number">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-muted mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-muted text-xs font-body">© {new Date().getFullYear()} BetsTracker — data-driven betting analytics.</div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.3em] text-muted font-heading font-semibold">{mode === "login" ? "ACCESSO" : "REGISTRAZIONE"}</div>
            <h2 className="mt-2 font-heading text-3xl font-bold text-white">
              {mode === "login" ? "Bentornato." : "Crea il tuo account"}
            </h2>
            <p className="mt-2 text-soft font-body text-sm">
              {mode === "login" ? "Inserisci le credenziali per accedere al cruscotto." : "Pochi secondi e sei pronto a tracciare."}
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={onSubmit} className="space-y-5">
              {mode === "register" && (
                <div>
                  <Label>Username (opzionale)</Label>
                  <Input data-testid="register-username-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="es. Levi" />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" required data-testid="login-email-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@dominio.it" />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={4}
                    data-testid="login-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                    {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" disabled={loading} className="w-full" data-testid="login-submit-btn">
                {loading ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}
              </Button>
            </form>
            <div className="mt-6 pt-5 border-t border-border text-center text-sm text-soft font-body">
              {mode === "login" ? (
                <>Non hai un account?{" "}
                  <button onClick={() => setMode("register")} className="text-primary hover:underline font-semibold" data-testid="switch-register">
                    Registrati
                  </button>
                </>
              ) : (
                <>Hai già un account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-semibold" data-testid="switch-login">
                    Accedi
                  </button>
                </>
              )}
            </div>
          </Card>
          <p className="mt-4 text-center text-[11px] text-muted font-body">
            Dati migrati da Supabase: la password temporanea è la tua email.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
