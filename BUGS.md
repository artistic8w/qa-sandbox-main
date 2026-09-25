# Bugs found — CompanyFlow

Top 9 most critical issues found (5 required minimum). Ordered by severity:
High, then Medium (ranked by real user impact), then Low.

---

### 1. Accountant can access and modify the Users screen by direct navigation

- **Severity:** High
- **Area:** Users / Permissions
- **Steps:**
  1. Log in as Accountant (`accountant@qa.test` / `acct123`).
  2. Manually navigate the browser to `/users`.
  3. Create a new user, or edit an existing one (e.g. change a role to Admin).
- **Expected:** This screen is admin-only — the nav link is hidden for Accountant,
  and the route should refuse to load for a non-admin session.
- **Actual:** The Users screen loads fully and is interactive; an Accountant
  could even promote their own account to Admin from here.
- **Notes:** `adminGuard` is applied to several admin-only routes in
  `app.routes.ts` but missing from `/users`. This is the most serious issue
  found — it allows privilege escalation, not just data tampering. Not
  data-specific; happens every time.

---

### 2. Accountant can edit and delete clients by navigating directly to the edit URL

- **Severity:** High
- **Area:** Clients / Permissions
- **Steps:**
  1. Log in as Accountant.
  2. Open any client from the list (e.g. `/clients/<id>`), or note its id from
     the URL.
  3. Manually navigate the browser to `/clients/<id>/edit`.
  4. Change any field (e.g. Name) and click Save.
- **Expected:** Accountant is not an admin and should not be able to edit or
  delete client records — the route should be blocked the same way
  `/clients/new` is.
- **Actual:** The edit form loads normally and the change saves successfully.
- **Notes:** Same root cause as #1 — `adminGuard` is applied to `clients/new`
  but not to `clients/:id/edit`. The Edit/Delete UI controls are correctly
  hidden from Accountants in the client list, but that's a UI-only
  restriction with no route-level enforcement behind it. Not data-specific;
  not intermittent.

---

### 3. "Add time entry" client dropdown silently fails to submit under fast interaction

- **Severity:** Medium
- **Area:** Time entries / Add entry form
- **Steps:**
  1. Log in, go to Time entries.
  2. Very quickly: click the Client dropdown, then immediately click an
     option (minimal pause between the two actions — this is far easier to
     trigger via automated/scripted interaction than by hand, see Notes).
  3. Fill in the remaining fields and click Add.
- **Expected:** The dropdown should reliably register a selection regardless
  of interaction speed, and if a required field genuinely is empty, the form
  should tell the user why nothing happened.
- **Actual:** Under fast interaction, the panel intermittently either fails
  to open, or opens but the selection doesn't register — the field is left
  empty, which then silently blocks the "Add entry" submit with **no error
  message shown at all**.
