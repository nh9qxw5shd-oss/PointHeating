// Supabase reads and writes for the weather resilience sections. DLog2's forecast tables are
// read only (another system's data); the wr_ tables are this system's own.

import { sb } from "@/lib/supabase";
import type { ChainsawRow } from "./chainsaw.ts";
import type { CrtSite, HotRailForecast } from "./crt.ts";
import { parseForecastRow, type Forecast, type ForecastDay } from "./forecast.ts";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

const londonToday = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "Europe/London" });

// -------------------------------------------------------------- forecast

export async function loadForecast(now = new Date()): Promise<Forecast> {
  const today = londonToday(now);
  const since = new Date(now.getTime() - 10 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const c = sb();
  const [days, issue, hist] = await Promise.all([
    c.from("weather_forecast_latest_days").select("area_key, area_name, day_index, forecast_date, day_name, overall_level, risks, min_temp_morning, max_temp, min_temp_night, ice_day").gte("forecast_date", today).order("forecast_date"),
    c.from("weather_forecasts").select("issued_at, valid_from, valid_to, summary_24h, summary_2_7, warnings").order("issued_at", { ascending: false }).limit(1).maybeSingle(),
    c.from("weather_forecast_days").select("area_key, forecast_date, min_temp_morning, min_temp_night, ice_day").eq("day_index", 0).gte("forecast_date", since).lt("forecast_date", today).order("forecast_date"),
  ]);
  const rows = (check(days, "Loading the forecast") ?? []) as Record<string, unknown>[];
  const parsed: ForecastDay[] = rows.map(parseForecastRow);
  const i = issue.data as Record<string, unknown> | null;
  const history = ((hist.data ?? []) as Record<string, unknown>[]).map((h) => {
    const d = parseForecastRow({ ...h, day_index: 0 });
    const v = [d.min_temp_morning, d.min_temp_night].filter((x): x is number => x != null);
    return { area_key: d.area_key, forecast_date: d.forecast_date, min: v.length ? Math.min(...v) : null, ice_day: d.ice_day };
  });
  return {
    issue: {
      issued_at: (i?.issued_at as string | null) ?? null,
      valid_from: (i?.valid_from as string | null) ?? null,
      valid_to: (i?.valid_to as string | null) ?? null,
      summary_24h: (i?.summary_24h as string | null) ?? null,
      summary_2_7: (i?.summary_2_7 as string | null) ?? null,
      warnings: ((i?.warnings as string[] | null) ?? []).filter(Boolean),
    },
    days: parsed,
    history,
  };
}

// ------------------------------------------------------------------- CRT

export interface CrtImport {
  id: string;
  imported_at: string;
  day1_date: string;
  row_count: number;
  source_name: string | null;
  sites: CrtSite[];
}

export async function latestCrtImport(): Promise<CrtImport | null> {
  const res = await sb().from("wr_crt_imports").select("id, imported_at, day1_date, row_count, source_name, sites").order("imported_at", { ascending: false }).limit(1).maybeSingle();
  const r = check(res, "Loading the CRT register") as Record<string, unknown> | null;
  return r ? { id: String(r.id), imported_at: String(r.imported_at), day1_date: String(r.day1_date), row_count: Number(r.row_count), source_name: (r.source_name as string | null) ?? null, sites: (r.sites as CrtSite[]) ?? [] } : null;
}

export async function saveCrtImport(sites: CrtSite[], day1Date: string, sourceName: string | null): Promise<void> {
  check(await sb().from("wr_crt_imports").insert({ day1_date: day1Date, row_count: sites.length, source_name: sourceName, sites }), "Saving the CRT register");
}

export interface HotRailImport extends HotRailForecast {
  id: string;
  imported_at: string;
  source_name: string | null;
}

export async function latestHotRail(): Promise<HotRailImport | null> {
  const res = await sb().from("wr_hotrail_forecasts").select("id, imported_at, issued_at, issued_by, valid_from, valid_to, source_name, areas").order("imported_at", { ascending: false }).limit(1).maybeSingle();
  const r = check(res, "Loading the hot rail forecast") as Record<string, unknown> | null;
  return r
    ? {
        id: String(r.id),
        imported_at: String(r.imported_at),
        issued_at: (r.issued_at as string | null) ?? null,
        issued_by: (r.issued_by as string | null) ?? null,
        valid_from: (r.valid_from as string | null) ?? null,
        valid_to: (r.valid_to as string | null) ?? null,
        source_name: (r.source_name as string | null) ?? null,
        areas: (r.areas as HotRailForecast["areas"]) ?? [],
      }
    : null;
}

export async function saveHotRail(f: HotRailForecast, sourceName: string | null): Promise<void> {
  check(await sb().from("wr_hotrail_forecasts").insert({ issued_at: f.issued_at, issued_by: f.issued_by, valid_from: f.valid_from, valid_to: f.valid_to, source_name: sourceName, areas: f.areas }), "Saving the hot rail forecast");
}

// ------------------------------------------------------------ flood checks

export interface FloodCheck {
  id: string;
  site_key: string;
  checked_at: string;
  checked_by: string | null;
  finding: "clear" | "high_water" | "flooding";
  notes: string | null;
}

export async function listFloodChecks(sinceDays = 14): Promise<FloodCheck[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const res = await sb().from("wr_flood_checks").select("id, site_key, checked_at, checked_by, finding, notes").gte("checked_at", since).order("checked_at", { ascending: false });
  return (check(res, "Loading flood site checks") ?? []) as FloodCheck[];
}

export async function recordFloodCheck(siteKey: string, finding: FloodCheck["finding"], notes: string, checkedBy: string): Promise<void> {
  check(await sb().from("wr_flood_checks").insert({ site_key: siteKey, finding, notes: notes || null, checked_by: checkedBy || null }), "Recording the check");
}

// --------------------------------------------------------------- chainsaw

export async function listChainsaw(): Promise<ChainsawRow[]> {
  const res = await sb().from("wr_chainsaw_staff").select("id, name, location, expiry_date, comments, course_booked, course_dates").order("location").order("name");
  return (check(res, "Loading chainsaw staff") ?? []) as ChainsawRow[];
}

export async function saveChainsaw(row: ChainsawRow): Promise<void> {
  const payload = { name: row.name, location: row.location, expiry_date: row.expiry_date, comments: row.comments, course_booked: row.course_booked, course_dates: row.course_dates };
  if (row.id) check(await sb().from("wr_chainsaw_staff").update(payload).eq("id", row.id), "Saving");
  else check(await sb().from("wr_chainsaw_staff").insert(payload), "Adding");
}

export async function deleteChainsaw(id: string): Promise<void> {
  check(await sb().from("wr_chainsaw_staff").delete().eq("id", id), "Deleting");
}

export async function importChainsaw(rows: ChainsawRow[]): Promise<void> {
  if (!rows.length) return;
  check(await sb().from("wr_chainsaw_staff").insert(rows.map((r) => ({ name: r.name, location: r.location, expiry_date: r.expiry_date, comments: r.comments, course_booked: r.course_booked, course_dates: r.course_dates }))), "Importing");
}
