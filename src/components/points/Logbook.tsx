"use client";

// The logbook: every point set by MOM area with how long since it was treated, and Treat now to
// record a treatment. Areas are collapsible with their RAG counts in the header; the first area
// with a point over 48 hours (or the chosen area) is open by default.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Info, Loader2, Pencil, Plus, Snowflake, Trash2, X } from "lucide-react";
import { Chips, EmptyState, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { useDialog, useToast } from "@/components/uiFeedback";
import { useHydrated, useLocalStorage, useNow } from "@/lib/hooks";
import { deletePoint, treatPoint } from "@/lib/points/data";
import { AREAS, groupByArea, keyOf, RAG_META, status, summarise, type PointRow, type Rag } from "@/lib/points/points";
import { pauseRefresh, refresh, requestAction, useActionListener, useLog, type LogAction } from "@/lib/points/store";

// Day, month and time; the year too when it is not this year (last season's treatments).
const fmtWhen = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const year = d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year, hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
};

function RagPill({ rag, label }: { rag: Rag; label: string }) {
  const c = RAG_META[rag].color;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: c, background: `color-mix(in srgb, ${c} 15%, transparent)` }} title={RAG_META[rag].hint}>
      <span className="dot" />
      {label}
    </span>
  );
}

function RowActions({ row, busy, onTreat, onDelete }: { row: PointRow; busy: string | null; onTreat: (r: PointRow) => void; onDelete: (r: PointRow) => void }) {
  const mine = busy === keyOf(row);
  return (
    <span className="flex items-center justify-end gap-1.5">
      <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => onTreat(row)}>
        {mine ? <Loader2 size={14} className="animate-spin" /> : <Snowflake size={14} />} Treat now
      </button>
      <button className="btn btn-ghost btn-sm btn-icon" disabled={!!busy} onClick={() => requestAction({ kind: "edit", key: keyOf(row) })} aria-label={`Edit ${row.point_number}`} title="Edit location and notes">
        <Pencil size={14} />
      </button>
      <button className="btn btn-ghost btn-sm btn-icon" disabled={!!busy} onClick={() => onDelete(row)} aria-label={`Delete ${row.point_number}`} title="Delete point set">
        <Trash2 size={14} />
      </button>
    </span>
  );
}

