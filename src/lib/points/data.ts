// Supabase reads and writes for points_winter_log, with the shapes the original page used.

import { sb } from "@/lib/supabase";
import type { PointRow } from "./points.ts";

export const TABLE = "points_winter_log";

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export async function listPoints(): Promise<PointRow[]> {
  const res = await sb().from(TABLE).select("*").order("area", { ascending: true }).order("point_number", { ascending: true });
  return (check(res, "Loading points") ?? []) as PointRow[];
}

/** Record treatment now (keeps location and notes). */
export async function treatPoint(r: PointRow): Promise<string> {
  const at = new Date().toISOString();
  check(
    await sb().from(TABLE).upsert({ area: r.area, point_number: r.point_number, location: r.location, notes: r.notes, last_treated_at: at }, { onConflict: "area,point_number" }),
    "Recording treatment",
  );
  return at;
}

/** A brand-new point set (no treatment yet). */
export async function addPoint(area: string, pointNumber: string, location: string, notes: string): Promise<void> {
  check(await sb().from(TABLE).insert({ area, point_number: pointNumber, location: location || null, notes: notes || null }), "Adding point");
}

/** Location and notes only; treatment time is left alone. */
export async function savePoint(area: string, pointNumber: string, location: string, notes: string): Promise<void> {
  check(
    await sb().from(TABLE).upsert({ area, point_number: pointNumber, location: location || null, notes: notes || null }, { onConflict: "area,point_number" }),
    "Saving point",
  );
}

export async function deletePoint(r: PointRow): Promise<void> {
  check(await sb().from(TABLE).delete().eq("area", r.area).eq("point_number", r.point_number), "Deleting point");
}
