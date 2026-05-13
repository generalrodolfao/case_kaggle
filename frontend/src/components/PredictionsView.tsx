import { useCallback, useState } from "react";
import { fetchPredictions } from "../api";
import { usePolling } from "../hooks/usePolling";
import type { Prediction } from "../types";

const ZONES = ["", "manhattan", "brooklyn", "jfk", "lga", "ewr", "other"];

export function PredictionsView() {
  const [zone, setZone] = useState("");
  const fetcher = useCallback(() => fetchPredictions(zone), [zone]);
  const { data, loading, error } = usePolling<Prediction[]>(fetcher, 30_000, false);

  const rmse = data?.length
    ? Math.sqrt(data.reduce((s, p) => s + p.abs_error ** 2, 0) / data.length)
    : null;

  return (
    <div>
      <div className="screen-intro">
        <div className="screen-title">Fare <em>predictor</em></div>
        <div className="screen-sub">XGBOOST · SILVER → GOLD/PREDICTIONS · HOLD-OUT 20%</div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Filter predictions</div>
            <div className="card-sub">ORDERED BY HIGHEST ABSOLUTE ERROR</div>
          </div>
          {rmse !== null && (
            <div className="card-tag">
              RMSE <span className="accent">${rmse.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div className="filter">
            <label>Pickup Zone</label>
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z ? z.toUpperCase() : "All zones"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="state-error">⚠ {error}</div>}
      {!data && loading && <div className="state-loading">LOADING PREDICTIONS…</div>}
      {data && data.length === 0 && (
        <div className="state-empty">
          No predictions found. Run the <span className="accent mono">prediction_pipeline</span> DAG first.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="table-wrapper">
          {loading && <div className="loading-bar" />}
          <table>
            <thead>
              <tr>
                <th className="col-num">Distance (km)</th>
                <th>Hour</th>
                <th>Day</th>
                <th>Pax</th>
                <th className="col-num">Actual (US$)</th>
                <th className="col-num">Predicted (US$)</th>
                <th className="col-num">Abs error (US$)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i} className={p.abs_error > 10 ? "row-warn" : ""}>
                  <td className="col-num mono">{p.trip_distance_km.toFixed(2)}</td>
                  <td className="mono">{String(p.pickup_hour).padStart(2, "0")}h</td>
                  <td className="mono">{p.pickup_dow}</td>
                  <td className="mono">{p.passenger_count}</td>
                  <td className="col-num fare-val">${p.fare_amount_actual.toFixed(2)}</td>
                  <td className="col-num mono" style={{ color: "var(--taxi-blue)" }}>
                    ${p.fare_amount_predicted.toFixed(2)}
                  </td>
                  <td
                    className="col-num mono"
                    style={{
                      color: p.abs_error > 10
                        ? "var(--taxi-red-meter)"
                        : "var(--taxi-green-meter)",
                      fontWeight: 700,
                    }}
                  >
                    ${p.abs_error.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
