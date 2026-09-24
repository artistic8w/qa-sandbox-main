import { Page, Locator } from '@playwright/test';

export class ClientListPage {
  readonly page: Page;
  readonly table: Locator;
  readonly newClientLink: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByTestId('client-table');
    this.newClientLink = page.getByTestId('new-client-link');
    this.searchInput = page.getByTestId('client-search-input');
  }

  async goto(): Promise<void> {
    await this.page.goto('/clients');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  rowByName(name: string): Locator {
    return this.page.getByRole('row', { name });
  }
}