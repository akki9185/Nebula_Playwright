const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage } = require('../pages');
const { pollEmail, decodeQuotedPrintable, inviteAndRegisterMember } = require('../utils/common.util');
const { RegisterPage } = require('../pages');

/**
 * User Management — Users Tab E2E Tests
 *
 * Pre-condition: Uses an existing paid Expert company account so the Users tab
 * and Invite Member feature are fully accessible.
 *
 * Credentials: ankitqa.iihglobal+ex19069@gmail.com / Pa$$w0rd!
 * Company Name: stored in companyName variable after navigating to Users tab.
 *
 * Run:
 *   npx playwright test tests/specs/user_management.spec.js
 */

const PAID_EMAIL    = 'ankitqa.iihglobal+ex19069@gmail.com';
const PAID_PASSWORD = 'Pa$$w0rd!';
const COMPANY_NAME  = 'Ankit QA AT ex19069'; // Company name of the paid account

test.describe('User Management — Users Tab E2E Tests', () => {
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

    // Navigate to User Management and switch to Users tab
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
    await expect(userMgmtPage.inviteMemberButton).toBeVisible();

    // Data table structure
    await expect(userMgmtPage.table).toBeVisible();
    await expect(userMgmtPage.tableHead).toBeVisible();
    await expect(userMgmtPage.tableBody).toBeVisible();

    // Column headers
    await expect(userMgmtPage.col_name).toContainText(/name/i);
    await expect(userMgmtPage.col_email).toContainText(/email/i);
    await expect(userMgmtPage.col_role).toContainText(/role/i);
    await expect(userMgmtPage.col_action).toBeVisible();

    // At least one data row should be present (the admin row itself)
    await expect(userMgmtPage.tableRows.first()).toBeVisible({ timeout: 10000 });

    console.log('✓ All Users tab UI elements verified');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_002: Verify Search by Name/Email filters table rows
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_002: Verify search by email filters the table correctly', async ({ page }) => {
    console.log('\n── TC_UM_002: Verifying search functionality ──');

    // Get the email from the first row to use as search query
    const firstRowEmail = (await userMgmtPage.tableBody.locator('tr').first().locator('td').nth(2).innerText()).trim();
    console.log(`Searching for: ${firstRowEmail}`);

    await userMgmtPage.searchInput.fill(firstRowEmail);
    await page.waitForTimeout(1000); // debounce

    // At least one row should remain visible with that email
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
  test('TC_UM_003: Verify Filter row toggles on and off', async ({ page }) => {
    console.log('\n── TC_UM_003: Verifying Filter toggle ──');

    // Initially filter row should not be visible
    await expect(userMgmtPage.filter_nameInput).not.toBeVisible();

    // Click Filter button to show filter row
    await userMgmtPage.toggleFilter();
    await expect(userMgmtPage.filter_nameInput).toBeVisible({ timeout: 5000 });
    await expect(userMgmtPage.filter_emailInput).toBeVisible();
    await expect(userMgmtPage.filter_roleSelect).toBeVisible();
    await expect(userMgmtPage.filter_statusSelect).toBeVisible();
    console.log('✓ Filter row is visible with all filter inputs');

    // Click Filter button again to hide filter row
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

    // Send button visible (may be disabled until form filled)
    await expect(userMgmtPage.invite_sendButton).toBeVisible();

    // Close button visible
    await expect(userMgmtPage.invite_closeButton).toBeVisible();

    console.log('✓ Invite Member modal renders all expected elements');

    // Close the modal
    await userMgmtPage.invite_closeButton.click();
    await expect(userMgmtPage.invite_title).not.toBeVisible({ timeout: 5000 });
    console.log('✓ Invite Member modal closed successfully');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_005: Invite a Full Access member and verify Pending status in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_005: Invite a Full Access member and verify Pending status', async ({ page }) => {
    console.log('\n── TC_UM_005: Inviting Full Access member ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}FA${randomNum}@gmail.com`;
    console.log(`Inviting Full Access member: ${invitedEmail}`);

    // Invite the member
    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Full Access' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

    // Verify invited member row appears in table with Pending status
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

    console.log('✓ Invited member row verified: blank name, email, User role, Pending status, Expert subscription, Full Access seat, Renewable');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_006: Invite a Read Only member and verify Pending status in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_006: Invite a Read Only member and verify Pending status', async ({ page }) => {
    console.log('\n── TC_UM_006: Inviting Read Only member ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}RO${randomNum}@gmail.com`;
    console.log(`Inviting Read Only member: ${invitedEmail}`);

    // Invite the member
    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Read Only' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

    // Verify invited member row appears in table with Pending status
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

    console.log('✓ Invited member row verified: blank name, email, User role, Pending status, Expert subscription, Read Only seat, Renewable');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_007: Full invite → register flow for a Full Access member
  //   Invite → retrieve email link → open registration page → verify prefilled
  //   fields are readonly → fill name/password → OTP → verify Active in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_007: Full invite & register flow — Full Access member becomes Active', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    console.log('\n── TC_UM_007: Full Full Access invite & register flow ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}FA${randomNum}@gmail.com`;
    const memberName = `FA User ${uid}`;
    console.log(`Inviting Full Access member: ${invitedEmail}`);

    const inviteStartTime = new Date();

    // Invite member
    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Full Access' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

    // Verify Pending status in table
    const invitedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
    await expect(invitedRow).toBeVisible({ timeout: 10000 });
    const cells = invitedRow.locator('td');
    await expect(cells.nth(6)).toContainText('Pending');
    console.log('✓ Invited member row is Pending');

    // Poll Gmail for invitation email
    console.log(`Polling for invitation email for: ${invitedEmail}`);
    const emailMessage = await pollEmail(`${COMPANY_NAME} Invited`, inviteStartTime);
    expect(emailMessage).toBeTruthy();
    console.log(`✓ Invitation email found`);

    // Extract invitation URL
    const decodedBody = decodeQuotedPrintable(emailMessage);
    const inviteUrlMatch = decodedBody.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
    expect(inviteUrlMatch).toBeTruthy();
    let inviteUrl = inviteUrlMatch[0].replace(/[=]+$/, '').trim();
    console.log(`✓ Extracted Invitation URL: ${inviteUrl}`);

    // Open registration in isolated context
    const inviteContext = await page.context().browser().newContext();
    const invitePage = await inviteContext.newPage();
    const inviteRegisterPage = new RegisterPage(invitePage);
    await invitePage.goto(inviteUrl);
    await invitePage.waitForLoadState('load');
    console.log('✓ Invitation register page loaded');

    // Verify Company Name is prefilled and readonly
    await expect(inviteRegisterPage.companyNameInput).toHaveValue(COMPANY_NAME);
    await expect(inviteRegisterPage.companyNameInput).toHaveAttribute('readonly');
    console.log('✓ Company name is prefilled and read-only');

    // Verify Email is prefilled and readonly
    await expect(inviteRegisterPage.emailInput).toHaveValue(invitedEmail);
    await expect(inviteRegisterPage.emailInput).toHaveAttribute('readonly');
    console.log('✓ Email is prefilled and read-only');

    // Fill name and password
    const otpSentTime = new Date();
    await inviteRegisterPage.fillRegistrationForm({
      name: memberName,
      password: 'Pa$$w0rd!',
      confirmPassword: 'Pa$$w0rd!'
    });
    await inviteRegisterPage.acceptTerms();
    await expect(inviteRegisterPage.submitButton).toBeEnabled();
    await inviteRegisterPage.clickSubmit();
    console.log('✓ Registration form submitted. Polling for OTP email...');

    // Poll OTP
    const inviteOtpBody = await pollEmail('Verification code', otpSentTime, invitedEmail);
    expect(inviteOtpBody, 'Invited user OTP email not received').not.toBe('');
    const inviteOtpMatch = inviteOtpBody.match(/\b\d{6}\b/);
    expect(inviteOtpMatch, 'Could not extract OTP').not.toBeNull();
    const inviteOtp = inviteOtpMatch[0];
    console.log(`✓ OTP received: ${inviteOtp}`);

    await inviteRegisterPage.fillOtp(inviteOtp);
    await inviteRegisterPage.clickSubmit();

    // Should redirect to dashboard
    await expect(invitePage).toHaveURL(/.*\/adhoc-search/, { timeout: 30000 });
    console.log('✓ Invited user registered and redirected to dashboard');
    await invitePage.close();
    await inviteContext.close();

    // Reload admin page and verify Active status
    await page.reload();
    await userMgmtPage.goToUsersTab();
    const updatedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
    await expect(updatedRow).toBeVisible({ timeout: 15000 });
    const updatedCells = updatedRow.locator('td');
    await expect(updatedCells.nth(1)).toContainText(memberName);
    await expect(updatedCells.nth(2)).toContainText(invitedEmail);
    await expect(updatedCells.nth(3)).toContainText('User');
    await expect(updatedCells.nth(6)).toContainText('Active');
    await expect(updatedCells.nth(7)).toContainText(/expert/i);
    await expect(updatedCells.nth(8)).toContainText(/Full/i);
    await expect(updatedCells.nth(9)).toContainText('Renewable');
    console.log('✓ Member is now Active in Users table with correct details');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_008: Full invite → register flow for a Read Only member
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_008: Full invite & register flow — Read Only member becomes Active', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    console.log('\n── TC_UM_008: Full Read Only invite & register flow ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}RO${randomNum}@gmail.com`;
    const memberName = `RO User ${uid}`;
    console.log(`Inviting Read Only member: ${invitedEmail}`);

    const inviteStartTime = new Date();

    // Invite member
    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Read Only' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

    // Verify Pending in table
    const invitedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
    await expect(invitedRow).toBeVisible({ timeout: 10000 });
    const cells = invitedRow.locator('td');
    await expect(cells.nth(6)).toContainText('Pending');
    console.log('✓ Invited member row is Pending');

    // Poll Gmail for invitation email
    console.log(`Polling for invitation email for: ${invitedEmail}`);
    const emailMessage = await pollEmail(`${COMPANY_NAME} Invited`, inviteStartTime);
    expect(emailMessage).toBeTruthy();
    console.log(`✓ Invitation email found`);

    // Extract invitation URL
    const decodedBody = decodeQuotedPrintable(emailMessage);
    const inviteUrlMatch = decodedBody.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
    expect(inviteUrlMatch).toBeTruthy();
    let inviteUrl = inviteUrlMatch[0].replace(/[=]+$/, '').trim();
    console.log(`✓ Extracted Invitation URL: ${inviteUrl}`);

    // Open registration in isolated context
    const inviteContext = await page.context().browser().newContext();
    const invitePage = await inviteContext.newPage();
    const inviteRegisterPage = new RegisterPage(invitePage);
    await invitePage.goto(inviteUrl);
    await invitePage.waitForLoadState('load');
    console.log('✓ Invitation register page loaded');

    // Verify Company Name is prefilled and readonly
    await expect(inviteRegisterPage.companyNameInput).toHaveValue(COMPANY_NAME);
    await expect(inviteRegisterPage.companyNameInput).toHaveAttribute('readonly');
    console.log('✓ Company name is prefilled and read-only');

    // Verify Email is prefilled and readonly
    await expect(inviteRegisterPage.emailInput).toHaveValue(invitedEmail);
    await expect(inviteRegisterPage.emailInput).toHaveAttribute('readonly');
    console.log('✓ Email is prefilled and read-only');

    // Fill name and password
    const otpSentTime = new Date();
    await inviteRegisterPage.fillRegistrationForm({
      name: memberName,
      password: 'Pa$$w0rd!',
      confirmPassword: 'Pa$$w0rd!'
    });
    await inviteRegisterPage.acceptTerms();
    await expect(inviteRegisterPage.submitButton).toBeEnabled();
    await inviteRegisterPage.clickSubmit();
    console.log('✓ Registration form submitted. Polling for OTP email...');

    // Poll OTP
    const inviteOtpBody = await pollEmail('Verification code', otpSentTime, invitedEmail);
    expect(inviteOtpBody, 'Invited user OTP email not received').not.toBe('');
    const inviteOtpMatch = inviteOtpBody.match(/\b\d{6}\b/);
    expect(inviteOtpMatch, 'Could not extract OTP').not.toBeNull();
    const inviteOtp = inviteOtpMatch[0];
    console.log(`✓ OTP received: ${inviteOtp}`);

    await inviteRegisterPage.fillOtp(inviteOtp);
    await inviteRegisterPage.clickSubmit();

    // Should redirect to dashboard
    await expect(invitePage).toHaveURL(/.*\/adhoc-search/, { timeout: 30000 });
    console.log('✓ Invited user registered and redirected to dashboard');
    await invitePage.close();
    await inviteContext.close();

    // Reload admin page and verify Active status
    await page.reload();
    await userMgmtPage.goToUsersTab();
    const updatedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
    await expect(updatedRow).toBeVisible({ timeout: 15000 });
    const updatedCells = updatedRow.locator('td');
    await expect(updatedCells.nth(1)).toContainText(memberName);
    await expect(updatedCells.nth(2)).toContainText(invitedEmail);
    await expect(updatedCells.nth(3)).toContainText('User');
    await expect(updatedCells.nth(6)).toContainText('Active');
    await expect(updatedCells.nth(7)).toContainText(/expert/i);
    await expect(updatedCells.nth(8)).toContainText(/ReadOnly/i);
    await expect(updatedCells.nth(9)).toContainText('Renewable');
    console.log('✓ Member is now Active in Users table with correct details');
  });
});
