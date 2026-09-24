import { test, expect, CREDENTIALS } from '../fixtures/auth';
import { LoginPage } from '../pages/login.page';
import { ShellPage } from '../pages/shell.page';

test.describe('Authentication', () => {
  test('admin can log in and see the admin-only Users nav item', async ({ page, loginAs }) => {
    await loginAs('admin');
    const shell = new ShellPage(page);

    await expect(shell.userMenuButton).toContainText(CREDENTIALS.admin.displayName);
    await expect(shell.usersNavLink).toBeVisible();
  });

  test('accountant can log in and does not see the Users nav item', async ({ page, loginAs }) => {
    await loginAs('accountant');
    const shell = new ShellPage(page);

    await expect(shell.userMenuButton).toContainText(CREDENTIALS.accountant.displayName);
    await expect(shell.usersNavLink).toHaveCount(0);
  });

  test('logout returns to the login screen and ends the session', async ({ page, loginAs }) => {
    await loginAs('admin');
    const shell = new ShellPage(page);
    const login = new LoginPage(page);

    await shell.logout();

    await expect(page).toHaveURL(/\/login$/);
    await expect(login.submit).toBeVisible();

    // Confirm the session really ended, not just a URL change.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('invalid credentials are rejected with an inline error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(CREDENTIALS.admin.email, 'wrong-password');

    await expect(login.failedMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});