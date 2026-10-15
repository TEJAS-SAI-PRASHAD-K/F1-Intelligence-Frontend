# F1 Intelligence — Frontend

A React dashboard over the [F1 Intelligence API](http://localhost:8000/docs): championship
standings, race analysis, tire degradation, pit-strategy simulation and race prediction, built on
FastF1 timing data from 2019 onward.

## Running it

The backend must be up first. The Vite dev server proxies `/api` and `/health` to it, so the
browser makes same-origin requests and the frontend works whatever the backend's CORS policy is.

```bash
npm install && npm run dev
```

Then open http://localhost:5173.

The backend defaults to `http://localhost:8000`. Point elsewhere with:

```bash
VITE_API_TARGET=http://other-host:8000 npm run dev
```

For a production build, `VITE_API_BASE` prefixes every request instead (the proxy only exists in
dev), and the host must serve `index.html` for unknown paths so client-side routes resolve.

## Pages

| Route | What it shows |
|---|---|
| `/` | Championship leader, latest race result, next round, constructors' table, model headline numbers |
| `/standings` | Drivers' and constructors' tables, per-circuit pace, qualifying-vs-race scatter, tire management |
| `/races` | One season's calendar |
| `/race/:eventId` | Result, stint chart, lap-by-lap pace, pit stops, prediction vs actual |
| `/drivers`, `/driver/:abbr` | Driver index and a career record with strongest/weakest circuits |
| `/tire` | Model degradation curves, and the measured per-stint slopes from a real race |
| `/strategy` | Measured circuit inputs, ranked strategies, and a head-to-head comparator |
| `/prediction` | Grid builder with predicted order and podium probability, plus the walk-forward backtest |
| `/models` | The model registry, each metric in its own units |

## Stack

React 19, React Router, TanStack Query, Recharts, Vite. Plain CSS with design tokens — no UI
framework.

```
src/
  api/        client.js (one function per endpoint), hooks.js (query/mutation wrappers)
  components/ Primitives.jsx (panels, tiles, tables, states), ChartKit.jsx (axes, tooltip, legend)
  lib/        teams.js (constructor + compound colours), format.js (lap times, deltas, dates)
  pages/      one file per route
  styles/     tokens.css, base.css
```

## Conventions worth knowing

**The API's caveats are on the page, not buried.** Race points exclude sprints; per-race
predictions are in-sample and say so; strategy limitations and circuit-input notes render as
callouts. If the backend qualifies a number, the UI qualifies it too.

**Colour follows the entity.** Constructors wear their livery and compounds wear the sport's own
coding, so a filter that changes which series are on screen never repaints the survivors. Every
use is paired with a code, label or legend — identity never rests on colour alone.

**Charts that need a generic palette** use a fixed five-slot ramp (`--cat-1`…`--cat-5` in
`tokens.css`), assigned in order and never cycled. It passes a dark-surface validation for
lightness band, chroma, colour-vision separation, normal-vision separation and contrast.

**No dual-axis charts.** Two measures on different scales get two charts — see the driver page,
where points and mean finishing position are separate panels rather than two y-scales on one.

## Slow endpoints

`GET /api/v1/dashboard/race/{event_id}` runs a prediction live and takes ~8s. The UI shows a
loading state rather than a stale frame; nothing is wrong if a race page sits spinning for a few
seconds on first load. Results are cached for 30 minutes per query key.
