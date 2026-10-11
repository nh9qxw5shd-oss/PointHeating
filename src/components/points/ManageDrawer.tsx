"use client";

// Add / edit a point set. Kept apart from the table on purpose: recording treatment is "Treat
// now" on the point's row, never re-adding it. A new point that already exists in its area is
// refused and offered for editing instead.

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Info, Loader2, Pencil, Plus } from "lucide-react";
import { Drawer, Field } from "@/components/ui";
import { useDialog, useToast } from "@/components/uiFeedback";
import { addPoint, savePoint } from "@/lib/points/data";
import { AREAS, comparePoints, isDuplicate, keyOf } from "@/lib/points/points";
import { pauseRefresh, refresh, requestAction, useActionListener, useLog, type LogAction } from "@/lib/points/store";

type Mode = "add" | "edit";

export default function ManageDrawer() {
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();
  const { rows } = useLog();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("add");
  const [busy, setBusy] = useState(false);
  // add
  const [area, setArea] = useState("");
  const [point, setPoint] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  // edit
  const [editKey, setEditKey] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const pick = useCallback(
    (key: string) => {
      setEditKey(key);
      const r = rows.find((x) => keyOf(x) === key);
      setEditLocation(r?.location ?? "");
      setEditNotes(r?.notes ?? "");
    },
    [rows],
  );

  const onAction = useCallback(
    (a: LogAction) => {
      if (a.kind === "add") {
        setMode("add");
        setArea("");
        setPoint("");
        setLocation("");
        setNotes("");
        setOpen(true);
      } else if (a.kind === "edit") {
        setMode("edit");
        pick(a.key ?? "");
        setOpen(true);
      }
    },
    [pick],
  );
  useActionListener(onAction);

  const sorted = [...rows].sort(comparePoints);
  const editing = rows.find((r) => keyOf(r) === editKey);

  async function submitAdd() {
    const a = area.trim();
    const p = point.trim();
    if (!a || !p || busy) return;
    if (isDuplicate(rows, a, p)) {
      const existing = rows.find((r) => r.area === a && r.point_number.trim().toUpperCase().replace(/\s+/g, "") === p.toUpperCase().replace(/\s+/g, ""));
      const go = await dialog.confirm({
        title: "That point already exists",
        body: `${existing?.point_number ?? p} is already on the ${a} list. To record treatment use Treat now on its row; to change its location or notes, edit it.`,
        confirmLabel: "Edit it instead",
        cancelLabel: "Back",
      });
      if (go && existing) {
        setMode("edit");
        pick(keyOf(existing));
      }
      return;
    }
    setBusy(true);
    pauseRefresh(true);
    try {
      await addPoint(a, p, location.trim(), notes.trim());
      await refresh();
      toast.success(`${p} added to ${a}`);
      setOpen(false);
      router.push(`/?area=${encodeURIComponent(a)}`);
      requestAction({ kind: "focus", key: `${a}||${p}` });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      pauseRefresh(false);
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!editing || busy) return;
    setBusy(true);
    pauseRefresh(true);
    try {
      await savePoint(editing.area, editing.point_number, editLocation.trim(), editNotes.trim());
      await refresh();
      toast.success(`${editing.point_number} (${editing.area}) saved`);
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      pauseRefresh(false);
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title="Add / edit point"
      subtitle="Adding is for a point set not on the list yet"
      width="max-w-lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
          {mode === "add" ? (
            <button className="btn btn-primary" disabled={busy || !area || !point.trim()} onClick={submitAdd}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Save new point
            </button>
          ) : (
            <button className="btn btn-primary" disabled={busy || !editing} onClick={submitEdit}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />} Save changes
            </button>
          )}
        </>
      }
    >
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-edge bg-sunken p-3 text-xs text-dim">
        <Info size={15} className="mt-0.5 shrink-0 text-accent" />
        <span>
          <b className="text-ink">Treating a point?</b> Use <b className="text-ink">Treat now</b> on its row in the logbook. Nothing else is needed, and it must not be added again.
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-edge bg-sunken p-1" role="tablist">
        {(["add", "edit"] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`btn btn-sm ${mode === m ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode(m)}>
            {m === "add" ? "Add new set" : "Edit existing set"}
          </button>
        ))}
      </div>

      {mode === "add" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitAdd();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area" required>
              <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="" disabled>
                  Select area…
                </option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Point" required>
              <input className="input font-mono" value={point} onChange={(e) => setPoint(e.target.value)} placeholder="e.g. 123A" />
            </Field>
          </div>
          <Field label="Location">
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. West Jn" />
          </Field>
          <Field label="Notes">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Defective heater / none fitted" />
          </Field>
          <button type="submit" hidden />
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitEdit();
          }}
        >
          <Field label="Point set" required>
            <select className="input" value={editKey} onChange={(e) => pick(e.target.value)}>
              <option value="" disabled>
                Select a point…
              </option>
              {sorted.map((r) => (
                <option key={keyOf(r)} value={keyOf(r)}>
                  {r.area} · {r.point_number}
                  {r.location ? ` (${r.location})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <fieldset disabled={!editing} className="space-y-3">
            <Field label="Location">
              <input className="input" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </Field>
            <Field label="Notes" hint="The treatment time is not changed.">
              <input className="input" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </Field>
          </fieldset>
          <button type="submit" hidden />
        </form>
      )}
    </Drawer>
  );
}
