import type { Filters } from "../types";

const ZONES = ["", "manhattan", "brooklyn", "jfk", "lga", "ewr", "other"];

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  autoRefresh: boolean;
  onToggleRefresh: () => void;
  lastUpdated: Date | null;
}

export function FilterPanel({ filters, onChange, autoRefresh, onToggleRefresh, lastUpdated }: Props) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <section className="filterbar">
      <div className="fb-row">
        <div className="filter">
          <label>Period</label>
          <div className="filter-inputs">
            <input
              type="date"
              value={filters.startDate}
              min="2009-01-01"
              max="2015-06-30"
              onChange={(e) => set("startDate", e.target.value)}
            />
            <span className="dash">→</span>
            <input
              type="date"
              value={filters.endDate}
              min="2009-01-01"
              max="2015-06-30"
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="filter">
          <label>Pickup Zone</label>
          <select value={filters.zone} onChange={(e) => set("zone", e.target.value)}>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z ? z.toUpperCase() : "All zones"}
              </option>
            ))}
          </select>
        </div>

        <div className="btn-actions">
          <button
            className={`btn btn-ghost ${autoRefresh ? "active" : ""}`}
            onClick={onToggleRefresh}
          >
            {autoRefresh ? "▶ LIVE · 5s" : "○ AUTO-REFRESH"}
          </button>
        </div>
      </div>

      <div className="fb-foot">
        <span>📍</span>
        <span>
          Filtros ativos:
          <span className="mono" style={{ marginLeft: 6, color: "var(--taxi-yellow)" }}>
            {[
              filters.startDate && "period",
              filters.zone && `zone=${filters.zone}`,
            ]
              .filter(Boolean)
              .join(" · ") || "nenhum"}
          </span>
        </span>
        {lastUpdated && (
          <span className="last-upd">
            atualizado {lastUpdated.toLocaleTimeString("pt-BR")}
          </span>
        )}
      </div>
    </section>
  );
}
