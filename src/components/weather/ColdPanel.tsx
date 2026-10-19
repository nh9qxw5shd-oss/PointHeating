"use client";

// Above the points logbook: tonight's and the week's minima by area, the treatment watch and the
// ice-check run, the points without heaters that need MOM attendance, and the at-risk tunnels.

import { Snowflake, ThermometerSnowflake } from "lucide-react";
import { Stat } from "@/components/ui";
import { useHydrated } from "@/lib/hooks";
import { COLD, coldDays } from "@/lib/weather/flags";
import { areaName, forecastAreaFor, FORECAST_AREAS } from "@/lib/weather/forecast";
import { ICE_TUNNELS, SNOW_POINTS, UNHEATED_POINTS } from "@/lib/weather/sites";
import { useForecast } from "@/lib/weather/store";
import { FROST_ALERTS, SNOW_ALERTS, SOURCES } from "@/lib/weather/thresholds";
import { fmtDay, ForecastGrid, GuidancePanel, IssueLine, TempCell } from "./bits";

export default function ColdPanel({ area }: { area: string }) {
  const { forecast: f, error, updatedAt } = useForecast();
  const hydrated = useHydrated();
  const keys = f ? [...new Set(f.days.map((d) => d.area_key))] : [];
  const cold = new Map(f ? keys.map((k) => [k, coldDays(k, f.days, f.history)]) : []);
  const wanted = area ? forecastAreaFor(area) : undefined;
  const shown = wanted ? keys.filter((k) => k === wanted) : keys;

  // Today's position per area, then the first date each flag lands.
  const today = shown.map((k) => cold.get(k)?.[0]).filter(Boolean);
  const act = shown.filter((k) => cold.get(k)?.some((c) => c.band === "act"));
  const watch = shown.filter((k) => cold.get(k)?.some((c) => c.band === "watch" || c.band === "act"));
  const ice = shown.filter((k) => cold.get(k)?.some((c) => c.iceCheck));
  const firstOf = (k: string, pick: (c: { band: string; iceCheck: boolean }) => boolean) => cold.get(k)?.find(pick)?.date;
  const names = (k: string) => areaName(k, f?.days ?? []);
  const lowest = today.length ? Math.min(...today.map((c) => c!.min ?? 99)) : null;

  return (
    <div className="mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lowest tonight" value={lowest == null || lowest === 99 ? "—" : `${lowest}°`} sub={f ? "air, across the areas shown" : "no forecast"} icon={ThermometerSnowflake} color={lowest != null && lowest <= COLD.ACT_C ? "var(--poor)" : lowest != null && lowest <= COLD.WATCH_C ? "var(--moderate)" : undefined} />
        <Stat label="Treatment due" value={act.length ? act.map(names).join(", ") : "None"} sub={act.length ? `sub-zero from ${fmtDay(act.map((k) => firstOf(k, (c) => c.band === "act")!).sort()[0])}` : `no sub-zero night in the week`} color={act.length ? "var(--poor)" : undefined} />
        <Stat label="Watch" value={watch.length ? watch.map(names).join(", ") : "None"} sub={`minimum at or below ${COLD.WATCH_C} °C`} color={watch.length ? "var(--moderate)" : undefined} />
        <Stat label="Ice checks" value={ice.length ? ice.map(names).join(", ") : "None"} sub={ice.length ? `from ${fmtDay(ice.map((k) => firstOf(k, (c) => c.iceCheck)!).sort()[0])}` : `${COLD.ICE_RUN_DAYS} sub-zero days or ${COLD.ICE_DAY_RUN} ice days in a row`} color={ice.length ? "var(--poor)" : undefined} />
      </div>

      {f && f.days.length > 0 && (
        <ForecastGrid
          f={{ ...f, days: f.days.filter((d) => shown.includes(d.area_key)) }}
          title="Minimum air temperature by area"
          subtitle={<IssueLine f={f} updatedAt={hydrated ? updatedAt : null} error={error} />}
          summary={(k) => FORECAST_AREAS.find((a) => a.key === k)?.mom.join(", ") ?? ""}
          cell={(d, k) => {
            const c = cold.get(k)?.find((x) => x.date === d.forecast_date);
            return (
              <div className="flex flex-col items-center">
                <TempCell value={c?.min ?? null} band={c?.band} />
                {c && c.subZeroRun > 0 && (
                  <span className="text-[10px] text-faint" title="Sub-zero days in a row">
                    {c.subZeroRun}d{d.ice_day ? " · ice day" : ""}
                  </span>
                )}
                {c?.iceCheck && (
                  <span className="text-[10px] font-bold text-poor" title={c.iceReason ?? undefined}>
                    ice checks
                  </span>
                )}
              </div>
            );
          }}
        />
      )}

      <details className="card group">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-bold">Points without heaters, at-risk tunnels and snow points</summary>
        <div className="grid gap-4 border-t border-edge p-4 md:grid-cols-3">
          <div>
            <div className="lbl">Points without heaters (Appendix K)</div>
            <p className="mb-2 text-xs text-dim">MOM attendance every {COLD.ATTEND_HOURS} hours during sub-zero spells. Outstanding heater faults are held by Control separately.</p>
            <ul className="space-y-1 text-sm">
              {UNHEATED_POINTS.filter((p) => !area || p.area === area).map((p) => (
                <li key={p.name} className="flex items-center gap-2">
                  <Snowflake size={13} className="shrink-0 text-faint" />
                  <span>
                    {p.name} <span className="text-faint">· {p.area}</span>
                    {p.attended_by !== "MOM" && <span className="block text-xs text-dim">{p.attended_by}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="lbl">Tunnels at risk of ice (Appendix G)</div>
            <p className="mb-2 text-xs text-dim">Ice patrols within 24 hours of a Red alert; ice checked by CCTV, patrol or cab ride; Structures told of any build-up.</p>
            <ul className="space-y-1 text-sm">
              {ICE_TUNNELS.filter((t) => !wanted || t.area_key === wanted).map((t) => (
                <li key={t.name + t.elr}>
                  {t.name} <span className="font-mono text-xs text-faint">{t.elr}/{t.bridge}</span>
                  {t.ole && <span className="ml-1 rounded bg-sunken px-1 text-[10px] font-semibold text-dim">OLE</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="lbl">Snow: points needing a snowman before KRS (§12.5)</div>
            <ul className="space-y-1 text-sm">
              {SNOW_POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <details className="card">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-bold">Guidance and sources</summary>
        <div className="border-t border-edge">
          <GuidancePanel sources={SOURCES.points} tables={[FROST_ALERTS, SNOW_ALERTS]}>
            <div className="text-sm text-dim">
              <p>
                <b className="text-ink">How the flags are set.</b> Treatment is <b className="text-ink">due</b> when an area&apos;s forecast minimum is at or below {COLD.ACT_C} °C (the Frost Aware line and the sub-zero condition in Appendix K). A <b className="text-ink">watch</b> starts at {COLD.WATCH_C} °C: the desk&apos;s margin for the forecast and for rail and ground running below air temperature, not a standard. <b className="text-ink">Ice checks</b> are flagged after {COLD.ICE_RUN_DAYS} sub-zero days in a row (Winter §9) or {COLD.ICE_DAY_RUN} ice days in a row, the forecast&apos;s &quot;below freezing all day&quot;, which is the flowchart&apos;s &quot;below 1 °C for more than 48 hours&quot; Red alert.
              </p>
            </div>
          </GuidancePanel>
        </div>
      </details>
    </div>
  );
}
