const { defineConfig, devices } = require('@playwright/test');

/**
 * CI/CD compatible Playwright configuration.
 *
 * Environment variables:
 *   CI=true          - Set automatically by GitHub Actions / Jenkins / CircleCI
 *   BASE_URL         - Override the target app URL (default: staging server)
 *   WORKERS          - Override the number of parallel workers
 */
module.exports = defineConfig({
  testDir: './tests',

  // Run in parallel with configurable workers; use 1 worker in CI to avoid race conditions
  workers: process.env.CI ? 1 : (parseInt(process.env.WORKERS) || 2),

  // Retry failed tests once in CI to reduce flakiness from transient network issues
  retries: process.env.CI ? 1 : 0,

  // Timeout per test: 120s locally
  timeout: 120000,

  reporter: [
    // Always show list output in the terminal
    ['list'],
    // // Generate an HTML report (opens automatically unless in CI)
    // ['html', { open: process.env.CI ? 'never' : 'on-failure', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://206.189.23.26:3003/webapp/',

    // Run in headed mode
    headless: false,
    slowMo: 2000, // slow down each action by 2000ms so execution is visible

    // Capture screenshot and video on failure for CI debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
