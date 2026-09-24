import { test as base, Page } from '@playwright/test';

/**
 * Every test gets safe, default stubs for the three external APIs the app
 * calls (BRØNNØYSUND company lookup, Nager.Date public holidays, Norges Bank
 * FX rates), so no test ever depends on those services actually being up.
 * A test that needs specific data registers a more specific page.route() on
 * top of this — Playwright checks the most-recently-registered handler
 * first, so the override wins for its exact URL while everything else still
 * falls back to these defaults.
 */
async function stubExternalApis(page: Page): Promise<void> {
  await page.route('https://data.brreg.no/**', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  );
  await page.route('https://date.nager.at/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('https://data.norges-bank.no/**', (route) =>
    route.fulfill({ status: 503, body: 'stubbed: unreachable' }),
  );
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await stubExternalApis(page);
    await use(page);
  },
});