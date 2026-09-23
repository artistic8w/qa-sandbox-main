import { test, expect } from '@playwright/test';

// Smoke test: log in as the seeded Accountant and confirm the dashboard loads.
// Network-free (no external APIs). Intentionally minimal — no page objects or
// fixtures ship with this repo.
test('logs in and shows the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('accountant@qa.test');
  await page.getByLabel('Password').fill('acct123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
