# Winter Points Logbook

Killfrost treatment log for points sets without working heaters, by MOM area (Derby, Nottingham,
Leicester, Kettering, Lincoln, WH). Each set shows when it was last treated and its status:
green under 24 hours, amber 24 to 48 hours, red 48 hours or more, grey never treated.

- **Treat now** on a set's row records a treatment at the current time. Nothing else is needed.
- **Add / edit point** adds a set that is not on the list yet (a set already in that area is
  refused and offered for editing) or changes a set's location and notes.
- Areas are collapsible with their RAG counts; the status cards filter by band; Ctrl+K finds a set.
- The list refreshes every 10 seconds, so every desk sees treatments as they are recorded.

Rebuilt in October 2026 on the Derby Control house style (Next.js App Router, TypeScript,
Tailwind v4, the Autumn Hub kit). Same table and columns as the original page.

## Run

```
npm install
npm run dev        # http://localhost:3000/points
npm run lint && npm run type-check && npm test && npm run build
```

## Addresses

- `https://weather-resilience.derbycontrol.co.uk/points` — the logbook (Vercel project
  `weather-resilience`); the root and `/index.html` redirect there.
- `https://overseer.derbycontrol.co.uk/points` — the same app inside the Derby Control hub.
- `index.html` at the repository root redirects the old GitHub Pages address
  (`nh9qxw5shd-oss.github.io/PointHeating`) to the logbook. The original single-page logbook is
  kept in `legacy/` for reference.

## Data

`points_winter_log` (Mini Project Hub): `area`, `point_number` (unique together), `location`,
`notes`, `last_treated_at`. Rules (bands, ordering, duplicate check) are pure and tested in
`src/lib/points/points.ts`.
