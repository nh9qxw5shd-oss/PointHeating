# Winter Points Logbook (PointHeating)

Next.js App Router, TypeScript strict, Tailwind v4, Supabase ("Mini Project Hub", anon key).
Killfrost treatment log; see README.md.

## Working here
- Checks before any push: `npm run lint`, `npm run type-check`, `npm test` (`node --test`, so
  relative imports inside `src/lib` carry the `.ts` suffix), `npm run build`.
- Rules live in `src/lib/points/points.ts` and are tested: RAG bands (24 h / 48 h), natural point
  ordering, the duplicate check. Writes keep the original shapes: treatment and edits upsert on
  `area,point_number`; a new set is an insert; delete matches area and point number.
- `basePath` is `/points` (`next.config.ts`); the hub (PotatOS) proxies
  `overseer.derbycontrol.co.uk/points/*` here. Vercel framework comes from `vercel.json`.
  `public/storage-bridge.html` is byte-identical across systems; change all or none. Browser
  storage keys are prefixed `points_`.
- Live at `weather-resilience.derbycontrol.co.uk/points`. Root `index.html` only redirects the old
  GitHub Pages address there; the original page is in `legacy/`, kept for reference.

## Design language
Autumn Hub house style (`nh9qxw5shd-oss/autumn-hub`, `web/src/`): the stylesheet, `ui.tsx` and
`uiFeedback.tsx` are copied by hand; keep them in step. Network Rail orange brand mark. Mobile
width 390 px with no horizontal scroll.

Writing and commits: no model names or identifiers in code, README, commit messages or PR text.
