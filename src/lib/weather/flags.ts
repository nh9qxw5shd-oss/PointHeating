// What the forecast asks the desk to do, hazard by hazard. Every threshold here is named and
// sourced so it can be challenged; the constants are the only place they live.
//
// Cold (points and ice): 2025 Winter Working Arrangements East Midlands §6.3 (frost alert levels,
// Aware from 0 °C), §9 (three consecutive days of sub-zero temperatures: ice in tunnels), Appendix
// K (points without heaters: MOM attendance every 48 h in sub-zero spells), Tunnel Ice Management
// flowchart (forecast to continue below 1 °C for more than 48 h: Red alert, ice patrols within
// 24 h). The 3 °C watch line is the desk's own margin above those, not a standard.
//
// Rain: Module D Extreme Rainfall (EWAT at Extreme, at Adverse when ground is saturated; CAT
// 1 h / 3 h thresholds); Winter Working Arrangements §13.2 (proactive checks of drains, culverts
// and trash screens on receipt of alerts).
//
// Wind: Module B Extreme High Winds §2.3.1 (gusts 60 mph or over: 50 mph BESR; 90 mph: suspend)
// and §3 (route proving after Adverse or Extreme winds in a no-train period).
//
// Heat: Extreme Heat Operations Plan 2026 v1.6 §3 and Appendix A (34 °C strategic command and
// junctions in normal; 39 °C OLE BSR south of Bedford; 41 °C 40/70 track BSR and OLE north of
// Bedford; 45 °C 40 mph OLE BSR).

import { asLevel, dayMin, LEVEL_RANK, maxLevel, type Forecast, type ForecastDay, type Level } from "./forecast.ts";

// ------------------------------------------------------------------- cold

export const COLD = {
  /** Treatment watch: forecast minimum at or below this. The desk's margin, not a standard. */
  WATCH_C: 3,
  /** Treatment due: sub-zero, the condition in Appendix K and the Frost Aware line. */
  ACT_C: 0,
  /** Consecutive sub-zero days before ice build-up checks in the at-risk tunnels (Winter §9). */
  ICE_RUN_DAYS: 3,
  /** Consecutive ice days (air below freezing all day, the "< 1 °C for more than 48 h" of the
   *  tunnel ice flowchart) before the Red alert response. */
  ICE_DAY_RUN: 2,
  /** Attendance interval at points without heaters during a sub-zero spell (Appendix K). */
  ATTEND_HOURS: 48,
} as const;

export type ColdBand = "none" | "watch" | "act";

export interface ColdDay {
  area_key: string;
  date: string;
  min: number | null;
  band: ColdBand;
  /** Sub-zero days in a row up to and including this one (history counted). */
  subZeroRun: number;
  /** Ice days in a row up to and including this one. */
  iceDayRun: number;
  /** Ice build-up checks are due in this area's at-risk tunnels. */
  iceCheck: boolean;
  iceReason: string | null;
}

export function coldBand(min: number | null): ColdBand {
  if (min == null) return "none";
  if (min <= COLD.ACT_C) return "act";
  if (min <= COLD.WATCH_C) return "watch";
  return "none";
}

/** Cold flags for one area across the forecast, with the run of cold that may have started
 *  before this issue (history: earlier issues' day 0). */
export function coldDays(area: string, days: ForecastDay[], history: Forecast["history"] = []): ColdDay[] {
  const mine = days.filter((d) => d.area_key === area).sort((a, b) => a.forecast_date.localeCompare(b.forecast_date));
  const first = mine[0]?.forecast_date;
  // History strictly before the forecast window, most recent last.
  const past = history
    .filter((h) => h.area_key === area && (!first || h.forecast_date < first))
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date));
  let subZero = 0;
  let ice = 0;
  let prevDate: string | null = null;
  const step = (date: string, min: number | null, iceDay: boolean) => {
    // A gap in the dates breaks the run.
    if (prevDate && nextDate(prevDate) !== date) {
      subZero = 0;
      ice = 0;
    }
    subZero = min != null && min <= COLD.ACT_C ? subZero + 1 : 0;
    ice = iceDay ? ice + 1 : 0;
    prevDate = date;
  };
  for (const h of past) step(h.forecast_date, h.min, h.ice_day);
  return mine.map((d) => {
    const min = dayMin(d);
    step(d.forecast_date, min, d.ice_day);
    const byRun = subZero >= COLD.ICE_RUN_DAYS;
    const byIce = ice >= COLD.ICE_DAY_RUN;
    return {
      area_key: area,
      date: d.forecast_date,
      min,
      band: coldBand(min),
      subZeroRun: subZero,
      iceDayRun: ice,
      iceCheck: byRun || byIce,
      iceReason: byIce ? `${ice} ice days in a row (below freezing all day)` : byRun ? `${subZero} sub-zero days in a row` : null,
    };
  });
}

