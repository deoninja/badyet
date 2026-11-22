# Badyet

An offline-first budget and expense tracker. Everything is stored locally on the device — no
accounts, no backend, and no sync.

Developed by **Deo Trinidad**.

## Features

- **Setup** — set take-home pay per paycheck, pay frequency (weekly, every 2 weeks, twice a month,
  or monthly), currency, and budget method.
- **Dashboard** — see income, spending, remaining balance, allocation split, and recent activity
  for the current pay period.
- **Budget breakdown** — group categories by needs, wants, savings, donations, and other, with
  optional per-category caps that reset every pay period.
- **Add expense** — pick a category, enter an amount, choose a date with the themed calendar, and
  add an optional note.
- **Savings goals** — track targets, deadlines, and contributions with progress bars.
- **History** — filter expenses by category and date range, then delete entries.
- **Installable PWA** — works offline after the first load, can be added to the home screen, and
  shows a one-time install prompt on the first visit.

## Budget methods

| Method              | Allocation                                    |
| ------------------- | --------------------------------------------- |
| 50/30/20 (default)  | 50% needs, 30% wants, 20% savings             |
| Zero-Based          | Allocate every peso until the plan equals income |
| Envelope            | Category caps drive the plan                  |
| Pay Yourself First  | Save a percentage first, then split the rest  |
| 70/20/10            | 70% spending, 20% savings, 10% donations      |
| 60/20/20            | 60% spending, 20% savings, 20% other          |

## Tech stack

- React 19 + TypeScript
- Vite 8
- `vite-plugin-pwa` (Workbox service worker)
- IndexedDB with a localStorage fallback
- Fraunces and Instrument Sans variable fonts
- Vitest for unit tests

## Getting started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the development server         |
| `npm run build`     | Typecheck and build for production   |
| `npm run preview`   | Preview the production build         |
| `npm test`          | Run the unit tests                   |
| `npm run typecheck` | Run TypeScript without emitting      |
| `npm run icons`     | Regenerate PWA icons                 |

## Project structure

```text
src/
  components/   Shared UI: layout, selects, date picker, icons
  db/           IndexedDB/localStorage adapter and seed data
  hooks/        App data loading and PWA helpers
  lib/          Budget math, dates, money formatting, summaries
  screens/      Dashboard, Budget, AddExpense, Goals, History, Setup
  App.tsx       Route state and data wiring
  styles.css    Global theme and responsive styles
```

## Data and privacy

All records live in the browser on the device. Clearing site data or using **Reset all data** in
Setup removes them permanently. There is no server, account, or analytics.

## Deployment

The project is ready for static hosting. `vercel.json` rewrites all routes to `index.html`, and the
service worker is generated during `npm run build`.

```bash
npm run build
```

Deploy the generated `dist` directory to Vercel, Netlify, or any static host with HTTPS (required
for PWA installation).
