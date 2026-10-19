// The Hot Rail Forecast PDF (MetDesk for Network Rail): one page, a header with issue and
// validity, then panels two abreast, one per forecast area, each a five-row table of day, max
// air temperature, max rail temperature, time of max and period above 46 °C. The layout is
// rebuilt from the text items' positions; the same string appears twice in the file (two text
// layers), so items are de-duplicated by position.

import type { HotRailArea, HotRailDay, HotRailForecast } from "./crt.ts";
import { addDays } from "./crt.ts";

export interface TextItem {
  str: string;
  x: number;
  y: number;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(day: string, mon: string, year: string): string | null {
  const m = MONTHS[mon.slice(0, 3).toLowerCase()];
  if (!m) return null;
  return `${year}-${String(m).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** "Forecast issued on Friday 04 Apr 2025 at 02:52 BST by Matt Andrews" → ISO (London offset by BST/GMT). */
export function parseIssued(line: string): { at: string | null; by: string | null } {
  const m = line.match(/issued on \w+ (\d{1,2}) (\w{3,}) (\d{4}) at (\d{2}):(\d{2}) (BST|GMT)(?: by (.+))?/i);
  if (!m) return { at: null, by: null };
  const date = isoDate(m[1], m[2], m[3]);
  const off = m[6].toUpperCase() === "BST" ? "+01:00" : "+00:00";
  return { at: date ? `${date}T${m[4]}:${m[5]}:00${off}` : null, by: m[7]?.trim() ?? null };
}

/** "Valid for 06:00 Friday 04 Apr 2025 to 06:00 Wednesday 09 Apr 2025" → the two dates. */
export function parseValidity(line: string): { from: string | null; to: string | null } {
  const re = /(\d{2}):(\d{2}) \w+ (\d{1,2}) (\w{3,}) (\d{4})/g;
  const found: string[] = [];
  for (const m of line.matchAll(re)) {
    const d = isoDate(m[3], m[4], m[5]);
    if (d) found.push(d);
  }
  return { from: found[0] ?? null, to: found[1] ?? null };
}

const num = (s: string): number | null => {
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return s.trim() && Number.isFinite(n) ? n : null;
};

/** Rebuild the forecast from positioned text items (page origin bottom-left, y up). */
export function parseHotRailItems(items: TextItem[]): HotRailForecast {
  // De-duplicate the doubled text layer: same string within 3 pt.
  const seen: TextItem[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    if (!seen.some((s) => s.str === it.str && Math.abs(s.x - it.x) <= 3 && Math.abs(s.y - it.y) <= 3)) seen.push(it);
  }
  // Group into lines by y.
  const lines: { y: number; items: TextItem[] }[] = [];
  for (const it of [...seen].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= 3);
    if (line) line.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  const text = (l: { items: TextItem[] }) => l.items.map((i) => i.str).join(" ");

  const issued = parseIssued(lines.map(text).find((t) => /issued on/i.test(t)) ?? "");
  const validity = parseValidity(lines.map(text).find((t) => /^Valid for/i.test(t)) ?? "");

  // Panels: a line whose items are area names ("LNE and EM - …"), one per column (x < 300 left,
  // else right). The next five day rows below it belong to those areas, split by the same x line.
  const areas: HotRailArea[] = [];
  const mid = 300;
  for (let i = 0; i < lines.length; i++) {
    const heads = lines[i].items.filter((it) => /^[A-Z]{2,}.* - .+/.test(it.str) && !/Max|Temp/.test(it.str));
    if (!heads.length) continue;
    const cols = heads.map((h) => ({ name: h.str.trim(), left: h.x < mid, days: [] as HotRailDay[] }));
    for (let j = i + 1; j < lines.length && cols.every((c) => c.days.length < 7); j++) {
      const l = lines[j];
      if (l.items.some((it) => /^[A-Z]{2,}.* - .+/.test(it.str) && !/Max|Temp/.test(it.str))) break; // next panel
      for (const c of cols) {
        const cells = l.items.filter((it) => (it.x < mid) === c.left);
        if (!cells.length || !DAYS.includes(cells[0].str.trim())) continue;
        const [day, air, rail, time, period] = cells.map((it) => it.str.trim());
        c.days.push({ day, date: null, max_air: num(air ?? ""), max_rail: num(rail ?? ""), time_of_max: time ?? null, period_above_46: period ?? null });
      }
    }
    for (const c of cols) if (c.days.length) areas.push({ name: c.name, days: c.days });
  }
  // Dates: day names run from the validity start.
  if (validity.from) {
    for (const a of areas) {
      let d = validity.from;
      for (const day of a.days) {
        // Walk forward to the next date whose weekday matches (handles a missing day).
        for (let k = 0; k < 7 && DAYS[new Date(d + "T00:00:00Z").getUTCDay()] !== day.day; k++) d = addDays(d, 1);
        day.date = d;
        d = addDays(d, 1);
      }
    }
  }
  return { issued_at: issued.at, issued_by: issued.by, valid_from: validity.from, valid_to: validity.to, areas };
}

/** The forecast areas this route reads. */
export const HOT_RAIL_AREAS = ["LNE and EM - East Midlands", "LNE and EM - London North"] as const;

export function routeAreas(f: HotRailForecast): HotRailArea[] {
  return f.areas.filter((a) => (HOT_RAIL_AREAS as readonly string[]).includes(a.name));
}
