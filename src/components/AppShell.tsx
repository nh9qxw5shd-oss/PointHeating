"use client";

// Application shell (Autumn Hub kit): sidebar with the sections, a top bar with search, the
// week's weather status, the London clock and the theme toggle. The hub hides the sidebar and
// the duplicated controls by the selectors in 09 §4.2, so those stay exactly as they are.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useLayoutEffect, useRef, useState } from "react";
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Sun, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useHydrated, useLocalStorage, useNow } from "@/lib/hooks";
import { NAV, navFor } from "@/lib/nav";
import { AREAS, status, summarise } from "@/lib/points/points";
import { requestAction, useLog, useLogPolling } from "@/lib/points/store";
import { headlines } from "@/lib/weather/flags";
import { useForecast, useForecastPolling } from "@/lib/weather/store";
import { CommandPalette, openPalette } from "@/components/CommandPalette";
import ManageDrawer from "@/components/points/ManageDrawer";

// A sun over a rail line in Network Rail orange (same mark as the favicon, src/app/icon.svg).
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <g fill="none" stroke="#F26522" strokeWidth="2.4" strokeLinecap="round">
        <path d="M5 26 27 6" />
        <path d="M5 26h22" />
        <path d="M16 4v6M13 7h6M14 5.5l4 3M18 5.5l-4 3" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- sidebar

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const params = useSearchParams();
  const area = params.get("area") ?? "";
  const { rows } = useLog();
  const now = useNow(60_000).getTime();
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const onPoints = path === "/points" || path.startsWith("/points/");

  useLayoutEffect(() => {
    const list = listRef.current;
    const ind = indicatorRef.current;
    if (!list || !ind) return;
    const active = list.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) {
      ind.style.opacity = "0";
      return;
    }
    const lr = list.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    ind.style.opacity = "1";
    ind.style.transform = `translateY(${ar.top - lr.top + 6}px)`;
    ind.style.height = `${ar.height - 12}px`;
  }, [path, area]);

  return (
    <div ref={listRef} className="relative">
      <span ref={indicatorRef} className="nav-indicator" style={{ top: 0, opacity: 0 }} />
      {NAV.map((g) => (
        <div key={g.label}>
          <div className="nav-group-label">{g.label}</div>
          {g.items.map((i) => {
            const current = i.href === "/" ? path === "/" : (path === i.href || path.startsWith(i.href + "/")) && !(i.href === "/points" && area);
            return (
              <Link key={i.href} href={i.href} className="nav-item" aria-current={current ? "page" : undefined} title={i.desc} onClick={onNavigate}>
                <i.icon size={17} strokeWidth={2.1} />
                <span className="nav-label">{i.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      {onPoints && (
        <>
          <div className="nav-group-label">MOM areas</div>
          {AREAS.map((a) => {
            const inArea = rows.filter((r) => r.area === a);
            const red = inArea.filter((r) => status(r.last_treated_at, now).rag === "red").length;
            return (
              <Link key={a} href={`/points?area=${encodeURIComponent(a)}`} className="nav-item" aria-current={area === a ? "page" : undefined} onClick={onNavigate} title={`${inArea.length} point sets in ${a}`}>
                <span className="dot" style={{ color: red ? "var(--poor)" : inArea.length ? "var(--good)" : "var(--text-faint)" }} />
                <span className="nav-label flex flex-1 items-baseline justify-between gap-2">
                  <span>{a}</span>
                  <span className="font-mono text-[11px] text-faint">{red ? `${red} due` : inArea.length || ""}</span>
                </span>
              </Link>
            );
          })}
          <button
            className="nav-item w-[calc(100%-1rem)] text-dim"
            onClick={() => {
              requestAction({ kind: "add" });
              onNavigate?.();
            }}
          >
            <Plus size={17} />
            <span className="nav-label">Add / edit point</span>
          </button>
        </>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className="sidebar hidden lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-4 py-4">
        <BrandMark />
        <span className="nav-label leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight">Weather Resilience</span>
          <span className="block text-[11px] font-semibold text-faint">Seasonal checks and monitoring</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto pb-4">
        <Suspense>
          <SidebarNav />
        </Suspense>
      </div>
      <div className="border-t border-edge p-2">
        <button className="nav-item w-[calc(100%-1rem)] text-faint" onClick={onToggle} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span className="nav-label text-xs">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="backdrop lg:hidden" onMouseDown={onClose}>
      <div className="sheet flex h-full w-72 max-w-[85vw] flex-col border-r border-edge bg-sunken" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[15px] font-extrabold">Weather Resilience</span>
          </span>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          <Suspense>
            <SidebarNav onNavigate={onClose} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- topbar

/** The week in one chip: the worst thing the forecast asks for, or that the points log is due. */
function StatusChip() {
  const { forecast, loaded, error } = useForecast();
  const log = useLog();
  const now = useNow(60_000).getTime();
  const hydrated = useHydrated();
  if (!loaded || !hydrated) return null;
  const heads = forecast ? headlines(forecast, [...new Set(forecast.days.map((d) => d.area_key))], 3) : [];
  const red = heads.filter((h) => h.tone === "red");
  const pointsDue = log.loaded ? summarise(log.rows, now).counts.red : 0;
  const color = error ? "var(--poor)" : red.length || pointsDue ? "var(--poor)" : heads.length ? "var(--moderate)" : "var(--good)";
  const text = error ? "Forecast offline" : red.length ? red[0].text : pointsDue ? `${pointsDue} points over 48h` : heads.length ? heads[0].text : "Nothing triggered";
  return (
    <span className="chip !cursor-default max-w-[40vw] truncate" title={error ?? (heads.map((h) => h.text).join(" · ") || "No forecast threshold reached in the next three days")}>
      <span className="dot" style={{ color }} />
      {text}
    </span>
  );
}

function Clock() {
  const now = useNow(15000);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const hhmm = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const day = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "Europe/London" });
  return (
    <span className="hidden items-baseline gap-1.5 text-sm md:inline-flex" title="Europe/London">
      <span className="font-mono text-base font-semibold tabular-nums">{hhmm}</span>
      <span className="text-xs text-dim">{day}</span>
    </span>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const light = theme === "light";
  return (
    <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label={light ? "Switch to dark theme" : "Switch to light theme"} title={light ? "Switch to dark theme" : "Switch to light theme"}>
      <span key={theme} className="pop inline-flex">
        {light ? <Moon size={17} /> : <Sun size={17} />}
      </span>
    </button>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const path = usePathname();
  const here = navFor(path);
  return (
    <header className="topbar glass flex items-center gap-2 px-3 sm:px-4">
      <button className="btn btn-ghost btn-icon lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu size={18} />
      </button>
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <BrandMark size={22} />
        <span className="text-sm font-extrabold">{here?.short ?? "Weather"}</span>
      </Link>
      <button className="btn btn-ghost ml-1 hidden min-w-[220px] justify-start gap-2 border border-edge bg-sunken text-dim sm:flex" onClick={() => openPalette()} title="Find a section or a point set">
        <Search size={15} />
        <span className="flex-1 text-left text-xs font-medium">Find a section or point…</span>
        <span className="flex gap-0.5">
          <kbd className="kbd">Ctrl</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>
      <button className="btn btn-ghost btn-icon sm:hidden" onClick={() => openPalette()} aria-label="Search">
        <Search size={18} />
      </button>
      <div className="flex-1" />
      <StatusChip />
      <Clock />
      <ThemeToggle />
    </header>
  );
}

// ------------------------------------------------------------------ shell

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage("points_nav_collapsed", false);
  const [menuOpen, setMenuOpen] = useState(false);
  useLogPolling();
  useForecastPolling();
  return (
    <div className="app-shell" data-collapsed={collapsed ? "true" : "false"}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <main className="content flex-1">{children}</main>
        <footer className="content !py-4 text-xs text-faint">Weather Resilience · Derby Control · Forecast from the NR Route 7 Day Forecast via DLog2; thresholds from the route&apos;s seasonal plans</footer>
      </div>
      <CommandPalette />
      <ManageDrawer />
    </div>
  );
}
