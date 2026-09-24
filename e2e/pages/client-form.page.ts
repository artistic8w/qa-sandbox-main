import { Page, Locator } from '@playwright/test';

export class ClientFormPage {
  readonly page: Page;
  readonly orgNumberInput: Locator;
  readonly lookupButton: Locator;
  readonly lookupMessage: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orgNumberInput = page.getByTestId('org-number-input');
    this.lookupButton = page.getByTestId('lookup-button');
    this.lookupMessage = page.getByTestId('lookup-message');
    this.nameInput = page.getByTestId('client-name-input');
    this.saveButton = page.getByTestId('save-client-button');
  }

  async gotoNew(): Promise<void> {
    await this.page.goto('/clients/new');
  }

  async lookupOrgNumber(orgNumber: string): Promise<void> {
    await this.orgNumberInput.fill(orgNumber);
    await this.lookupButton.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}