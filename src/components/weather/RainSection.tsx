"use client";

// Rainfall, earthworks and flood sites: the week's rain risk by area, the flood sites whose
// checks the forecast suggests (with the site's own actions and a log of checks), the earthworks
// risk sites and the operational sections that take a BESR in an extreme event.

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CloudRain, Droplets, Loader2, Mountain } from "lucide-react";
import { Card, Chips, Field, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { useToast } from "@/components/uiFeedback";
import { useHydrated, useLocalStorage } from "@/lib/hooks";
import { listFloodChecks, recordFloodCheck, type FloodCheck } from "@/lib/weather/data";
import { rainDays, type RainDay } from "@/lib/weather/flags";
import { areaName, LEVEL_META, LEVEL_RANK, type Level } from "@/lib/weather/forecast";
import { EARTHWORKS_SITES, FLOOD_SITES, OP_SECTIONS, type FloodSite } from "@/lib/weather/sites";
import { useForecast } from "@/lib/weather/store";
import { CAT_THRESHOLDS, EWAT_LITE_TRIGGERS, SOURCES } from "@/lib/weather/thresholds";
import { fmtDay, fmtStamp, ForecastGrid, GuidancePanel, IssueLine, LevelPill } from "./bits";

const FINDINGS: { value: FloodCheck["finding"]; label: string; color: string }[] = [
  { value: "clear", label: "Clear", color: "var(--good)" },
  { value: "high_water", label: "High water", color: "var(--moderate)" },
  { value: "flooding", label: "Flooding", color: "var(--poor)" },
];

function CheckForm({ site, onDone }: { site: FloodSite; onDone: () => void }) {
  const toast = useToast();
  const [who, setWho] = useLocalStorage("wr_checked_by", "");
  const [finding, setFinding] = useState<FloodCheck["finding"]>("clear");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await recordFloodCheck(site.key, finding, notes.trim(), who.trim());
      toast.success(`${site.name}: ${FINDINGS.find((f) => f.value === finding)?.label.toLowerCase()} recorded`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
      <Field label="Finding">
        <select className="input" value={finding} onChange={(e) => setFinding(e.target.value as FloodCheck["finding"])}>
          {FINDINGS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Checked by">
        <input className="input" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Name or desk" />
      </Field>
      <Field label="Notes">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Water level, trash screen, what was done" />
      </Field>
      <button className="btn btn-primary" disabled={busy} onClick={submit}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Record check
      </button>
    </div>
  );
}

export default function RainSection() {
  const { forecast: f, error, updatedAt } = useForecast();
  const hydrated = useHydrated();
  const [checks, setChecks] = useState<FloodCheck[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [area, setArea] = useState("");

  // State is set from the promise's callbacks, never in the effect body.
  const load = useCallback(
    () =>
      listFloodChecks(14)
        .then(setChecks)
        .catch(() => setChecks([])),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  if (!f && !error) return <PageSkeleton kind="stats" />;

  const keys = f ? [...new Set(f.days.map((d) => d.area_key))] : [];
  const rain = new Map<string, RainDay[]>(f ? keys.map((k) => [k, rainDays(k, f.days)]) : []);
  const names = (k: string) => areaName(k, f?.days ?? []);
  // The worst rain level per area over the next three days drives the site list.
  const worst = (k: string): Level => (rain.get(k) ?? []).slice(0, 3).reduce<Level>((w, d) => (LEVEL_RANK[d.level] > LEVEL_RANK[w] ? d.level : w), "GREEN");
  const firstFlag = (k: string) => (rain.get(k) ?? []).find((d) => d.floodChecks)?.date;
  const sites = FLOOD_SITES.filter((s) => !area || s.area_key === area);
  const due = sites.filter((s) => LEVEL_RANK[worst(s.area_key)] >= LEVEL_RANK.AWARE);
  const lastCheck = (key: string) => checks?.find((c) => c.site_key === key);
  const ewatAreas = keys.filter((k) => (rain.get(k) ?? []).some((d) => d.ewat !== "none"));
  const highSections = OP_SECTIONS.filter((s) => s.risk === "High" && (!area || s.area_key === area));

  return (
    <>
      <PageHeader eyebrow="All year" title="Rainfall, earthworks and flood sites" subtitle={<IssueLine f={f} updatedAt={hydrated ? updatedAt : null} error={error} />} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Flood checks suggested" value={due.length} sub={due.length ? `${[...new Set(due.map((s) => s.area_key))].map(names).join(", ")}` : "no rain risk at Aware or above"} icon={Droplets} color={due.length ? "var(--moderate)" : undefined} />
        <Stat label="EWAT" value={ewatAreas.length ? ewatAreas.map(names).join(", ") : "None"} sub="Adverse: consider · Extreme: convene" icon={CloudRain} color={ewatAreas.length ? "var(--poor)" : undefined} />
        <Stat label="Checks in 14 days" value={checks ? checks.length : "—"} sub={checks?.[0] ? `last ${fmtStamp(checks[0].checked_at)}` : "none recorded"} icon={CheckCircle2} />
        <Stat label="High-risk sections" value={highSections.length} sub="40 mph BESR in an extreme rainfall event" icon={Mountain} />
      </div>

      {f && f.days.length > 0 && (
        <div className="mb-4">
          <ForecastGrid
            f={f}
            title="Rain risk by area"
            subtitle="Heavy Rain and Convective Rainfall from the Route 7 Day Forecast; Aware or above suggests the site checks below"
            cell={(d, k) => {
              const r = rain.get(k)?.find((x) => x.date === d.forecast_date);
              if (!r || r.level === "GREEN") return <span className="dot" style={{ color: "var(--good)" }} />;
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <LevelPill level={r.level} />
                  <span className="text-[10px] text-faint">{r.risks.map((x) => x.risk.replace("Convective Rainfall", "convective").replace("Heavy Rain", "heavy")).join(" · ")}</span>
                  {r.ewat !== "none" && <span className="text-[10px] font-bold text-poor">EWAT</span>}
                </div>
              );
            }}
          />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chips<string> allLabel="All areas" value={area} onChange={setArea} options={keys.map((k) => ({ value: k, label: names(k) }))} />
      </div>

      <Card title="Flood sites" subtitle="Known flood risk sites with their monitoring and actions; record each check so the desk sees what has been looked at" className="mb-4" padded={false}>
        <ul className="divide-y divide-[var(--border)]">
          {sites.map((s) => {
            const w = worst(s.area_key);
            const suggested = LEVEL_RANK[w] >= LEVEL_RANK.AWARE;
            const last = lastCheck(s.key);
            const isOpen = open === s.key;
            return (
              <li key={s.key} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{s.name}</span>
                      <span className="font-mono text-xs text-faint">
                        {s.elr} {s.mileage}
                      </span>
                      {s.ewmp && <span className="rounded bg-sunken px-1.5 text-[10px] font-semibold text-dim">EWMP</span>}
                      {s.derogation && <span className="rounded bg-sunken px-1.5 text-[10px] font-semibold text-dim">{s.derogation} derogation</span>}
                    </span>
                    <span className="block text-xs text-dim">
                      {names(s.area_key)} · {s.tme} TME{s.monitoring ? ` · ${s.monitoring}` : ""}
                    </span>
                  </button>
                  <span className="flex flex-wrap items-center gap-2">
                    {suggested && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: LEVEL_META[w].color, background: `color-mix(in srgb, ${LEVEL_META[w].color} 15%, transparent)` }}>
                        <Droplets size={12} /> check from {fmtDay(firstFlag(s.area_key) ?? "")}
                      </span>
                    )}
                    {last ? (
                      <span className="text-xs text-dim" title={last.notes ?? undefined}>
                        <span className="dot mr-1" style={{ color: FINDINGS.find((x) => x.value === last.finding)?.color }} />
                        {FINDINGS.find((x) => x.value === last.finding)?.label} {fmtStamp(last.checked_at)}
                        {last.checked_by ? ` · ${last.checked_by}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-faint">no check in 14 days</span>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpen(isOpen ? null : s.key)}>
                      {isOpen ? "Close" : "Actions / record"}
                    </button>
                  </span>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-3 rounded-lg bg-sunken p-3 text-sm">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <div className="lbl">Following an EWAT</div>
                        <p className="text-dim">{s.after_ewat}</p>
                      </div>
                      <div>
                        <div className="lbl">High water observed</div>
                        <p className="text-dim">{s.high_water}</p>
                      </div>
                      <div>
                        <div className="lbl">Flooding evident</div>
                        <p className="text-dim">{s.flooding}</p>
                      </div>
                    </div>
                    {s.notes && <p className="text-xs text-dim">{s.notes}</p>}
                    <CheckForm
                      site={s}
                      onDone={() => {
                        setOpen(null);
                        void load();
                      }}
                    />
                    {checks && checks.filter((c) => c.site_key === s.key).length > 0 && (
                      <ul className="space-y-1 text-xs text-dim">
                        {checks
                          .filter((c) => c.site_key === s.key)
                          .slice(0, 5)
                          .map((c) => (
                            <li key={c.id}>
                              <span className="dot mr-1" style={{ color: FINDINGS.find((x) => x.value === c.finding)?.color }} />
                              {fmtStamp(c.checked_at)} · {FINDINGS.find((x) => x.value === c.finding)?.label}
                              {c.checked_by ? ` · ${c.checked_by}` : ""}
                              {c.notes ? ` · ${c.notes}` : ""}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <details className="card mb-4">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-bold">Operational sections in an extreme rainfall event ({highSections.length} high risk{area ? " in this area" : ""})</summary>
        <div className="overflow-x-auto border-t border-edge">
          <table className="tbl">
            <thead>
              <tr>
                <th>Section</th>
                <th>From</th>
                <th>To</th>
                <th>Risk</th>
                <th>Restriction</th>
              </tr>
            </thead>
            <tbody>
              {OP_SECTIONS.filter((s) => !area || s.area_key === area).map((s) => (
                <tr key={s.section}>
                  <td className="font-mono text-xs">{s.section}</td>
                  <td>{s.from}</td>
                  <td>{s.to}</td>
                  <td>
                    <span className="font-semibold" style={{ color: s.risk === "High" ? "var(--poor)" : s.risk === "Medium" ? "var(--moderate)" : "var(--text-dim)" }}>
                      {s.risk}
                    </span>
                  </td>
                  <td className="text-dim">{s.restriction ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="card mb-4">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-bold">Earthworks risk sites ({EARTHWORKS_SITES.length})</summary>
        <div className="overflow-x-auto border-t border-edge">
          <table className="tbl">
            <thead>
              <tr>
                <th>Route</th>
                <th>ELR / mileage</th>
                <th>Location</th>
                <th>ORS</th>
                <th>Risk and actions</th>
              </tr>
            </thead>
            <tbody>
              {EARTHWORKS_SITES.map((s) => (
                <tr key={s.elr + s.mileage}>
                  <td className="text-dim">{s.route}</td>
                  <td className="whitespace-nowrap font-mono text-xs">
                    {s.elr} {s.mileage}
                  </td>
                  <td>{s.location}</td>
                  <td className="font-mono text-xs">{s.ors}</td>
                  <td className="text-xs text-dim">
                    {s.risk && <span className="block">{s.risk}</span>}
                    {s.before && <span className="block">Before/during: {s.before}</span>}
                    {s.after && <span className="block">After: {s.after}</span>}
                    {!s.risk && !s.before && !s.after && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <GuidancePanel sources={SOURCES.rain} tables={[CAT_THRESHOLDS]}>
        <div className="space-y-3 text-sm text-dim">
          <p>
            <b className="text-ink">How the flags are set.</b> Heavy Rain or Convective Rainfall at <b className="text-ink">Aware</b> or above in an area suggests the proactive checks of drains, culverts and trash screens at that area&apos;s flood sites (Winter §13.2). <b className="text-ink">Adverse</b> asks for an EWAT to be considered (depending on ground saturation) and <b className="text-ink">Extreme</b> for one to be convened (Module D §2.1). In an Extreme Rainfall Event the high-risk operational sections take a 40 mph BESR unless other mitigation is in place; the BESR is lifted only on the Route Engineer&apos;s authority after inspection.
          </p>
          <p>
            <b className="text-ink">Emerging event.</b> CAT alerts at 40 mm in three hours; drivers&apos; reports of flooding or bank slips are treated as the network being compromised. Flooding confined to the track at a derogation site runs under Rule Book M3 M4; water coming down an adjacent slope means a caution until the Route Earthworks Team has been consulted.
          </p>
          <div>
            <div className="mb-1 text-sm font-bold text-ink">EWAT-lite triggers (Winter §7.6.2)</div>
            <ul className="space-y-1 text-xs">
              {EWAT_LITE_TRIGGERS.map((t, i) => (
                <li key={i}>
                  <b className="text-ink">{t.hazard} {t.alert}:</b> {t.when} → {t.action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GuidancePanel>
    </>
  );
}
