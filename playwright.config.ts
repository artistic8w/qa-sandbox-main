import { defineConfig, devices } from '@playwright/test';

// Barebones config. Chromium only. There are deliberately no fixtures, projects,
// or page objects here yet — structuring this is part of the assignment.
//
// By default the tests run against the app served locally. To run against a
// different URL instead (e.g. the hosted demo, if you can't start the dev
// server), set PLAYWRIGHT_BASE_URL — Playwright then skips the local server.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? 'http://localhost:4300';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Local: dev server (fast, auto-reload, reused if `npm start` is already up);
  // CI: build + serve the production bundle. Skipped entirely when an external
  // base URL is provided.
  webServer: externalBaseURL
    ? undefined
    : {
        command: process.env.CI ? 'npm run build && npm run serve:dist' : 'npm start',
        url: 'http://localhost:4300',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
