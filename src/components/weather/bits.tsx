"use client";

// Small pieces the weather sections share: level pills, the area-by-day forecast grid, guidance
// panels and a file drop button. Built from the kit's classes only.

import { useRef, useState, type ReactNode } from "react";
import { BookOpen, Loader2, Upload } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { byArea, forecastDates, LEVEL_META, type Forecast, type ForecastDay, type Level } from "@/lib/weather/forecast";
import type { SourceDoc, ThresholdTable } from "@/lib/weather/thresholds";

export function fmtDay(iso: string, withDate = true): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "short", ...(withDate ? { day: "2-digit", month: "short" } : {}), timeZone: "UTC" });
}

export function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export function LevelPill({ level, label }: { level: Level; label?: string }) {
  const m = LEVEL_META[level];
  return (
    <Badge color={m.color} dot>
      {label ?? m.label}
    </Badge>
  );
}

export function IssueLine({ f, updatedAt, error }: { f: Forecast | null; updatedAt: number | null; error: string | null }) {
  if (error) return <span className="text-poor">{error}</span>;
  if (!f) return <span>Loading the Route 7 Day Forecast…</span>;
  return (
    <span>
      Route 7 Day Forecast issued {fmtStamp(f.issue.issued_at)} (via DLog2)
      {updatedAt ? ` · read ${new Date(updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
    </span>
  );
}

/**
 * Areas down, dates across. `cell` renders one area-day; `summary` an optional line under the
 * area name. Phones scroll the grid sideways inside the card.
 */
export function ForecastGrid({
  f,
  cell,
  summary,
  title,
  subtitle,
  action,
  maxDays = 7,
}: {
  f: Forecast;
  cell: (d: ForecastDay, areaKey: string) => ReactNode;
  summary?: (areaKey: string, days: ForecastDay[]) => ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  maxDays?: number;
}) {
  const dates = forecastDates(f.days).slice(0, maxDays);
  const areas = byArea(f.days);
  return (
    <Card title={title} subtitle={subtitle} action={action} padded={false}>
      <div className="overflow-x-auto">
        <table className="tbl min-w-[640px]">
          <thead>
            <tr>
              <th>Area</th>
              {dates.map((d, i) => (
                <th key={d} className="text-center">
                  <span className="block">{fmtDay(d, false)}</span>
                  <span className="block font-mono text-[10px] font-normal text-faint">{i === 0 ? "today" : d.slice(8) + "/" + d.slice(5, 7)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.key}>
                <td className="whitespace-nowrap">
                  <span className="block text-sm font-semibold">{a.name}</span>
                  {summary && <span className="block text-xs text-dim">{summary(a.key, a.days)}</span>}
                </td>
                {dates.map((d) => {
                  const day = a.days.find((x) => x.forecast_date === d);
                  return (
                    <td key={d} className="text-center align-top">
                      {day ? cell(day, a.key) : <span className="text-faint">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TempCell({ value, band, unit = "°" }: { value: number | null; band?: "none" | "watch" | "act" | "command" | "ole_south" | "track_bsr" | "ole_40"; unit?: string }) {
  const color = band === "act" || band === "track_bsr" || band === "ole_40" ? "var(--poor)" : band === "watch" || band === "command" || band === "ole_south" ? "var(--moderate)" : undefined;
  return (
    <span className="font-mono text-sm font-semibold tnum" style={color ? { color } : undefined}>
      {value == null ? "—" : `${value}${unit}`}
    </span>
  );
}

export function ThresholdTableView({ t }: { t: ThresholdTable }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold">{t.title}</div>
      <div className="mb-2 text-xs text-faint">{t.source}</div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Level</th>
              {t.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap font-semibold">{r.level}</td>
                {r.cells.map((c, j) => (
                  <td key={j} className="text-dim">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.note && <p className="mt-2 text-xs text-dim">{t.note}</p>}
    </div>
  );
}

export function GuidancePanel({ sources, tables = [], children }: { sources: SourceDoc[]; tables?: ThresholdTable[]; children?: ReactNode }) {
  return (
    <Card title="Guidance and sources" subtitle="The documents in the route's weather resilience folder that this section follows">
      <div className="space-y-5">
        {children}
        {tables.map((t) => (
          <ThresholdTableView key={t.title} t={t} />
        ))}
        <div>
          <div className="mb-2 text-sm font-bold">Documents</div>
          <ul className="space-y-1.5 text-sm">
            {sources.map((s) => (
              <li key={s.title} className="flex items-start gap-2">
                <BookOpen size={14} className="mt-0.5 shrink-0 text-faint" />
                <span>
                  <span className="font-semibold">{s.title}</span>
                  {s.ref && <span className="text-faint"> · {s.ref}</span>}
                  {s.note && <span className="block text-xs text-dim">{s.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/** A button that opens the file picker and hands the chosen file over. */
export function FileButton({ accept, label, busy, onFile, primary = false }: { accept: string; label: string; busy?: boolean; onFile: (f: File) => void; primary?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button
        className={`btn ${primary ? "btn-primary" : "btn-ghost border border-edge"} ${drag ? "ring-2 ring-[var(--accent)]" : ""}`}
        disabled={busy}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        title="Choose a file, or drop it here"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {label}
      </button>
    </>
  );
}

export function AreaChips({ keys, names }: { keys: string[]; names: (k: string) => string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <span key={k} className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold text-dim">
          {names(k)}
        </span>
      ))}
    </span>
  );
}
