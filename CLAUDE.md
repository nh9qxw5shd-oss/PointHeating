# Weather Resilience (PointHeating)

Next.js App Router, TypeScript strict, Tailwind v4, Supabase ("Mini Project Hub", anon key).
Derby Control's seasonal and weather resilience system: ice and point heating (the Killfrost log),
hot weather and CRT, rainfall and flood sites, high winds, vegetation and obscured signals,
chainsaw competency. See README.md.

## Working here
- Checks before any push: `npm run lint`, `npm run type-check`, `npm test` (`node --test`, so
  relative imports inside `src/lib` carry the `.ts` suffix), `npm run build`.
- Rules are pure and tested. Points: `src/lib/points/points.ts` (RAG bands 24 h / 48 h, natural
  ordering, duplicate check); writes keep the original shapes (upsert on `area,point_number`,
  insert for a new set, delete by area and point number). Weather: `src/lib/weather/` (`flags.ts`
  thresholds per hazard with their sources, `crt.ts` + `hotrail.ts` the CRT register and hot rail
  forecast, `chainsaw.ts`, `signals.ts`, `sites.ts` reference lists, `thresholds.ts` the published
  tables). A threshold changes in one place and its source comment moves with it.
- Forecast: read only from DLog2's `weather_forecast_latest_days`, `weather_forecasts` and
  `weather_forecast_days` (day 0 history). Own tables are prefixed `wr_` (migrations in
  `supabase/`): `wr_crt_imports`, `wr_hotrail_forecasts`, `wr_flood_checks`, `wr_chainsaw_staff`.
  `points_winter_log` is unchanged and the hub's cockpit reads it.
- The hot rail PDF is parsed server-side (`src/app/api/hotrail/route.ts`, pdfjs); the page posts
  the file and stores the result. Hand-built URLs go through `src/lib/weather/basePath.ts`.
- `basePath` is `/weather` (`next.config.ts`); the hub (PotatOS) proxies
  `overseer.derbycontrol.co.uk/weather/*` here. `/points` redirects to `/weather/points`. Vercel
  framework comes from `vercel.json`. `public/storage-bridge.html` is byte-identical across
  systems; change all or none. Browser storage keys are prefixed `points_` (the logbook's, kept)
  and `wr_`.
- Live at `weather-resilience.derbycontrol.co.uk/weather`. Root `index.html` only redirects the
  old GitHub Pages address there; the original logbook page is in `legacy/`, kept for reference.
- Forecast areas map onto MOM areas in `src/lib/weather/forecast.ts` (`FORECAST_AREAS`); CRT
  sites map onto hot-rail areas in `crt.ts` (`hotRailAreaFor`). Both are assumptions to check
  first if a flag lands on the wrong desk.
- Overseer is the only way in (27 Oct): the Vercel project has no domain and is reached only through
  `overseer.derbycontrol.co.uk/weather` (PotatOS docs/09 §4.6). The last redirect in `next.config` sends a page
  load without Overseer's `x-overseer-hop` marker to the same address on Overseer. Absolute links
  this system hands out use `https://overseer.derbycontrol.co.uk/weather/…`. Do not add a domain.

## Design language
Autumn Hub house style (`nh9qxw5shd-oss/autumn-hub`, `web/src/`): the stylesheet, `ui.tsx` and
`uiFeedback.tsx` are copied by hand; keep them in step. Network Rail orange brand mark. Mobile
width 390 px with no horizontal scroll.

Writing and commits: no model names or identifiers in code, README, commit messages or PR text.
