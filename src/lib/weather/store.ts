"use client";

// The Route 7 Day Forecast as this system reads it from DLog2, shared by the shell, the overview
// and every section; refreshed every ten minutes (DLog2 ingests it once a morning).

import { useEffect, useSyncExternalStore } from "react";
import { loadForecast } from "./data.ts";
import type { Forecast } from "./forecast.ts";

export interface ForecastState {
  forecast: Forecast | null;
  loaded: boolean;
  error: string | null;
  updatedAt: number | null;
}

let state: ForecastState = { forecast: null, loaded: false, error: null, updatedAt: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<ForecastState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const get = () => state;

export function useForecast(): ForecastState {
  return useSyncExternalStore(subscribe, get, get);
}

let inFlight: Promise<void> | null = null;
export function refreshForecast(): Promise<void> {
  if (!inFlight) {
    inFlight = loadForecast()
      .then((forecast) => set({ forecast, loaded: true, error: null, updatedAt: Date.now() }))
      .catch((e: Error) => set({ loaded: true, error: e.message }))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useForecastPolling(intervalMs = 600_000): void {
  useEffect(() => {
    void refreshForecast();
    const id = setInterval(() => void refreshForecast(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
