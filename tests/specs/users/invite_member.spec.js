const { test, expect } = require('@playwright/test');
const {
  LoginPage,
  UserManagementPage,
  SubscriptionPage,
  RegisterPage
} = require('../../pages');
const { pollEmail, decodeQuotedPrintable, completeStripePayment } = require('../../utils/common.util');
const registerData = require('../../data/register.data.json');

/**
 * User Management — Users Tab Tests
 *
 * Flow:
 *   beforeAll  → Register fresh Expert account (FA=5, RO=1) → OTP → Stripe payment
 *   beforeEach → Login with registered credentials → navigate to Users tab
 *   Tests      → Users tab cases (TC_UM_001 to TC_UM_006)
 *
 * Run:
 *   npx playwright test tests/specs/user_management.spec.js
 */

// Shared credentials populated by beforeAll
let registeredEmail;
let registeredPassword;
let registeredCompanyName;

test.describe.serial('User Management — Users Tab Tests', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // beforeAll: Register a fresh Expert account and complete Stripe payment
  // ─────────────────────────────────────────────────────────────────────────────
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(600000); // 10 minutes for full registration + Stripe payment
    console.log('\n════ beforeAll: Registering fresh Expert account and completing payment ════');

    const context = await browser.newContext();
    const page = await context.newPage();

    const subPage = new SubscriptionPage(page);
    const registerPage = new RegisterPage(page);

    // ── Step 1: Select Expert plan (FA=5, RO=1, GOALS=FC) ──────────────────
    await page.context().clearCookies();

    let loaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      await subPage.navigateToSubscription();
      try {
        await expect(page.locator('h5', { hasText: /^Free$/i })).toBeVisible({ timeout: 5000 });
        loaded = true;
        break;
      } catch {
        console.log(`Subscription page load attempt ${attempt} failed. Retrying...`);
        await page.waitForTimeout(3000);
      }
    }
    if (!loaded) throw new Error('Failed to load subscription page after 3 attempts');

    await subPage.selectPlan('Expert');
    console.log('✓ Expert plan selected (FA=5 base, RO=0 base)');

    // Add 1 Read-Only seat
    await subPage.incrementReadOnly('Expert');
    console.log('✓ Added 1 Read-Only seat');

    // Select search goal FC
    await subPage.selectSearchGoal('FC');
    console.log('✓ Selected FC search goal');

    await expect(subPage.grandTotal).toBeVisible();
    const grandTotal = (await subPage.grandTotal.textContent()).trim();
    console.log(`✓ Grand Total: ${grandTotal}`);

    await subPage.clickNextCreateAccount();
    await expect(page).toHaveURL(/.*\/register/);

    // ── Step 2: Fill registration form ─────────────────────────────────────
    const uid = Math.random().toString(36).substring(2, 7);
    registeredEmail = `ankitqa.iihglobal+${uid}@gmail.com`;
    registeredPassword = registerData.validation.password;
    registeredCompanyName = `Ankit QA AT ${uid}`;

    await registerPage.fillRegistrationForm({
      companyName: registeredCompanyName,
      email: registeredEmail,
      name: 'UM Admin',
      password: registeredPassword,
      confirmPassword: registeredPassword
    });
    await registerPage.acceptTerms();
    await expect(registerPage.submitButton).toBeEnabled();

    const testStartTime = new Date();
    await registerPage.clickSubmit();
    console.log('✓ Registration submitted.');

    // ── Step 3: OTP verification ────────────────────────────────────────────
    console.log('Polling for OTP email...');

    const otpBody = await pollEmail('Your Verification code for Company Registration', testStartTime, registeredEmail);
    expect(otpBody, 'OTP email not received').not.toBe('');
    const otpMatch = otpBody.match(/\b\d{6}\b/);
    expect(otpMatch, 'Could not extract OTP').not.toBeNull();
    const otp = otpMatch[0];
    console.log(`✓ OTP received: ${otp}`);

    await registerPage.fillOtp(otp);
    await registerPage.clickSubmit();
    console.log('✓ OTP submitted');

    // Poll for welcome email — ensures server has processed registration before continuing
    const welcomeStart = new Date();
    const welcomeBody = await pollEmail('User registration', welcomeStart, registeredEmail);
    expect(welcomeBody, 'Welcome email not received').not.toBe('');
    console.log('✓ Welcome email received');

    // ── Step 4: Click Email Invoice ─────────────────────────────────────────
    await expect(registerPage.emailInvoiceButton).toBeVisible({ timeout: 15000 });
    await registerPage.clickEmailInvoice();
    await expect(registerPage.invoiceDialogTitle).toBeVisible({ timeout: 30000 });
    console.log('✓ Invoice sent');

    // ── Step 5: Stripe payment ──────────────────────────────────────────────
    console.log('✓ Polling for Stripe invoice email...');
    const invoiceEmailStart = new Date(Date.now() - 3 * 60 * 1000);
    const rawInvoiceEmail = await pollEmail('invoice', invoiceEmailStart, registeredEmail);
    expect(rawInvoiceEmail, 'Invoice email not received').not.toBe('');

    const decodedInvoice = decodeQuotedPrintable(rawInvoiceEmail);
    const invoiceUrlMatch = decodedInvoice.match(/https:\/\/invoice\.stripe\.com\/[^\s"'>]+/i);
    expect(invoiceUrlMatch, 'Could not find Stripe invoice URL').not.toBeNull();
    let stripeUrl = invoiceUrlMatch[0].replace(/[=]+$/, '').trim();
    console.log(`✓ Stripe invoice URL extracted`);

    const stripePage = await context.newPage();
    await stripePage.goto(stripeUrl);
    await stripePage.waitForLoadState('load');
    await completeStripePayment(stripePage);
    await stripePage.close();
    console.log('✓ Stripe payment completed');

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('REGISTERED CREDENTIALS');
    console.log(`Company: ${registeredCompanyName}`);
    console.log(`Email  : ${registeredEmail}`);
    console.log(`Password: ${registeredPassword}`);
    console.log('══════════════════════════════════════════════════════════\n');

    await context.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // beforeEach: Login with registered credentials → navigate to Users tab
  // ─────────────────────────────────────────────────────────────────────────────
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const userMgmtPage = new UserManagementPage(page);

    console.log(`\n── Logging in as ${registeredEmail} ──`);
    await loginPage.navigateToLogin();
    await loginPage.login(registeredEmail, registeredPassword);
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Logged in');

    // Poll until subscription is RENEWABLE (webhook may take a moment)
    await userMgmtPage.navigateToUserManagement();
    await userMgmtPage.goToSubscriptionTab();
    for (let i = 0; i < 10; i++) {
      const status = await userMgmtPage.sub_cellStatus.innerText();
      if (!status.toLowerCase().includes('unpaid')) break;
      console.log(`[Attempt ${i + 1}] Subscription still Unpaid, waiting for webhook...`);
      await page.waitForTimeout(3000);
      await page.reload();
      await userMgmtPage.tab_Subscription.waitFor({ state: 'visible', timeout: 10000 });
      await userMgmtPage.goToSubscriptionTab();
    }

    await userMgmtPage.goToUsersTab();
    console.log('✓ Navigated to Users tab');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_001: Verify Users tab renders all expected elements
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_001: Verify Users tab renders all expected elements', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_001: Verifying Users tab UI elements ──');

    await expect(userMgmtPage.tab_Users).toBeVisible();
    await expect(userMgmtPage.searchInput).toBeVisible();
    await expect(userMgmtPage.filterButton).toBeVisible();

    // Invite Member button must be ENABLED (payment completed)
    await expect(userMgmtPage.inviteMemberButton).toBeVisible();
    await expect(userMgmtPage.inviteMemberButton).toBeEnabled();
    console.log('✓ Invite Member button is enabled (payment completed)');

    await expect(userMgmtPage.table).toBeVisible();
    await expect(userMgmtPage.tableHead).toBeVisible();
    await expect(userMgmtPage.tableBody).toBeVisible();

    await expect(userMgmtPage.col_name).toContainText(/name/i);
    await expect(userMgmtPage.col_email).toContainText(/email/i);
    await expect(userMgmtPage.col_role).toContainText(/role/i);
    await expect(userMgmtPage.col_action).toBeVisible();

    await expect(userMgmtPage.tableRows.first()).toBeVisible({ timeout: 10000 });
    console.log('✓ All Users tab UI elements verified');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_002: Verify search by email filters table rows
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_002: Verify search by email filters the table correctly', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_002: Verifying search functionality ──');

    const firstRowEmail = (await userMgmtPage.tableBody.locator('tr').first().locator('td').nth(2).innerText()).trim();
    console.log(`Searching for: ${firstRowEmail}`);

    await userMgmtPage.searchInput.fill(firstRowEmail);
    await page.waitForTimeout(1000);

    const matchedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: firstRowEmail });
    await expect(matchedRow).toBeVisible({ timeout: 10000 });
    console.log('✓ Search filtered table — matched row visible');

    await userMgmtPage.searchInput.fill('');
    await page.waitForTimeout(1000);
    await expect(userMgmtPage.tableRows.first()).toBeVisible();
    console.log('✓ Cleared search — table rows restored');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_003: Verify Filter row toggles on and off
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_003: Verify Filter row toggles on and off', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_003: Verifying Filter toggle ──');

    await expect(userMgmtPage.filter_nameInput).not.toBeVisible();

    await userMgmtPage.toggleFilter();
    await expect(userMgmtPage.filter_nameInput).toBeVisible({ timeout: 5000 });
    await expect(userMgmtPage.filter_emailInput).toBeVisible();
    await expect(userMgmtPage.filter_roleSelect).toBeVisible();
    await expect(userMgmtPage.filter_statusSelect).toBeVisible();
    console.log('✓ Filter row visible with all filter inputs');

    await userMgmtPage.toggleFilter();
    await expect(userMgmtPage.filter_nameInput).not.toBeVisible();
    console.log('✓ Filter row hidden after toggling off');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_004: Verify Invite Member modal opens and renders correctly
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_004: Verify Invite Member modal opens and renders correctly', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_004: Verifying Invite Member modal UI ──');

    await userMgmtPage.openInviteMemberModal();
    await expect(userMgmtPage.invite_title).toBeVisible({ timeout: 10000 });
    await expect(userMgmtPage.invite_accessTypeSelect).toBeVisible();
    await expect(userMgmtPage.invite_emailInput).toBeVisible();
    await expect(userMgmtPage.invite_sendButton).toBeVisible();
    await expect(userMgmtPage.invite_closeButton).toBeVisible();
    console.log('✓ Invite Member modal renders all expected elements');

    await userMgmtPage.invite_closeButton.click();
    await expect(userMgmtPage.invite_title).not.toBeVisible({ timeout: 5000 });
    console.log('✓ Invite Member modal closed successfully');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_005: Invite a Full Access member and verify Pending status in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_005: Invite Full Access member — verify Pending status in table', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_005: Inviting Full Access member ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}FA${randomNum}@gmail.com`;
    console.log(`Inviting: ${invitedEmail}`);

    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Full Access' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

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
    console.log('✓ Full Access member verified: Pending, Expert, Full Access, Renewable');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_006: Invite a Read Only member and verify Pending status in table
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_006: Invite Read Only member — verify Pending status in table', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_006: Inviting Read Only member ──');

    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invitedEmail = `ankitqa.iihglobal+${uid}RO${randomNum}@gmail.com`;
    console.log(`Inviting: ${invitedEmail}`);

    await userMgmtPage.inviteMember({ email: invitedEmail, accessType: 'Read Only' });
    await userMgmtPage.clickOkay();
    console.log('✓ Member invited successfully');

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
    console.log('✓ Read Only member verified: Pending, Expert, Read Only, Renewable');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_007: Verify registeredEmail is marked as Primary admin
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_007: Verify registeredEmail is marked as Primary admin', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_007: Verifying primary admin status ──');

    const adminRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: registeredEmail });
    await expect(adminRow).toBeVisible({ timeout: 10000 });

    const primaryChip = adminRow.locator('.MuiChip-root', { hasText: 'Primary' });
    await expect(primaryChip).toBeVisible();
    console.log('✓ Primary admin status verified successfully');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_008: Verify logged-in user cannot edit their own details
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_008: Verify logged-in user cannot edit their own Role, Email, Status, Seat Type, and Renew Status', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_008: Verifying logged-in user self-edit restrictions ──');

    // Find the row for the logged-in user
    const selfRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: registeredEmail });
    await expect(selfRow).toBeVisible({ timeout: 10000 });

    // Open row action menu (...)
    await selfRow.locator('button').last().click();
    console.log('✓ Action menu opened');

    // Click Edit
    await userMgmtPage.actionMenu_editItem.click();
    console.log('✓ Edit modal opened');

    // Verify dialog/modal is visible
    await expect(userMgmtPage.edit_modal).toBeVisible();

    // Verify fields are disabled
    const editRoleSelect = userMgmtPage.edit_modal.getByRole('combobox', { name: /role/i });
    const editEmailInput = userMgmtPage.edit_modal.locator('input#email');
    const editStatusSelect = userMgmtPage.edit_modal.locator('#status[role="combobox"]');
    const editSeatSelect = userMgmtPage.edit_modal.locator('#viewType[role="combobox"]');
    const editRenewSelect = userMgmtPage.edit_modal.locator('#renewable[role="combobox"]');

    await expect(editRoleSelect).toBeDisabled();
    await expect(editEmailInput).toBeDisabled();
    await expect(editStatusSelect).toBeDisabled();
    await expect(editSeatSelect).toBeDisabled();
    await expect(editRenewSelect).toBeDisabled();
    console.log('✓ Verified Role, Email, Status, Seat Type, and Renew Status fields are disabled');

    // Cancel edit
    await userMgmtPage.edit_cancelButton.click();
    await expect(userMgmtPage.edit_modal).toBeHidden();
    console.log('✓ Cancelled edit');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC_UM_012: Verify Payment History Tab — Transactions, Invoices, and Invoice Modal Details
  // ─────────────────────────────────────────────────────────────────────────────
  test('TC_UM_012: Verify Payment History Tab — Transactions, Invoices, and Invoice Modal Details', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_012: Verifying Payment History tab ──');

    // Go to Payment History Tab
    await userMgmtPage.tab_PaymentHistory.click();
    console.log('✓ Switched to Payment History tab');

    // Verify "Transactions" sub-tab is active by default and contains a paid transaction row
    await expect(userMgmtPage.payment_subtabTransactions).toBeVisible();
    await expect(userMgmtPage.payment_tableRows).toHaveCount(1);
    
    const firstTxRow = userMgmtPage.payment_tableRows.first();
    await expect(firstTxRow.locator('td').nth(2)).toContainText(/5,?100\.00/); // Expert Plan ($5000) + 1 RO seat ($15) + FC goal ($10) + 3 min extra seats ($75)
    await expect(firstTxRow.locator('td').nth(4)).toContainText(/succeeded|paid/i);
    console.log('✓ Verified transaction row contains correct payment amount and succeeded status');

    // Switch to "Invoices" sub-tab
    await userMgmtPage.switchPaymentSubTab('invoices');
    console.log('✓ Switched to Invoices sub-tab');

    // Verify invoice row is visible and has correct details
    await expect(userMgmtPage.payment_tableRows).toHaveCount(1);
    const firstInvoiceRow = userMgmtPage.payment_tableRows.first();
    await expect(firstInvoiceRow.locator('td').nth(2)).toContainText(/5,?100\.00/);
    await expect(firstInvoiceRow.locator('td').nth(3)).toContainText(/paid|succeeded/i);

    // Open invoice detail dialog
    await userMgmtPage.viewInvoice(0);
    console.log('✓ Opened invoice detail modal');

    // Verify dialog content
    await expect(userMgmtPage.invoice_modal).toBeVisible();
    await expect(userMgmtPage.invoice_modal.locator('text=Total Paid')).toBeVisible();
    await expect(userMgmtPage.invoice_modal).toContainText(/5,?100\.00/);
    await expect(userMgmtPage.invoice_modal.locator('text=Amount Due')).toBeVisible();
    await expect(userMgmtPage.invoice_modal.locator('text=$0.00')).toBeVisible();

    // Verify download/view PDF buttons inside modal
    await expect(userMgmtPage.invoice_downloadBtn).toBeVisible();
    await expect(userMgmtPage.invoice_viewPdfBtn).toBeVisible();
    console.log('✓ Verified invoice details, payment totals, and action buttons in dialog');

    // Close the invoice modal
    await userMgmtPage.closeInvoiceModal();
    console.log('✓ Closed invoice modal successfully');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const cleanTitle = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
      const screenshotPath = `test-results/screenshots/${cleanTitle}-failed.png`;
      console.log(`[Failure] Saving screenshot to: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  });
});

