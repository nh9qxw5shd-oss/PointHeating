// The NR Route 7 Day Forecast as DLog2 stores it (weather_forecast_latest_days, one row per
// forecast area and day), and how its areas map onto the MOM areas this system works in. Pure:
// loading is in data.ts.

export type Level = "GREEN" | "AWARE" | "ADVERSE" | "EXTREME";
export const LEVEL_RANK: Record<Level, number> = { GREEN: 0, AWARE: 1, ADVERSE: 2, EXTREME: 3 };

export function asLevel(v: unknown): Level {
  const s = String(v ?? "").toUpperCase();
  return s === "AWARE" || s === "ADVERSE" || s === "EXTREME" ? s : "GREEN";
}

export function maxLevel(...levels: (Level | null | undefined)[]): Level {
  let best: Level = "GREEN";
  for (const l of levels) if (l && LEVEL_RANK[l] > LEVEL_RANK[best]) best = l;
  return best;
}

export const LEVEL_META: Record<Level, { label: string; color: string }> = {
  GREEN: { label: "Normal", color: "var(--good)" },
  AWARE: { label: "Aware", color: "var(--moderate)" },
  ADVERSE: { label: "Adverse", color: "var(--accent-deep)" },
  EXTREME: { label: "Extreme", color: "var(--poor)" },
};

/** One forecast area on one day, as stored by DLog2. Temperatures are air °C. */
export interface ForecastDay {
  area_key: string;
  area_name: string | null;
  day_index: number;
  forecast_date: string; // YYYY-MM-DD
  day_name: string | null;
  overall_level: Level;
  /** Non-green risks only, e.g. { "Wind": "AWARE", "Heavy Rain": "ADVERSE" }. */
  risks: Record<string, Level>;
  min_temp_morning: number | null;
  max_temp: number | null;
  min_temp_night: number | null;
  /** Air temperature stays below freezing all day. */
  ice_day: boolean;
}

export interface ForecastIssue {
  issued_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  summary_24h: string | null;
  summary_2_7: string | null;
  warnings: string[];
}

export interface Forecast {
  issue: ForecastIssue;
  days: ForecastDay[];
  /** Day-0 minima from earlier issues, for runs of cold that started before this issue. */
  history: { area_key: string; forecast_date: string; min: number | null; ice_day: boolean }[];
}

export function parseForecastRow(r: Record<string, unknown>): ForecastDay {
  const risks: Record<string, Level> = {};
  const raw = (r.risks ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(raw)) {
    const l = asLevel(v);
    if (l !== "GREEN") risks[k] = l;
  }
  const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return {
    area_key: String(r.area_key),
    area_name: (r.area_name as string | null) ?? null,
    day_index: Number(r.day_index ?? 0),
    forecast_date: String(r.forecast_date),
    day_name: (r.day_name as string | null) ?? null,
    overall_level: asLevel(r.overall_level),
    risks,
    min_temp_morning: num(r.min_temp_morning),
    max_temp: num(r.max_temp),
    min_temp_night: num(r.min_temp_night),
    ice_day: r.ice_day === true,
  };
}

/** The lowest air temperature forecast for the date (morning or the coming night). */
export function dayMin(d: Pick<ForecastDay, "min_temp_morning" | "min_temp_night">): number | null {
  const v = [d.min_temp_morning, d.min_temp_night].filter((x): x is number => x != null);
  return v.length ? Math.min(...v) : null;
}

// ------------------------------------------------------------------ areas

/** Forecast areas in route order, and the MOM areas each one covers. The MOM areas are those of
 *  the points logbook; the assignment is by geography and is the assumption to check first if a
 *  flag lands on the wrong desk. */
export const FORECAST_AREAS: { key: string; name: string; mom: string[] }[] = [
  { key: "em_north", name: "East Mids North", mom: ["Derby", "Nottingham"] },
  { key: "em_south", name: "East Mids South", mom: ["Leicester", "Kettering"] },
  { key: "lincolnshire", name: "Lincolnshire", mom: ["Lincoln"] },
  { key: "london_luton", name: "London - Luton", mom: ["WH"] },
];

export function forecastAreaFor(momArea: string): string | undefined {
  return FORECAST_AREAS.find((a) => a.mom.includes(momArea))?.key;
}

export function areaName(key: string, days: ForecastDay[] = []): string {
  return FORECAST_AREAS.find((a) => a.key === key)?.name ?? days.find((d) => d.area_key === key)?.area_name ?? key;
}

/** Days grouped by area, each sorted by date; areas in route order, unknown areas after. */
export function byArea(days: ForecastDay[]): { key: string; name: string; days: ForecastDay[] }[] {
  const order = new Map(FORECAST_AREAS.map((a, i) => [a.key, i]));
  const map = new Map<string, ForecastDay[]>();
  for (const d of days) map.set(d.area_key, [...(map.get(d.area_key) ?? []), d]);
  return [...map.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b))
    .map(([key, ds]) => ({ key, name: areaName(key, ds), days: ds.sort((x, y) => x.forecast_date.localeCompare(y.forecast_date)) }));
}

/** The distinct dates of a forecast, ascending. */
export function forecastDates(days: ForecastDay[]): string[] {
  return [...new Set(days.map((d) => d.forecast_date))].sort();
}
