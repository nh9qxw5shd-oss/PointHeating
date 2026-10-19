"use client";

// Today and the week: what each hazard asks of the desk, and the forecast grid with the
// temperature extremes and non-green risks per area and day.

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CloudSun } from "lucide-react";
import { Card, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { useHydrated } from "@/lib/hooks";
import { NAV_ITEMS } from "@/lib/nav";
import { areaFlags, headlines, type Headline } from "@/lib/weather/flags";
import { areaName, FORECAST_AREAS, LEVEL_META, type ForecastDay } from "@/lib/weather/forecast";
import { useForecast } from "@/lib/weather/store";
import { AreaChips, fmtDay, ForecastGrid, IssueLine, LevelPill, TempCell } from "./bits";

const SECTION_HREF: Record<Headline["section"], string> = { points: "/points", rain: "/rain", wind: "/wind", heat: "/heat" };

function cell(d: ForecastDay, areaKey: string, flags: ReturnType<typeof areaFlags>) {
  const cold = flags.cold.find((c) => c.date === d.forecast_date);
  const heat = flags.heat.find((h) => h.date === d.forecast_date);
  const risks = Object.entries(d.risks);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex items-baseline gap-1.5">
        <TempCell value={d.max_temp} band={heat?.band} />
        <span className="text-faint">/</span>
        <TempCell value={cold?.min ?? null} band={cold?.band} />
      </span>
      {cold?.iceCheck && (
        <span className="text-[10px] font-bold text-poor" title={cold.iceReason ?? undefined}>
          ice checks
        </span>
      )}
      {risks.length === 0 ? (
        <span className="dot" style={{ color: "var(--good)" }} aria-label={`${areaKey} normal`} />
      ) : (
        <span className="flex flex-wrap justify-center gap-0.5">
          {risks.map(([r, l]) => (
            <span key={r} className="rounded px-1 text-[10px] font-semibold" style={{ color: LEVEL_META[l].color, background: `color-mix(in srgb, ${LEVEL_META[l].color} 15%, transparent)` }} title={`${r}: ${LEVEL_META[l].label}`}>
              {r.replace("Convective Rainfall", "Convective").replace("Heavy Rain", "Rain")}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export default function Overview() {
  const { forecast: f, loaded, error, updatedAt } = useForecast();
  const hydrated = useHydrated();
  if (!loaded) return <PageSkeleton kind="stats" />;

  const keys = f ? [...new Set(f.days.map((d) => d.area_key))] : [];
  const flagsByArea = new Map(f ? keys.map((k) => [k, areaFlags(k, f)]) : []);
  const heads = f ? headlines(f, keys, 3) : [];
  const names = (k: string) => areaName(k, f?.days ?? []);

  return (
    <>
      <PageHeader eyebrow="Weather resilience" title="This week" subtitle={<IssueLine f={f} updatedAt={hydrated ? updatedAt : null} error={error} />} />

      {f && f.issue.summary_24h && (
        <div className="card fade-up mb-4 flex items-start gap-3 p-4 text-sm">
          <CloudSun size={17} className="mt-0.5 shrink-0 text-accent" />
          <div className="space-y-1">
            <p>{f.issue.summary_24h}</p>
            {f.issue.summary_2_7 && <p className="text-dim">{f.issue.summary_2_7}</p>}
            {f.issue.warnings.length > 0 && <p className="text-xs font-semibold text-moderate">Met Office warnings: {f.issue.warnings.join(" · ")}</p>}
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Asked of the desk" subtitle="Next three days, from the forecast thresholds in each section">
          {heads.length === 0 ? (
            <EmptyState icon={CloudSun} title="Nothing triggered" hint="No forecast threshold is reached in the next three days." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {heads.map((h) => (
                <li key={h.section + h.text} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: h.tone === "red" ? "var(--poor)" : "var(--moderate)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{h.text}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-dim">
                      from {fmtDay(h.from)} · <AreaChips keys={h.areas} names={names} />
                    </span>
                  </span>
                  <Link href={SECTION_HREF[h.section]} className="btn btn-ghost btn-sm" title="Open the section">
                    Open <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Sections">
          <ul className="space-y-1">
            {NAV_ITEMS.filter((i) => i.href !== "/").map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-hover">
                  <i.icon size={16} className="text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{i.label}</span>
                    <span className="block truncate text-xs text-faint">{i.desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {f && f.days.length > 0 ? (
        <ForecastGrid
          f={f}
          title="Forecast by area"
          subtitle="Max / min air temperature (°C) and the non-green risks; MOM areas under each forecast area"
          summary={(k) => FORECAST_AREAS.find((a) => a.key === k)?.mom.join(", ") ?? ""}
          cell={(d, k) => cell(d, k, flagsByArea.get(k)!)}
        />
      ) : (
        <div className="card">
          <EmptyState icon={CloudSun} title="No forecast for today yet" hint="DLog2 ingests the Route 7 Day Forecast each morning; the sections work from it once it is in." />
        </div>
      )}

      <p className="mt-3 text-xs text-faint">
        Levels: {(["GREEN", "AWARE", "ADVERSE", "EXTREME"] as const).map((l) => <LevelPill key={l} level={l} />).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, " ", el] : [el]), [])}
      </p>
    </>
  );
}
