"use client";

// The logbook rows shared by the page, the sidebar and the palette, refreshed every 10 seconds
// (as the original page did) and after every change, plus the actions the palette can request.

import { useEffect, useSyncExternalStore } from "react";
import { listPoints } from "./data.ts";
import type { PointRow } from "./points.ts";

export interface LogState {
  rows: PointRow[];
  loaded: boolean;
  error: string | null;
  updatedAt: number | null;
}

let state: LogState = { rows: [], loaded: false, error: null, updatedAt: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<LogState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const get = () => state;

export function useLog(): LogState {
  return useSyncExternalStore(subscribe, get, get);
}

let paused = 0;
/** Hold the background refresh while a write is in flight, so the table does not jump. */
export function pauseRefresh(on: boolean): void {
  paused = Math.max(0, paused + (on ? 1 : -1));
}

export async function refresh(): Promise<void> {
  try {
    const rows = await listPoints();
    set({ rows, loaded: true, error: null, updatedAt: Date.now() });
  } catch (e) {
    set({ loaded: true, error: (e as Error).message });
  }
}

export function useLogPolling(): void {
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!paused) void refresh();
    }, 10_000);
    return () => clearInterval(id);
  }, []);
}

// ------------------------------------------------------------------ actions

export type LogAction = { kind: "add" } | { kind: "edit"; key?: string } | { kind: "focus"; key: string };
const EVENT = "points:action";

export function requestAction(a: LogAction): void {
  window.dispatchEvent(new CustomEvent<LogAction>(EVENT, { detail: a }));
}

export function useActionListener(handler: (a: LogAction) => void): void {
  useEffect(() => {
    const on = (e: Event) => handler((e as CustomEvent<LogAction>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [handler]);
}
