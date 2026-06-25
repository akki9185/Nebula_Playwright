const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage } = require('../pages');

test.describe('User Management Page E2E Tests', () => {
  let loginPage;
  let userMgmtPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    userMgmtPage = new UserManagementPage(page);

    // Login using the provided Paid Company credentials
    console.log('\n── Logging in with Paid Company Credentials ──');
    await loginPage.navigateToLogin();
    await loginPage.login('ankitqa.iihglobal+ex19069@gmail.com', 'Pa$$w0rd!');
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Logged in and redirected to Adhoc Search page');

    // Navigate to User Management
    await userMgmtPage.navigateToUserManagement();
    await expect(page).toHaveURL(/.*\/user-management.*/, { timeout: 15000 });
    console.log('✓ Redirected to User Management page');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const cleanTitle = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
      const screenshotPath = `test-results/screenshots/${cleanTitle}-failed.png`;
      console.log(`[Failure] Saving screenshot to: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  });

  // Test cases will be added here one by one
});
