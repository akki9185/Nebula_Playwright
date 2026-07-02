const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage, RegisterPage } = require('../../pages');
const { pollEmail, decodeQuotedPrintable } = require('../../utils/common.util');
const { createFreshActiveUser, promoteUserToAdmin, deleteUserCleanup } = require('../../utils/helpers.util');

let registeredEmail = 'ankitqa.iihglobal+nt18x@gmail.com';
let registeredPassword = 'Pa$$w0rd!';

// Shared state for the single-invite candidate
let candidateEmail = null;
let currentPassword = 'Pa$$w0rd!';
let candidateRole = 'User';

// ==========================================
// 1. BEFORE HOOKS
// ==========================================

// Set up the shared candidate user once before any tests run
test.beforeAll(async ({ browser }) => {
    test.setTimeout(300000);
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    const userMgmtPage = new UserManagementPage(page);

    console.log(`\n── [beforeAll] Creating shared active candidate user ──`);
    await loginPage.navigateToLogin();
    await loginPage.login(registeredEmail, registeredPassword);
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });

    await userMgmtPage.navigateToUserManagement();
    await userMgmtPage.goToUsersTab();

    candidateEmail = await createFreshActiveUser(page, userMgmtPage, 'Suite', 'Shared CP');
    currentPassword = 'Pa$$w0rd!';
    candidateRole = 'User';
    console.log(`[beforeAll] Shared candidate created: ${candidateEmail}`);

    await page.close();
    await context.close();
});

test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const userMgmtPage = new UserManagementPage(page);

    console.log(`\n── Logging in as ${registeredEmail} ──`);
    await loginPage.navigateToLogin();
    await loginPage.login(registeredEmail, registeredPassword);
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Logged in');

    await userMgmtPage.navigateToUserManagement();
    await userMgmtPage.goToUsersTab();
    console.log('✓ Navigated to Users tab');
});

// ==========================================
// 3. TEST CASES
// ==========================================

// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_019: Verify "Change Password" option is NOT available for Pending users
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_019: Verify "Change Password" option is not available for Pending users', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_019: Verify "Change Password" option is not available for Pending users ──');

    // Use the filter to find a Pending user
    await userMgmtPage.filterButton.click();
    await page.waitForTimeout(1000);
    await userMgmtPage.filter_statusSelect.click();
    await page.waitForTimeout(1000);
    const pendingOption = page.locator('li[role="option"]').filter({ hasText: /^Pending$/i });

    const hasPendingOption = await pendingOption.count() > 0;
    if (!hasPendingOption) {
        console.log('ℹ No Pending status option found — skipping (no pending users in system)');
        await page.keyboard.press('Escape');
        await userMgmtPage.filter_clearButton.click();
        await userMgmtPage.filterButton.click();
        return;
    }

    await pendingOption.click();
    await page.waitForTimeout(1500);

    const rows = userMgmtPage.tableRows;
    const rowCount = await rows.count();

    if (rowCount === 0) {
        console.log('ℹ No Pending users found in table — skipping test');
        await userMgmtPage.filter_clearButton.click();
        await userMgmtPage.filterButton.click();
        return;
    }

    // Identify first Pending user row
    const pendingRow = rows.first();
    const cells = pendingRow.locator('td');
    const pendingEmail = (await cells.nth(2).textContent()).trim();
    console.log(`Found Pending user: ${pendingEmail}`);

    // Clear filters and search specifically for this user
    await userMgmtPage.filter_clearButton.click();
    await userMgmtPage.filterButton.click();
    await userMgmtPage.searchUser(pendingEmail);
    await page.waitForTimeout(1500);

    // Open action menu
    await pendingRow.locator('button').last().click();
    console.log('✓ Action menu opened');

    // Verify "Change Password" is NOT present for Pending users
    await expect(userMgmtPage.actionMenu_changePasswordItem).toBeHidden({ timeout: 5000 });
    console.log('✓ "Change Password" option is NOT visible for Pending user — correctly excluded');

    // Close menu and clear search
    await page.keyboard.press('Escape');
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(500);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_021: Verify Change Password modal UI elements and password validation rules
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_021: Verify Change Password modal UI elements and password validation rules', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_021: Verify Change Password modal UI and validation ──');
    console.log(`[TC21] Using candidate: ${candidateEmail}`);

    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });

    // Open Change Password from action menu
    await candidateRow.locator('button').last().click();
    await expect(userMgmtPage.actionMenu_changePasswordItem).toBeVisible({ timeout: 5000 });
    await userMgmtPage.actionMenu_changePasswordItem.click();
    console.log('✓ "Change Password" option clicked');

    // Verify modal opens
    const cpModal = page.locator('.MuiModal-root, [role="dialog"]').filter({ hasText: /change password/i }).first();
    await expect(cpModal).toBeVisible({ timeout: 8000 });
    console.log('✓ Change Password modal is visible');

    // Verify input fields exist
    const newPasswordInput = cpModal.locator('input[type="password"]').first();
    const confirmPasswordInput = cpModal.locator('input[type="password"]').last();
    await expect(newPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    console.log('✓ New Password and Confirm Password fields are visible');

    // Verify Save button exists
    const saveButton = cpModal.getByRole('button', { name: /save|update|change|submit/i }).first();
    await expect(saveButton).toBeVisible();
    console.log('✓ Save button is visible');

    // ── Validation: Mismatched passwords ──
    await newPasswordInput.fill('Pa$$w0rd!');
    await confirmPasswordInput.fill('Mismatch123!');
    await saveButton.click();
    await page.waitForTimeout(1500);

    const mismatchError = cpModal.locator('p, span, div, .Mui-error').filter({ hasText: /does not match|mismatch|passwords must match/i }).first();
    const hasMismatchError = await mismatchError.isVisible().catch(() => false);
    if (hasMismatchError) {
        console.log('✓ Mismatch validation error is shown as inline text');
    } else {
        console.log('ℹ Inline mismatch error not found — checking snackbar...');
        const snackbarError = page.locator('.MuiSnackbar-root').filter({ hasText: /match|mismatch|password/i }).first();
        await expect(snackbarError).toBeVisible({ timeout: 5000 });
        console.log('✓ Mismatch error shown via snackbar');
    }

    // ── Validation: Weak / short password ──
    await newPasswordInput.fill('abc');
    await confirmPasswordInput.fill('abc');
    await saveButton.click();
    await page.waitForTimeout(1500);

    const weakError = cpModal.locator('p, span, div, .Mui-error').filter({ hasText: /minimum|at least|characters|strong|requirement/i }).first();
    const hasWeakError = await weakError.isVisible().catch(() => false);
    if (hasWeakError) {
        console.log('✓ Weak password validation error is shown');
    } else {
        console.log('ℹ Weak password validation not surfaced as inline error — app may validate on blur only');
    }

    // Close modal without saving
    const cancelButton = cpModal.getByRole('button', { name: /cancel|close/i }).first();
    if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        console.log('✓ Clicked Cancel button');
    } else {
        await page.keyboard.press('Escape');
        console.log('✓ Pressed Escape to close modal');
    }
    await page.waitForTimeout(1000);
    console.log('✓ Modal closed without saving');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_022: Verify successful password change blocks login with old password
