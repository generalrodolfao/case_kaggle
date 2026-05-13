import { useCallback } from "react";
import { fetchEvents } from "../api";
import { usePolling } from "../hooks/usePolling";
import type { Filters, RideEvent } from "../types";

interface Props {
  filters: Filters;
  autoRefresh: boolean;
  onUpdated: (d: Date) => void;
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function EventsTable({ filters, autoRefresh, onUpdated }: Props) {
  const fetcher = useCallback(() => fetchEvents(filters), [filters]);
  const { data, loading, error, lastUpdated } = usePolling<RideEvent[]>(fetcher, 5_000, autoRefresh);

  if (lastUpdated) onUpdated(lastUpdated);

  return (
    <div>
      <div className="screen-intro">
        <div className="screen-title">Live <em>rides</em></div>
        <div className="screen-sub">SILVER LAYER · REAL-TIME FEED · FILTERED</div>
      </div>

      {error && <div className="state-error">⚠ {error}</div>}

      {!data && loading && (
        <div className="state-loading">LOADING FEED…</div>
      )}

      {data && data.length === 0 && (
        <div className="state-empty">No rides for the selected filters.</div>
      )}

      {data && data.length > 0 && (
        <div className="table-wrapper">
          {loading && <div className="loading-bar" />}
          <table>
            <thead>
              <tr>
                <th>Pickup datetime</th>
                <th>Zone</th>
                <th>Hour</th>
                <th>Day</th>
                <th>Pax</th>
                <th className="col-num">Distance (km)</th>
                <th className="col-num">Fare (US$)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.key}>
                  <td className="mono">{new Date(r.pickup_datetime).toLocaleString("pt-BR")}</td>
                  <td>
                    <span className={`zone-badge zone-${r.pickup_zone}`}>
                      {r.pickup_zone}
                    </span>
                  </td>
                  <td className="mono">{String(r.pickup_hour).padStart(2, "0")}h</td>
                  <td className="mono">{DOW[r.pickup_dow] ?? r.pickup_dow}</td>
                  <td className="mono">{r.passenger_count}</td>
                  <td className="col-num mono">{r.trip_distance_km.toFixed(2)}</td>
                  <td className="col-num fare-val">${r.fare_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
