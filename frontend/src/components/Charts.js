import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { fmtMoney, fmtDate } from "../lib/utils";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-surface border border-border rounded p-3 shadow-glow font-body">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted mb-1">{fmtDate(label)}</div>
      <div className="number text-base font-semibold" style={{ color: p.cumulative >= 0 ? "#00FF88" : "#FF3B30" }}>
        {fmtMoney(p.cumulative)}
      </div>
      {p.delta != null && (
        <div className="text-xs text-soft mt-1">
          Delta giorno: <span className="number" style={{ color: p.delta >= 0 ? "#00FF88" : "#FF3B30" }}>{fmtMoney(p.delta)}</span>
        </div>
      )}
    </div>
  );
}

export function ProfitChart({ data, height = 380, type = "area", showAxes = true }) {
  const last = data?.length ? data[data.length - 1].cumulative : 0;
  const positive = last >= 0;
  const color = positive ? "#00FF88" : "#FF3B30";

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted text-sm font-body" style={{ height }}>
        Nessun dato disponibile — aggiungi delle bet per vedere il grafico.
      </div>
    );
  }

  const Chart = type === "area" ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
        {showAxes && (
          <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d)} tickLine={false} axisLine={false} minTickGap={30} />
        )}
        {showAxes && (
          <YAxis tickFormatter={(v) => `€${v >= 1000 || v <= -1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`} tickLine={false} axisLine={false} width={60} />
        )}
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#262626" strokeDasharray="3 3" />
        {type === "area" ? (
          <Area type="monotone" dataKey="cumulative" stroke={color} strokeWidth={2} fill="url(#gProfit)" />
        ) : (
          <Line type="monotone" dataKey="cumulative" stroke={color} strokeWidth={2} dot={false} />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, height = 60, positive }) {
  if (!data || data.length === 0) {
    return <div style={{ height }} className="flex items-center text-muted text-xs font-body">Nessun movimento</div>;
  }
  const last = data[data.length - 1].cumulative;
  const isPos = positive != null ? positive : last >= 0;
  const color = isPos ? "#00FF88" : "#FF3B30";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="cumulative" stroke={color} strokeWidth={1.5} fill={`url(#sp-${color})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
