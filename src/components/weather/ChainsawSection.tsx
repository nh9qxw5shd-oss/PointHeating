"use client";

// Chainsaw-competent operations staff: the register by location with expiry status, add and
// edit in a drawer, import from the spreadsheet's CSV.

import { useCallback, useEffect, useState } from "react";
import { Axe, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Chips, Drawer, EmptyState, Field, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { useDialog, useToast } from "@/components/uiFeedback";
import { useHydrated, useNow } from "@/lib/hooks";
import { compareStaff, EXPIRY_META, expiryStatus, parseChainsawCsv, summariseExpiry, titleCase, toIsoDate, type ChainsawRow, type ExpiryRag } from "@/lib/weather/chainsaw";
import { parseCsv } from "@/lib/weather/csv";
import { deleteChainsaw, importChainsaw, listChainsaw, saveChainsaw } from "@/lib/weather/data";
import { SOURCES } from "@/lib/weather/thresholds";
import { FileButton, GuidancePanel } from "./bits";

const EMPTY: ChainsawRow = { name: "", location: "", expiry_date: null, comments: null, course_booked: null, course_dates: null };
const fmt = (iso: string | null) => (iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

function Pill({ rag, label }: { rag: ExpiryRag; label: string }) {
  const c = EXPIRY_META[rag].color;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: c, background: `color-mix(in srgb, ${c} 15%, transparent)` }} title={EXPIRY_META[rag].hint}>
      <span className="dot" />
      {label}
    </span>
  );
}

