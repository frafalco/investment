import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Header } from "./components/Header";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Strategies from "./pages/Strategies";
import StrategyDetail from "./pages/StrategyDetail";
import AddBet from "./pages/AddBet";
import Profile from "./pages/Profile";

function Protected({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted font-body">
        <div className="animate-pulse">Caricamento…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-bg text-white">
      <Header />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Shell><Home /></Shell></Protected>} />
      <Route path="/strategies" element={<Protected><Shell><Strategies /></Shell></Protected>} />
      <Route path="/strategy/:id" element={<Protected><Shell><StrategyDetail /></Shell></Protected>} />
      <Route path="/add-bet" element={<Protected><Shell><AddBet /></Shell></Protected>} />
      <Route path="/profile" element={<Protected><Shell><Profile /></Shell></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
