import { useState } from "react";
import { EventsTable } from "./components/EventsTable";
import { FilterPanel } from "./components/FilterPanel";
import { PredictionsView } from "./components/PredictionsView";
import { StatsCharts } from "./components/StatsCharts";
import type { Filters } from "./types";
import "./index.css";

type Tab = "events" | "stats" | "predictions";

const NAV: { id: Tab; icon: string; label: string; k: string }[] = [
  { id: "events",      icon: "🚖", label: "Live Rides",    k: "01" },
  { id: "stats",       icon: "📊", label: "Analytics",     k: "02" },
  { id: "predictions", icon: "🎯", label: "Predictions",   k: "03" },
];

const CRUMB: Record<Tab, string> = {
  events:      "LIVE FEED",
  stats:       "ANALYTICS",
  predictions: "FARE PREDICTOR",
};

const DEFAULT_FILTERS: Filters = {
  startDate: "2014-01-01",
  endDate:   "2014-01-31",
  zone:      "",
};

export default function App() {
  const [tab, setTab]           = useState<Tab>("events");
  const [filters, setFilters]   = useState<Filters>(DEFAULT_FILTERS);
  const [autoRefresh, setAuto]  = useState(false);
  const [lastUpdated, setLastUpd] = useState<Date | null>(null);

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand">
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
            <rect x="0" y="0" width="32" height="32" rx="4" fill="#F7B731"/>
            <text x="16" y="22" textAnchor="middle"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="800" fontSize="18" fill="#0F0F0F">TX</text>
          </svg>
          <div>
            <div className="brand-title">TAXI<br/>INTELLIGENCE</div>
            <div className="brand-sub">NYC · FARE PREDICTOR</div>
          </div>
        </div>

        <div className="checker" />

        <nav className="nav">
          {NAV.map((n) => (
            <div
              key={n.id}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <span className="ico">{n.icon}</span>
              <span className="nlabel">{n.label}</span>
              <span className="num">{n.k}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="meter-dot" />
          <div>
            <div className="foot-title">METER ONLINE</div>
            <div className="foot-sub">PIPELINE · ACTIVE</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="crumb">
            <span className="crumb-id">FLEET · DISPATCH</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-cur">{CRUMB[tab]}</span>
          </div>
          <div className="topbar-meta">
            <div className="meta-block">
              <div className="meta-label">DATASET</div>
              <div className="meta-val">2009 — 2015</div>
            </div>
            <div className="meta-block">
              <div className="meta-label">ROWS</div>
              <div className="meta-val mono">55,423,856</div>
            </div>
            {lastUpdated && (
              <div className="meta-block">
                <div className="meta-label">LAST UPDATE</div>
                <div className="meta-val mono">{lastUpdated.toLocaleTimeString("pt-BR")}</div>
              </div>
            )}
            <div className="status-pill">
              <span className="dot" /> LIVE
            </div>
          </div>
        </header>

        {/* Filter bar — only on events tab */}
        {tab === "events" && (
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            autoRefresh={autoRefresh}
            onToggleRefresh={() => setAuto((v) => !v)}
            lastUpdated={lastUpdated}
          />
        )}

        {/* Screen content */}
        <div className="screens">
          {tab === "events" && (
            <EventsTable
              filters={filters}
              autoRefresh={autoRefresh}
              onUpdated={setLastUpd}
            />
          )}
          {tab === "stats"       && <StatsCharts />}
          {tab === "predictions" && <PredictionsView />}
        </div>

        {/* Botbar */}
        <footer className="botbar">
          <span className="mono">v0.1.0</span>
          <span>·</span>
          <span>NYC TLC · 2009–2015</span>
          <span>·</span>
          <span className="mono">Redpanda → MinIO → DuckDB</span>
          <span className="botbar-right mono" id="clock" suppressHydrationWarning>
            {new Date().toLocaleTimeString("pt-BR")} · NYC
          </span>
        </footer>
      </main>
    </div>
  );
}