function nextDate(iso: string, n = 1): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------- rain

export const RAIN_RISKS = ["Heavy Rain", "Convective Rainfall"] as const;

export interface RainDay {
  area_key: string;
  date: string;
  level: Level;
  risks: { risk: string; level: Level }[];
  /** Proactive flood-site checks are suggested (Aware or above). */
  floodChecks: boolean;
  /** EWAT to be considered (Adverse) or convened (Extreme) per Module D. */
  ewat: "none" | "consider" | "convene";
}

export function rainDays(area: string, days: ForecastDay[]): RainDay[] {
  return days
    .filter((d) => d.area_key === area)
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date))
    .map((d) => {
      const risks = RAIN_RISKS.filter((r) => d.risks[r]).map((r) => ({ risk: r, level: asLevel(d.risks[r]) }));
      const level = maxLevel(...risks.map((r) => r.level));
      return {
        area_key: area,
        date: d.forecast_date,
        level,
        risks,
        floodChecks: LEVEL_RANK[level] >= LEVEL_RANK.AWARE,
        ewat: level === "EXTREME" ? "convene" : level === "ADVERSE" ? "consider" : "none",
      };
    });
}

// ------------------------------------------------------------------- wind

export interface WindDay {
  area_key: string;
  date: string;
  level: Level;
  /** 50 mph BESR to be considered across the forecast area (Extreme). */
  besr: boolean;
  /** Route proving to be arranged for lines with a no-train period (Adverse or Extreme). */
  routeProving: boolean;
}

export function windDays(area: string, days: ForecastDay[]): WindDay[] {
  return days
    .filter((d) => d.area_key === area)
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date))
    .map((d) => {
      const level = asLevel(d.risks.Wind);
      return { area_key: area, date: d.forecast_date, level, besr: level === "EXTREME", routeProving: LEVEL_RANK[level] >= LEVEL_RANK.ADVERSE };
    });
}

// ------------------------------------------------------------------- heat

export const HEAT = {
  /** Strategic command stood up; listed junctions kept in normal; welfare measures. */
  COMMAND_C: 34,
  /** 60 mph OLE BSR south of Bedford (MK3B), 11:00–22:00; all points south of Bedford in normal. */
  OLE_SOUTH_C: 39,
  /** 40/70 mph track BSR 14:00–20:00 (all track) and 60 mph OLE BSR north of Bedford (UKMS). */
  TRACK_BSR_C: 41,
  /** 40 mph OLE BSR, both OLE types. */
  OLE_40_C: 45,
} as const;

export type HeatBand = "none" | "command" | "ole_south" | "track_bsr" | "ole_40";

export interface HeatDay {
  area_key: string;
  date: string;
  max: number | null;
  band: HeatBand;
  actions: string[];
}

export function heatBand(max: number | null): HeatBand {
  if (max == null || max < HEAT.COMMAND_C) return "none";
  if (max >= HEAT.OLE_40_C) return "ole_40";
  if (max >= HEAT.TRACK_BSR_C) return "track_bsr";
  if (max >= HEAT.OLE_SOUTH_C) return "ole_south";
  return "command";
}

export const HEAT_ACTIONS: Record<Exclude<HeatBand, "none">, string[]> = {
  command: ["Strategic Command stood up on receipt of the forecast", "Listed junctions kept in normal (Luton North to Tapton)", "Welfare: water, air conditioning, PPE check", "Localised CRT sites only"],
  ole_south: ["All of the above", "60 mph OLE BSR south of Bedford, 11:00–22:00", "All points south of Bedford in normal (Bedford excepted); no changes of line south of Bedford"],
  track_bsr: ["All of the above", "40/70 mph track BSR on all track, 14:00–20:00 (KRS plans it 11:00–22:00)", "60 mph OLE BSR north of Bedford, 11:00–22:00", "Key Route Strategy timetable; critical freight only"],
  ole_40: ["All of the above", "40 mph OLE BSR on both OLE types, 11:00–22:00"],
};

