# Bugs found — CompanyFlow

Top 5 most critical issues found, ranked by real-world impact. Ordered High to Medium severity.

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
  message shown at all**. The user has no way to know why their entry wasn't
  saved.
- **Notes:** Intermittent and speed-dependent — surfaced repeatedly while
  automating this exact interaction with Playwright: identical code passed
  when stepped through slowly and failed at full speed, with a different
  specific symptom each time (panel not opening; panel opening with nothing
  highlighted; selection visually made but not registered in time). Pattern
  points to a timing race between the dropdown's overlay/animation state and
  Angular's change detection. The complete silence on failure is arguably the
  more serious half of this bug — a real user clicking quickly could lose
  their entry with zero indication anything went wrong.

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
  happens every time regardless of who's logged in.

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
  user — this matters most on a shared/kiosk machine, which is a realistic
  scenario for an internal tool like this.
- **Actual:** The Login screen (and anything rendered before the next login)
  stays in Norwegian — whatever language was active for the previous
  session.
- **Notes:** Confirmed by tracing the code: `session.service.ts`'s
  `logout()` clears the session but never resets the app's
  `I18nService`/`TranslateService`. Language is only ever explicitly set on
  login (`login.ts` calls `i18n.init(user.locale)`) or via the manual
  language switcher — nothing resets it on logout. Discovered indirectly:
  an automated logout test that asserted on English-locale text failed
  specifically after an Admin session, which is what led to tracing this
  down. Not intermittent — happens every time an `nb`-locale user logs out.

---

*Seven additional issues were found beyond this top-5 (a lookup race
condition, incorrect sort collation for Æ/Ø/Å, an unmasked password field,
missing duplicate-submit guards, a missing `aria-label`, an unused API field,
and an ambiguous error message) — available on request if useful for the
Optional "more bugs" section.*