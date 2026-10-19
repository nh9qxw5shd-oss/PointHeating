// Critical Rail Temperature sites: the National CRT RAG Report's export (one row per site and
// track) with its own five-day rail temperature forecast, the Hot Rail Forecast (one max rail
// temperature per forecast area and day), and which sites hold a risk on which day.
//
// Bands follow the register's own thresholds. CRT (W) is the warning temperature at which the
// site is watched; CRT (30/60) is the rail temperature at which the site's speed restriction
// applies (the 30/60 mph of the older NR/L2/TRK/001/mod14, 40/70 mph since the May 2026 change:
// the column keeps the register's name); CRT (20) is the 20 mph restriction. A site is at risk on
// a day when the higher of its own forecast and its forecast area's hot-rail forecast reaches a
// band.

import { parseCsv } from "./csv.ts";

export interface CrtSite {
  register: string;
  depot: string;
  tme: string;
  name: string;
  elr: string;
  track_id: string;
  mileage: string;
  line_speed: string;
  crt_w: number | null;
  crt_speed: number | null;
  crt_20: number | null;
  /** The register's own forecast max rail temperature, day 1 to 5 (day 1 = export day). */
  rail_days: (number | null)[];
  /** The register's forecast cell id, shared by sites under one forecast point. */
  forecast_id: string;
}

export const CRT_COLUMNS = {
  register: "Register",
  depot: "Depot",
  tme: "TME",
  name: "Location Name",
  elr: "ELR",
  track: "Track ID",
  mileage: "Mileage",
  speed: "Line Speed",
  w: "CRT (W)",
  s: "CRT (30/60)",
  t: "CRT (20)",
  day: (n: number) => `Rail Day ${n}`,
  id: "id",
} as const;

