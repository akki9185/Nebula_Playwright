const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage } = require('../pages');

/**
 * User Management — Users Tab Tests
 *
 * Pre-condition: Uses an existing paid Expert company account so the Users tab
 * and Invite Member feature are fully accessible (payment already completed).
 *
 * Credentials: ankitqa.iihglobal+ex19069@gmail.com / Pa$$w0rd!
 *
 * Run:
 *   npx playwright test tests/specs/user_management.spec.js
 */

const PAID_EMAIL    = 'ankitqa.iihglobal+ex19069@gmail.com';
const PAID_PASSWORD = 'Pa$$w0rd!';

test.describe('User Management — Users Tab Tests', () => {
  let loginPage;
  let userMgmtPage;

  test.beforeEach(async ({ page }) => {
    loginPage    = new LoginPage(page);
    userMgmtPage = new UserManagementPage(page);

    console.log('\n── Logging in with Paid Company Credentials ──');
    await loginPage.navigateToLogin();
    await loginPage.login(PAID_EMAIL, PAID_PASSWORD);
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Logged in and redirected to Adhoc Search page');

    // Navigate to User Management → Users tab
    await userMgmtPage.navigateToUserManagement();
    await expect(page).toHaveURL(/.*\/user-management.*/, { timeout: 15000 });
    await userMgmtPage.goToUsersTab();
    console.log('✓ Navigated to User Management → Users tab');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const cleanTitle = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
      const screenshotPath = `test-results/screenshots/${cleanTitle}-failed.png`;
      console.log(`[Failure] Saving screenshot to: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_001: Verify Users Tab UI renders all expected elements
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_001: Verify Users tab renders all expected elements', async () => {
    console.log('\n── TC_UM_001: Verifying Users tab UI elements ──');

    // Users tab should be active/visible
    await expect(userMgmtPage.tab_Users).toBeVisible();

    // Toolbar controls
    await expect(userMgmtPage.searchInput).toBeVisible();
    await expect(userMgmtPage.filterButton).toBeVisible();

    // Invite Member button should be ENABLED (payment already completed)
    await expect(userMgmtPage.inviteMemberButton).toBeVisible();
    await expect(userMgmtPage.inviteMemberButton).toBeEnabled();
    console.log('✓ Invite Member button is enabled (paid account)');

    // Data table structure
    await expect(userMgmtPage.table).toBeVisible();
    await expect(userMgmtPage.tableHead).toBeVisible();
    await expect(userMgmtPage.tableBody).toBeVisible();

    // Column headers
    await expect(userMgmtPage.col_name).toContainText(/name/i);
    await expect(userMgmtPage.col_email).toContainText(/email/i);
    await expect(userMgmtPage.col_role).toContainText(/role/i);
    await expect(userMgmtPage.col_action).toBeVisible();

    // At least one data row should be present (the admin row)
    await expect(userMgmtPage.tableRows.first()).toBeVisible({ timeout: 10000 });
    console.log('✓ All Users tab UI elements verified');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_002: Verify Search by email filters table rows
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_002: Verify search by email filters the table correctly', async ({ page }) => {
    console.log('\n── TC_UM_002: Verifying search functionality ──');

    // Get the email from the first row to use as search query
    const firstRowEmail = (await userMgmtPage.tableBody.locator('tr').first().locator('td').nth(2).innerText()).trim();
    console.log(`Searching for: ${firstRowEmail}`);

    await userMgmtPage.searchInput.fill(firstRowEmail);
    await page.waitForTimeout(1000); // debounce

    // Matched row should be visible
    const matchedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: firstRowEmail });
    await expect(matchedRow).toBeVisible({ timeout: 10000 });
    console.log('✓ Search filtered table and matched row is visible');

    // Clear search and verify rows are restored
    await userMgmtPage.searchInput.fill('');
    await page.waitForTimeout(1000);
    await expect(userMgmtPage.tableRows.first()).toBeVisible();
    console.log('✓ Cleared search and table rows restored');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_003: Verify Filter row toggles and filter fields are visible
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_003: Verify Filter row toggles on and off', async () => {
    console.log('\n── TC_UM_003: Verifying Filter toggle ──');

    // Initially filter row should not be visible
    await expect(userMgmtPage.filter_nameInput).not.toBeVisible();

    // Click Filter to show filter row
    await userMgmtPage.toggleFilter();
    await expect(userMgmtPage.filter_nameInput).toBeVisible({ timeout: 5000 });
    await expect(userMgmtPage.filter_emailInput).toBeVisible();
    await expect(userMgmtPage.filter_roleSelect).toBeVisible();
    await expect(userMgmtPage.filter_statusSelect).toBeVisible();
    console.log('✓ Filter row visible with all filter inputs');

    // Click Filter again to hide filter row
    await userMgmtPage.toggleFilter();
    await expect(userMgmtPage.filter_nameInput).not.toBeVisible();
    console.log('✓ Filter row hidden after toggling off');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_004: Verify Invite Member modal opens and renders all fields
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_004: Verify Invite Member modal opens and renders correctly', async () => {
    console.log('\n── TC_UM_004: Verifying Invite Member modal UI ──');

    await userMgmtPage.openInviteMemberModal();

    // Modal title
    await expect(userMgmtPage.invite_title).toBeVisible({ timeout: 10000 });

    // Modal fields
    await expect(userMgmtPage.invite_accessTypeSelect).toBeVisible();
    await expect(userMgmtPage.invite_emailInput).toBeVisible();
    await expect(userMgmtPage.invite_sendButton).toBeVisible();
    await expect(userMgmtPage.invite_closeButton).toBeVisible();
    console.log('✓ Invite Member modal renders all expected elements');

    // Close modal
    await userMgmtPage.invite_closeButton.click();
    await expect(userMgmtPage.invite_title).not.toBeVisible({ timeout: 5000 });
    console.log('✓ Invite Member modal closed successfully');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_005: Invite a Full Access member and verify Pending status in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_005: Invite Full Access member — verify Pending status in table', async () => {
    console.log('\n── TC_UM_005: Inviting Full Access member ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}FA${randomNum}@gmail.com`;
    console.log(`Inviting Full Access member: ${invitedEmail}`);

    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Full Access' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

    // Verify row appears in table with correct Pending details
    const invitedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
    await expect(invitedRow).toBeVisible({ timeout: 10000 });

    const cells = invitedRow.locator('td');
    const nameText = (await cells.nth(1).innerText()).trim();
    expect(nameText === '' || nameText === '-').toBe(true);
    await expect(cells.nth(2)).toContainText(invitedEmail);
    await expect(cells.nth(3)).toContainText('User');
    await expect(cells.nth(6)).toContainText('Pending');
    await expect(cells.nth(7)).toContainText(/expert/i);
    await expect(cells.nth(8)).toContainText(/Full/i);
    await expect(cells.nth(9)).toContainText('Renewable');
    console.log('✓ Invited Full Access member row verified: blank name, email, User role, Pending, Expert, Full Access, Renewable');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_006: Invite a Read Only member and verify Pending status in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_006: Invite Read Only member — verify Pending status in table', async () => {
    console.log('\n── TC_UM_006: Inviting Read Only member ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}RO${randomNum}@gmail.com`;
    console.log(`Inviting Read Only member: ${invitedEmail}`);

    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Read Only' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

    // Verify row appears in table with correct Pending details
    const invitedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
    await expect(invitedRow).toBeVisible({ timeout: 10000 });

    const cells = invitedRow.locator('td');
    const nameText = (await cells.nth(1).innerText()).trim();
    expect(nameText === '' || nameText === '-').toBe(true);
    await expect(cells.nth(2)).toContainText(invitedEmail);
    await expect(cells.nth(3)).toContainText('User');
    await expect(cells.nth(6)).toContainText('Pending');
    await expect(cells.nth(7)).toContainText(/expert/i);
    await expect(cells.nth(8)).toContainText(/ReadOnly/i);
    await expect(cells.nth(9)).toContainText('Renewable');
    console.log('✓ Invited Read Only member row verified: blank name, email, User role, Pending, Expert, Read Only, Renewable');
  });
});
