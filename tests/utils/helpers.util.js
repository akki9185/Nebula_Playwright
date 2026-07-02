const { expect } = require('@playwright/test');
const { LoginPage, UserManagementPage, RegisterPage } = require('../pages');
const { inviteAndRegisterMember, pollEmail, decodeQuotedPrintable } = require('./common.util');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Dynamically find table column indices by text content
// ─────────────────────────────────────────────────────────────────────────────
async function getTableColumnIndices(userMgmtPage) {
    const headers = userMgmtPage.tableHead.locator('th');
    const count = await headers.count();
    let emailIdx = 2;
    let roleIdx = 3;
    let statusIdx = 4;
    let seatIdx = 6;
    let renewIdx = 7;

    console.log(`[DEBUG] Header count in table: ${count}`);
    for (let i = 0; i < count; i++) {
        const text = (await headers.nth(i).innerText()).trim().toLowerCase();
        console.log(`[DEBUG] Header index ${i}: "${text}"`);
        if (text.includes('email')) emailIdx = i;
        if (text.includes('role')) roleIdx = i;
        if (text.includes('status')) statusIdx = i;
        if (text.includes('seat')) seatIdx = i;
        if (text.includes('renew')) renewIdx = i;
    }

    console.log(`[DEBUG] Resolved indices -> emailIdx: ${emailIdx}, roleIdx: ${roleIdx}, statusIdx: ${statusIdx}`);
    return { emailIdx, roleIdx, statusIdx, seatIdx, renewIdx };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get candidate with known password
// ─────────────────────────────────────────────────────────────────────────────
async function getCandidateWithKnownPassword(page, userMgmtPage, targetRole) {
    await userMgmtPage.searchUser('');
    await page.waitForTimeout(1000);

    const { emailIdx, roleIdx, statusIdx } = await getTableColumnIndices(userMgmtPage);

    const rows = userMgmtPage.tableRows;
    const rowCount = await rows.count();
    let foundEmail = null;

    console.log(`[DEBUG] Total rows in table: ${rowCount}`);
    for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const emailText = (await row.locator('td').nth(emailIdx).textContent()).trim();
        const roleText = (await row.locator('td').nth(roleIdx).textContent()).trim();
        const statusText = (await row.locator('td').nth(statusIdx).textContent()).trim();
        const hasPrimaryChip = await row.locator('.MuiChip-root', { hasText: 'Primary' }).count() > 0;

        console.log(`[DEBUG] Row ${i}: Email="${emailText}", Role="${roleText}", Status="${statusText}", hasPrimaryChip=${hasPrimaryChip}`);

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
            const companyName = 'Ankit QA AT nt18x';
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

    const { statusIdx, seatIdx, renewIdx } = await getTableColumnIndices(userMgmtPage);

    // Search for the candidate
    await userMgmtPage.searchUser(candidateEmail);
    await page.waitForTimeout(1500);
    const row = userMgmtPage.tableBody.locator('tr').filter({ hasText: candidateEmail });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Store their initial details (Seat Type and Renew status) before deactivating
    const cells = row.locator('td');
    const initialSeatType = (await cells.nth(seatIdx).innerText()).trim(); // "Full" or "Read Only"
    const initialRenewStatus = (await cells.nth(renewIdx).innerText()).trim(); // "Renewable" or "Non Renewable"
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
    await expect(inactiveRow.locator('td').nth(statusIdx)).toContainText('Inactive');
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
    await expect(activeRow.locator('td').nth(statusIdx)).toContainText('Active');
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

// Helper to invite and register a fresh candidate user
async function createFreshActiveUser(page, adminUserMgmtPage, caseId, namePrefix) {
    const uid = Math.random().toString(36).substring(2, 7);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const email = `ankitqa.iihglobal+${uid}${caseId.toLowerCase()}${randomNum}@gmail.com`;
    console.log(`[Helper - ${caseId}] Inviting fresh candidate: ${email}`);

    const inviteStartTime = new Date(Date.now() - 30000);
    await adminUserMgmtPage.inviteMember({ email, accessType: 'Full Access' });
    await adminUserMgmtPage.clickOkay();
    await page.waitForTimeout(1500);

    const inviteEmailBody = await pollEmail('Invited', inviteStartTime, email);
    expect(inviteEmailBody).toBeTruthy();
    const decodedInvite = decodeQuotedPrintable(inviteEmailBody);
    const inviteUrlMatch = decodedInvite.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
    expect(inviteUrlMatch).toBeTruthy();
    const inviteUrl = inviteUrlMatch[0].replace(/[=]+$/, '').trim();

    const regContext = await page.context().browser().newContext();
    const regPage = await regContext.newPage();
    const registerPageObj = new RegisterPage(regPage);
    await regPage.goto(inviteUrl);
    await regPage.waitForLoadState('load');

    await registerPageObj.fillRegistrationForm({
        name: `${namePrefix} ${randomNum}`,
        password: 'Pa$$w0rd!',
        confirmPassword: 'Pa$$w0rd!'
    });
    await registerPageObj.acceptTerms();
    await expect(registerPageObj.submitButton).toBeEnabled();

    const otpSentTime = new Date(Date.now() - 30000);
    await registerPageObj.clickSubmit();

    const otpBody = await pollEmail('Verification code', otpSentTime, email);
    expect(otpBody).toBeTruthy();
    const otpMatch = otpBody.match(/\b\d{6}\b/);
    expect(otpMatch).toBeTruthy();
    const otp = otpMatch[0];

    await registerPageObj.fillOtp(otp);
    await registerPageObj.clickSubmit();
    await expect(regPage).toHaveURL(/.*\/adhoc-search/, { timeout: 30000 });
    console.log(`[Helper - ${caseId}] Candidate registered and Active: ${email}`);
    await regPage.close();
    await regContext.close();

    return email;
}

// Helper to promote a user to Admin role
async function promoteUserToAdmin(page, adminUserMgmtPage, caseId, email, currentRole) {
    if (currentRole === 'Admin') {
        console.log(`[Helper - ${caseId}] Candidate is already Admin — skipping promotion`);
        return 'Admin';
    }
    console.log(`[Helper - ${caseId}] Promoting candidate ${email} to Admin`);
    await adminUserMgmtPage.goToUsersTab();
    await adminUserMgmtPage.searchUser(email);
    await page.waitForTimeout(1500);
    const promoteRow = adminUserMgmtPage.tableBody.locator('tr').filter({ hasText: email });
    await expect(promoteRow).toBeVisible({ timeout: 10000 });
    await promoteRow.locator('button').last().click();
    await adminUserMgmtPage.actionMenu_editItem.click();
    const promoteModal = page.locator('.MuiModal-root').filter({ hasText: 'Update Member' });
    await expect(promoteModal).toBeVisible({ timeout: 8000 });
    await adminUserMgmtPage.edit_roleSelect.click();
    await page.waitForTimeout(1000);
    await page.locator('li[role="option"]').filter({ hasText: /^Admin$/i }).click();
    await page.waitForTimeout(1000);
    await adminUserMgmtPage.edit_saveButton.click();
    const promoteAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
    await expect(promoteAlert).toBeVisible({ timeout: 10000 });
    console.log(`[Helper - ${caseId}] Candidate ${email} promoted to Admin successfully`);
    await adminUserMgmtPage.searchUser('');
    await page.waitForTimeout(1000);
    return 'Admin';
}

// Helper to delete a user to restore seats and clean up
async function deleteUserCleanup(adminUserMgmtPage, caseId, email) {
    console.log(`[Cleanup - ${caseId}] Deleting test user: ${email}`);
    await adminUserMgmtPage.goToUsersTab();
    await adminUserMgmtPage.searchUser(email);
    await adminUserMgmtPage.page.waitForTimeout(2000);

    const deleteRow = adminUserMgmtPage.tableBody.locator('tr').filter({ hasText: email });
    console.log(`[Cleanup - ${caseId}] Checking row visibility...`);
    const isVisible = await deleteRow.isVisible();
    console.log(`[Cleanup - ${caseId}] Row visible: ${isVisible}`);

    if (isVisible) {
        console.log(`[Cleanup - ${caseId}] Clicking row action button...`);
        await deleteRow.locator('button').last().click();
        await adminUserMgmtPage.page.waitForTimeout(1000);

        console.log(`[Cleanup - ${caseId}] Clicking delete item...`);
        await adminUserMgmtPage.page.locator('[role="menuitem"]').filter({ hasText: /^delete$/i }).click();
        await adminUserMgmtPage.page.waitForTimeout(1000);

        console.log(`[Cleanup - ${caseId}] Clicking delete confirm...`);
        await adminUserMgmtPage.delete_confirmButton.click();

        console.log(`[Cleanup - ${caseId}] Waiting for delete snackbar...`);
        const deleteAlert = adminUserMgmtPage.page.locator('.MuiSnackbar-root').filter({ hasText: /success|deleted/i }).first();
        await expect(deleteAlert).toBeVisible({ timeout: 15000 });
        console.log(`[Cleanup - ${caseId}] User ${email} deleted successfully`);
    }
    await adminUserMgmtPage.searchUser('');
    await adminUserMgmtPage.page.waitForTimeout(1000);
}

module.exports = {
    getTableColumnIndices,
    getCandidateWithKnownPassword,
    runStatusToggleAndLoginVerification,
    createFreshActiveUser,
    promoteUserToAdmin,
    deleteUserCleanup
};