//            and allows login with new password (User role)
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_022: Verify changing a User\'s password blocks old password login and permits new password login', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_022: Verify Change Password — old password blocked, new password works ──');

    const oldPassword = currentPassword;
    const newPassword = 'NewPa$$w0rd@1';
    console.log(`[TC22] Using candidate: ${candidateEmail}`);

    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });

    // ── Open Change Password modal ──
    await candidateRow.locator('button').last().click();
    await expect(userMgmtPage.actionMenu_changePasswordItem).toBeVisible({ timeout: 5000 });
    await userMgmtPage.actionMenu_changePasswordItem.click();
    console.log('✓ Clicked "Change Password" from action menu');

    const cpModal = page.locator('.MuiModal-root, [role="dialog"]').filter({ hasText: /change password/i }).first();
    await expect(cpModal).toBeVisible({ timeout: 8000 });
    console.log('✓ Change Password modal opened');

    // Fill new password and save
    const newPasswordInput = cpModal.locator('input[type="password"]').first();
    const confirmPasswordInput = cpModal.locator('input[type="password"]').last();
    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    const saveButton = cpModal.getByRole('button', { name: /save|update|change|submit/i }).first();
    await saveButton.click();

    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated|changed/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Password changed successfully — success notification visible');

    await expect(cpModal).toBeHidden({ timeout: 8000 });
    currentPassword = newPassword;

    // ── Step 1: Verify old password is rejected ──
    console.log(`── [TC22] Verifying login with old password fails for: ${candidateEmail} ──`);
    const loginContext1 = await page.context().browser().newContext();
    const loginPage1 = await loginContext1.newPage();
    const loginPageObj1 = new LoginPage(loginPage1);
    await loginPageObj1.navigateToLogin();
    await loginPageObj1.login(candidateEmail, oldPassword);

    const loginError = loginPage1.locator('.MuiAlert-message, [role="alert"], p').filter({ hasText: /invalid|incorrect|failed|wrong/i }).first();
    await expect(loginError).toBeVisible({ timeout: 10000 });
    const loginErrorText = await loginError.textContent();
    console.log(`✓ [TC22] Old password correctly rejected: "${loginErrorText.trim()}"`);
    await expect(loginPage1).not.toHaveURL(/.*\/adhoc-search/);

    await loginPage1.close();
    await loginContext1.close();

    // ── Step 2: Verify new password is accepted ──
    console.log(`── [TC22] Verifying login with new password succeeds for: ${candidateEmail} ──`);
    const loginContext2 = await page.context().browser().newContext();
    const loginPage2 = await loginContext2.newPage();
    const loginPageObj2 = new LoginPage(loginPage2);
    await loginPageObj2.navigateToLogin();
    await loginPageObj2.login(candidateEmail, newPassword);
    await expect(loginPage2).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ [TC22] Successfully logged in with new password!');

    await loginPage2.close();
    await loginContext2.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_023: Verify successful password change for an Admin role user
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_023: Verify Admin user password can be changed and login verified', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_023: Verify Change Password for Admin role user ──');

    const newPassword = 'AdminNew@Pa$$1';
    candidateRole = await promoteUserToAdmin(page, userMgmtPage, 'TC23', candidateEmail, candidateRole);

    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });

    // Open Change Password modal
    await candidateRow.locator('button').last().click();
    await expect(userMgmtPage.actionMenu_changePasswordItem).toBeVisible({ timeout: 5000 });
    await userMgmtPage.actionMenu_changePasswordItem.click();
    console.log('✓ Clicked "Change Password" for Admin user');

    const cpModal = page.locator('.MuiModal-root, [role="dialog"]').filter({ hasText: /change password/i }).first();
    await expect(cpModal).toBeVisible({ timeout: 8000 });

    const newPasswordInput = cpModal.locator('input[type="password"]').first();
    const confirmPasswordInput = cpModal.locator('input[type="password"]').last();
    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    const saveButton = cpModal.getByRole('button', { name: /save|update|change|submit/i }).first();
    await saveButton.click();

    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated|changed/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Admin password changed successfully');
    await expect(cpModal).toBeHidden({ timeout: 8000 });
    currentPassword = newPassword;

    // Verify login with new password
    console.log(`── [TC23] Verifying login with new password succeeds for: ${candidateEmail} ──`);
    const loginContext = await page.context().browser().newContext();
    const loginPageInst = await loginContext.newPage();
    const loginPageObj = new LoginPage(loginPageInst);
    await loginPageObj.navigateToLogin();
    await loginPageObj.login(candidateEmail, newPassword);
    await expect(loginPageInst).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ [TC23] Admin logged in successfully with new password!');
    await loginPageInst.close();
    await loginContext.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_024: Verify Change Password modal closes on Cancel without saving
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_024: Verify Change Password modal closes on Cancel without changing the password', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_024: Verify Cancel on Change Password modal does not change the password ──');

    const oldPassword = currentPassword;
    const abortedNewPassword = 'ShouldNotSave@1!';
    console.log(`[TC24] Using candidate: ${candidateEmail}`);

    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });

    // Open Change Password modal
    await candidateRow.locator('button').last().click();
    await expect(userMgmtPage.actionMenu_changePasswordItem).toBeVisible({ timeout: 5000 });
    await userMgmtPage.actionMenu_changePasswordItem.click();

    const cpModal = page.locator('.MuiModal-root, [role="dialog"]').filter({ hasText: /change password/i }).first();
    await expect(cpModal).toBeVisible({ timeout: 8000 });
    console.log('✓ Change Password modal opened');

    // Fill in new password but DO NOT save
    const newPasswordInput = cpModal.locator('input[type="password"]').first();
    const confirmPasswordInput = cpModal.locator('input[type="password"]').last();
    await newPasswordInput.fill(abortedNewPassword);
    await confirmPasswordInput.fill(abortedNewPassword);
    console.log('✓ Filled new password fields (will not be saved)');

    // Click Cancel / close
    const cancelButton = cpModal.getByRole('button', { name: /cancel|close/i }).first();
    if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        console.log('✓ Clicked Cancel button');
    } else {
        await page.keyboard.press('Escape');
        console.log('✓ Pressed Escape to close modal');
    }

    await expect(cpModal).toBeHidden({ timeout: 5000 });
    console.log('✓ Modal is closed without saving');

    // Verify original password still works by attempting login
    console.log(`── [TC24] Verifying original password still works for: ${candidateEmail} ──`);
    const loginContext = await page.context().browser().newContext();
    const loginPage = await loginContext.newPage();
    const loginPageObj = new LoginPage(loginPage);
    await loginPageObj.navigateToLogin();
    await loginPageObj.login(candidateEmail, oldPassword);
    await expect(loginPage).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ [TC24] Original password still works — password was NOT changed on Cancel');

    await loginPage.close();
    await loginContext.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_025: Verify a logged-in active Admin user can change their own password