- **Notes:** Intermittent and speed-dependent — surfaced repeatedly while
  automating this exact interaction with Playwright: identical code passed
  when stepped through slowly/manually and failed at full automation speed,
  multiple times, with a different specific symptom each time (panel not
  opening at all; panel opening but no option highlighted; option visually
  selected but the form's bound value not updating in time). Pattern points
  to a timing race between the `mat-select`/CDK overlay's open/close state
  and Angular's change detection, rather than one single, simple cause.
  Ranked above the other Medium issues because it's a completely silent
  failure — a real user clicking quickly could lose their entry with zero
  indication anything went wrong.

---

### 4. Time entries accept a negative duration (end time before start time)

- **Severity:** Medium
- **Area:** Time entries
- **Steps:**
  1. Log in as either role, go to Time entries.
  2. Add an entry with, e.g., Start = 23:00 and End = 01:00.
  3. Submit the entry.
- **Expected:** The form should reject this (end time must be after start
  time), or at minimum warn the user — this isn't a valid overnight-shift
  model, it's just bad data silently accepted.
- **Actual:** The entry saves with a negative duration and no warning; it
  then contributes a negative value to any duration totals shown elsewhere
  (e.g. weekly/dashboard summaries).
- **Notes:** Strong evidence this is a deliberately planted gap, not an
  oversight: `en.json` contains an unused translation key
  `time.durationInvalid` ("End time must be after start time") that is never
  referenced anywhere in the component or template — the validation message
  exists but the validator that would trigger it doesn't. Not role-specific;
  happens every time.

---

### 5. UI language leaks across sessions after logout

- **Severity:** Medium
- **Area:** Auth / Internationalization
- **Steps:**
  1. Log in as Admin (seeded with Norwegian as their language preference).
  2. Log out via the user menu.
  3. Observe the Login screen's language.
- **Expected:** Logging out should return the UI to a neutral/default
  language, since the next person to use the machine may not be the same
  user — this matters most on a shared/kiosk machine.
- **Actual:** The Login screen (and anything else rendered before the next
  login) stays in Norwegian — whatever language was active for the previous
  session.
- **Notes:** Confirmed by tracing the code: `session.service.ts`'s
  `logout()` clears the session but never resets the app's
  `I18nService`/`TranslateService`. Language is only ever explicitly set on
  login (`login.ts` calls `i18n.init(user.locale)`) or via the manual
  language switcher — nothing resets it on logout. Found while writing an
  automated logout test that asserted on English-locale text and failed
  after an Admin session, which is what led to tracing this down. Not
  intermittent — happens every time an `nb`-locale user logs out.

---

### 6. Organization-number lookup has a race condition (stale response can overwrite a newer one)

- **Severity:** Medium
- **Area:** Clients / Organization lookup
- **Steps:**
  1. Log in as Admin, go to New Client.
  2. Enter a valid organization number and click the lookup button.
  3. Before the first lookup resolves, change the organization number and
     click lookup again (repeat quickly with a different number).
  4. Observe which company's details end up populating the form once both
     requests have resolved.
- **Expected:** The form should always reflect the result of the *most
  recent* lookup request, regardless of which response arrives first.
- **Actual:** Because the lookup pipeline uses RxJS `mergeMap` instead of
  `switchMap` (`client-form.ts`), an earlier, slower request can resolve
  after a later, faster one and silently overwrite the form with outdated
  data.
- **Notes:** Reliably reproduced with an automated test
  (`e2e/tests/race-condition.spec.ts`) by mocking the first lookup's response
  with an artificial delay and the second with none — the form ends up
  showing the first (stale) company every time. Would appear intermittent
  to a manual tester relying on real network timing; deterministic once
  response order is controlled directly.

---

### 7. Client list sorts using English collation instead of Norwegian

- **Severity:** Medium
- **Area:** Clients / List sorting
- **Steps:**
  1. Log in as Admin, go to Clients.
  2. Sort by Name (ascending, then descending).
  3. Look at where client names starting with Æ, Ø, or Å land in the sort
     order.
- **Expected:** Under correct Norwegian (`nb`) collation, Æ, Ø, and Å sort
  *after* Z, not alongside A–Z as in English.
- **Actual:** The sort comparator in `client-list.ts` calls
  `localeCompare(bv, 'en')`, using English collation regardless of the app's
  active language, so these names sort in the wrong position.
- **Notes:** Data-specific — only visible with clients whose names start with
  Æ/Ø/Å (the seed data includes several specifically for this). Confirmed
  deliberate: the seed data has a comment directly above the affected rows
  noting these should sort after Z under correct collation.

---

### 8. New User password field is not masked

- **Severity:** Low
- **Area:** Users / New user form
- **Steps:**
  1. Log in as Admin, go to Users, click to create a new user.
  2. Type into the Password field.
- **Expected:** Password input should be masked (`type="password"`), same as
  on the Login screen.
- **Actual:** The field renders as `type="text"`, so the password is fully
  visible on screen while typing.
- **Notes:** Not role- or data-specific; happens every time. Minor, but a
  real inconsistency with the Login form's own password field right next to
  it in the same app.

---

### 9. No duplicate-submission guard on several Save/Add buttons

- **Severity:** Low
- **Area:** Clients / Time entries (form submission, general pattern)
- **Steps:**
  1. Go to New Client (or Add time entry), fill in valid data.
  2. Double-click the Save/Add button rapidly (or click, then click again
     before the page navigates away).
- **Expected:** A second click while the first submission is still in flight
  should be ignored, or the button should disable itself immediately on
  first click.
- **Actual:** Nothing disables the button during submission, so a fast
  double-click can fire the create/save action twice, potentially creating
  two near-identical records.
- **Notes:** Timing-dependent — easiest to reproduce with a throttled
  network (adds a window between click and navigation). The Login form
  already does this correctly (its submit button binds
  `[disabled]="submitting()"`), which makes the client/time-entry forms'
  lack of the same guard look like an oversight rather than a deliberate
  difference.
