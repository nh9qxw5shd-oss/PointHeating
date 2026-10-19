# Weather Resilience

Derby Control's seasonal and weather resilience system. It reads the NR Route 7 Day Forecast
(as DLog2 ingests it each morning) and turns it into what the desk has to do, section by section,
with the route's own plans as the source of every threshold.

| Section | What it does |
|---|---|
| Overview | The week by forecast area: max / min air temperature, non-green risks, and the hazards that need the desk in the next three days. |
| Ice and point heating | The Killfrost treatment log for points without working heaters, by MOM area (green under 24 h, amber 24–48 h, red 48 h or more). Above it, the forecast minima: treatment **watch** at 3 °C and **due** at 0 °C, and **ice checks** in the at-risk tunnels after three sub-zero days or two ice days in a row. Appendix K points, Appendix G tunnels and the snow points. |
| Hot weather and CRT | Drop in the National CRT RAG Report export (CSV) and the Hot Rail Forecast (PDF). Each site is banded per day against its CRT (W), CRT (30/60) and CRT (20) using the higher of the register's own rail forecast and the area's hot rail forecast; the output is the sites at risk by TME. The air-temperature triggers (34 / 39 / 41 / 45 °C) from the Extreme Heat Operations Plan. |
| Rainfall, earthworks and flood sites | Heavy Rain and Convective Rainfall by area; flood sites with their monitoring and actions, checks suggested from Aware, and a log of checks; the earthworks risk sites; the operational sections that take a 40 mph BESR in an extreme event. |
| High winds | Wind level by area, the 50 mph BESR at Extreme, route proving after a no-train period from Adverse, the lines concerned, the EWAT timeline. |
| Vegetation and obscured signals | The TI181 process, a reading-time check for a reported obstruction, the signal visibility chart. |
| Chainsaw competency | Who holds it, where, when it expires (amber inside six months, red once lapsed); add, edit, import from the spreadsheet's CSV. |

Thresholds and the lists of sites live in `src/lib/weather/` with the document and section they
come from. Where a value is the desk's own margin rather than a standard (the 3 °C watch) it says
so.

## Run

```
npm install
npm run dev        # http://localhost:3000/weather
npm run lint && npm run type-check && npm test && npm run build
```

## Addresses

- `https://weather-resilience.derbycontrol.co.uk/weather` (Vercel project `weather-resilience`);
  the root, `/index.html` and the old `/points` redirect there.
- `https://overseer.derbycontrol.co.uk/weather` — the same app inside the Derby Control hub.
- `index.html` at the repository root redirects the old GitHub Pages address
  (`nh9qxw5shd-oss.github.io/PointHeating`) to the points logbook. The original single-page
  logbook is kept in `legacy/` for reference.

## Data

Mini Project Hub (Supabase). Read from DLog2: `weather_forecast_latest_days`, `weather_forecasts`,
`weather_forecast_days` (day 0 of earlier issues, for runs of cold). Own tables (`supabase/`):

- `points_winter_log`: `area`, `point_number` (unique together), `location`, `notes`,
  `last_treated_at` (unchanged from the logbook).
- `wr_crt_imports`: one row per CRT register drop-in (`sites` jsonb, `day1_date`).
- `wr_hotrail_forecasts`: one row per hot rail forecast PDF (`areas` jsonb, validity).
- `wr_flood_checks`: a check at a flood site (`site_key`, `finding`, notes).
- `wr_chainsaw_staff`: the register.

## Assumptions to check

- Forecast areas to MOM areas: East Mids North = Derby, Nottingham; East Mids South = Leicester,
  Kettering; Lincolnshire = Lincoln; London – Luton = WH (`FORECAST_AREAS`).
- CRT sites to hot-rail areas: Luton TME in London North, everything else in East Midlands
  (`hotRailAreaFor`).
- The CRT register's Rail Day 1 is the day it is dropped in.
