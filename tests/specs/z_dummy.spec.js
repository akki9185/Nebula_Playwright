const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage } = require('../pages');
const { findUserDynamically, ensureCandidateExists, inviteAndRegisterMember } = require('../utils/common.util');

let registeredEmail = 'ankitqa.iihglobal+nt18x@gmail.com';
let registeredPassword = 'Pa$$w0rd!';


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


test('TC_UM_007: Verify registeredEmail is marked as Primary admin', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_007: Verifying primary admin status ──');

    const adminRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: registeredEmail });
    await expect(adminRow).toBeVisible({ timeout: 10000 });

    const primaryChip = adminRow.locator('.MuiChip-root', { hasText: 'Primary' });
    await expect(primaryChip).toBeVisible();
    console.log('✓ Primary admin status verified successfully');
});


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
    console.log('✓ Edit modal clicked');

    // MemberUpdateModel uses MUI <Modal> (not <Dialog>), so scope by heading text
    const editModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(editModal).toBeVisible({ timeout: 8000 });
    console.log('✓ Edit modal is visible');

    // Verify fields are disabled — MUI Select renders with role="combobox"
    const editRoleSelect = editModal.getByRole('combobox', { name: /role/i });
    const editEmailInput = editModal.locator('input#email');
    const editStatusSelect = editModal.locator('#status[role="combobox"]');
    const editSeatSelect = editModal.locator('#viewType[role="combobox"]');
    const editRenewSelect = editModal.locator('#renewable[role="combobox"]');

    await expect(editRoleSelect).toBeDisabled();
    console.log('  ✓ Role is disabled');
    await expect(editEmailInput).toBeDisabled();
    console.log('  ✓ Email is disabled');
    await expect(editStatusSelect).toBeDisabled();
    console.log('  ✓ Status is disabled');
    await expect(editSeatSelect).toBeDisabled();
    console.log('  ✓ Seat Type is disabled');
    await expect(editRenewSelect).toBeDisabled();
    console.log('  ✓ Renew Status is disabled');
    console.log('✓ Verified all restricted fields are disabled for the logged-in user');

    // Cancel edit
    await editModal.getByRole('button', { name: /cancel/i }).click();
    await expect(editModal).toBeHidden();
    console.log('✓ Modal closed');
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_009: Admin + Full Access user can be set as Primary Admin
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_009: Verify Admin + Full Access user can be set as Primary Admin', async ({ page }, testInfo) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_009: Verify Admin+Full Access user can be set as Primary Admin ──');

    const candidateEmail = await ensureCandidateExists(page, userMgmtPage, 'Admin', 'Full Access', registeredEmail);

    // Search for the candidate email to bypass virtual scrolling
    await userMgmtPage.searchUser(candidateEmail);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ Found candidate user: ${candidateEmail}`);

    // Open action menu for the candidate
    await candidateRow.locator('button').last().click();
    console.log('✓ Action menu opened');

    // Verify "Set as Primary" is visible
    await expect(userMgmtPage.actionMenu_setPrimaryItem).toBeVisible({ timeout: 5000 });
    console.log('✓ "Set as Primary" option is visible in menu');

    // Click Set as Primary
    await userMgmtPage.actionMenu_setPrimaryItem.click();
    console.log('✓ Clicked "Set as Primary"');

    // Verify success alert — use .first() to avoid strict mode when Snackbar + Alert both match
    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /primary|success/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible');

    // Clear search to verify the Primary chip on the row
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(1000);

    // Verify Primary chip now appears on the candidate row
    const newPrimaryRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await newPrimaryRow.scrollIntoViewIfNeeded();
    await expect(newPrimaryRow.locator('.MuiChip-root', { hasText: 'Primary' })).toBeVisible({ timeout: 10000 });
    console.log('✓ Primary chip now visible on the candidate user');

    // ── Restore: set registeredEmail back as Primary via Logging in as new Primary Admin ──
    console.log('\n── Restoring Primary Admin to registeredEmail ──');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(candidateEmail, registeredPassword);
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });

    await userMgmtPage.navigateToUserManagement();
    await userMgmtPage.goToUsersTab();

    await userMgmtPage.searchUser(registeredEmail);
    await page.waitForTimeout(1500);
    const selfRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: registeredEmail });
    await expect(selfRow).toBeVisible({ timeout: 10000 });
    await selfRow.locator('button').last().click();
    await userMgmtPage.actionMenu_setPrimaryItem.click();

    const restoreAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /primary|success/i }).first();
    await expect(restoreAlert).toBeVisible({ timeout: 10000 });

    // Clear search to verify restoration
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(1000);

    const restoredRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: registeredEmail });
    await restoredRow.scrollIntoViewIfNeeded();
    await expect(restoredRow.locator('.MuiChip-root', { hasText: 'Primary' })).toBeVisible({ timeout: 10000 });
    console.log('✓ Primary chip restored on registeredEmail');

    // Demote candidateEmail back to User role to keep DB clean
    console.log('── Demoting candidateEmail back to User role ──');

    // Log out of candidateEmail
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Log in as registeredEmail (Primary Admin)
    await loginPage.navigateToLogin();
    await loginPage.login(registeredEmail, registeredPassword);
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });

    await userMgmtPage.navigateToUserManagement();
    await userMgmtPage.goToUsersTab();

    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const candidateRowToDemote = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRowToDemote).toBeVisible({ timeout: 10000 });
    await candidateRowToDemote.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    const updateModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(updateModal).toBeVisible({ timeout: 8000 });
    await userMgmtPage.edit_roleSelect.click();
    await page.waitForTimeout(1000);
    const userOption = page.locator('li[role="option"]').filter({ hasText: /^User$/i });
    await userOption.click();
    await page.waitForTimeout(1000);

    await userMgmtPage.edit_saveButton.click();
    const demoteAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(demoteAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Candidate demoted back to User role');

    // Clean up login session for subsequent tests
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_010: Admin + ReadOnly user — "Set as Primary" is disabled
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_010: Verify Admin + ReadOnly user cannot be set as Primary Admin', async ({ page }, testInfo) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_010: Verify Admin+ReadOnly user cannot be set as Primary Admin ──');

    const candidateEmail = await ensureCandidateExists(page, userMgmtPage, 'Admin', 'Read Only', registeredEmail);

    // Search for the candidate email to bypass virtual scrolling
    await userMgmtPage.searchUser(candidateEmail);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ Found Admin+ReadOnly candidate: ${candidateEmail}`);

    // Open action menu
    await candidateRow.locator('button').last().click();
    console.log('✓ Action menu opened');

    // Verify "Set as Primary" menu item IS visible (it always appears for Admin users)
    await expect(userMgmtPage.actionMenu_setPrimaryItem).toBeVisible({ timeout: 5000 });
    console.log('✓ "Set as Primary" option is visible');

    // Verify it is visually disabled via opacity CSS (not aria-disabled)
    // The app applies opacity: 0.5 + cursor: not-allowed when viewType !== "Full"
    const setPrimaryItem = userMgmtPage.actionMenu_setPrimaryItem;
    const opacity = await setPrimaryItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(1);
    console.log(`✓ "Set as Primary" appears disabled (opacity: ${opacity})`);

    // Click it and verify Primary chip does NOT move to this ReadOnly Admin
    await setPrimaryItem.click();
    await page.waitForTimeout(2000); // brief wait for any potential action

    const readOnlyAdminRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    const primaryChip = readOnlyAdminRow.locator('.MuiChip-root', { hasText: 'Primary' });
    await expect(primaryChip).toBeHidden();
    console.log('✓ Primary chip did NOT appear on Admin+ReadOnly user — correctly blocked');

    // Close any open menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Demote candidate back to User role to keep DB clean
    console.log('── Demoting candidateEmail back to User role ──');
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const rowToDemote = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(rowToDemote).toBeVisible({ timeout: 10000 });
    await rowToDemote.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    const updateModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(updateModal).toBeVisible({ timeout: 8000 });
    await userMgmtPage.edit_roleSelect.click();
    await page.waitForTimeout(1000);
    const userOption = page.locator('li[role="option"]').filter({ hasText: /^User$/i });
    await userOption.click();
    await page.waitForTimeout(1000);

    await userMgmtPage.edit_saveButton.click();
    const demoteAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(demoteAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Candidate demoted back to User role');

    // Close any open menu and clear search
    await page.keyboard.press('Escape');
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(1000);
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_011: User role — "Set as Primary" option is NOT available regardless of seat type
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_011: Verify User role cannot be set as Primary Admin (seat type irrelevant)', async ({ page }, testInfo) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_011: Verify User role has no "Set as Primary" option ──');

    const userEmail = await findUserDynamically(page, userMgmtPage, 'User', '', registeredEmail);

    // Search for the candidate email to bypass virtual scrolling
    await userMgmtPage.searchUser(userEmail);
    const userRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: userEmail });
    await expect(userRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ Found User-role candidate: ${userEmail}`);

    // Open action menu (...)
    await userRow.locator('button').last().click();
    console.log('✓ Action menu opened');

    // Verify "Set as Primary" is NOT present in the menu at all
    await expect(userMgmtPage.actionMenu_setPrimaryItem).toBeHidden();
    console.log('✓ "Set as Primary" option is NOT visible for User role — correctly excluded');

    // Close menu and clear search
    await page.keyboard.press('Escape');
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(1000);
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_013: Verify changing user Renew Status updates and reflects in user listing table
// ─────────────────────────────────────────────────────────────────────────────
('TC_UM_013: Verify changing user Renew Status updates and reflects in user listing table', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_013: Verify user Renew Status updates and reflects in table ──');

    const candidateEmail = await findUserDynamically(page, userMgmtPage, 'User', '', registeredEmail);
    console.log(`Candidate for Renew Status update: ${candidateEmail}`);

    // Search for the candidate email
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const candidateRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(candidateRow).toBeVisible({ timeout: 10000 });

    const cells = candidateRow.locator('td');
    const initialStatus = (await cells.nth(9).innerText()).trim();
    console.log(`Initial Renew Status: ${initialStatus}`);

    const targetStatus = initialStatus === 'Renewable' ? 'Non Renewable' : 'Renewable';
    console.log(`Target Renew Status: ${targetStatus}`);

    // Open row action menu (...)
    await candidateRow.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    const editModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(editModal).toBeVisible({ timeout: 8000 });

    // Change Renew Status
    await userMgmtPage.edit_renewSelect.click();
    await page.waitForTimeout(1000);
    const targetOption = page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${targetStatus}$`, 'i') });
    await targetOption.click();
    await page.waitForTimeout(1000);

    // Save changes
    await userMgmtPage.edit_saveButton.click();
    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible');

    // Wait and verify table reflects updated status
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const updatedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(updatedRow.locator('td').nth(9)).toContainText(targetStatus);
    console.log(`✓ Table correctly reflects updated status: ${targetStatus}`);

    // ── Restore: Change it back to initialStatus to keep DB clean ──
    console.log(`── Restoring user Renew Status back to: ${initialStatus} ──`);
    await updatedRow.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();
    await expect(editModal).toBeVisible({ timeout: 8000 });

    await userMgmtPage.edit_renewSelect.click();
    await page.waitForTimeout(1000);
    const initialOption = page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${initialStatus}$`, 'i') });
    await initialOption.click();
    await page.waitForTimeout(1000);

    await userMgmtPage.edit_saveButton.click();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log(`✓ Restored original status: ${initialStatus}`);
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_014: Verify User role status changes Active <> Inactive affect login permissions
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_014: Verify User role status changes Active <> Inactive affect login permissions', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_014: Verify User status changes Active <> Inactive affect login ──');
    await runStatusToggleAndLoginVerification(page, userMgmtPage, 'User');
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_015: Verify Admin role status changes Active <> Inactive affect login permissions
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_015: Verify Admin role status changes Active <> Inactive affect login permissions', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_015: Verify Admin status changes Active <> Inactive affect login ──');
    await runStatusToggleAndLoginVerification(page, userMgmtPage, 'Admin');
});




