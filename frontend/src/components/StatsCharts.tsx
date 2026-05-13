import { useCallback } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart,
} from "recharts";
import { fetchStatsByHour, fetchStatsByZone } from "../api";
import { usePolling } from "../hooks/usePolling";
import type { HourStat, ZoneStat } from "../types";

const Y = "#F7B731";
const R = "#FF1744";
const GREY = "#2A2A2A";
const TICK = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 };

const TOOLTIP_STYLE = {
  background: "#000",
  border: "1px solid #F7B731",
  borderRadius: 4,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "#F5F5F5",
};

export function StatsCharts() {
  const zFetcher = useCallback(fetchStatsByZone, []);
  const hFetcher = useCallback(fetchStatsByHour, []);

  const { data: zones, error: zErr, loading: zLoad } = usePolling<ZoneStat[]>(zFetcher, 60_000, false);
  const { data: hours, error: hErr, loading: hLoad } = usePolling<HourStat[]>(hFetcher, 60_000, false);

  return (
    <div>
      <div className="screen-intro">
        <div className="screen-title">Fleet <em>analytics</em></div>
        <div className="screen-sub">GOLD LAYER · AGGREGATED FROM SILVER · BATCH</div>
      </div>

      <div className="grid g-2">
        {/* Zone revenue */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Revenue by pickup zone</div>
              <div className="card-sub">TOTAL US$ · GOLD LAYER</div>
            </div>
          </div>
          {zErr && <div className="state-error">{zErr}</div>}
          {!zones && zLoad && <div className="state-loading">LOADING…</div>}
          {zones && (
            <div className="chart-wrap h-280">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones} margin={{ top: 8, right: 8, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                  <XAxis dataKey="pickup_zone" tick={TICK} />
                  <YAxis tick={TICK} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, "Revenue"]}
                  />
                  <Bar dataKey="total_revenue" name="Revenue" fill={Y} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Zone avg fare */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Avg fare by zone</div>
              <div className="card-sub">US$ · MEAN PER RIDE</div>
            </div>
          </div>
          {zones && (
            <div className="chart-wrap h-280">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones} margin={{ top: 8, right: 8, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                  <XAxis dataKey="pickup_zone" tick={TICK} />
                  <YAxis tick={TICK} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Avg fare"]}
                  />
                  <Bar dataKey="avg_fare" name="Avg fare" fill="#00C853" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Hour of day */}
      <div className="card row-gap">
        <div className="card-head">
          <div>
            <div className="card-title">Hour × day demand</div>
            <div className="card-sub">RIDES (BARS) + AVG FARE (LINE) · DUAL AXIS</div>
          </div>
        </div>
        {hErr && <div className="state-error">{hErr}</div>}
        {!hours && hLoad && <div className="state-loading">LOADING…</div>}
        {hours && (
          <div className="chart-wrap h-280">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hours} margin={{ top: 8, right: 40, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                <XAxis dataKey="pickup_hour" tick={TICK} tickFormatter={(v) => `${v}h`} />
                <YAxis yAxisId="left"  tick={TICK} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ ...TICK, fill: R }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, name: string) =>
                    name === "Rides" ? [v.toLocaleString(), name] : [`$${v.toFixed(2)}`, name]
                  }
                />
                <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
                <Bar yAxisId="left"  dataKey="total_rides" name="Rides"    fill={Y}  opacity={0.7} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" dataKey="avg_fare"   name="Avg fare" stroke={R} dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Zone table */}
      {zones && (
        <div className="card row-gap">
          <div className="card-head">
            <div>
              <div className="card-title">Zone summary</div>
              <div className="card-sub">ALL METRICS · ORDERED BY REVENUE</div>
            </div>
          </div>
          <div className="table-wrapper" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th className="col-num">Rides</th>
                  <th className="col-num">Avg fare</th>
                  <th className="col-num">Revenue</th>
                  <th className="col-num">Avg dist (km)</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => {
                  const maxRev = Math.max(...zones.map((z) => z.total_revenue));
                  return (
                    <tr key={z.pickup_zone}>
                      <td>
                        <span className={`zone-badge zone-${z.pickup_zone}`}>{z.pickup_zone}</span>
                      </td>
                      <td className="col-num mono">{z.total_rides.toLocaleString("en-US")}</td>
                      <td className="col-num fare-val">${z.avg_fare.toFixed(2)}</td>
                      <td className="col-num mono accent">${(z.total_revenue / 1e6).toFixed(2)}M</td>
                      <td className="col-num mono">{z.avg_distance_km.toFixed(2)}</td>
                      <td style={{ minWidth: 100 }}>
                        <div className="minibar">
                          <div className="bar">
                            <i style={{ width: `${(z.total_revenue / maxRev) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
