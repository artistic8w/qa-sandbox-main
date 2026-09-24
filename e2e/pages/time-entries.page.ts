import { Page, Locator } from '@playwright/test';

export class TimeEntriesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/time');
  }

  entryRowByComment(comment: string): Locator {
    return this.page.locator('[data-testid^="time-entry-"]', { hasText: comment });
  }

  firstVisibleEntryRow(): Locator {
    return this.page.locator('[data-testid^="time-entry-"]').first();
  }
}
