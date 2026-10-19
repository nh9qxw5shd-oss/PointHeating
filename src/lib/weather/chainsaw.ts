// Chainsaw-competent operations staff: who holds the competency, where they are based, when it
// expires. Amber inside six months of expiry (the spreadsheet's own "expires within 6 months"
// group), red once expired, grey with no date.

export interface ChainsawRow {
  id?: string;
  name: string;
  location: string;
  expiry_date: string | null; // YYYY-MM-DD
  comments: string | null;
  course_booked: string | null;
  course_dates: string | null;
}

export type ExpiryRag = "green" | "amber" | "red" | "grey";

export const EXPIRY_WARN_DAYS = 183;

export function expiryStatus(expiry: string | null, now = Date.now()): { rag: ExpiryRag; days: number | null; label: string } {
  if (!expiry) return { rag: "grey", days: null, label: "No date" };
  const t = Date.parse(expiry + "T00:00:00Z");
  if (!Number.isFinite(t)) return { rag: "grey", days: null, label: "No date" };
  // Whole calendar days from today (UTC date) to the expiry date.
  const today = Date.parse(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z");
  const days = Math.round((t - today) / 86_400_000);
  if (days < 0) return { rag: "red", days, label: `Expired ${-days}d ago` };
  if (days <= EXPIRY_WARN_DAYS) return { rag: "amber", days, label: `${days}d left` };
  return { rag: "green", days, label: `${days}d left` };
}

export const EXPIRY_META: Record<ExpiryRag, { label: string; color: string; hint: string }> = {
  green: { label: "In date", color: "var(--good)", hint: "More than six months left" },
  amber: { label: "Within 6 months", color: "var(--moderate)", hint: "Expires inside six months: book the refresher" },
  red: { label: "Expired", color: "var(--poor)", hint: "Competency has lapsed" },
  grey: { label: "No date", color: "var(--text-faint)", hint: "No expiry recorded" },
};

/** Normalise a date typed or imported as dd/mm/yyyy, d/m/yy, m/d/yyyy (US exports) or ISO. */
export function toIsoDate(s: string | null | undefined, usOrder = false): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return null;
  let day = usOrder ? Number(m[2]) : Number(m[1]);
  let month = usOrder ? Number(m[1]) : Number(m[2]);
  // A month over 12 can only be a day: the other order was meant.
  if (month > 12 && day <= 12) [day, month] = [month, day];
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Rows from a CSV in the "CHAINSAW INFO" layout: NAME, LOCATION, EXPIRY DATE, COMMENTS.
 *  Dates in that export are month-first. */
export function parseChainsawCsv(rows: Record<string, string>[], usDates = true): ChainsawRow[] {
  const get = (r: Record<string, string>, ...keys: string[]) => {
    for (const k of Object.keys(r)) if (keys.some((want) => k.trim().toUpperCase() === want)) return r[k];
    return "";
  };
  return rows
    .map((r) => ({
      name: get(r, "NAME").trim(),
      location: get(r, "LOCATION", "DEPOT", "AREA").trim(),
      expiry_date: toIsoDate(get(r, "EXPIRY DATE", "EXPIRY", "EXPIRES"), usDates),
      comments: get(r, "COMMENTS", "NOTES").trim() || null,
      course_booked: get(r, "COURSE BOOKED", "COURSE").trim() || null,
      course_dates: get(r, "DATE(S)", "DATES", "COURSE DATES").trim() || null,
    }))
    .filter((r) => r.name && !/^name$/i.test(r.name));
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])(\w)/g, (m) => m.toUpperCase());
}

export function compareStaff(a: ChainsawRow, b: ChainsawRow): number {
  return a.location.localeCompare(b.location) || a.name.localeCompare(b.name);
}

export function summariseExpiry(rows: ChainsawRow[], now = Date.now()): Record<ExpiryRag, number> {
  const out: Record<ExpiryRag, number> = { green: 0, amber: 0, red: 0, grey: 0 };
  for (const r of rows) out[expiryStatus(r.expiry_date, now).rag]++;
  return out;
}
