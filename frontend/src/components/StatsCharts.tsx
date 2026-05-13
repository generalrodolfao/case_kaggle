import { useCallback } from "react";
import {
  Bar, BarChart, CartesianGrid, ComposedChart,
  Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  fetchStatsByDow, fetchStatsByHour, fetchStatsByMonth,
  fetchStatsByZone, fetchStatsOverview,
} from "../api";
import { usePolling } from "../hooks/usePolling";
import type { DowStat, HourStat, MonthStat, OverviewStat, ZoneStat } from "../types";

const Y = "#F7B731";
const R = "#FF1744";
const G = "#00C853";
const B = "#2979FF";
const GREY = "#2A2A2A";
const TICK = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 };
const TOOLTIP = {
  background: "#000", border: "1px solid #F7B731", borderRadius: 4,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F5F5F5",
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function usd(v: number) { return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`; }

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card kpi-card">
      <div className="card-sub">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function StatsCharts() {
  const ovFetcher  = useCallback(fetchStatsOverview,  []);
  const moFetcher  = useCallback(fetchStatsByMonth,   []);
  const dowFetcher = useCallback(fetchStatsByDow,     []);
  const zFetcher   = useCallback(fetchStatsByZone,    []);
  const hFetcher   = useCallback(fetchStatsByHour,    []);

  const { data: ov }    = usePolling<OverviewStat>(ovFetcher,  120_000, false);
  const { data: months } = usePolling<MonthStat[]>(moFetcher,  120_000, false);
  const { data: dows }   = usePolling<DowStat[]>(dowFetcher,   120_000, false);
  const { data: zones, error: zErr, loading: zLoad } = usePolling<ZoneStat[]>(zFetcher, 60_000, false);
  const { data: hours, error: hErr, loading: hLoad } = usePolling<HourStat[]>(hFetcher, 60_000, false);

  const monthsWithLabel = months?.map((m) => ({
    ...m,
    label: `${MONTH_NAMES[m.pickup_month - 1]} ${String(m.pickup_year).slice(2)}`,
  }));

  const dowsWithLabel = dows?.map((d) => ({
    ...d,
    label: DOW_LABELS[d.pickup_dow],
  }));

  return (
    <div>
      <div className="screen-intro">
        <div className="screen-title">Fleet <em>analytics</em></div>
        <div className="screen-sub">GOLD LAYER · AGGREGATED FROM SILVER · BATCH</div>
      </div>

      {/* ── KPI Cards ── */}
      {ov && (
        <div className="grid g-4 row-gap">
          <KpiCard label="TOTAL RIDES"   value={ov.total_rides.toLocaleString("en-US")} />
          <KpiCard label="TOTAL REVENUE" value={`$${(ov.total_revenue / 1e6).toFixed(2)}M`} />
          <KpiCard label="AVG FARE"      value={usd(ov.avg_fare)} sub={`median ${usd(ov.median_fare)}`} />
          <KpiCard label="AVG DISTANCE"  value={`${ov.avg_distance_km.toFixed(2)} km`} sub={`${usd(ov.fare_per_km)}/km`} />
          <KpiCard label="AIRPORT TRIPS" value={pct(ov.airport_trips_pct)} />
          <KpiCard label="RUSH HOUR"     value={pct(ov.rush_hour_pct)} />
          <KpiCard label="NIGHT SHIFT"   value={pct(ov.night_shift_pct)} />
          <KpiCard label="WEEKENDS"      value={pct(ov.weekend_pct)} />
        </div>
      )}

      {/* ── Monthly trend ── */}
      {monthsWithLabel && (
        <div className="card row-gap">
          <div className="card-head">
            <div>
              <div className="card-title">Monthly volume & revenue</div>
              <div className="card-sub">2009 – 2015 · RIDES (BARS) + REVENUE (LINE)</div>
            </div>
          </div>
          <div className="chart-wrap h-280">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthsWithLabel} margin={{ top: 8, right: 48, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                <XAxis dataKey="label" tick={{ ...TICK, fontSize: 9 }} interval={5} />
                <YAxis yAxisId="left"  tick={TICK} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ ...TICK, fill: G }}
                       tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP}
                  formatter={(v: number, name: string) =>
                    name === "Rides"
                      ? [v.toLocaleString(), name]
                      : [`$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, name]
                  }
                />
                <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="total_rides"   name="Rides"   fill={Y} opacity={0.75} radius={[2,2,0,0]} />
                <Line yAxisId="right" dataKey="total_revenue" name="Revenue" stroke={G} dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Day of week ── */}
      {dowsWithLabel && (
        <div className="card row-gap">
          <div className="card-head">
            <div>
              <div className="card-title">Demand by day of week</div>
              <div className="card-sub">TOTAL RIDES · AIRPORT + RUSH + NIGHT BREAKDOWN</div>
            </div>
          </div>
          <div className="chart-wrap h-260">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowsWithLabel} margin={{ top: 8, right: 8, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                <XAxis dataKey="label" tick={TICK} />
                <YAxis tick={TICK} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP}
                  formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                />
                <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
                <Bar dataKey="total_rides"    name="Total rides"   fill={Y}  radius={[2,2,0,0]} />
                <Bar dataKey="airport_trips"  name="Airport"       fill={B}  radius={[2,2,0,0]} />
                <Bar dataKey="rush_hour_trips" name="Rush hour"    fill={R}  radius={[2,2,0,0]} />
                <Bar dataKey="night_shift_trips" name="Night shift" fill="#9C27B0" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Hour × demand ── */}
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
          <div className="chart-wrap h-260">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hours} margin={{ top: 8, right: 40, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                <XAxis dataKey="pickup_hour" tick={TICK} tickFormatter={(v) => `${v}h`} />
                <YAxis yAxisId="left"  tick={TICK} tickFormatter={(v) => `${(v / 1e3).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ ...TICK, fill: R }}
                       tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip contentStyle={TOOLTIP}
                  formatter={(v: number, name: string) =>
                    name === "Rides" ? [v.toLocaleString(), name] : [`$${v.toFixed(2)}`, name]
                  }
                />
                <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="total_rides" name="Rides"    fill={Y} opacity={0.7} radius={[2,2,0,0]} />
                <Line yAxisId="right" dataKey="avg_fare"    name="Avg fare" stroke={R} dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Zone charts ── */}
      <div className="grid g-2 row-gap">
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
            <div className="chart-wrap h-260">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones} margin={{ top: 8, right: 8, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                  <XAxis dataKey="pickup_zone" tick={TICK} />
                  <YAxis tick={TICK} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip contentStyle={TOOLTIP}
                    formatter={(v: number) => [`$${v.toLocaleString("en-US")}`, "Revenue"]}
                  />
                  <Bar dataKey="total_revenue" name="Revenue" fill={Y} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Avg fare by zone</div>
              <div className="card-sub">US$ · MEAN PER RIDE</div>
            </div>
          </div>
          {zones && (
            <div className="chart-wrap h-260">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones} margin={{ top: 8, right: 8, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                  <XAxis dataKey="pickup_zone" tick={TICK} />
                  <YAxis tick={TICK} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <Tooltip contentStyle={TOOLTIP}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Avg fare"]}
                  />
                  <Bar dataKey="avg_fare" name="Avg fare" fill={G} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Zone table ── */}
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
                  const maxRev = Math.max(...zones.map((x) => x.total_revenue));
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
