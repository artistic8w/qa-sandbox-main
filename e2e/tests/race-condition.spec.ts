import { test, expect } from '../fixtures/index';
import { mockBrregFound } from '../fixtures/brreg-mock';
import { ClientFormPage } from '../pages/client-form.page';

const SLOW_ORG_NUMBER = '900000006';
const FAST_ORG_NUMBER = '910000004';
const SLOW_COMPANY_NAME = 'SLOW LOOKUP AS';
const FAST_COMPANY_NAME = 'FAST LOOKUP AS';

test.describe('Organization-number lookup race condition (BUGS.md)', () => {
  test('a slow, earlier lookup silently overwrites a faster, later one', async ({ page, loginAs }) => {
    await loginAs('admin');

    // SLOW resolves after an artificial 800ms delay; FAST resolves
    // immediately. A correct implementation (switchMap) cancels the first
    // request's subscription the moment a second lookup is triggered, so
    // the form should end up showing FAST_COMPANY_NAME regardless of
    // response timing. The app uses mergeMap, which never cancels prior
    // inner subscriptions — both requests run to completion, and whichever
    // *response* arrives last wins, not whichever was *requested* last.
    await mockBrregFound(
      page,
      SLOW_ORG_NUMBER,
      { navn: SLOW_COMPANY_NAME, adresse: ['Treg vei 1'], postnummer: '0150', poststed: 'OSLO' },
      800,
    );
    await mockBrregFound(
      page,
      FAST_ORG_NUMBER,
      { navn: FAST_COMPANY_NAME, adresse: ['Rask vei 2'], postnummer: '0151', poststed: 'OSLO' },
      0,
    );

    const form = new ClientFormPage(page);
    await form.gotoNew();

    // Trigger the slow lookup first...
    await form.orgNumberInput.fill(SLOW_ORG_NUMBER);
    await form.lookupButton.click();

    // ...then, before it can resolve, trigger the fast one.
    await form.orgNumberInput.fill(FAST_ORG_NUMBER);
    await form.lookupButton.click();

    // expect() polls until the slow response's artificial delay has
    // elapsed (timeout comfortably exceeds it) — no fixed sleep needed.
    // This is the bug: the form ends up showing the STALE, first-triggered
    // lookup's data, not the one the user actually asked for last.
    await expect(form.nameInput).toHaveValue(SLOW_COMPANY_NAME, { timeout: 2000 });
  });
});