export default function ChainsawSection() {
  const toast = useToast();
  const dialog = useDialog();
  const hydrated = useHydrated();
  const now = useNow(60_000).getTime();
  const [rows, setRows] = useState<ChainsawRow[] | null>(null);
  const [loc, setLoc] = useState("");
  const [rag, setRag] = useState<ExpiryRag | "">("");
  const [editing, setEditing] = useState<ChainsawRow | null>(null);
  const [busy, setBusy] = useState(false);

  // State is set from the promise's callbacks, never in the effect body.
  const load = useCallback(
    () =>
      listChainsaw()
        .then(setRows)
        .catch((e: Error) => {
          toast.error(e.message);
          setRows([]);
        }),
    [toast],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!editing || !editing.name.trim() || !editing.location.trim()) return;
    setBusy(true);
    try {
      await saveChainsaw({ ...editing, name: editing.name.trim(), location: titleCase(editing.location.trim()) });
      toast.success(`${editing.name.trim()} saved`);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: ChainsawRow) {
    if (!r.id) return;
    const ok = await dialog.confirm({ title: `Remove ${r.name}?`, body: "The record is deleted. Keep leavers until the register is reconciled if in doubt.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      await deleteChainsaw(r.id);
      toast.success(`${r.name} removed`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onCsv(file: File) {
    setBusy(true);
    try {
      const parsed = parseChainsawCsv(parseCsv(await file.text()));
      if (!parsed.length) throw new Error("No rows with a NAME and LOCATION found.");
      const ok = await dialog.confirm({ title: `Import ${parsed.length} people?`, body: "Rows are added to the register (nothing is replaced). Dates in the spreadsheet export are read month-first.", confirmLabel: "Import" });
      if (!ok) return;
      await importChainsaw(parsed.map((p) => ({ ...p, location: titleCase(p.location) })));
      toast.success(`${parsed.length} imported`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <PageSkeleton kind="table" />;

  const locations = [...new Set(rows.map((r) => r.location))].sort();
  const shown = rows.filter((r) => (!loc || r.location === loc) && (!rag || expiryStatus(r.expiry_date, now).rag === rag)).sort(compareStaff);
  const counts = summariseExpiry(loc ? rows.filter((r) => r.location === loc) : rows, now);
  const locCounts: Partial<Record<string, number>> = { "": rows.length };
  for (const r of rows) locCounts[r.location] = (locCounts[r.location] ?? 0) + 1;

  return (
    <>
      <PageHeader
        eyebrow="All year"
        title="Chainsaw competency"
        subtitle={`${rows.length} people on the register`}
        actions={
          <>
            <FileButton accept=".csv,text/csv" label="Import CSV" busy={busy} onFile={onCsv} />
            <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>
              <Plus size={15} /> Add person
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["red", "amber", "green", "grey"] as ExpiryRag[]).map((r) => (
          <button key={r} className="text-left" onClick={() => setRag(rag === r ? "" : r)} aria-pressed={rag === r}>
            <span className={`block rounded-[var(--radius)] ${rag === r ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <Stat label={EXPIRY_META[r].label} value={hydrated ? counts[r] : "–"} color={r === "grey" ? undefined : EXPIRY_META[r].color} sub={EXPIRY_META[r].hint} />
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chips<string> allLabel="All locations" value={loc} onChange={setLoc} options={locations.map((l) => ({ value: l, label: l }))} counts={locCounts} />
      </div>

      {shown.length === 0 ? (
        <div className="card mb-4">
          <EmptyState icon={Axe} title={rows.length ? "Nobody matches this filter" : "The register is empty"} hint={rows.length ? undefined : "Add people one by one, or import the spreadsheet saved as CSV (NAME, LOCATION, EXPIRY DATE, COMMENTS)."} />
        </div>
      ) : (
        <div className="card mb-4 overflow-hidden">
          <table className="tbl hidden md:table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Course booked</th>
                <th>Comments</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const s = expiryStatus(r.expiry_date, now);
                return (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.name}</td>
                    <td>{r.location}</td>
                    <td className="whitespace-nowrap font-mono text-xs">{fmt(r.expiry_date)}</td>
                    <td>{hydrated && <Pill rag={s.rag} label={s.label} />}</td>
                    <td className="text-dim">{[r.course_booked, r.course_dates].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="max-w-xs text-dim">{r.comments || "—"}</td>
                    <td>
                      <span className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing({ ...r })} aria-label={`Edit ${r.name}`}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(r)} aria-label={`Remove ${r.name}`}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="divide-y divide-[var(--border)] md:hidden">
            {shown.map((r) => {
              const s = expiryStatus(r.expiry_date, now);
              return (
                <li key={r.id} className="flex items-start gap-3 p-3">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-xs text-dim">
                      {r.location} · expires {fmt(r.expiry_date)}
                    </span>
                    {r.comments && <span className="block text-xs text-faint">{r.comments}</span>}
                  </span>
                  {hydrated && <Pill rag={s.rag} label={s.label} />}
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing({ ...r })} aria-label={`Edit ${r.name}`}>
                    <Pencil size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <GuidancePanel sources={SOURCES.chainsaw}>
        <p className="text-sm text-dim">
          Amber from six months before expiry so the refresher can be booked; red once lapsed. Module B&apos;s EWAT checklist asks for chainsaw cover at Bedford, Leicester, Derby and Lincoln, and for chainsaw-trained staff to ride a route proving train after a shut-down.
        </p>
      </GuidancePanel>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : "Add person"}
        width="max-w-lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>
              Close
            </button>
            <button className="btn btn-primary" disabled={busy || !editing?.name.trim() || !editing?.location.trim()} onClick={save}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Save
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Name" required>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Location" required hint="Depot or MOM area">
              <input className="input" list="wr-locations" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              <datalist id="wr-locations">
                {[...new Set([...locations, "Derby", "Nottingham", "Leicester", "Kettering", "Lincoln", "Bedford"])].map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </Field>
            <Field label="Expiry date">
              <input className="input" type="date" value={editing.expiry_date ?? ""} onChange={(e) => setEditing({ ...editing, expiry_date: toIsoDate(e.target.value) })} />
            </Field>
            <Field label="Course booked" hint="Core, add-on…">
              <input className="input" value={editing.course_booked ?? ""} onChange={(e) => setEditing({ ...editing, course_booked: e.target.value || null })} />
            </Field>
            <Field label="Course dates">
              <input className="input" value={editing.course_dates ?? ""} onChange={(e) => setEditing({ ...editing, course_dates: e.target.value || null })} />
            </Field>
            <Field label="Comments">
              <input className="input" value={editing.comments ?? ""} onChange={(e) => setEditing({ ...editing, comments: e.target.value || null })} />
            </Field>
          </div>
        )}
      </Drawer>
    </>
  );
}
