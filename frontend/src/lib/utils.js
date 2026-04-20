import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...a) => twMerge(clsx(a));

export const fmtMoney = (v, decimals = 2) => {
  if (v == null || isNaN(v)) return "—";
  const n = Number(v);
  const s = n.toFixed(decimals);
  const [i, d] = s.split(".");
  const withSep = Number(i).toLocaleString("en-US");
  return `${n < 0 ? "-" : ""}€${withSep.replace(/^-/, "")}${d ? "." + d : ""}`;
};

export const fmtPct = (v, decimals = 2) => {
  if (v == null || isNaN(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
};

export const parseDate = (s) => {
  if (!s) return null;
  try {
    return new Date(s.replace(" ", "T"));
  } catch {
    return null;
  }
};

export const fmtDate = (s, withTime = false) => {
  const d = parseDate(s);
  if (!d || isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  if (!withTime) return `${dd}/${mm}/${yy}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

// compute KPIs per strategy given bets & bonuses
export const computeKpis = (strategy, bets, bonuses = []) => {
  const sorted = [...bets].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const nonPending = sorted.filter((b) => b.result !== "pending");
  let cumulative = 0;
  let peak = 0;
  let maxDD = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;
  let wins = 0;
  let losses = 0;
  let voids = 0;
  let totalOdds = 0;
  let totalWagered = 0;
  let totalProfit = 0;

  nonPending.forEach((b) => {
    cumulative += Number(b.profit || 0);
    peak = Math.max(peak, cumulative);
    maxDD = Math.min(maxDD, cumulative - peak);
    if (b.result === "won") {
      wins++;
      currentLossStreak = 0;
    } else if (b.result === "lost") {
      losses++;
      currentLossStreak++;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    } else if (b.result === "void") {
      voids++;
    }
    totalOdds += Number(b.odds || 0);
    totalWagered += Number(b.bet || 0);
    totalProfit += Number(b.profit || 0);
  });
  const bonusTotal = bonuses.reduce((s, x) => s + Number(x.amount || 0), 0);
  totalProfit += bonusTotal;

  const wlCount = wins + losses;
  const bankroll = strategy?.starting_bankroll || 0;

  return {
    totalBets: bets.length,
    settledBets: nonPending.length,
    pendingBets: bets.length - nonPending.length,
    wins,
    losses,
    voids,
    winRate: wlCount ? wins / wlCount : 0,
    avgOdds: nonPending.length ? totalOdds / nonPending.length : 0,
    totalWagered,
    totalProfit,
    bonusTotal,
    roi: bankroll ? totalProfit / bankroll : 0,
    yieldPct: totalWagered ? totalProfit / totalWagered : 0,
    maxDrawdown: maxDD,
    maxLossStreak,
    currentBankroll: bankroll + totalProfit,
  };
};

// chart series for a single strategy (cumulative profit)
export const buildSeries = (bets, bonuses = [], view = "cumulative") => {
  const items = [
    ...bets
      .filter((b) => b.result !== "pending")
      .map((b) => ({ date: b.date, delta: Number(b.profit || 0) })),
    ...bonuses.map((b) => ({ date: b.date, delta: Number(b.amount || 0) })),
  ]
    .filter((x) => x.date)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (items.length === 0) return [];
  const bucket = (d) => {
    const dt = parseDate(d);
    if (!dt) return null;
    if (view === "daily") return dt.toISOString().slice(0, 10);
    if (view === "weekly") {
      const day = dt.getDay();
      const diff = (day + 6) % 7;
      const mon = new Date(dt);
      mon.setDate(dt.getDate() - diff);
      return mon.toISOString().slice(0, 10);
    }
    if (view === "monthly") return dt.toISOString().slice(0, 7);
    return dt.toISOString().slice(0, 10); // cumulative uses daily bucket
  };
  const agg = new Map();
  items.forEach((it) => {
    const k = bucket(it.date);
    agg.set(k, (agg.get(k) || 0) + it.delta);
  });
  const keys = Array.from(agg.keys()).sort();
  let cum = 0;
  const out = keys.map((k) => {
    const delta = agg.get(k);
    cum += delta;
    return { date: k, delta, cumulative: cum };
  });
  return out;
};

// aggregate series from multiple strategies for home
export const aggregateSeries = (allData) => {
  // allData: [{bets, bonuses}]
  const all = [];
  allData.forEach(({ bets, bonuses }) => {
    bets
      .filter((b) => b.result !== "pending")
      .forEach((b) => b.date && all.push({ date: b.date.slice(0, 10), delta: Number(b.profit || 0) }));
    bonuses.forEach((b) => b.date && all.push({ date: b.date.slice(0, 10), delta: Number(b.amount || 0) }));
  });
  if (!all.length) return [];
  all.sort((a, b) => a.date.localeCompare(b.date));
  const agg = new Map();
  all.forEach(({ date, delta }) => agg.set(date, (agg.get(date) || 0) + delta));
  const keys = Array.from(agg.keys()).sort();
  let cum = 0;
  return keys.map((k) => {
    cum += agg.get(k);
    return { date: k, cumulative: cum };
  });
};
