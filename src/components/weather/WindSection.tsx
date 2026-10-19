"use client";

// High winds: the week's wind level by area, what each level asks (BESR, route proving after a
// no-train period, freight wind warning), the lines that need proving and the EWAT timeline.

import { Wind as WindIcon, Route, Users } from "lucide-react";
import { Card, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { useHydrated } from "@/lib/hooks";
import { windDays, type WindDay } from "@/lib/weather/flags";
import { areaName, LEVEL_RANK } from "@/lib/weather/forecast";
import { CHAINSAW_RESOURCE_LOCATIONS, MOM_RESOURCE_LOCATIONS, NO_TRAIN_LINES } from "@/lib/weather/sites";
import { useForecast } from "@/lib/weather/store";
import { SOURCES, WIND_THRESHOLDS } from "@/lib/weather/thresholds";
import { fmtDay, ForecastGrid, GuidancePanel, IssueLine, LevelPill } from "./bits";

const EWAT_TIMELINE: { row: string; cells: string[] }[] = [
  { row: "First day of the event", cells: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  { row: "NRWS alert horizon (T-4)", cells: ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"] },
  { row: "Heads-up message", cells: ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"] },
  { row: "First EWAT, high confidence", cells: ["Thu", "Thu", "Mon", "Mon", "Mon", "Tue", "Wed"] },
  { row: "First EWAT, low confidence", cells: ["Thu", "Fri", "Mon", "Tue", "Wed", "Wed", "Thu"] },
  { row: "NR resources confirmed", cells: ["Fri", "Mon", "Tue", "Wed", "Thu", "Fri", "Fri"] },
  { row: "Contingent timetable decided", cells: ["Fri", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] },
  { row: "Timetable uploaded", cells: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
  { row: "Final EWAT", cells: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
];

export default function WindSection() {
  const { forecast: f, error, updatedAt } = useForecast();
  const hydrated = useHydrated();
  if (!f && !error) return <PageSkeleton kind="stats" />;

  const keys = f ? [...new Set(f.days.map((d) => d.area_key))] : [];
  const wind = new Map<string, WindDay[]>(f ? keys.map((k) => [k, windDays(k, f.days)]) : []);
  const names = (k: string) => areaName(k, f?.days ?? []);
  const besr = keys.filter((k) => wind.get(k)?.some((d) => d.besr));
  const proving = keys.filter((k) => wind.get(k)?.some((d) => d.routeProving));
  const firstProving = proving.map((k) => wind.get(k)!.find((d) => d.routeProving)!.date).sort()[0];
  const aware = keys.filter((k) => wind.get(k)?.some((d) => LEVEL_RANK[d.level] >= LEVEL_RANK.AWARE));
  const linesDue = NO_TRAIN_LINES.filter((l) => proving.includes(l.area_key));

  return (
    <>
      <PageHeader eyebrow="All year" title="High winds" subtitle={<IssueLine f={f} updatedAt={hydrated ? updatedAt : null} error={error} />} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="50 mph BESR" value={besr.length ? besr.map(names).join(", ") : "None"} sub="Extreme: gusts 60 mph or mean 50 mph or over" icon={WindIcon} color={besr.length ? "var(--poor)" : undefined} />
        <Stat label="Route proving" value={proving.length ? proving.map(names).join(", ") : "None"} sub={proving.length ? `Adverse or above from ${fmtDay(firstProving)}` : "after a no-train period at Adverse or above"} icon={Route} color={proving.length ? "var(--moderate)" : undefined} />
        <Stat label="Freight wind warning" value={aware.length ? "Possible" : "None"} sub="NOC issues it at forecast gusts over 40 mph (Aware and above)" color={aware.length ? "var(--moderate)" : undefined} />
        <Stat label="Lines to prove" value={linesDue.length} sub={`of ${NO_TRAIN_LINES.length} with a daily no-train period`} icon={Users} />
      </div>

      {f && f.days.length > 0 && (
        <div className="mb-4">
          <ForecastGrid
            f={f}
            title="Wind by area"
            subtitle="The Wind risk from the Route 7 Day Forecast; Adverse brings route proving into play, Extreme the BESR"
            cell={(d, k) => {
              const w = wind.get(k)?.find((x) => x.date === d.forecast_date);
              if (!w || w.level === "GREEN") return <span className="dot" style={{ color: "var(--good)" }} />;
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <LevelPill level={w.level} />
                  {w.besr ? <span className="text-[10px] font-bold text-poor">50 mph BESR</span> : w.routeProving ? <span className="text-[10px] font-semibold text-dim">route proving</span> : null}
                </div>
              );
            }}
          />
        </div>
      )}

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Card title="Lines with a daily no-train period" subtitle="Proving run (first service at caution, or a dedicated train with chainsaw staff) after Adverse or Extreme winds overnight">
          <ul className="space-y-1.5 text-sm">
            {NO_TRAIN_LINES.map((l) => {
              const due = proving.includes(l.area_key);
              return (
                <li key={l.line} className="flex items-center gap-2">
                  <span className="dot" style={{ color: due ? "var(--moderate)" : "var(--text-faint)" }} />
                  <span className={due ? "font-semibold" : ""}>{l.line}</span>
                  <span className="text-xs text-faint">{names(l.area_key)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Resources the EWAT checks" subtitle="Module B Appendix A: additional MOM, Off-Track and chainsaw cover by location">
          <div className="space-y-3 text-sm">
            <div>
              <div className="lbl">MOM</div>
              <p className="text-dim">{MOM_RESOURCE_LOCATIONS.join(" · ")}</p>
            </div>
            <div>
              <div className="lbl">Off-Track and chainsaw</div>
              <p className="text-dim">{CHAINSAW_RESOURCE_LOCATIONS.join(" · ")} · see the chainsaw competency section for who is in date</p>
            </div>
            <div>
              <div className="lbl">Storm surge</div>
              <p className="text-dim">Easterly winds with high tides and river levels: Boston – Skegness, worst at Boston and east of Thorpe Culvert; review Boston out-stabling.</p>
            </div>
          </div>
        </Card>
      </div>

      <details className="card mb-4">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-bold">EWAT timeline by first day of the event (Module B §2.2)</summary>
        <div className="overflow-x-auto border-t border-edge">
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                {EWAT_TIMELINE[0].cells.map((c) => (
                  <th key={c} className="text-center">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EWAT_TIMELINE.slice(1).map((r) => (
                <tr key={r.row}>
                  <td className="whitespace-nowrap font-semibold">{r.row}</td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="text-center text-dim">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <GuidancePanel sources={SOURCES.wind} tables={[WIND_THRESHOLDS]}>
        <div className="space-y-3 text-sm text-dim">
          <p>
            <b className="text-ink">Imposing a BESR.</b> Proactively by late notice wire (speed, WON sections, start and finish) supplemented by berth-triggered GSM-R broadcasts; across the whole WON line of route where possible, never more than two sections. Reactively, by stopping trains out of course, GSM-R broadcasts or advice at station dwells when conditions on the day outrun the forecast (squall lines and gust fronts show on the rainfall radar).
          </p>
          <p>
            <b className="text-ink">Lifting it.</b> MetDesk observations show the peak has passed and the hourly forecast confirms the fall, plus 60 minutes without wind-related incidents; a withdrawal wire, with drivers also told at origins, by stopping trains or by berth-triggered announcements. Cross-boundary services are told the withdrawal applies on East Midlands only.
          </p>
        </div>
      </GuidancePanel>
    </>
  );
}
