# Solution notes

## Locator strategy

My default is role/label locators (`getByRole`, `getByLabel`) — they double as a
lightweight accessibility check, since if a label breaks, the test breaks too,
which is useful signal. I only reach for `data-testid` when an element's
accessible name isn't actually guaranteed stable, which turned out to be a
bigger category than I expected once I started testing against a genuinely
localized, stateful app rather than a static page. Concretely, that meant:

- **Locale-dependent text.** Admin and Accountant are seeded with different
  languages (`nb` / `en`). My first pass at the login/shell tests used
  `getByRole('heading', { name: 'Dashboard' })` and `getByLabel('Email')`, which
  broke the moment I tested the Admin flow (renders "Oversikt", not
  "Dashboard") — and broke a second time on the *logout* test specifically,
  because logging out doesn't reset the UI language (see `BUGS.md` #5), so the
  login screen itself can render in whatever language the previous session
  left it in. That's a case where a testid isn't just convenient, it's the
  only correct choice — the accessible name is genuinely not stable, by
  design, given the app's own behavior.
- **Session/user-dependent text.** The user-menu button's label is the logged-in
  user's display name (`Kari Admin` vs `Ola Regnskap`) — a role/name locator
  would need to branch per role, so a stable testid is simpler and correct
  either way.
- **Unknown identifiers at write-time.** Table rows for newly-created records
  (a client just created via the lookup flow, in particular) don't have a
  predictable id when the test is written — I used `getByRole('row', { name })`
  or `.locator('[data-testid^="..."]', { hasText })` for those, filtering by
  content instead of a testid, since the id genuinely can't be known ahead of
  time. For *seeded* records where the id-generation isn't relevant (e.g. a
  specific row's action menu), I used the `data-testid="{prefix}-{id}"` pattern
  instead, since there the id is stable and known.
