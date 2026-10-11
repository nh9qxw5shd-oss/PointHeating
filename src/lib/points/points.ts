// Winter points logbook rules. Pure, so the page, the palette and the tests share them.
//
// A point set is identified by area + point number (unique in points_winter_log). Treatment age
// sets its RAG: under 24 hours green, 24 to 48 hours amber, 48 hours or more red, never treated
// grey.

export const AREAS = ["Derby", "Nottingham", "Leicester", "Kettering", "Lincoln", "WH"] as const;
export type Area = (typeof AREAS)[number];

export const GREEN_LIMIT_HOURS = 24;
export const AMBER_LIMIT_HOURS = 48;

export interface PointRow {
  id?: string;
  area: string;
  point_number: string;
  location: string | null;
  notes: string | null;
  last_treated_at: string | null;
  updated_at?: string | null;
}

export type Rag = "green" | "amber" | "red" | "grey";

export interface Status {
  rag: Rag;
  /** Whole hours since treatment, or null when never treated. */
  hours: number | null;
  label: string;
}

export function status(lastTreated: string | null, now = Date.now()): Status {
  const t = lastTreated ? new Date(lastTreated).getTime() : NaN;
  if (!Number.isFinite(t)) return { rag: "grey", hours: null, label: "Not treated" };
  const h = (now - t) / 3_600_000;
  const rag: Rag = h < GREEN_LIMIT_HOURS ? "green" : h < AMBER_LIMIT_HOURS ? "amber" : "red";
  const hours = Math.max(0, Math.floor(h));
  // Past three days the hour count stops being readable; show days instead.
  return { rag, hours, label: hours >= 72 ? `${Math.floor(hours / 24)}d` : `${hours}h` };
}

export const RAG_META: Record<Rag, { label: string; color: string; hint: string }> = {
  green: { label: "Under 24h", color: "var(--good)", hint: "Treated in the last 24 hours" },
  amber: { label: "24–48h", color: "var(--moderate)", hint: "Treated 24 to 48 hours ago" },
  red: { label: "Over 48h", color: "var(--poor)", hint: "Treated 48 hours or more ago" },
  grey: { label: "Not treated", color: "var(--text-faint)", hint: "No treatment recorded" },
};

export const keyOf = (r: Pick<PointRow, "area" | "point_number">) => `${r.area}||${r.point_number}`;

/** Natural order for point numbers: 99 before 123A, 123A before 123B. */
export function comparePoints(a: PointRow, b: PointRow): number {
  return (a.area || "").localeCompare(b.area || "") || (a.point_number || "").localeCompare(b.point_number || "", "en-GB", { numeric: true });
}

/** Does this area already have a point with this number (case and spacing ignored)? */
export function isDuplicate(rows: PointRow[], area: string, pointNumber: string): boolean {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  return rows.some((r) => r.area === area && norm(String(r.point_number)) === norm(pointNumber));
}

export interface Summary {
  total: number;
  counts: Record<Rag, number>;
}

export function summarise(rows: PointRow[], now = Date.now()): Summary {
  const counts: Record<Rag, number> = { green: 0, amber: 0, red: 0, grey: 0 };
  for (const r of rows) counts[status(r.last_treated_at, now).rag]++;
  return { total: rows.length, counts };
}

/** Rows grouped by area in the fixed area order; areas outside the list follow alphabetically. */
export function groupByArea(rows: PointRow[]): { area: string; rows: PointRow[] }[] {
  const order = new Map<string, number>(AREAS.map((a, i) => [a, i]));
  const map = new Map<string, PointRow[]>();
  for (const r of [...rows].sort(comparePoints)) map.set(r.area, [...(map.get(r.area) ?? []), r]);
  return [...map.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b))
    .map(([area, rs]) => ({ area, rows: rs }));
}