const num = (v: string | undefined): number | null => {
  if (v == null || v.trim() === "" || v.trim().toUpperCase() === "N/A") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Reads the Power BI export. Throws when the columns are not the register's. */
export function parseCrtRegister(csv: string): CrtSite[] {
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error("The file has no rows.");
  const need = [CRT_COLUMNS.name, CRT_COLUMNS.elr, CRT_COLUMNS.w, CRT_COLUMNS.s, CRT_COLUMNS.t];
  const missing = need.filter((c) => !(c in rows[0]));
  if (missing.length) throw new Error(`Not the CRT register export: missing ${missing.join(", ")}.`);
  return rows.map((r) => ({
    register: r[CRT_COLUMNS.register] ?? "",
    depot: r[CRT_COLUMNS.depot] ?? "",
    tme: r[CRT_COLUMNS.tme] ?? "",
    name: r[CRT_COLUMNS.name],
    elr: r[CRT_COLUMNS.elr],
    track_id: r[CRT_COLUMNS.track] ?? "",
    mileage: r[CRT_COLUMNS.mileage] ?? "",
    line_speed: r[CRT_COLUMNS.speed] ?? "",
    crt_w: num(r[CRT_COLUMNS.w]),
    crt_speed: num(r[CRT_COLUMNS.s]),
    crt_20: num(r[CRT_COLUMNS.t]),
    rail_days: [1, 2, 3, 4, 5].map((n) => num(r[CRT_COLUMNS.day(n)])),
    forecast_id: r[CRT_COLUMNS.id] ?? "",
  }));
}

// ------------------------------------------------------------- hot rail

export interface HotRailDay {
  day: string; // Fri
  date: string | null; // YYYY-MM-DD, from the validity line
  max_air: number | null;
  max_rail: number | null;
  time_of_max: string | null;
  period_above_46: string | null;
}

export interface HotRailArea {
  name: string; // "LNE and EM - East Midlands"
  days: HotRailDay[];
}

export interface HotRailForecast {
  issued_at: string | null; // ISO
  issued_by: string | null;
  valid_from: string | null; // YYYY-MM-DD
  valid_to: string | null;
  areas: HotRailArea[];
}

/** Which hot-rail forecast area a site falls in. Luton TME's sites (St Pancras to Harlington)
 *  are in London North; the rest of the route is East Midlands. Assumption to check against the
 *  forecaster's area boundaries. */
export function hotRailAreaFor(site: Pick<CrtSite, "tme">): string {
  return /luton/i.test(site.tme) ? "LNE and EM - London North" : "LNE and EM - East Midlands";
}

// ------------------------------------------------------------------ risk

export type CrtBand = "none" | "warning" | "speed" | "twenty";

export const CRT_BAND_META: Record<CrtBand, { label: string; short: string; color: string }> = {
  none: { label: "Below warning", short: "—", color: "var(--text-faint)" },
  warning: { label: "Warning (CRT W)", short: "Watch", color: "var(--moderate)" },
  speed: { label: "Speed restriction (CRT 30/60, now 40/70)", short: "ESR", color: "var(--accent-deep)" },
  twenty: { label: "20 mph (CRT 20)", short: "20 mph", color: "var(--poor)" },
};

export function crtBand(site: Pick<CrtSite, "crt_w" | "crt_speed" | "crt_20">, railTemp: number | null): CrtBand {
  if (railTemp == null) return "none";
  if (site.crt_20 != null && railTemp >= site.crt_20) return "twenty";
  if (site.crt_speed != null && railTemp >= site.crt_speed) return "speed";
  if (site.crt_w != null && railTemp >= site.crt_w) return "warning";
  return "none";
}

export const BAND_RANK: Record<CrtBand, number> = { none: 0, warning: 1, speed: 2, twenty: 3 };

export interface SiteDayRisk {
  date: string;
  /** The register's own forecast for the site that day. */
  site_rail: number | null;
  /** The hot-rail forecast for the site's area that day. */
  area_rail: number | null;
  /** The higher of the two, the value banded. */
  rail: number | null;
  band: CrtBand;
}

export interface SiteRisk {
  site: CrtSite;
  area: string;
  days: SiteDayRisk[];
  worst: CrtBand;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Risk per site per date. `registerDay1` is the date the register was exported (its Rail Day 1);
 * the hot-rail forecast carries its own dates. Dates are the union of both, ascending.
 */
export function siteRisks(sites: CrtSite[], registerDay1: string | null, hotRail: HotRailForecast | null): SiteRisk[] {
  const dates = new Set<string>();
  if (registerDay1) for (let i = 0; i < 5; i++) dates.add(addDays(registerDay1, i));
  for (const a of hotRail?.areas ?? []) for (const d of a.days) if (d.date) dates.add(d.date);
  const list = [...dates].sort();
  const areaDay = new Map<string, HotRailDay>();
  for (const a of hotRail?.areas ?? []) for (const d of a.days) if (d.date) areaDay.set(`${a.name}|${d.date}`, d);
  return sites
    .map((site) => {
      const area = hotRailAreaFor(site);
      const days = list.map((date) => {
        const idx = registerDay1 ? Math.round((Date.parse(date) - Date.parse(registerDay1)) / 86_400_000) : -1;
        const site_rail = idx >= 0 && idx < 5 ? site.rail_days[idx] : null;
        const area_rail = areaDay.get(`${area}|${date}`)?.max_rail ?? null;
        const vals = [site_rail, area_rail].filter((v): v is number => v != null);
        const rail = vals.length ? Math.max(...vals) : null;
        return { date, site_rail, area_rail, rail, band: crtBand(site, rail) };
      });
      const worst = days.reduce<CrtBand>((w, d) => (BAND_RANK[d.band] > BAND_RANK[w] ? d.band : w), "none");
      return { site, area, days, worst };
    })
    .sort((a, b) => BAND_RANK[b.worst] - BAND_RANK[a.worst] || a.site.tme.localeCompare(b.site.tme) || a.site.name.localeCompare(b.site.name));
}

/** Sites at risk grouped by TME, the at-risk ones only. */
export function atRiskByTme(risks: SiteRisk[]): { tme: string; sites: SiteRisk[] }[] {
  const map = new Map<string, SiteRisk[]>();
  for (const r of risks) if (r.worst !== "none") map.set(r.site.tme, [...(map.get(r.site.tme) ?? []), r]);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tme, sites]) => ({ tme, sites }));
}

export function countByBand(risks: SiteRisk[]): Record<CrtBand, number> {
  const out: Record<CrtBand, number> = { none: 0, warning: 0, speed: 0, twenty: 0 };
  for (const r of risks) out[r.worst]++;
  return out;
}
