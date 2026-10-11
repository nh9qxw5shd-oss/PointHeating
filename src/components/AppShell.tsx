"use client";

// Application shell (Autumn Hub kit): sidebar with the logbook and each MOM area (with how many of
// its points are over 48 hours), a top bar with search, the overall status, the London clock and
// the theme toggle.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Sun, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useHydrated, useLocalStorage, useNow } from "@/lib/hooks";
import { AREAS, status, summarise } from "@/lib/points/points";
import { requestAction, useLog, useLogPolling } from "@/lib/points/store";
import { CommandPalette, openPalette } from "@/components/CommandPalette";
import ManageDrawer from "@/components/points/ManageDrawer";

// Points crossing with a snowflake in Network Rail orange (same mark as the favicon, src/app/icon.svg).
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
      <div className="nav-group-label">Logbook</div>
      <Link href="/" className="nav-item" aria-current={path === "/" && !area ? "page" : undefined} title="Every point set, grouped by MOM area" onClick={onNavigate}>
        <BookOpen size={17} strokeWidth={2.1} />
        <span className="nav-label">All areas</span>
      </Link>
      <div className="nav-group-label">MOM areas</div>
      {AREAS.map((a) => {
        const inArea = rows.filter((r) => r.area === a);
        const red = inArea.filter((r) => status(r.last_treated_at, now).rag === "red").length;
        return (
          <Link key={a} href={`/?area=${encodeURIComponent(a)}`} className="nav-item" aria-current={area === a ? "page" : undefined} onClick={onNavigate} title={`${inArea.length} point sets in ${a}`}>
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
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className="sidebar hidden lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-4 py-4">
        <BrandMark />
        <span className="nav-label leading-tight">
          <span className="block text-[15px] font-extrabold tracking-tight">Winter Points</span>
          <span className="block text-[11px] font-semibold text-faint">Killfrost treatment log</span>
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
            <span className="text-[15px] font-extrabold">Winter Points</span>
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

function StatusChip() {
  const { rows, loaded, error } = useLog();
  const now = useNow(60_000).getTime();
  const hydrated = useHydrated();
  if (!loaded || !hydrated) return null;
  const s = summarise(rows, now);
  const color = error ? "var(--poor)" : s.counts.red ? "var(--poor)" : s.counts.amber ? "var(--moderate)" : "var(--good)";
  const text = error ? "Offline" : s.counts.red ? `${s.counts.red} over 48h` : s.counts.amber ? `${s.counts.amber} at 24–48h` : "All in date";
  return (
    <span className="chip !cursor-default" title={error ?? `${s.total} point sets`}>
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
  return (
    <header className="topbar glass flex items-center gap-2 px-3 sm:px-4">
      <button className="btn btn-ghost btn-icon lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu size={18} />
      </button>
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <BrandMark size={22} />
        <span className="text-sm font-extrabold">Points</span>
      </Link>
      <button className="btn btn-ghost ml-1 hidden min-w-[220px] justify-start gap-2 border border-edge bg-sunken text-dim sm:flex" onClick={() => openPalette()} title="Find a point or an action">
        <Search size={15} />
        <span className="flex-1 text-left text-xs font-medium">Find a point…</span>
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
  return (
    <div className="app-shell" data-collapsed={collapsed ? "true" : "false"}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <main className="content flex-1">{children}</main>
        <footer className="content !py-4 text-xs text-faint">Winter Points Logbook · Derby Control · Green under 24h, amber 24–48h, red 48h and over since last treatment</footer>
      </div>
      <CommandPalette />
      <ManageDrawer />
    </div>
  );
}
