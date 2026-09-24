# Bugs found — CompanyFlow

12 issues found and confirmed (5 required). Ordered by severity: High, Medium, Low.
Most were confirmed by reading the source directly against observed UI behaviour;
a few were caught live during manual exploration before automating anything
(noted in "Notes" where that's the case).

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

### 3. Organization-number lookup has a race condition (stale response can overwrite a newer one)

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
  showing the first (stale) company every time. Not timing-dependent to
  reproduce once response order is controlled directly, though it would
  appear intermittent to a manual tester relying on real network timing.

---

### 4. Client list sorts using English collation instead of Norwegian

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
  deliberate: the seed data has a comment noting these should sort after Z
  under correct collation. Covered by an automated test in
  `e2e/tests/client-list-depth.spec.ts`.

---

### 5. Time entries accept a negative duration (end time before start time)

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

### 6. UI language leaks across sessions after logout

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
  after an Admin session, which is what led me to trace this. Not
  intermittent — happens every time an `nb`-locale user logs out.

---

### 7. "Add time entry" client dropdown silently fails to submit under fast interaction

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
  and Angular's change detection, rather than one single, simple cause. The
  complete silence on failure is arguably the more serious half of this bug.

---

### 8. Organization-number lookup gives the same generic message for "not found" and "service unreachable"

- **Severity:** Low
- **Area:** Clients / Organization lookup
- **Steps:**
  1. Go to New Client.
  2. Enter a validly-formatted but non-existent organization number and run
     the lookup.
  3. Separately, simulate the BRREG service being unreachable (e.g. offline)
     and run a lookup.
- **Expected:** These are different situations — "no such company" vs. "we
  couldn't reach the registry" — and arguably should be communicated
  differently so the user knows whether retrying might help.
- **Actual:** Both cases show the exact same message ("Lookup failed — you
  can enter details manually").
- **Notes:** Dead code confirms this wasn't intentional: `en.json` has a
  separate `clientForm.lookupNotFound` key ("No company found for that
  number") that is never referenced anywhere. In `brreg.service.ts`, both a
  real 404 and a network failure are caught by the same
  `catchError(() => of(null))` and collapse to an identical `null` result, so
  the component has no way to tell the two cases apart even if it wanted to.

---

### 9. Organization-number lookup ignores the phone number available in the response

- **Severity:** Low
- **Area:** Clients / Organization lookup
- **Steps:**
  1. Go to New Client, look up a real organization number that has a phone
     number on file (many do — confirmed via the raw BRREG API response).
  2. Check the Telephone field after the lookup completes.
- **Expected:** Since the whole point of this lookup is to auto-fill known
  company details, and the raw response includes a `telefon` field, it seems
  reasonable to expect the Telephone field to be populated from it.
- **Actual:** The Telephone field is left blank; `brreg.service.ts`'s
  `parse()` method only maps `navn`/address fields and never reads
  `telefon`.
- **Notes:** Found by manually comparing an actual BRREG API response
  against what appeared in the form during live testing. Arguably closer to
  a missed enhancement than a strict "bug," included here because the data
  is right there in the response and simply goes unused.

---

### 10. New User password field is not masked

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

### 11. No duplicate-submission guard on several Save/Add buttons

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

---

### 12. Time entry delete button has no accessible label

- **Severity:** Low
- **Area:** Time entries / Accessibility
- **Steps:**
  1. Log in as Admin, go to Time entries.
  2. Inspect the delete (trash icon) button on any entry row.
  3. Compare it to other icon-only buttons in the app (e.g. the week
     previous/next buttons, or the task delete button).
- **Expected:** Every other icon-only button in the app has an
  `[attr.aria-label]` bound to a translated string, so a screen reader
  announces what it does.
- **Actual:** This specific button has no `aria-label` at all — a screen
  reader user has no way to know what it is.
- **Notes:** Not role- or data-specific; consistent every time. Found while
  adding `data-testid`s for automation and noticing the markup pattern
  didn't match every other icon-button in the codebase.