export function heatDays(area: string, days: ForecastDay[]): HeatDay[] {
  return days
    .filter((d) => d.area_key === area)
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date))
    .map((d) => {
      const band = heatBand(d.max_temp);
      return { area_key: area, date: d.forecast_date, max: d.max_temp, band, actions: band === "none" ? [] : HEAT_ACTIONS[band] };
    });
}

// ---------------------------------------------------------------- summary

export interface AreaFlags {
  area_key: string;
  cold: ColdDay[];
  rain: RainDay[];
  wind: WindDay[];
  heat: HeatDay[];
}

export function areaFlags(area: string, f: Forecast): AreaFlags {
  return { area_key: area, cold: coldDays(area, f.days, f.history), rain: rainDays(area, f.days), wind: windDays(area, f.days), heat: heatDays(area, f.days) };
}

/** One line per hazard that needs the desk today or soon, for the overview and the status chip. */
export interface Headline {
  section: "points" | "rain" | "wind" | "heat";
  tone: "amber" | "red";
  text: string;
  /** Areas affected, by forecast area key. */
  areas: string[];
  /** First date it applies. */
  from: string;
}

export function headlines(f: Forecast, areaKeys: string[], horizonDays = 3): Headline[] {
  // The window is the first `horizonDays` calendar days of the forecast.
  const first = [...f.days.map((d) => d.forecast_date)].sort()[0];
  const last = first ? nextDate(first, horizonDays - 1) : "";
  const inWindow = (date: string) => !!first && date >= first && date <= last;
  const out: Headline[] = [];
  const collect = <T extends { area_key: string; date: string }>(rows: T[], pick: (r: T) => boolean) => {
    const hits = rows.filter((r) => inWindow(r.date) && pick(r));
    return { areas: [...new Set(hits.map((h) => h.area_key))], from: hits.map((h) => h.date).sort()[0] };
  };
  const all = areaKeys.map((a) => areaFlags(a, f));
  const cold = all.flatMap((a) => a.cold);
  const act = collect(cold, (c) => c.band === "act");
  if (act.areas.length) out.push({ section: "points", tone: "red", text: "Sub-zero forecast: treat points without heaters", areas: act.areas, from: act.from });
  else {
    const watch = collect(cold, (c) => c.band === "watch");
    if (watch.areas.length) out.push({ section: "points", tone: "amber", text: `Minimum at or below ${COLD.WATCH_C} °C: treatment watch`, areas: watch.areas, from: watch.from });
  }
  const ice = collect(cold, (c) => c.iceCheck);
  if (ice.areas.length) out.push({ section: "points", tone: "red", text: "Ice build-up checks due in at-risk tunnels", areas: ice.areas, from: ice.from });
  const rain = all.flatMap((a) => a.rain);
  const ewat = collect(rain, (r) => r.ewat !== "none");
  if (ewat.areas.length) out.push({ section: "rain", tone: "red", text: "Adverse or extreme rainfall: EWAT and flood-site checks", areas: ewat.areas, from: ewat.from });
  else {
    const fl = collect(rain, (r) => r.floodChecks);
    if (fl.areas.length) out.push({ section: "rain", tone: "amber", text: "Rain at Aware: proactive flood-site checks", areas: fl.areas, from: fl.from });
  }
  const wind = all.flatMap((a) => a.wind);
  const besr = collect(wind, (w) => w.besr);
  if (besr.areas.length) out.push({ section: "wind", tone: "red", text: "Extreme wind: 50 mph BESR and route proving", areas: besr.areas, from: besr.from });
  else {
    const rp = collect(wind, (w) => w.routeProving);
    if (rp.areas.length) out.push({ section: "wind", tone: "amber", text: "Adverse wind: route proving after no-train periods", areas: rp.areas, from: rp.from });
  }
  const heat = all.flatMap((a) => a.heat);
  const bsr = collect(heat, (h) => h.band === "track_bsr" || h.band === "ole_40");
  if (bsr.areas.length) out.push({ section: "heat", tone: "red", text: `${HEAT.TRACK_BSR_C} °C or more: track BSR and KRS`, areas: bsr.areas, from: bsr.from });
  else {
    const cmd = collect(heat, (h) => h.band !== "none");
    if (cmd.areas.length) out.push({ section: "heat", tone: "amber", text: `${HEAT.COMMAND_C} °C or more: strategic command and junctions in normal`, areas: cmd.areas, from: cmd.from });
  }
  return out;
}