export default function Logbook() {
  const params = useSearchParams();
  const router = useRouter();
  const area = params.get("area") ?? "";
  const { rows, loaded, error, updatedAt } = useLog();
  const hydrated = useHydrated();
  const nowTick = useNow(30_000).getTime();
  const now = hydrated ? nowTick : 0;
  const toast = useToast();
  const dialog = useDialog();
  const [busy, setBusy] = useState<string | null>(null);
  const [ragFilter, setRagFilter] = useState<Rag | "">("");
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [guideHidden, setGuideHidden] = useLocalStorage("points_guide_hidden", false);

  const onAction = useCallback((a: LogAction) => {
    if (a.kind !== "focus") return;
    setFocus(a.key);
    setToggled((t) => ({ ...t, [a.key.split("||")[0]]: true }));
  }, []);
  useActionListener(onAction);

  // Scroll a point found through the palette (or just added) into view, then let the highlight fade.
  useEffect(() => {
    if (!focus) return;
    const id = window.setTimeout(() => {
      document.getElementById(`pt-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const clear = window.setTimeout(() => setFocus(null), 4000);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(clear);
    };
  }, [focus, rows.length]);

  async function onTreat(r: PointRow) {
    if (busy) return;
    setBusy(keyOf(r));
    pauseRefresh(true);
    try {
      const at = await treatPoint(r);
      await refresh();
      toast.success(`${r.point_number} (${r.area}) treated at ${fmtWhen(at).split(", ").pop()}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      pauseRefresh(false);
      setBusy(null);
    }
  }

  async function onDelete(r: PointRow) {
    const ok = await dialog.confirm({
      title: `Delete ${r.point_number} in ${r.area}?`,
      body: "The point set and its treatment record are removed. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusy(keyOf(r));
    pauseRefresh(true);
    try {
      await deletePoint(r);
      await refresh();
      toast.success(`${r.point_number} (${r.area}) deleted`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      pauseRefresh(false);
      setBusy(null);
    }
  }

  if (!loaded) return <PageSkeleton kind="table" />;

  const inArea = area ? rows.filter((r) => r.area === area) : rows;
  const summary = summarise(inArea, now);
  const shown = ragFilter ? inArea.filter((r) => status(r.last_treated_at, now).rag === ragFilter) : inArea;
  const groups = groupByArea(shown);
  const firstDue = groups.find((g) => g.rows.some((r) => status(r.last_treated_at, now).rag === "red"))?.area ?? groups[0]?.area;
  const areaCounts: Partial<Record<string, number>> = { "": rows.length };
  for (const r of rows) areaCounts[r.area] = (areaCounts[r.area] ?? 0) + 1;

  return (
    <>
      <PageHeader
        eyebrow="Ice and point heating"
        title={area ? `${area} points` : "Points logbook"}
        subtitle={
          <>
            {inArea.length} point set{inArea.length === 1 ? "" : "s"}
            {hydrated && updatedAt ? ` · refreshed ${new Date(updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
            {error ? ` · ${error}` : ""}
          </>
        }
        actions={
          <button className="btn btn-primary" onClick={() => requestAction({ kind: "add" })}>
            <Plus size={15} /> Add / edit point
          </button>
        }
      />

      {!guideHidden && (
        <div className="card fade-up mb-4 flex items-start gap-3 p-4 text-sm">
          <Info size={17} className="mt-0.5 shrink-0 text-accent" />
          <ul className="flex-1 space-y-1 text-dim">
            <li>
              <b className="text-ink">Recording treatment:</b> find the point and press <b className="text-ink">Treat now</b>. Nothing else is needed.
            </li>
            <li>
              <b className="text-ink">Changing details:</b> the pencil on its row, or <b className="text-ink">Add / edit point</b>. Do not re-add a point to update its notes.
            </li>
            <li>
              <b className="text-ink">A brand-new point:</b> <b className="text-ink">Add / edit point</b>, only when it is not on the list yet.
            </li>
          </ul>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setGuideHidden(true)} aria-label="Hide the guide" title="Hide the guide">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["red", "amber", "green", "grey"] as Rag[]).map((r) => (
          <button key={r} className="text-left" onClick={() => setRagFilter(ragFilter === r ? "" : r)} aria-pressed={ragFilter === r} title={ragFilter === r ? "Show all" : `Show only: ${RAG_META[r].hint.toLowerCase()}`}>
            <span className={`block rounded-[var(--radius)] ${ragFilter === r ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <Stat label={RAG_META[r].label} value={hydrated ? summary.counts[r] : "–"} color={r === "grey" ? undefined : RAG_META[r].color} sub={RAG_META[r].hint} />
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chips<string>
          allLabel="All areas"
          value={area}
          onChange={(v) => router.push(v ? `/points?area=${encodeURIComponent(v)}` : "/points")}
          options={AREAS.map((a) => ({ value: a, label: a }))}
          counts={areaCounts}
        />
        {ragFilter && (
          <button className="chip" onClick={() => setRagFilter("")}>
            <X size={12} /> {RAG_META[ragFilter].label} only
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <EmptyState icon={Snowflake} title={inArea.length ? "No points match this filter" : "No points recorded"} hint={inArea.length ? undefined : "Add a point set to start the log."} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const open = area ? true : (toggled[g.area] ?? g.area === firstDue);
            const s = summarise(g.rows, now);
            return (
              <section key={g.area} className="card overflow-hidden">
                <button className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left" aria-expanded={open} onClick={() => setToggled({ ...toggled, [g.area]: !open })} disabled={!!area}>
                  {!area && <ChevronDown size={16} className={`text-faint transition-transform ${open ? "" : "-rotate-90"}`} />}
                  <span className="text-sm font-bold">{g.area}</span>
                  <span className="text-xs text-faint">
                    {g.rows.length} set{g.rows.length === 1 ? "" : "s"}
                  </span>
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    {hydrated &&
                      (["red", "amber", "green", "grey"] as Rag[])
                        .filter((r) => s.counts[r])
                        .map((r) => <RagPill key={r} rag={r} label={`${s.counts[r]} ${r === "grey" ? "untreated" : RAG_META[r].label}`} />)}
                  </span>
                </button>
                {open && (
                  <>
                    {/* Wide screens: table */}
                    <table className="tbl hidden border-t border-edge md:table">
                      <thead>
                        <tr>
                          <th>Point</th>
                          <th>Location</th>
                          <th>Notes</th>
                          <th>Last treated</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r) => {
                          const st = status(r.last_treated_at, now);
                          return (
                            <tr key={keyOf(r)} id={`pt-${keyOf(r)}`} style={focus === keyOf(r) ? { background: "var(--accent-soft)" } : undefined}>
                              <td>
                                <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-xs font-bold">{r.point_number}</span>
                              </td>
                              <td>{r.location || <span className="text-faint">—</span>}</td>
                              <td className="max-w-xs text-dim">{r.notes || <span className="text-faint">—</span>}</td>
                              <td className="whitespace-nowrap font-mono text-xs">{hydrated ? fmtWhen(r.last_treated_at) : "…"}</td>
                              <td title={st.hours != null ? `${st.hours} hours since treatment` : undefined}>{hydrated && <RagPill rag={st.rag} label={st.label} />}</td>
                              <td>
                                <RowActions row={r} busy={busy} onTreat={onTreat} onDelete={onDelete} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Phones: cards */}
                    <ul className="divide-y divide-[var(--border)] border-t border-edge md:hidden">
                      {g.rows.map((r) => {
                        const st = status(r.last_treated_at, now);
                        return (
                          <li key={keyOf(r)} id={`pt-${keyOf(r)}`} className="p-3" style={focus === keyOf(r) ? { background: "var(--accent-soft)" } : undefined}>
                            <div className="flex items-start gap-2">
                              <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-xs font-bold">{r.point_number}</span>
                              <span className="min-w-0 flex-1 text-sm">
                                <span className="block font-semibold">{r.location || "No location"}</span>
                                {r.notes && <span className="block text-xs text-dim">{r.notes}</span>}
                              </span>
                              {hydrated && <RagPill rag={st.rag} label={st.label} />}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px] text-faint">{hydrated ? `Last ${fmtWhen(r.last_treated_at)}` : ""}</span>
                              <RowActions row={r} busy={busy} onTreat={onTreat} onDelete={onDelete} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
