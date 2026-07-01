const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage, RegisterPage } = require('../../pages');
const { findUserDynamically, ensureCandidateExists, pollEmail, decodeQuotedPrintable } = require('../../utils/common.util');
const { runStatusToggleAndLoginVerification } = require('../../utils/helpers.util');

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
test('TC_UM_013: Verify changing user Renew Status updates and reflects in user listing table', async ({ page }) => {
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


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_016: Verify changing user seat type affects available seat counts of both types
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_016: Verify changing user seat type affects available seat counts of both types', async ({ page }) => {
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_016: Verify changing user seat type affects available seat counts ──');

    // 1. Go to subscription tab and read initial available counts
    await userMgmtPage.goToSubscriptionTab();
    const initialFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
    const initialReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);
    console.log(`Initial Available Seats - Full: ${initialFullAvailable}, ReadOnly: ${initialReadOnlyAvailable}`);

    // 2. Go back to Users tab
    await userMgmtPage.goToUsersTab();

    // 3. Find an active User candidate
    const candidateEmail = await findUserDynamically(page, userMgmtPage, 'User', '', registeredEmail);
    console.log(`Found candidate user: ${candidateEmail}`);

    // 4. Search and locate candidate user row
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const row = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(row).toBeVisible({ timeout: 10000 });

    // 5. Read their current seat type
    const cells = row.locator('td');
    const initialSeatType = (await cells.nth(8).innerText()).trim(); // "Full" or "ReadOnly"
    console.log(`Candidate initial seat type: ${initialSeatType}`);

    // 6. Determine target seat type and expected changes
    let targetSeatType, expectedFullChange, expectedReadOnlyChange, targetOptionText, restoreOptionText;
    if (initialSeatType.toLowerCase().includes('full')) {
        targetSeatType = 'ReadOnly';
        targetOptionText = /^Read Only/i;
        restoreOptionText = /^Full/i;
        expectedFullChange = 1;
        expectedReadOnlyChange = -1;
    } else {
        targetSeatType = 'Full';
        targetOptionText = /^Full/i;
        restoreOptionText = /^Read Only/i;
        expectedFullChange = -1;
        expectedReadOnlyChange = 1;
    }

    // 7. Open Edit modal and change seat type to target
    await row.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    const editModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(editModal).toBeVisible({ timeout: 8000 });

    await userMgmtPage.edit_seatSelect.click();
    await page.waitForTimeout(1000);
    const targetOption = page.locator('li[role="option"]').filter({ hasText: targetOptionText }).first();
    await targetOption.click();
    await page.waitForTimeout(1000);

    // Save changes
    await userMgmtPage.edit_saveButton.click();
    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log(`✓ Changed seat type to ${targetSeatType}`);

    // 8. Verify updated available seat counts on My Subscription page
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);

    let updatedFullAvailable, updatedReadOnlyAvailable;
    for (let i = 0; i < 5; i++) {
        updatedFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
        updatedReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);

        if (updatedFullAvailable === initialFullAvailable + expectedFullChange &&
            updatedReadOnlyAvailable === initialReadOnlyAvailable + expectedReadOnlyChange) {
            break;
        }
        await page.waitForTimeout(1000);
    }

    console.log(`Updated Available Seats - Full: ${updatedFullAvailable}, ReadOnly: ${updatedReadOnlyAvailable}`);
    expect(updatedFullAvailable).toBe(initialFullAvailable + expectedFullChange);
    expect(updatedReadOnlyAvailable).toBe(initialReadOnlyAvailable + expectedReadOnlyChange);
    console.log('✓ Verified available seat counts of both types are affected correctly');

    // 9. Go back to Users tab
    await userMgmtPage.goToUsersTab();

    // 10. Restore candidate's original seat type
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const rowRestore = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(rowRestore).toBeVisible({ timeout: 10000 });

    await rowRestore.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();
    await expect(editModal).toBeVisible({ timeout: 8000 });

    await userMgmtPage.edit_seatSelect.click();
    await page.waitForTimeout(1000);
    const restoreOption = page.locator('li[role="option"]').filter({ hasText: restoreOptionText }).first();
    await restoreOption.click();
    await page.waitForTimeout(1000);

    await userMgmtPage.edit_saveButton.click();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log(`✓ Restored seat type back to ${initialSeatType}`);

    // 11. Verify seat counts are back to initial on Subscription tab
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);

    let finalFullAvailable, finalReadOnlyAvailable;
    for (let i = 0; i < 5; i++) {
        finalFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
        finalReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);

        if (finalFullAvailable === initialFullAvailable &&
            finalReadOnlyAvailable === initialReadOnlyAvailable) {
            break;
        }
        await page.waitForTimeout(1000);
    }

    console.log(`Final Available Seats - Full: ${finalFullAvailable}, ReadOnly: ${finalReadOnlyAvailable}`);
    expect(finalFullAvailable).toBe(initialFullAvailable);
    expect(finalReadOnlyAvailable).toBe(initialReadOnlyAvailable);
    console.log('✓ Verified available seat counts of both types are successfully restored');
});




// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_017: Change Email Feature - Verify editing email of Pending user resends invitation, invalidates old link, registers on new link, and checks seats
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_017: Change Email Feature - Verify editing email of Pending user resends invitation, invalidates old link, registers on new link, and checks seats', async ({ page }) => {
    test.setTimeout(240000);
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_017: Change Email Feature - Verify editing email of Pending user ──');

    const editModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });

    // 1. Get initial available seats from My Subscription page
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);
    let initialFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
    let initialReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);
    console.log(`Initial Available Seats - Full: ${initialFullAvailable}, ReadOnly: ${initialReadOnlyAvailable}`);

    // If there are no Full Access seats available, clean up a previous test user to free a seat
    if (initialFullAvailable === 0) {
        console.log('No available Full Access seats. Cleaning up a previous test user...');
        await userMgmtPage.goToUsersTab();
        await page.waitForTimeout(1500);
        await userMgmtPage.searchUser('ankitqa.iihglobal+');
        await page.waitForTimeout(2000);

        const rows = userMgmtPage.tableRows;
        const rowCount = await rows.count();
        console.log(`Found ${rowCount} potential test users for cleanup.`);
        for (let i = 0; i < rowCount; i++) {
            const row = rows.nth(i);
            const statusText = (await row.locator('td').nth(6).textContent()).trim();
            const emailText = (await row.locator('td').nth(2).textContent()).trim();
            const seatTypeText = (await row.locator('td').nth(8).textContent()).trim(); // 8th column is seat type
            console.log(`Row ${i}: Email="${emailText}", Status="${statusText}", SeatType="${seatTypeText}"`);

            // Delete if the user is Active, has Full Access seat, and is a temporary test user (excluding the logged-in admin)
            if (statusText.toLowerCase() === 'active' &&
                seatTypeText.toLowerCase().includes('full') &&
                emailText.includes('ankitqa.iihglobal+') &&
                emailText !== 'ankitqa.iihglobal+nt18x@gmail.com') {
                console.log(`Deleting user ${emailText} to free a Full Access seat...`);
                await row.locator('button').last().click();
                await userMgmtPage.actionMenu_deleteItem.click();
                await userMgmtPage.delete_confirmButton.click();

                const deleteAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|deleted/i }).first();
                await expect(deleteAlert).toBeVisible({ timeout: 10000 });
                console.log('✓ Success notification is visible after deleting the user');

                // Wait for the seat to be freed
                await userMgmtPage.goToSubscriptionTab();
                await page.waitForTimeout(2000);
                initialFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
                initialReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);
                console.log(`Updated Available Seats - Full: ${initialFullAvailable}, ReadOnly: ${initialReadOnlyAvailable}`);
                break;
            }
        }
    }

    await userMgmtPage.goToUsersTab();
    await page.waitForTimeout(1500);

    // 2. Direct invite member: Create a brand new user
    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pendingEmail = `ankitqa.iihglobal+${uid}PEND${randomNum}@gmail.com`;
    console.log(`Inviting a new user: ${pendingEmail}`);

    const inviteStartTime = new Date(Date.now() - 30000); // 30s buffer for IMAP clock skew
    await userMgmtPage.inviteMember({ email: pendingEmail, accessType: 'Full Access' });
    await userMgmtPage.clickOkay();
    await page.waitForTimeout(1500);

    // Poll for invitation email to get the old invite URL
    const emailMessage = await pollEmail('Invited', inviteStartTime, pendingEmail);
    expect(emailMessage).toBeTruthy();
    const decodedBody = decodeQuotedPrintable(emailMessage);
    const inviteUrlMatch = decodedBody.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
    expect(inviteUrlMatch).toBeTruthy();
    const oldInviteUrl = inviteUrlMatch[0].replace(/[=]+$/, '').trim();
    console.log(`✓ Got Old Invitation URL: ${oldInviteUrl}`);

    // 3. Edit the email of the pending user
    await userMgmtPage.searchUser(pendingEmail);
    await page.waitForTimeout(1500);
    const editRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: pendingEmail });
    await editRow.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    // Verify edit modal is visible
    await expect(editModal).toBeVisible({ timeout: 8000 });

    // Generate updated email
    const uid2 = Math.random().toString(36).substring(2, 7);
    const randomNum2 = Math.floor(1000 + Math.random() * 9000);
    const updatedEmail = `ankitqa.iihglobal+${uid2}UPD${randomNum2}@gmail.com`;
    console.log(`Updating email from ${pendingEmail} to ${updatedEmail}`);

    // Fill in new email and save
    const emailInput = editModal.locator('input#email');
    await emailInput.fill(updatedEmail);

    const updateStartTime = new Date(Date.now() - 30000); // 30s buffer for IMAP clock skew
    await userMgmtPage.edit_saveButton.click();

    // Verify success snackbar
    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible after updating email');

    // Verify updated email in the table
    await userMgmtPage.searchUser(updatedEmail);
    await page.waitForTimeout(1500);
    const updatedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: updatedEmail });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ Verification: Table correctly displays the updated email: ${updatedEmail}`);

    // 5. Try to Register With the Old Email Invitation URL
    console.log('── Verifying registration fails with the old invitation link ──');
    const oldInviteContext = await page.context().browser().newContext();
    const oldInvitePage = await oldInviteContext.newPage();
    await oldInvitePage.goto(oldInviteUrl);
    await oldInvitePage.waitForLoadState('load');
    await oldInvitePage.waitForTimeout(3000);

    const currentUrl = oldInvitePage.url();
    console.log(`Current URL with old invite link: ${currentUrl}`);

    const oldRegisterPageObj = new RegisterPage(oldInvitePage);
    const isOldSubmitVisible = await oldRegisterPageObj.submitButton.isVisible().catch(() => false);
    expect(isOldSubmitVisible).toBe(true);

    console.log('Attempting to submit registration with old invitation...');
    await oldRegisterPageObj.fillRegistrationForm({
        name: 'Old User Reg',
        password: 'Pa$$w0rd!',
        confirmPassword: 'Pa$$w0rd!'
    });
    await oldRegisterPageObj.acceptTerms();

    const oldOtpSentTime = new Date(Date.now() - 30000); // 30s buffer for IMAP clock skew
    await oldRegisterPageObj.clickSubmit();
    console.log('✓ First register submit clicked. Polling for old email OTP code...');

    // Poll for the OTP code sent to the old (pendingEmail) address
    const oldOtpMessage = await pollEmail('Verification code', oldOtpSentTime, pendingEmail);
    expect(oldOtpMessage).toBeTruthy();
    const oldOtpMatch = oldOtpMessage.match(/\b\d{6}\b/);
    expect(oldOtpMatch).toBeTruthy();
    const oldOtp = oldOtpMatch[0];
    console.log(`✓ Received OTP code for old email: ${oldOtp}`);

    // Fill OTP and click submit (Register button)
    await oldRegisterPageObj.fillOtp(oldOtp);
    await oldRegisterPageObj.clickSubmit();
    await oldInvitePage.waitForTimeout(3000);

    // Expecting error message to appear (e.g. invalid invitation or token error)
    const errorMessage = oldInvitePage.locator('p, span, div, h1, h2, h3, h4, h5, h6, label').filter({ hasText: /invalid|expired|fail|error/i }).first();
    await expect(errorMessage).toBeVisible({ timeout: 15000 });
    const errorText = await errorMessage.textContent();
    console.log(`✓ Verified: Error displayed on page when attempting to register: "${errorText.trim()}"`);

    // Verify registration did not redirect to the dashboard
    expect(oldInvitePage.url()).not.toContain('adhoc-search');

    await oldInvitePage.close();
    await oldInviteContext.close();

    // 6. Try to register with new Email and Do Register
    console.log('── Registering user using the updated email invitation link ──');

    // Poll for the new invitation email sent to the updated email address
    console.log(`Polling for invitation email sent to updated email: ${updatedEmail}`);
    const newEmailMessage = await pollEmail('Invited', updateStartTime, updatedEmail);
    expect(newEmailMessage).toBeTruthy();
    const newDecodedBody = decodeQuotedPrintable(newEmailMessage);
    const newInviteUrlMatch = newDecodedBody.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
    expect(newInviteUrlMatch).toBeTruthy();
    const newInviteUrl = newInviteUrlMatch[0].replace(/[=]+$/, '').trim();
    console.log(`✓ Got New Invitation URL: ${newInviteUrl}`);

    const newInviteContext = await page.context().browser().newContext();
    const newInvitePage = await newInviteContext.newPage();
    await newInvitePage.goto(newInviteUrl);
    await newInvitePage.waitForLoadState('load');
    console.log('✓ New Invitation register page loaded successfully');

    const newRegisterPageObj = new RegisterPage(newInvitePage);
    const memberName = 'Updated User Reg';

    // Fill the registration form
    await newRegisterPageObj.fillRegistrationForm({
        name: memberName,
        password: 'Pa$$w0rd!',
        confirmPassword: 'Pa$$w0rd!'
    });
    await newRegisterPageObj.acceptTerms();
    await expect(newRegisterPageObj.submitButton).toBeEnabled();

    const newOtpSentTime = new Date(Date.now() - 30000); // 30s buffer for IMAP clock skew
    await newRegisterPageObj.clickSubmit();
    console.log('✓ First register submit clicked. Taking debug screenshot...');
    await newInvitePage.screenshot({ path: 'test-results/register_submit_debug.png' });
    console.log('✓ Debug screenshot saved to test-results/register_submit_debug.png');
    console.log('Polling for updated email OTP code...');

    // Poll for the OTP code sent to the updatedEmail address
    const newOtpMessage = await pollEmail('Verification code', newOtpSentTime, updatedEmail);
    expect(newOtpMessage).toBeTruthy();
    const newOtpMatch = newOtpMessage.match(/\b\d{6}\b/);
    expect(newOtpMatch).toBeTruthy();
    const newOtp = newOtpMatch[0];
    console.log(`✓ Received OTP code for updated email: ${newOtp}`);

    // Fill OTP and click submit (Register button)
    await newRegisterPageObj.fillOtp(newOtp);
    await newRegisterPageObj.clickSubmit();
    console.log('✓ Second register submit clicked. Waiting 5s for redirection...');
    await newInvitePage.waitForTimeout(5000);
    await newInvitePage.screenshot({ path: 'test-results/register_final_debug.png' });
    console.log('✓ Final register debug screenshot saved.');

    // Wait for redirection to dashboard (adhoc-search)
    await expect(newInvitePage).toHaveURL(/.*\/adhoc-search/, { timeout: 30000 });
    console.log('✓ Updated user registered successfully and redirected to dashboard');

    await newInvitePage.close();
    await newInviteContext.close();

    // 7. Checked Available Seat
    console.log('── Checking available seat counts on My Subscription page ──');
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);

    let afterRegFullAvailable, afterRegReadOnlyAvailable;
    for (let i = 0; i < 5; i++) {
        afterRegFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
        afterRegReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);

        if (afterRegFullAvailable === initialFullAvailable - 1) {
            break;
        }
        await page.waitForTimeout(1000);
    }
    console.log(`After Registration Available Seats - Full: ${afterRegFullAvailable}, ReadOnly: ${afterRegReadOnlyAvailable}`);
    expect(afterRegFullAvailable).toBe(initialFullAvailable - 1);
    console.log('✓ Verified: Available Full Access seat count decreased by 1');

    // 8. Delete Registered User and Check Available seats
    console.log('── Deleting the registered user ──');
    await userMgmtPage.goToUsersTab();
    await page.waitForTimeout(1500);

    await userMgmtPage.searchUser(updatedEmail);
    await page.waitForTimeout(1500);
    const deleteRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: updatedEmail });
    await expect(deleteRow).toBeVisible({ timeout: 10000 });

    await deleteRow.locator('button').last().click();
    await userMgmtPage.actionMenu_deleteItem.click();
    await userMgmtPage.delete_confirmButton.click();

    // Wait for delete success snackbar
    const deleteAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|deleted/i }).first();
    await expect(deleteAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible after deleting the user');

    // Check available seats are restored
    console.log('── Checking available seat counts after deleting the user ──');
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);

    let finalFullAvailable, finalReadOnlyAvailable;
    for (let i = 0; i < 5; i++) {
        finalFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
        finalReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);

        if (finalFullAvailable === initialFullAvailable) {
            break;
        }
        await page.waitForTimeout(1000);
    }
    console.log(`Final Available Seats - Full: ${finalFullAvailable}, ReadOnly: ${finalReadOnlyAvailable}`);
    expect(finalFullAvailable).toBe(initialFullAvailable);
    console.log('✓ Verified: Available Full Access seat count returned to initial count');
});


// ─────────────────────────────────────────────────────────────────────────────
// TC_UM_018: Change Email Feature - Active User Case
// ─────────────────────────────────────────────────────────────────────────────
test('TC_UM_018: Change Email Feature - Verify editing email of Active user triggers notification, blocks login on old email, and permits login on new email', async ({ page }) => {
    test.setTimeout(480000);
    const userMgmtPage = new UserManagementPage(page);
    console.log('\n── TC_UM_018: Change Email Feature - Active User Case ──');

    // 1. Invite a new user
    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const initialEmail = `ankitqa.iihglobal+${uid}ACT${randomNum}@gmail.com`;
    console.log(`Inviting a new user for activation: ${initialEmail}`);

    const inviteStartTime = new Date(Date.now() - 30000); // 30s buffer for IMAP clock skew
    await userMgmtPage.inviteMember({ email: initialEmail, accessType: 'Full Access' });
    await userMgmtPage.clickOkay();
    await page.waitForTimeout(1500);

    // 2. Poll for invite, register and complete registration to make the user status Active
    const emailMessage = await pollEmail('Invited', inviteStartTime, initialEmail);
    expect(emailMessage).toBeTruthy();
    const decodedBody = decodeQuotedPrintable(emailMessage);
    const inviteUrlMatch = decodedBody.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
    expect(inviteUrlMatch).toBeTruthy();
    const inviteUrl = inviteUrlMatch[0].replace(/[=]+$/, '').trim();
    console.log(`✓ Got Invitation URL: ${inviteUrl}`);

    const inviteContext = await page.context().browser().newContext();
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(inviteUrl);
    await invitePage.waitForLoadState('load');
    console.log('✓ Invitation register page loaded successfully');

    const registerPageObj = new RegisterPage(invitePage);
    const memberName = 'Active User Reg';

    await registerPageObj.fillRegistrationForm({
        name: memberName,
        password: 'Pa$$w0rd!',
        confirmPassword: 'Pa$$w0rd!'
    });
    await registerPageObj.acceptTerms();
    await expect(registerPageObj.submitButton).toBeEnabled();

    const otpSentTime = new Date(Date.now() - 30000);
    await registerPageObj.clickSubmit();
    console.log('✓ Submit clicked. Polling for OTP...');

    const otpMessage = await pollEmail('Verification code', otpSentTime, initialEmail);
    expect(otpMessage).toBeTruthy();
    const otpMatch = otpMessage.match(/\b\d{6}\b/);
    expect(otpMatch).toBeTruthy();
    const otp = otpMatch[0];
    console.log(`✓ Received OTP code: ${otp}`);

    await registerPageObj.fillOtp(otp);
    await registerPageObj.clickSubmit();
    console.log('✓ OTP submitted. Waiting for redirection...');

    await expect(invitePage).toHaveURL(/.*\/adhoc-search/, { timeout: 30000 });
    console.log('✓ User registered successfully and redirected to dashboard (Status is now Active)');

    await invitePage.close();
    await inviteContext.close();

    // 3. Change the email of the Active user
    await userMgmtPage.goToUsersTab();
    await page.waitForTimeout(1500);
    await userMgmtPage.searchUser(initialEmail);
    await page.waitForTimeout(1500);

    const editRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: initialEmail });
    await editRow.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    const editModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(editModal).toBeVisible({ timeout: 8000 });

    const uid2 = Math.random().toString(36).substring(2, 7);
    const randomNum2 = Math.floor(1000 + Math.random() * 9000);
    const updatedEmail = `ankitqa.iihglobal+${uid2}ACTUPD${randomNum2}@gmail.com`;
    console.log(`Updating Active user email from ${initialEmail} to ${updatedEmail}`);

    const emailInput = editModal.locator('input#email');
    await emailInput.fill(updatedEmail);

    const updateStartTime = new Date(Date.now() - 30000);
    await userMgmtPage.edit_saveButton.click();

    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification visible after updating Active user email');

    await userMgmtPage.searchUser(updatedEmail);
    await page.waitForTimeout(1500);
    const updatedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: updatedEmail });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ Verification: Table correctly displays the updated email: ${updatedEmail}`);

    // 4. Verify the update email is sent to the new email address
    console.log(`Polling for "Email Address Updated" notification at new email: ${updatedEmail}`);
    const updateEmailMessage = await pollEmail('Email Address Updated', updateStartTime, updatedEmail);
    expect(updateEmailMessage).toBeTruthy();
    console.log('✓ "Email Address Updated" notification email received successfully');

    // Decode and verify login button/link exists
    const decodedUpdateBody = decodeQuotedPrintable(updateEmailMessage);
    const loginLinkMatch = decodedUpdateBody.match(/href="([^"]+)"[^>]*>Login/i);
    expect(loginLinkMatch).toBeTruthy();
    const loginLink = loginLinkMatch[1].replace(/[=]+$/, '').trim();
    console.log(`✓ Extracted Login URL from email: ${loginLink}`);

    // 5. Verify login permissions (Old vs New Email)
    console.log('── Verifying login permissions ──');
    const loginVerifyContext = await page.context().browser().newContext();
    const loginVerifyPage = await loginVerifyContext.newPage();
    const loginPageObj = new LoginPage(loginVerifyPage);

    // Try old email
    console.log(`Attempting login with old email (should fail): ${initialEmail}`);
    await loginVerifyPage.goto(loginLink);
    await loginVerifyPage.waitForLoadState('load');
    await loginPageObj.login(initialEmail, 'Pa$$w0rd!');

    // Expect error toast or block message
    const errorMsg = loginVerifyPage.locator('.MuiAlert-message, [role="alert"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
    const errorText = await errorMsg.textContent();
    console.log(`✓ Login correctly blocked with old email: "${errorText.trim()}"`);

    // Try new email
    console.log(`Attempting login with new email (should succeed): ${updatedEmail}`);
    await loginVerifyPage.reload();
    await loginPageObj.login(updatedEmail, 'Pa$$w0rd!');
    await expect(loginVerifyPage).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Successfully logged in with the new updated email!');

    await loginVerifyPage.close();
    await loginVerifyContext.close();

    // 6. Clean up: Delete the registered active user to restore seats
    console.log('── Deleting the registered active user to restore seats ──');
    await userMgmtPage.goToUsersTab();
    await page.waitForTimeout(2000);
    await userMgmtPage.searchUser(updatedEmail);
    await page.waitForTimeout(2000);

    const deleteRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: updatedEmail });
    await expect(deleteRow).toBeVisible({ timeout: 15000 });
    await deleteRow.locator('button').last().click();
    await page.waitForTimeout(1000);
    await page.locator('[role="menuitem"]').filter({ hasText: /^delete$/i }).click();
    await userMgmtPage.delete_confirmButton.click();

    const deleteAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|deleted/i }).first();
    await expect(deleteAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible after deleting the user');
});

