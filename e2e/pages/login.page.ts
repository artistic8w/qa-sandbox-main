import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly failedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByTestId('login-email-input');
    this.password = page.getByTestId('login-password-input');
    this.submit = page.getByTestId('login-submit-button');
    this.failedMessage = page.getByTestId('login-failed-message');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}