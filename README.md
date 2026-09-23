# CompanyFlow

A small single-page app for managing accounting **clients**, their **tasks**, and
**time entries** for Norwegian accounting consultants. It runs entirely in the
browser — data is stored locally (IndexedDB), there is no backend to set up.

This repository is your assessment environment. Your assignment — what to build and how
it's evaluated — was sent to you separately.

## Prerequisites

- **Node.js 22 LTS** (≥ 22.22.3) — or any newer supported version (24.15+ or 26+).
  The exact version is pinned in [`.nvmrc`](./.nvmrc); with `nvm`/`fnm` just run
  `nvm use` (or `fnm use`) in the repo to match it. (CI runs on the `.nvmrc` version.)
- **npm 10+** (ships with Node).
- A **GitHub account** — you'll open a pull request against this repository.
- Playwright's Chromium is installed in one step below; no other browser setup is needed.

## Run it locally

```bash
npm install
npm start
```

The app serves at http://localhost:4300.

## Build & serve the production bundle (what CI does)

```bash
npm run build
npm run serve:dist
```

Playwright is configured to build and start this server automatically (see
[`playwright.config.ts`](./playwright.config.ts)).

## Seeded logins

The database is seeded automatically on first load.

| Role       | Email                | Password | What they can do |
|------------|----------------------|----------|------------------|
| Admin      | `admin@qa.test`      | `admin123` | Everything: manage clients, tasks, time entries, and users |
| Accountant | `accountant@qa.test` | `acct123`  | View clients; create/edit tasks and time entries; **cannot** delete time entries, **cannot** create/edit/delete clients, **cannot** manage users |

## Reset the data

Use the **Reset data** button in the top toolbar to wipe and reseed everything back
to the starting point. A fresh browser profile (or a new incognito window) also
starts from a clean seed. You stay logged in across a reset.

## External services

The app calls three real, public, key-free APIs:

- **Brønnøysundregistrene** (`data.brreg.no`) — company lookup by organization number on the client form
- **Nager.Date** (`date.nager.at`) — Norwegian public holidays in the time-entry week view
- **Norges Bank** (`data.norges-bank.no`) — EUR/NOK exchange rate on the dashboard

If a service is unreachable the app degrades gracefully and stays usable.

## Playwright — ready to write tests immediately

A minimal, working setup ships so you don't have to configure anything:

- [`playwright.config.ts`](./playwright.config.ts) — Chromium, points at the app, and **starts the server for you**
- [`e2e/smoke.spec.ts`](./e2e/smoke.spec.ts) — one passing test (logs in, checks the dashboard) as a starting point

One-time, install the browser binary:

```bash
npx playwright install chromium
```

Then:

```bash
npm run e2e          # run all tests (Playwright builds/serves the app for you)
npm run e2e:ui       # interactive UI mode — the easiest way to write tests
npm run e2e:report   # open the last HTML report
```

**Fastest feedback loop:** run `npm start` in one terminal (dev server, hot reload) and
`npm run e2e:ui` in another — the tests reuse that already-running server.

Add your specs under `e2e/`. There are intentionally **no** page objects, fixtures, or
`data-testid`s yet — building the structure and testability you need is part of the
assignment.

## Where your tests run

By default the tests run against the app on your machine — `npm run e2e` builds and serves
it for you (or reuses `npm start` if it's already running). This is where your own
`data-testid` additions take effect.

If you can't run the app locally, you can point the tests at the hosted demo instead — no
local server needed:

```bash
PLAYWRIGHT_BASE_URL=https://company-flow.netlify.app npm run e2e
```

Write your tests with **relative paths** (`page.goto('/login')`, not a full URL) and let the
base URL come from config — the same specs then run against your local app *and* the demo
without changes. Note: the demo is the deployed build, so `data-testid`s you add in your PR
won't appear there; use it mainly to explore and to write role/label-based tests.

## Before you submit

There is **no CI** in this repo on purpose — **run your tests yourself and make sure they
pass** before you open the PR:

```bash
npm run e2e
```

They should be deterministic and must **not** depend on the three external APIs being
reachable (mock them). We run your suite when reviewing your submission.
