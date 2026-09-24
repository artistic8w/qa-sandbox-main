import { test, expect } from '../fixtures/index';
import { TimeEntriesPage } from '../pages/time-entries.page';

test.describe('Permission boundaries', () => {
  test('an accountant cannot delete a time entry', async ({ page, loginAs }) => {
    await loginAs('accountant');

    const time = new TimeEntriesPage(page);
    await time.goto();

    // Seed data (src/app/core/data/seed.ts, buildSeedTimeEntries) always
    // generates weekday entries for both users in the current week relative
    // to "now" — so an existing row is guaranteed here without needing to
    // drive the add-entry form's client mat-select, which has proven
    // unreliable to automate (see time-entries.page.ts for that debugging
    // story). This boundary only needs a visible entry to check against; it
    // doesn't need to be one we created ourselves.
    const row = time.firstVisibleEntryRow();
    await expect(row).toBeVisible();

    // Accountants can create/edit time entries but must not be able to
    // delete them — the delete icon-button only renders for admins.
    await expect(row.getByRole('button')).toHaveCount(0);
  });
});