- **Icon-only controls with duplicate/ambiguous accessible names** (e.g. a
  per-row "Client actions" button that's identical across every row) — scoped
  by id via testid rather than relying on row position, which would break the
  moment sorting or pagination changes.

Everywhere else — forms with genuinely static English labels used only in
English-locale test contexts, buttons with unique translated text within a
single test's session — I kept plain role/label locators. The `data-testid`
additions are listed in the diff; they're concentrated on the login form, the
app shell (user menu, logout, nav), the client list and form, and the time
entries list — specifically the places where locale, session state, or
unknown-at-write-time ids made a role/label locator actually unreliable rather
than just less idiomatic.

## Flake strategy

A few concrete decisions, each tied to a specific problem I actually hit while
building this out:

- **Never assume seed data ordering or pagination.** The client list defaults
  to 10 rows per page, sorted by name; a newly-created client can easily land
  on page 2 or 3 depending on its name. Rather than guess or hardcode page
  navigation, the client-creation test filters via the search box before
  asserting the row exists — this also makes the test independent of how many
  other clients exist in seed data, so it won't break if `seed.ts` changes.
- **Never reimplement app-internal date logic in a test.** My first version of
  the time-entries permission test computed "today" via
  `new Date().toISOString().slice(0, 10)` — UTC. The app's own `isoDate()`
  util is explicitly local-time (there's a comment saying so). On a
  UTC-offset machine, those two can disagree about what day it is, which
  produced a test that failed consistently but for a reason that had nothing
  to do with the feature being tested. Lesson: match the app's own convention
  exactly, don't assume ISO-ish date formatting is unambiguous.
- **Mock all three external APIs by default, override per-test where needed.**
  `e2e/fixtures/network.ts` stubs BRØNNØYSUND, Nager.Date, and Norges Bank with
  safe defaults for every test via a `page` fixture override, so no test ever
  depends on those services actually being reachable. Tests that need specific
  data (the org-number lookup tests) register a more specific `page.route()`
  on top of that default — Playwright checks the most-recently-registered
  handler first, so the specific mock wins for its exact URL while everything
  else still falls back to the safe default.
- **Control timing directly instead of relying on real network jitter, when a
  test's whole point is timing.** The race-condition test
  (`e2e/tests/race-condition.spec.ts`, covering `BUGS.md` #6) needed the first
  lookup to resolve *after* the second, deterministically, every run — not "on
  a slow network, sometimes." `mockBrregFound()` takes an optional `delayMs`
  and resolves the mocked response only after that delay, so the race is
  reproduced by construction rather than by luck. The one intentional
  exception to "don't use fixed waits": the test's final assertion is a
  polling `expect(...).toHaveValue(...)` with a timeout comfortably longer
  than the artificial delay — so even here, it's Playwright's built-in
  retry/poll waiting for real DOM state, not a blind `waitForTimeout`.
- **Prefer waiting for real overlay state over waiting for time**, generally —
  where an interaction involves a CDK overlay (`mat-select` panels in
  particular), wait for the panel to actually be visible/hidden rather than a
  fixed delay.
- **Don't build a test around a boundary the app doesn't actually enforce.**
  Two routes (`/clients/:id/edit`, `/users`) are missing their `adminGuard`
  (`BUGS.md` #1–2) — found via code reading before writing the required
  permission-boundary test, and I deliberately picked a different boundary (an
  Accountant cannot delete a time entry) that's genuinely, correctly enforced
  with no route to bypass it. Building the required test around a boundary I
  already knew was broken would have meant either a failing "required" test,
  or quietly working around a bug instead of reporting it — the missing
  guards belong in `BUGS.md`, not baked into a test's assumptions.
- **Recognize when a test is fighting a widget instead of testing a
  boundary.** I spent a significant amount of time trying to make the "Add
  time entry" client `mat-select` reliably selectable under Playwright —
  click, then a keyboard sequence, then keyboard-plus-explicit-visibility-
  waits, then an explicit post-selection assertion to fail fast if it hadn't
  registered. Each attempt fixed the previous failure mode and hit a new one;
  the pattern (passes when stepped through slowly, fails intermittently at
  full speed) is itself now `BUGS.md` item #3 — genuine evidence of a timing
  race in the app's overlay handling, not a test artifact. But the
  permission-boundary test I actually needed didn't require creating a new
  entry at all — an existing seeded entry (guaranteed present in the current
  week, since `buildSeedTimeEntries` generates entries relative to "now")
  proves the same boundary without touching the unreliable widget. Once I
  noticed the test didn't need the thing I was fighting to make reliable, I
  removed the now-unused interaction code rather than leave a half-working,
  uncalled method in the page object — untested, previously-broken code
  sitting unused in a repo is worse than not having attempted it.
- **Cut a test rather than ship one I didn't fully trust.** I attempted an
  additional bonus spec covering client list sorting and pagination. The
  sorting/collation half was solid and passed consistently. The pagination
  half passed in isolation but failed intermittently when run as part of the
  full suite under parallel workers — a genuine timing issue in that specific
  test (a non-auto-waiting query ran before the list had finished rendering
  under higher load), not a bug in the app. Given the submission deadline, I
  removed that spec file entirely rather than submit a suite that isn't
  reliably green end-to-end — the assignment is explicit that a small,
  deterministic suite beats a broader but flaky one, and "passes alone but
  not in the full run" is exactly the kind of flakiness that should disqualify
  a test from being included, not be shipped with a caveat.
- **Fresh browser context per test = fresh IndexedDB per test.** Playwright
  isolates storage per test by default, so seed data re-generates from
  scratch every run with no manual reset step needed, and tests can't
  contaminate each other's state.

## Beyond the required core

- **More bugs.** 9 confirmed issues total in `BUGS.md` (5 required minimum),
  ranging from two High-severity privilege/permission gaps down to two
  Low-severity consistency issues.
- **The race condition ("the tricky one").** Reliably reproduced with a
  dedicated test (`e2e/tests/race-condition.spec.ts`) by controlling mock
  response timing directly rather than relying on real network conditions —
  see Flake strategy above for why that's deterministic rather than lucky.
- **Structure.** Shared login/mocking logic lives in `e2e/fixtures/`
  (`auth.ts`, `network.ts`, `brreg-mock.ts`, merged via `index.ts` so every
  spec gets both credentials and API stubbing from one import), and every
  screen under test has a corresponding Page Object in `e2e/pages/` — no spec
  file contains a raw `page.getByX(...)` locator; everything routes through a
  page object method.

## What I'd do with more time

- Come back to the "Add time entry" `mat-select` interaction (`BUGS.md` #3)
  as its own investigation — possibly by intercepting Angular's
  zone/change-detection timing, or reproducing it outside Playwright entirely
  to rule out a Playwright-specific cause versus a genuine app defect.
- Revisit client-list sorting/pagination coverage with a properly-guarded
  wait strategy (see Flake strategy above) and re-verify a clean run under
  full parallel load before re-adding it.
- Add page objects/tests for Tasks (create, mark complete, check both the
  client's own view and the global Tasks screen).