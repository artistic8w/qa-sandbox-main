import { Page } from '@playwright/test';

export interface BrregFixture {
  navn: string;
  adresse: string[];
  postnummer: string;
  poststed: string;
  land?: string;
}

/**
 * Overrides the default 404 stub (see network.ts) for one specific
 * organization number, returning a fake — but shape-accurate — BRREG
 * response. Call this before navigating to the client form.
 *
 * `delayMs` lets a test control exactly when the response resolves, which
 * is what makes the race-condition test (mergeMap vs switchMap) reliably
 * reproducible instead of a matter of luck.
 */
export async function mockBrregFound(
  page: Page,
  orgNumber: string,
  fixture: BrregFixture,
  delayMs = 0,
): Promise<void> {
  const url = `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}`;
  await page.route(url, async (route) => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organisasjonsnummer: orgNumber,
        navn: fixture.navn,
        forretningsadresse: {
          adresse: fixture.adresse,
          postnummer: fixture.postnummer,
          poststed: fixture.poststed,
          land: fixture.land ?? 'Norge',
        },
      }),
    });
  });
}