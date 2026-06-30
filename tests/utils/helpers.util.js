const { expect } = require('@playwright/test');
const { LoginPage, UserManagementPage } = require('../pages');
const { inviteAndRegisterMember } = require('./common.util');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get candidate with known password
// ─────────────────────────────────────────────────────────────────────────────
async function getCandidateWithKnownPassword(page, userMgmtPage, targetRole) {
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(1000);

    const rows = userMgmtPage.tableRows;
    const rowCount = await rows.count();
    let foundEmail = null;

    for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const emailText = (await row.locator('td').nth(2).textContent()).trim();
        const roleText = (await row.locator('td').nth(3).textContent()).trim();
        const statusText = (await row.locator('td').nth(6).textContent()).trim();
        const hasPrimaryChip = await row.locator('.MuiChip-root', { hasText: 'Primary' }).count() > 0;

        if (
            emailText.startsWith('ankitqa.iihglobal+') &&
            emailText.includes('MB') &&
            roleText.toLowerCase() === targetRole.toLowerCase() &&
            statusText.toLowerCase() === 'active' &&
            !hasPrimaryChip
        ) {
            foundEmail = emailText;
            break;
        }
    }

    if (!foundEmail) {
        if (targetRole.toLowerCase() === 'admin') {
            console.log('No existing active Admin test user found. Finding a User role candidate and promoting...');
            const userEmail = await getCandidateWithKnownPassword(page, userMgmtPage, 'User');
            
            await userMgmtPage.searchUser(userEmail);
            await page.waitForTimeout(1500);
            const row = userMgmtPage.tableBody.locator('tr').filter({ hasText: userEmail });
            await expect(row).toBeVisible({ timeout: 10000 });
            await row.locator('button').last().click();
            await userMgmtPage.actionMenu_editItem.click();

            await expect(userMgmtPage.edit_modal).toBeVisible({ timeout: 8000 });
            await userMgmtPage.edit_roleSelect.click();
            await page.waitForTimeout(1000);
            const adminOption = page.locator('li[role="option"]').filter({ hasText: /^Admin$/i });
            await adminOption.click();
            await page.waitForTimeout(1000);

            await userMgmtPage.edit_saveButton.click();
            const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
            await expect(successAlert).toBeVisible({ timeout: 10000 });
            
            await userMgmtPage.searchUser('');
            await page.waitForTimeout(1000);
            
            return userEmail;
        } else {
            console.log('No existing active test user with known password found. Registering a new one...');
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const registerData = require('../data/register.data.json');
            const companyName = registerData.register.companyName;
            const uid = 'nt18x';
            await inviteAndRegisterMember({
                page,
                userMgmtPage,
                companyName,
                uid,
                accessType: 'Full Access',
                namePrefix: 'TempUser',
                index: randomNum
            });
            return getCandidateWithKnownPassword(page, userMgmtPage, 'User');
        }
    }

    return foundEmail;
}


