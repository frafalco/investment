import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api, WS_URL } from "../lib/api";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, token } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [bets, setBets] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [wsOnline, setWsOnline] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [s, b, bo] = await Promise.all([
      api.get("/strategies"),
      api.get("/bets"),
      api.get("/bonuses"),
    ]);
    setStrategies(s.data);
    setBets(b.data);
    setBonuses(bo.data);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (user && user.id) refresh();
    else {
      setStrategies([]); setBets([]); setBonuses([]); setLoaded(false);
    }
  }, [user, refresh]);

  // WebSocket for multi-device sync
  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        wsRef.current = ws;
        ws.onopen = () => setWsOnline(true);
        ws.onclose = () => {
          setWsOnline(false);
          if (!cancelled) {
            clearTimeout(reconnectRef.current);
            reconnectRef.current = setTimeout(connect, 2500);
          }
        };
        ws.onerror = () => { try { ws.close(); } catch {} };
        ws.onmessage = (e) => {
          try {
            const { entity, action, data } = JSON.parse(e.data);
            if (entity === "strategy") {
              setStrategies((prev) => {
                if (action === "delete") return prev.filter((x) => x.id !== data.id);
                const exists = prev.find((x) => x.id === data.id);
                if (exists) return prev.map((x) => (x.id === data.id ? data : x));
                return [data, ...prev];
              });
            } else if (entity === "bet") {
              setBets((prev) => {
                if (action === "delete") return prev.filter((x) => x.id !== data.id);
                const exists = prev.find((x) => x.id === data.id);
                if (exists) return prev.map((x) => (x.id === data.id ? data : x));
                return [data, ...prev];
              });
            } else if (entity === "bonus") {
              setBonuses((prev) => {
                if (action === "delete") return prev.filter((x) => x.id !== data.id);
                const exists = prev.find((x) => x.id === data.id);
                if (exists) return prev.map((x) => (x.id === data.id ? data : x));
                return [data, ...prev];
              });
            }
          } catch {}
        };
      } catch {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };
    connect();

    // keepalive ping
    const ping = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === 1) {
        try { wsRef.current.send("ping"); } catch {}
      }
    }, 25000);

    return () => {
      cancelled = true;
      clearTimeout(reconnectRef.current);
      clearInterval(ping);
      try { wsRef.current && wsRef.current.close(); } catch {}
    };
  }, [user, token]);

  // CRUD helpers
  const createStrategy = async (payload) => (await api.post("/strategies", payload)).data;
  const updateStrategy = async (id, payload) => (await api.put(`/strategies/${id}`, payload)).data;
  const deleteStrategy = async (id) => (await api.delete(`/strategies/${id}`)).data;
  const createBet = async (payload) => (await api.post("/bets", payload)).data;
  const updateBet = async (id, payload) => (await api.put(`/bets/${id}`, payload)).data;
  const deleteBet = async (id) => (await api.delete(`/bets/${id}`)).data;
  const createBonus = async (payload) => (await api.post("/bonuses", payload)).data;
  const deleteBonus = async (id) => (await api.delete(`/bonuses/${id}`)).data;

  return (
    <DataContext.Provider
      value={{
        strategies, bets, bonuses, loaded, wsOnline,
        refresh,
        createStrategy, updateStrategy, deleteStrategy,
        createBet, updateBet, deleteBet,
        createBonus, deleteBonus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
