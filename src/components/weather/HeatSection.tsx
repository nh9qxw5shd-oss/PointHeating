"use client";

// Hot weather and CRT: drop in the CRT RAG Report export (CSV) and the Hot Rail Forecast (PDF);
// the section lists which sites hold a risk on which day, by TME, and the air-temperature
// triggers from the forecast.

import { useCallback, useEffect, useState } from "react";
import { Flame, FileSpreadsheet, FileText, Thermometer } from "lucide-react";
import { Card, EmptyState, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { useToast } from "@/components/uiFeedback";
import { useHydrated } from "@/lib/hooks";
import { withBase } from "@/lib/weather/basePath";
import { atRiskByTme, countByBand, CRT_BAND_META, parseCrtRegister, siteRisks, type CrtBand, type HotRailForecast } from "@/lib/weather/crt";
import { latestCrtImport, latestHotRail, saveCrtImport, saveHotRail, type CrtImport, type HotRailImport } from "@/lib/weather/data";
import { HEAT, heatDays } from "@/lib/weather/flags";
import { areaName } from "@/lib/weather/forecast";
import { routeAreas } from "@/lib/weather/hotrail";
import { HEAT_JUNCTIONS_NORMAL, HEAT_JUNCTIONS_NOTE } from "@/lib/weather/sites";
import { useForecast } from "@/lib/weather/store";
import { HEAT_THRESHOLDS, SOURCES } from "@/lib/weather/thresholds";
import { FileButton, fmtDay, fmtStamp, ForecastGrid, GuidancePanel, IssueLine, TempCell } from "./bits";

const londonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

function BandPill({ band, label }: { band: CrtBand; label?: string }) {
  const m = CRT_BAND_META[band];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 15%, transparent)` }} title={m.label}>
      {label ?? m.short}
    </span>
  );
}

export default function HeatSection() {
  const toast = useToast();
  const hydrated = useHydrated();
  const { forecast: f, error: fErr, updatedAt } = useForecast();
  const [reg, setReg] = useState<CrtImport | null | undefined>(undefined);
  const [hot, setHot] = useState<HotRailImport | null | undefined>(undefined);
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);
  const [band, setBand] = useState<CrtBand | "">("");

  // The latest drop-ins; state is set from the promise's callbacks, never in the effect body.
  const load = useCallback(
    () =>
      Promise.all([latestCrtImport(), latestHotRail()])
        .then(([r, h]) => {
          setReg(r);
          setHot(h);
        })
        .catch((e: Error) => {
          toast.error(e.message);
          setReg(null);
          setHot(null);
        }),
    [toast],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function onCsv(file: File) {
    setBusy("csv");
    try {
      const sites = parseCrtRegister(await file.text());
      await saveCrtImport(sites, londonToday(), file.name);
      toast.success(`${sites.length} CRT sites imported; Rail Day 1 is today`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onPdf(file: File) {
    setBusy("pdf");
    try {
      const res = await fetch(withBase("/api/hotrail"), { method: "POST", body: file, headers: { "content-type": "application/pdf" } });
      const body = (await res.json()) as HotRailForecast & { error?: string };
      if (!res.ok || body.error) throw new Error(body.error ?? `Parsing failed (${res.status})`);
      if (!routeAreas(body).length) throw new Error("No East Midlands or London North panel found in that PDF.");
      await saveHotRail(body, file.name);
      toast.success(`Hot rail forecast valid from ${body.valid_from ?? "?"} imported`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (reg === undefined || hot === undefined) return <PageSkeleton kind="stats" />;

  const risks = reg ? siteRisks(reg.sites, reg.day1_date, hot) : [];
  const counts = countByBand(risks);
  const groups = atRiskByTme(band ? risks.filter((r) => r.worst === band) : risks);
  const dates = risks[0]?.days.map((d) => d.date) ?? [];
  const em = hot ? routeAreas(hot) : [];
  const stale = reg && reg.day1_date < londonToday();

  return (
    <>
      <PageHeader
        eyebrow="Summer"
        title="Hot weather and CRT"
        subtitle={<IssueLine f={f} updatedAt={hydrated ? updatedAt : null} error={fErr} />}
        actions={
          <>
            <FileButton accept=".csv,text/csv" label="CRT register (CSV)" busy={busy === "csv"} onFile={onCsv} primary />
            <FileButton accept=".pdf,application/pdf" label="Hot rail forecast (PDF)" busy={busy === "pdf"} onFile={onPdf} />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="CRT register" value={reg ? reg.sites.length : "—"} sub={reg ? `${reg.source_name ?? "export"} · Rail Day 1 = ${fmtDay(reg.day1_date)}${stale ? " · drop in today's" : ""}` : "drop in the Power BI export"} icon={FileSpreadsheet} color={stale ? "var(--moderate)" : undefined} />
        <Stat label="Hot rail forecast" value={hot ? fmtDay(hot.valid_from ?? hot.imported_at.slice(0, 10)) : "—"} sub={hot ? `issued ${fmtStamp(hot.issued_at)}${hot.issued_by ? ` by ${hot.issued_by}` : ""}` : "drop in the MetDesk PDF"} icon={FileText} />
        {(["twenty", "speed"] as CrtBand[]).map((b) => (
          <button key={b} className="text-left" onClick={() => setBand(band === b ? "" : b)} aria-pressed={band === b}>
            <span className={`block rounded-[var(--radius)] ${band === b ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <Stat label={CRT_BAND_META[b].label} value={reg ? counts[b] : "—"} sub={b === "twenty" ? `+ ${counts.warning} at warning` : "sites reaching the band this week"} color={counts[b] ? CRT_BAND_META[b].color : undefined} icon={Thermometer} />
            </span>
          </button>
        ))}
      </div>

      {em.length > 0 && (
        <Card title="Hot rail forecast" subtitle={`Max rail temperature (°C) at the time of max; valid ${hot?.valid_from ?? "?"} to ${hot?.valid_to ?? "?"}`} className="mb-4" padded={false}>
          <div className="overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead>
                <tr>
                  <th>Area</th>
                  {em[0].days.map((d) => (
                    <th key={d.day + d.date} className="text-center">
                      {d.date ? fmtDay(d.date) : d.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {em.map((a) => (
                  <tr key={a.name}>
                    <td className="font-semibold">{a.name.replace("LNE and EM - ", "")}</td>
                    {a.days.map((d) => (
                      <td key={d.day + d.date} className="text-center">
                        <span className="font-mono text-sm font-semibold tnum" style={d.max_rail != null && d.max_rail >= 46 ? { color: "var(--poor)" } : d.max_rail != null && d.max_rail >= 40 ? { color: "var(--moderate)" } : undefined}>
                          {d.max_rail ?? "—"}
                        </span>
                        <span className="block text-[10px] text-faint">
                          air {d.max_air ?? "—"} · {d.time_of_max}
                          {d.period_above_46 && d.period_above_46 !== "N/A" ? ` · >46: ${d.period_above_46}` : ""}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!reg ? (
        <div className="card mb-4">
          <EmptyState icon={Flame} title="No CRT register yet" hint="Export the National CRT RAG Report's table (Export data → underlying data, CSV) and drop it in; the hot rail forecast PDF can follow." />
        </div>
      ) : groups.length === 0 ? (
        <div className="card mb-4">
          <EmptyState icon={Flame} title={band ? "No site reaches that band" : "No CRT site at risk this week"} hint={`${reg.sites.length} sites checked against their CRT values with the register's forecast${hot ? " and the hot rail forecast" : ""}.`} />
        </div>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {groups.map((g) => (
            <Card key={g.tme} title={g.tme} subtitle={`${g.sites.length} site${g.sites.length === 1 ? "" : "s"} at risk`} padded={false}>
              <div className="overflow-x-auto">
                <table className="tbl min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>ELR / mileage</th>
                      <th className="text-center">CRT W / 30-60 / 20</th>
                      {dates.map((d) => (
                        <th key={d} className="text-center">
                          {fmtDay(d, false)}
                          <span className="block font-mono text-[10px] font-normal text-faint">{d.slice(8)}/{d.slice(5, 7)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.sites.map((r) => (
                      <tr key={r.site.name + r.site.track_id}>
                        <td>
                          <span className="block text-sm font-semibold">{r.site.name}</span>
                          <span className="block text-xs text-faint">
                            {r.site.line_speed} · track {r.site.track_id} · {r.area.replace("LNE and EM - ", "")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap font-mono text-xs">
                          {r.site.elr} {r.site.mileage}
                        </td>
                        <td className="whitespace-nowrap text-center font-mono text-xs">
                          {r.site.crt_w ?? "—"} / {r.site.crt_speed ?? "—"} / {r.site.crt_20 ?? "—"}
                        </td>
                        {r.days.map((d) => (
                          <td key={d.date} className="text-center" title={`site forecast ${d.site_rail ?? "—"}, area forecast ${d.area_rail ?? "—"}`}>
                            {d.band === "none" ? <span className="font-mono text-xs text-faint">{d.rail ?? "—"}</span> : <BandPill band={d.band} label={`${d.rail} ${CRT_BAND_META[d.band].short}`} />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {f && f.days.length > 0 && (
        <div className="mb-4">
          <ForecastGrid
            f={f}
            title="Air temperature triggers"
            subtitle={`Forecast maximum (°C): ${HEAT.COMMAND_C} strategic command · ${HEAT.OLE_SOUTH_C} OLE BSR south of Bedford · ${HEAT.TRACK_BSR_C} track BSR · ${HEAT.OLE_40_C} 40 mph OLE`}
            cell={(d, k) => {
              const h = heatDays(k, f.days).find((x) => x.date === d.forecast_date);
              return (
                <div className="flex flex-col items-center">
                  <TempCell value={d.max_temp} band={h?.band} />
                  {h && h.band !== "none" && <span className="text-[10px] font-semibold text-dim">{h.band === "command" ? "command" : h.band === "ole_south" ? "OLE S" : h.band === "track_bsr" ? "track BSR" : "40 OLE"}</span>}
                </div>
              );
            }}
            summary={(k) => areaName(k, f.days) === "London - Luton" ? "south of Bedford" : ""}
          />
        </div>
      )}

      <GuidancePanel sources={SOURCES.heat} tables={[HEAT_THRESHOLDS]}>
        <div className="space-y-3 text-sm text-dim">
          <p>
            <b className="text-ink">How a site is placed.</b> Each day the higher of the register&apos;s own rail forecast for the site and the hot rail forecast for its area (Luton TME in London North, the rest in East Midlands) is compared with the site&apos;s CRT values: at or above <b className="text-ink">CRT (W)</b> the site is watched; at or above <b className="text-ink">CRT (30/60)</b> its speed restriction applies (40/70 mph since May 2026; the column keeps the register&apos;s name); at or above <b className="text-ink">CRT (20)</b> the 20 mph restriction. Rail Day 1 in the register is taken as the day it is dropped in.
          </p>
          <p>
            <b className="text-ink">Junctions kept in normal from {HEAT.COMMAND_C} °C:</b> {HEAT_JUNCTIONS_NORMAL.join(", ")}. {HEAT_JUNCTIONS_NOTE} From {HEAT.OLE_SOUTH_C} °C all points south of Bedford (Bedford excepted).
          </p>
        </div>
      </GuidancePanel>
    </>
  );
}
