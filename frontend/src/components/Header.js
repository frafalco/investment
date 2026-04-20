import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { House, ChartLine, Plus, User, SignOut, Lightning, List, X } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Button } from "./ui";

export function Header() {
  const { user, logout } = useAuth();
  const { wsOnline } = useData();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkCls = ({ isActive }) =>
    `font-heading text-sm font-medium tracking-tight px-3 py-2 rounded transition-colors ${
      isActive ? "text-white bg-white/10" : "text-soft hover:text-white hover:bg-white/5"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 h-16 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shadow-glow">
            <Lightning size={18} weight="fill" className="text-white" />
          </div>
          <div className="leading-none">
            <div className="font-heading font-black text-white tracking-tight">BETS<span className="text-primary">TRACKER</span></div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted mt-0.5">Performance Pro</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          <NavLink to="/" end className={linkCls} data-testid="nav-home"><House size={16} className="inline mr-1.5" />Home</NavLink>
          <NavLink to="/strategies" className={linkCls} data-testid="nav-strategies"><ChartLine size={16} className="inline mr-1.5" />Strategie</NavLink>
          <NavLink to="/add-bet" className={linkCls} data-testid="nav-add-bet"><Plus size={16} className="inline mr-1.5" />Nuova Bet</NavLink>
          <NavLink to="/profile" className={linkCls} data-testid="nav-profile"><User size={16} className="inline mr-1.5" />Profilo</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2" data-testid="ws-indicator">
            <motion.div
              className={`h-2 w-2 rounded-full ${wsOnline ? "bg-success" : "bg-muted"}`}
              animate={wsOnline ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : { scale: 1 }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span className="text-[11px] uppercase tracking-wider text-muted font-heading">
              {wsOnline ? "Live Sync" : "Offline"}
            </span>
          </div>
          {user && (
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <div className="text-sm text-white font-medium">{user.username}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">{user.email}</div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => { logout(); nav("/login"); }} data-testid="logout-btn">
            <SignOut size={14} /> <span className="hidden sm:inline">Esci</span>
          </Button>
          <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
            {mobileOpen ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface p-3 flex flex-col gap-1" data-testid="mobile-menu">
          <NavLink onClick={() => setMobileOpen(false)} to="/" end className={linkCls}>Home</NavLink>
          <NavLink onClick={() => setMobileOpen(false)} to="/strategies" className={linkCls}>Strategie</NavLink>
          <NavLink onClick={() => setMobileOpen(false)} to="/add-bet" className={linkCls}>Nuova Bet</NavLink>
          <NavLink onClick={() => setMobileOpen(false)} to="/profile" className={linkCls}>Profilo</NavLink>
        </div>
      )}
    </header>
  );
}