// ─────────────────────────────────────────────────────────────────────────────
// Helper: Run status toggle and login verification flow
// ─────────────────────────────────────────────────────────────────────────────
async function runStatusToggleAndLoginVerification(page, userMgmtPage, targetRole) {
    const candidateEmail = await getCandidateWithKnownPassword(page, userMgmtPage, targetRole);
    console.log(`Using candidate email for ${targetRole} status testing: ${candidateEmail}`);

    // Search for the candidate
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const row = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Store their initial details (Seat Type and Renew status) before deactivating
    const cells = row.locator('td');
    const initialSeatType = (await cells.nth(8).innerText()).trim(); // "Full" or "Read Only"
    const initialRenewStatus = (await cells.nth(9).innerText()).trim(); // "Renewable" or "Non Renewable"
    console.log(`Initial details - Seat: ${initialSeatType}, Renew: ${initialRenewStatus}`);

    // Go to subscription tab and read initial available counts
    await userMgmtPage.goToSubscriptionTab();
    const initialFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
    const initialReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);
    const initialAvailable = initialSeatType.toLowerCase().includes('read') ? initialReadOnlyAvailable : initialFullAvailable;
    console.log(`[Status Toggle Verification] Initial Available Seats for ${initialSeatType}: ${initialAvailable}`);

    // Go back to Users tab
    await userMgmtPage.goToUsersTab();
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);

    // Open Edit modal
    await row.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();

    const editModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(editModal).toBeVisible({ timeout: 8000 });

    // Change status from Active to Inactive
    const editStatusSelect = editModal.locator('#status[role="combobox"]');
    await editStatusSelect.click();
    await page.waitForTimeout(1000);
    const inactiveOption = page.locator('li[role="option"]').filter({ hasText: /^Inactive$/i });
    await inactiveOption.click();
    await page.waitForTimeout(1000);

    // Verify Seat Type and Renew Status are disabled when Inactive is selected
    await expect(userMgmtPage.edit_seatSelect).toBeDisabled();
    await expect(userMgmtPage.edit_renewSelect).toBeDisabled();
    console.log('✓ Seat Type and Renew Status are disabled when status is Inactive');

    // Save changes
    await userMgmtPage.edit_saveButton.click();
    const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible');

    // Verify Inactive status is reflected in the table
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const inactiveRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(inactiveRow.locator('td').nth(6)).toContainText('Inactive');
    console.log('✓ Table correctly reflects Inactive status');

    // Verify available seat count increased on Subscription tab
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);
    let deactivatedFullAvailable, deactivatedReadOnlyAvailable;
    for (let i = 0; i < 5; i++) {
        deactivatedFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
        deactivatedReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);
        const currentAvailable = initialSeatType.toLowerCase().includes('read') ? deactivatedReadOnlyAvailable : deactivatedFullAvailable;
        if (currentAvailable === initialAvailable + 1) {
            break;
        }
        await page.waitForTimeout(1000);
    }
    const afterDeactivationAvailable = initialSeatType.toLowerCase().includes('read') ? deactivatedReadOnlyAvailable : deactivatedFullAvailable;
    expect(afterDeactivationAvailable).toBe(initialAvailable + 1);
    console.log(`✓ Verified available seat count increased after deactivation: ${afterDeactivationAvailable}`);

    // Go back to Users tab
    await userMgmtPage.goToUsersTab();

    // Verify login is blocked when Inactive
    console.log('── Verifying login is blocked for Inactive user ──');
    const loginContext = await page.context().browser().newContext();
    const loginPageInstance = await loginContext.newPage();
    const loginPage = new LoginPage(loginPageInstance);
    await loginPage.navigateToLogin();
    await loginPage.login(candidateEmail, 'Pa$$w0rd!');
    // Assert specific error message for Inactive accounts is displayed
    const inactiveError = loginPageInstance.locator('p').filter({ hasText: /Inactive account/i });
    await expect(inactiveError).toBeVisible({ timeout: 10000 });
    await expect(inactiveError).toHaveText(/Inactive account\. Please contact admin/i);

    await expect(loginPageInstance).not.toHaveURL(/.*\/adhoc-search/, { timeout: 10000 });
    console.log('✓ Login blocked successfully for Inactive user (correct error message shown)');
    await loginPageInstance.close();
    await loginContext.close();

    // Now re-activate the user
    console.log('── Re-activating the user to Active ──');
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const rowToActivate = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await rowToActivate.locator('button').last().click();
    await userMgmtPage.actionMenu_editItem.click();
    await expect(editModal).toBeVisible({ timeout: 8000 });

    // Set Status -> Active
    await editStatusSelect.click();
    await page.waitForTimeout(1000);
    const activeOption = page.locator('li[role="option"]').filter({ hasText: /^Active$/i });
    await activeOption.click();
    await page.waitForTimeout(1000);

    // Also select Seat Type (viewType) and Renew status (renewable) since they are cleared on Inactive
    await userMgmtPage.edit_seatSelect.click();
    await page.waitForTimeout(1000);
    const seatOptionText = initialSeatType.toLowerCase().includes('read') ? /^Read Only/i : /^Full/i;
    const seatOption = page.locator('li[role="option"]').filter({ hasText: seatOptionText }).first();
    await seatOption.click();
    await page.waitForTimeout(1000);

    await userMgmtPage.edit_renewSelect.click();
    await page.waitForTimeout(1000);
    const renewOption = page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${initialRenewStatus}$`, 'i') });
    await renewOption.click();
    await page.waitForTimeout(1000);

    // Save changes
    await userMgmtPage.edit_saveButton.click();
    const reactivationAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(reactivationAlert).toBeVisible({ timeout: 10000 });
    console.log('✓ Success notification is visible on reactivation');

    // Verify Active status is reflected in the table
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const activeRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(activeRow.locator('td').nth(6)).toContainText('Active');
    console.log('✓ Table correctly reflects Active status');

    // Verify available seat count decreased on Subscription tab
    await userMgmtPage.goToSubscriptionTab();
    await page.waitForTimeout(2000);
    let activatedFullAvailable, activatedReadOnlyAvailable;
    for (let i = 0; i < 5; i++) {
        activatedFullAvailable = parseInt((await userMgmtPage.sub_cellFullAccessAvailable.innerText()).trim(), 10);
        activatedReadOnlyAvailable = parseInt((await userMgmtPage.sub_cellReadOnlyAvailable.innerText()).trim(), 10);
        const currentAvailable = initialSeatType.toLowerCase().includes('read') ? activatedReadOnlyAvailable : activatedFullAvailable;
        if (currentAvailable === initialAvailable) {
            break;
        }
        await page.waitForTimeout(1000);
    }
    const afterActivationAvailable = initialSeatType.toLowerCase().includes('read') ? activatedReadOnlyAvailable : activatedFullAvailable;
    expect(afterActivationAvailable).toBe(initialAvailable);
    console.log(`✓ Verified available seat count decreased after reactivation: ${afterActivationAvailable}`);

    // Go back to Users tab
    await userMgmtPage.goToUsersTab();

    // Verify login is allowed when Active
    console.log('── Verifying login is allowed for Active user ──');
    const activeLoginContext = await page.context().browser().newContext();
    const activeLoginPageInstance = await activeLoginContext.newPage();
    const activeLoginPage = new LoginPage(activeLoginPageInstance);
    await activeLoginPage.navigateToLogin();
    await activeLoginPage.login(candidateEmail, 'Pa$$w0rd!');
    await expect(activeLoginPageInstance).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Login allowed successfully for active user');
    await activeLoginPageInstance.close();
    await activeLoginContext.close();
}

module.exports = {
    getCandidateWithKnownPassword,
    runStatusToggleAndLoginVerification
};
