import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ShellPage } from '../pages/shell.page';

export type Role = 'admin' | 'accountant';

export const CREDENTIALS: Record<Role, { email: string; password: string; displayName: string }> = {
  admin: {
    email: process.env['SEED_ADMIN_EMAIL'] ?? 'admin@qa.test',
    password: process.env['SEED_ADMIN_PASSWORD'] ?? 'admin123',
    displayName: 'Kari Admin',
  },
  accountant: {
    email: process.env['SEED_ACCOUNTANT_EMAIL'] ?? 'accountant@qa.test',
    password: process.env['SEED_ACCOUNTANT_PASSWORD'] ?? 'acct123',
    displayName: 'Ola Regnskap',
  },
};

type Fixtures = {
  loginAs: (role: Role) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  loginAs: async ({ page }, use) => {
    await use(async (role: Role) => {
      const { email, password } = CREDENTIALS[role];
      const login = new LoginPage(page);
      await login.goto();
      await login.login(email, password);

      await expect(page).toHaveURL(/\/dashboard$/);
      const shell = new ShellPage(page);
      await expect(shell.userMenuButton).toBeVisible();
    });
  },
});

export { expect };