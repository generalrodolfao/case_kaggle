import type { Filters, HourStat, Prediction, RideEvent, ZoneStat } from "./types";

const BASE = "/api";

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function fetchEvents(filters: Filters, limit = 100, offset = 0): Promise<RideEvent[]> {
  const r = await fetch(
    `${BASE}/events${qs({ start_date: filters.startDate, end_date: filters.endDate, zone: filters.zone, limit, offset })}`
  );
  if (!r.ok) throw new Error(`events: ${r.status}`);
  return r.json();
}

export async function fetchStatsByZone(): Promise<ZoneStat[]> {
  const r = await fetch(`${BASE}/stats/by_zone`);
  if (!r.ok) throw new Error(`stats/by_zone: ${r.status}`);
  return r.json();
}

export async function fetchStatsByHour(): Promise<HourStat[]> {
  const r = await fetch(`${BASE}/stats/by_hour`);
  if (!r.ok) throw new Error(`stats/by_hour: ${r.status}`);
  return r.json();
}

export async function fetchPredictions(zone: string, limit = 100, offset = 0): Promise<Prediction[]> {
  const r = await fetch(
    `${BASE}/predictions${qs({ zone: zone || undefined, limit, offset })}`
  );
  if (!r.ok) throw new Error(`predictions: ${r.status}`);
  return r.json();
}
