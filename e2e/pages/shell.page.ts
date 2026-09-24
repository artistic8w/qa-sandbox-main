import { Page, Locator } from '@playwright/test';

/**
 * The app shell/toolbar shown on every authenticated screen:
 * nav links, language switcher, and the user menu (logout).
 */
export class ShellPage {
  readonly page: Page;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly usersNavLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenuButton = page.getByTestId('user-menu-button');
    this.logoutButton = page.getByTestId('logout-button');
    this.usersNavLink = page.getByTestId('nav-users-link');
  }

  async logout(): Promise<void> {
    await this.userMenuButton.click();
    await this.logoutButton.click();
  }
}