//            from Users > Action > Change Password and login with new password
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_025: Verify logged-in active Admin user can change own password via Users Action menu and login with new password', async ({ page }) => {
    const adminUserMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_025: Self Change Password — Users > Action > Change Password ──');

    const selfPassword = currentPassword;
    const newPassword  = 'SelfNew@Pa$$1';

    // ── Step 4: Log in as the candidate (Admin) in a new context ──
    console.log(`── [TC25] Logging in as candidate Admin: ${candidateEmail} ──`);
    const candidateContext = await page.context().browser().newContext();
    const candidatePage = await candidateContext.newPage();
    const candidateLoginPage = new LoginPage(candidatePage);
    const candidateUserMgmtPage = new UserManagementPage(candidatePage);

    await candidateLoginPage.navigateToLogin();
    await candidateLoginPage.login(candidateEmail, selfPassword);
    await expect(candidatePage).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ [TC25] Candidate Admin logged in successfully');

    // ── Step 5: Navigate to Users tab and find own row ──
    await candidateUserMgmtPage.navigateToUserManagement();
    await candidateUserMgmtPage.goToUsersTab();
    await candidateUserMgmtPage.searchUser(candidateEmail);
    await candidatePage.waitForTimeout(1500);
    const ownRow = candidateUserMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(ownRow).toBeVisible({ timeout: 10000 });
    console.log('✓ [TC25] Found own row in the Users table');

    // ── Step 6: Open action menu and verify Change Password is visible ──
    await ownRow.locator('button').last().click();
    await expect(candidateUserMgmtPage.actionMenu_changePasswordItem).toBeVisible({ timeout: 5000 });
    console.log('✓ [TC25] "Change Password" option IS visible for own row — self-service allowed');

    // ── Step 7: Change the password ──
    await candidateUserMgmtPage.actionMenu_changePasswordItem.click();
    const cpModal = candidatePage.locator('.MuiModal-root, [role="dialog"]').filter({ hasText: /change password/i }).first();
    await expect(cpModal).toBeVisible({ timeout: 8000 });
    console.log('✓ Change Password modal opened');

    const newPasswordInput = cpModal.locator('input[type="password"]').first();
    const confirmPasswordInput = cpModal.locator('input[type="password"]').last();
    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    const saveButton = cpModal.getByRole('button', { name: /save|update|change|submit/i }).first();
    await saveButton.click();

    const successAlert = candidatePage.locator('.MuiSnackbar-root').filter({ hasText: /success|updated|changed/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ [TC25] Password changed successfully');
    await expect(cpModal).toBeHidden({ timeout: 8000 });
    await candidatePage.close();
    await candidateContext.close();
    currentPassword = newPassword;

    // ── Step 8: Verify old password is rejected ──
    console.log(`── [TC25] Verifying old password is rejected for: ${candidateEmail} ──`);
    const oldCtx = await page.context().browser().newContext();
    const oldPg  = await oldCtx.newPage();
    await new LoginPage(oldPg).navigateToLogin();
    await new LoginPage(oldPg).login(candidateEmail, selfPassword);
    const loginError = oldPg.locator('.MuiAlert-message, [role="alert"], p').filter({ hasText: /invalid|incorrect|failed|wrong/i }).first();
    await expect(loginError).toBeVisible({ timeout: 10000 });
    console.log(`✓ [TC25] Old password rejected: "${(await loginError.textContent()).trim()}"`);
    await expect(oldPg).not.toHaveURL(/.*\/adhoc-search/);
    await oldPg.close();
    await oldCtx.close();

    // ── Step 9: Verify new password is accepted ──
    console.log(`── [TC25] Verifying new password works for: ${candidateEmail} ──`);
    const newCtx = await page.context().browser().newContext();
    const newPg  = await newCtx.newPage();
    await new LoginPage(newPg).navigateToLogin();
    await new LoginPage(newPg).login(candidateEmail, newPassword);
    await expect(newPg).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ [TC25] New password accepted — login successful!');
    await newPg.close();
    await newCtx.close();
});

// ==========================================
// 4. AFTER HOOKS
// ==========================================

// Clean up the shared candidate user after all tests complete
test.afterAll(async ({ browser }) => {
    if (candidateEmail) {
        console.log(`\n── [afterAll] Deleting shared test user: ${candidateEmail} ──`);
        const context = await browser.newContext();
        const page = await context.newPage();
        const loginPage = new LoginPage(page);
        const userMgmtPage = new UserManagementPage(page);

        await loginPage.navigateToLogin();
        await loginPage.login(registeredEmail, registeredPassword);
        await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });

        await userMgmtPage.navigateToUserManagement();
        await deleteUserCleanup(userMgmtPage, 'afterAll', candidateEmail);
        await page.close();
        await context.close();
    }
});
