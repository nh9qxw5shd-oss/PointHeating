"use client";

// Vegetation and obscured signals: the TI181 process, a reading-time check for a reported
// obstruction, and the visibility chart.

import { useState } from "react";
import { Trees } from "lucide-react";
import { Card, Field, PageHeader } from "@/components/ui";
import { CHART_SECONDS, CHART_SPEEDS, classify, LOW_RISK_AUTHORISATION_HOURS, MITIGATED_SIGN_BACK_DAYS, SECTION_MANAGER_REVIEW_DAYS, SIGNIFICANT_SECONDS, viewingDistance } from "@/lib/weather/signals";
import { SOURCES } from "@/lib/weather/thresholds";
import { GuidancePanel } from "./bits";

const STEPS = [
  { title: "Report", body: "The signaller establishes whether the signal is visible at all times between the AWS and the signal, where it became difficult to see, the location and cause of the obstruction and whether sighting is lost for more or less than 2 seconds at permissible speed; captured on the RT3185." },
  { title: "Dual allocation", body: "The fault is allocated to both SFI staff and Vegetation Clearance; clearance staff record the situation as found (photos, measurements) before cutting, so evidence survives." },
  { title: "SFI Level 1", body: "Checks the risk against the Signal Sighting Record (or a Signal Visibility Check). An obstruction between the Minimum Reading Distance and the signal is a wrong side failure, investigated under T037 (colour light) or T038 (mechanical)." },
  { title: "Significance", body: `Significant (high risk): ${SIGNIFICANT_SECONDS} seconds or more of reading time lost at permissible speed; must be mitigated (ESR, temporary approach control, double-block working or clear on approach). Minor (low risk): under ${SIGNIFICANT_SECONDS} seconds; SFI Level 2 may authorise normal use for up to ${LOW_RISK_AUTHORISATION_HOURS} hours, operators told of the raised SPAD risk.` },
  { title: "Sign back and review", body: `SFI Level 3 may sign back mitigated working for up to ${MITIGATED_SIGN_BACK_DAYS} days. The Section Manager (Signalling) reviews every report within ${SECTION_MANAGER_REVIEW_DAYS} days; the record closes only when both allocations are complete.` },
];

export default function VegetationSection() {
  const [mph, setMph] = useState(75);
  const [yards, setYards] = useState(40);
  const [where, setWhere] = useState<"mrd" | "rrd" | "none">("mrd");
  const c = classify(mph, yards, where === "mrd", where === "rrd");

  return (
    <>
      <PageHeader eyebrow="All year" title="Vegetation and obscured signals" subtitle="Managing a signal reported difficult, or becoming difficult, to see" />

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="The process" subtitle="NR/SMTH/Part05/Module/S22 (TI 181)">
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken font-mono text-xs font-bold text-accent">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="text-dim">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Reading-time check" subtitle="How much sighting an obstruction takes at line speed">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Permissible speed (mph)">
              <input className="input" type="number" min={5} max={125} value={mph} onChange={(e) => setMph(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Obstruction length (yards)">
              <input className="input" type="number" min={0} value={yards} onChange={(e) => setYards(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Where it sits" className="col-span-2">
              <select className="input" value={where} onChange={(e) => setWhere(e.target.value as typeof where)}>
                <option value="mrd">Between the Minimum Reading Distance and the signal</option>
                <option value="rrd">Between the Required and Minimum Reading Distance only</option>
                <option value="none">Signal still readable; at risk from growth</option>
              </select>
            </Field>
          </div>
          <div className="mt-3 rounded-lg bg-sunken p-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-2xl font-extrabold tnum" style={{ color: c.risk === "high" ? "var(--poor)" : c.risk === "low" ? "var(--moderate)" : "var(--good)" }}>
                {c.seconds.toFixed(1)} s
              </span>
              <span className="font-semibold">{c.risk === "high" ? "Significant: high risk" : c.risk === "low" ? (c.wrongSide ? "Minor: low risk" : "Becoming difficult to see") : "Negligible"}</span>
              {c.wrongSide && <span className="rounded bg-raised px-1.5 text-[10px] font-bold text-poor">wrong side failure</span>}
            </div>
            <p className="mt-1 text-dim">{c.response}</p>
            <p className="mt-1 text-xs text-faint">
              {SIGNIFICANT_SECONDS} s at {mph} mph is {viewingDistance(mph, SIGNIFICANT_SECONDS).yards} yd; the MRD and RRD are on the Signal Sighting Record.
            </p>
          </div>
        </Card>
      </div>

      <details className="card mb-4">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-bold">Signal visibility chart (NR/SMS/PartZ/Z01 §5): yards for 2, 4, 5 and 10 seconds</summary>
        <div className="overflow-x-auto border-t border-edge">
          <table className="tbl">
            <thead>
              <tr>
                <th>mph</th>
                {CHART_SECONDS.map((s) => (
                  <th key={s} className="text-right">
                    {s} s
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHART_SPEEDS.map((mphRow) => (
                <tr key={mphRow}>
                  <td className="font-mono text-xs font-bold">{mphRow}</td>
                  {CHART_SECONDS.map((s) => (
                    <td key={s} className="text-right font-mono text-xs tnum">
                      {viewingDistance(mphRow, s).yards} <span className="text-faint">({viewingDistance(mphRow, s).metres} m)</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <GuidancePanel sources={SOURCES.vegetation}>
        <div className="space-y-2 text-sm text-dim">
          <p className="flex items-start gap-2">
            <Trees size={15} className="mt-0.5 shrink-0 text-accent" />
            <span>
              <b className="text-ink">Where an obscuration is judged to affect under 10% of a signal element</b> it may be treated as becoming difficult to see (NR/L2/SIG/10157). &quot;Fully&quot; and &quot;partially&quot; obscured are no longer used. Low sun is a different test guide (T036).
            </span>
          </p>
          <p>
            <b className="text-ink">High winds and leaf fall</b> bring reports in clusters: the first autumn storm, and any Adverse wind in full leaf, is when this section and the chainsaw register get used together.
          </p>
        </div>
      </GuidancePanel>
    </>
  );
}
