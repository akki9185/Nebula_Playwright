const { expect } = require('@playwright/test');
const { pollGmailForMessage } = require('./gmail.util');
const registerData = require('../data/register.data.json');

/**
 * Poll email using centralized gmail credentials
 */
async function pollEmail(subjectQuery, since, to) {
  return pollGmailForMessage({
    emailAddress: registerData.gmail.emailAddress,
    appPassword: registerData.gmail.appPassword,
    subjectQuery,
    since,
    to,
  });
}

/**
 * Decode quoted printable email body text
 */
function decodeQuotedPrintable(str) {
  let decoded = str.replace(/=\r?\n/g, '');
  decoded = decoded.replace(/=3D/g, '=');
  return decoded;
}

/**
 * Fill credit card inputs inside Stripe element iframe and submit payment
 */
async function completeStripePayment(stripePage) {
  await stripePage.waitForLoadState('load');
  await stripePage.waitForTimeout(2000);

  // ── Handle currency selection screen (new Stripe UI) ──────────────────────
  // If a currency picker is shown, select USD and then click Card payment method
  const usdOption = stripePage.locator('button, label, div').filter({ hasText: /^\$[\d,]+\.\d{2}$/ }).first();
  if (await usdOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await usdOption.click();
    console.log('✓ Selected USD currency on Stripe page');
    await stripePage.waitForTimeout(1000);
  }

  // Click the Card payment method if shown on the main page (outside iframe)
  const cardMethodBtn = stripePage.locator('button, [role="radio"]').filter({ hasText: /^card$/i }).first();
  if (await cardMethodBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cardMethodBtn.click();
    console.log('✓ Clicked Card payment method on Stripe page');
    await stripePage.waitForTimeout(1000);
  }

  // ── Fill card details inside Stripe iframe ────────────────────────────────
  const paymentIFrameLocator = stripePage.locator('iframe[src*="elements-inner-payment"]');
  await paymentIFrameLocator.waitFor({ state: 'visible', timeout: 25000 });
  const stripeCardFrame = stripePage.frameLocator('iframe[src*="elements-inner-payment"]');

  await stripePage.waitForTimeout(2000);

  const cardTab = stripeCardFrame.locator('text=Card').first();
  if (await cardTab.count() > 0) {
    await cardTab.click();
    console.log('✓ Clicked Card tab inside iframe');
  }

  console.log('── Entering test credit card details on Stripe page ──');
  const cardInput = stripeCardFrame.locator('input[name="number"]');
  await expect(cardInput).toBeVisible({ timeout: 20000 });

  await cardInput.fill('4242');
  await cardInput.pressSequentially('424242424242');
  await stripeCardFrame.locator('input[name="expiry"]').fill('12/34');
  await stripeCardFrame.locator('input[name="cvc"]').fill('123');

  const postalInput = stripeCardFrame.locator('input[name="postalCode"]');
  if (await postalInput.count() > 0) {
    await postalInput.fill('90210');
  }

  // Click Pay
  await stripePage.waitForTimeout(2000);
  const stripePayBtn = stripePage.getByRole('button', { name: /^Pay/i }).first();
  await expect(stripePayBtn).toBeEnabled();
  await stripePayBtn.click();
  console.log('── Payment submitted, waiting for processing... ──');

  // Wait for Stripe success screen with a retry click if not visible
  let paid = false;
  const successLocator = stripePage.locator('text=Invoice paid').or(stripePage.locator('text=Paid')).or(stripePage.locator('text=Payment complete')).first();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await expect(successLocator).toBeVisible({ timeout: 15000 });
      paid = true;
      break;
    } catch (e) {
      console.log(`Payment success screen not visible on attempt ${attempt}. Retrying click on Pay button...`);
      if (await stripePayBtn.isVisible()) {
        await stripePayBtn.click().catch(() => { });
      }
    }
  }
  if (!paid) {
    throw new Error("Stripe payment success screen not visible after retries");
  }
  console.log('✓ Stripe payment completed successfully!');
  // Wait 5 seconds for webhook processing to settle completely
  await stripePage.waitForTimeout(5000);
}







const { RegisterPage } = require('../pages');

async function inviteAndRegisterMember({
  page,
  userMgmtPage,
  companyName,
  uid,
  accessType,
  namePrefix,
  index
}) {
  await userMgmtPage.goToUsersTab();

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const invitedEmail = `ankitqa.iihglobal+${uid}MB${randomNum}@gmail.com`;
  console.log(`Inviting ${accessType} member: ${invitedEmail}`);

  const inviteStartTime = new Date();
  await userMgmtPage.inviteMember({
    email: invitedEmail,
    accessType
  });
  await userMgmtPage.clickOkay();
  console.log('✓ Member invited successfully!');

  // Verify invited user details in the table
  const invitedRow = userMgmtPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
  await expect(invitedRow).toBeVisible({ timeout: 10000 });

  const cells = invitedRow.locator('td');
  const nameText = (await cells.nth(1).innerText()).trim();
  expect(nameText === '' || nameText === '-').toBe(true);
  await expect(cells.nth(2)).toContainText(invitedEmail);
  await expect(cells.nth(3)).toContainText('User');
  await expect(cells.nth(6)).toContainText('Pending');
  await expect(cells.nth(7)).toContainText(/expert/i);
  await expect(cells.nth(8)).toContainText(accessType === 'Full Access' ? /Full/i : /ReadOnly/i);
  await expect(cells.nth(9)).toContainText('Renewable');
  console.log(`✓ Verified invited member details in table (blank name, email, User role, Pending status, Expert subscription, ${accessType} seat, Renewable)`);

  // Now retrieve the invitation link from email, complete the registration form, and confirm they become Active!
  console.log(`Polling for invitation email for: ${invitedEmail}`);
  const emailMessage = await pollEmail(`${companyName} Invited`, inviteStartTime);
  expect(emailMessage).toBeTruthy();
  console.log(`✓ Invitation email found for: ${invitedEmail}`);

  const decodedBody = decodeQuotedPrintable(emailMessage);
  const inviteUrlMatch = decodedBody.match(/https?:\/\/[^\s"'<>]*\/register[^\s"'<>]*/);
  expect(inviteUrlMatch).toBeTruthy();
  let inviteUrl = inviteUrlMatch[0].replace(/[=]+$/, '').trim();
  console.log(`✓ Extracted Invitation URL: ${inviteUrl}`);

  // Complete registration in new, unauthenticated context
  const inviteContext = await page.context().browser().newContext();
  const invitePage = await inviteContext.newPage();
  const inviteRegisterPage = new RegisterPage(invitePage);
  await invitePage.goto(inviteUrl);
  await invitePage.waitForLoadState('load');
  console.log('✓ Invitation register page loaded successfully');

  // Verify Company Name is prefilled with invited company name and is readonly (disabled for editing)
  await expect(inviteRegisterPage.companyNameInput).toHaveValue(companyName);
  await expect(inviteRegisterPage.companyNameInput).toHaveAttribute('readonly');
  console.log('✓ Verified company name input is prefilled and read-only');

  // Verify Email is prefilled with invited email and is readonly (disabled for editing)
  await expect(inviteRegisterPage.emailInput).toHaveValue(invitedEmail);
  await expect(inviteRegisterPage.emailInput).toHaveAttribute('readonly');
  console.log('✓ Verified email input is prefilled and read-only');

  const otpSentTime = new Date();
  const memberName = `${namePrefix} ${index}`;
  await inviteRegisterPage.fillRegistrationForm({
    name: memberName,
    password: 'Pa$$w0rd!',
    confirmPassword: 'Pa$$w0rd!'
  });
  await inviteRegisterPage.acceptTerms();
  await expect(inviteRegisterPage.submitButton).toBeEnabled();
  await inviteRegisterPage.clickSubmit();
  console.log('✓ First register submit clicked. Polling for invited member OTP email...');

  // Poll OTP and submit
  const inviteOtpBody = await pollEmail('Verification code', otpSentTime, invitedEmail);
  expect(inviteOtpBody, 'Invited user OTP email not received').not.toBe('');
  const inviteOtpMatch = inviteOtpBody.match(/\b\d{6}\b/);
  expect(inviteOtpMatch, 'Could not extract OTP for invited user').not.toBeNull();
  const inviteOtp = inviteOtpMatch[0];
  console.log(`✓ Invited user OTP received: ${inviteOtp}`);

  await inviteRegisterPage.fillOtp(inviteOtp);
  await inviteRegisterPage.clickSubmit();

  // Wait for redirection to adhoc-search screen (dashboard)
  await expect(invitePage).toHaveURL(/.*\/adhoc-search/, { timeout: 30000 });
  console.log('✓ Invited user registered successfully and redirected to dashboard');
  await invitePage.close();
  await inviteContext.close();

  // Refresh the page and assert the user status becomes Active in the user management table
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
  await expect(updatedCells.nth(8)).toContainText(accessType === 'Full Access' ? /Full/i : /ReadOnly/i);
  await expect(updatedCells.nth(9)).toContainText('Renewable');
  console.log(`✓ Verified registered member details in Users table (name, email, role, Active status, expert subscription, ${accessType} seat, Renewable)`);
}




/**
 * Dynamically finds a user email from the user management table matching specific criteria.
 * Uses UI filter dropdowns to isolate the role and prevent virtual scrolling display issues.
 */
async function findUserDynamically(page, userMgmtPage, targetRole, targetSeatType, excludeEmail) {
  // Map targetSeatType to match the actual cell text ('Full' or 'ReadOnly')
  let seatMatch = targetSeatType;
  if (targetSeatType && targetSeatType.toLowerCase().includes('full')) {
    seatMatch = 'Full';
  } else if (targetSeatType && targetSeatType.toLowerCase().includes('read')) {
    seatMatch = 'ReadOnly';
  }

  // Clear search input
  await userMgmtPage.searchUser('');
  await page.waitForTimeout(1000);

  // If filter inputs are not visible, click the filter toggle button
  const isFilterVisible = await userMgmtPage.filter_roleSelect.isVisible().catch(() => false);
  if (!isFilterVisible) {
    await userMgmtPage.filterButton.click();
    await page.waitForTimeout(1500);
  }

  // Select the target role in the filter dropdown
  await userMgmtPage.filter_roleSelect.click();
  await page.waitForTimeout(1000);
  const option = page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${targetRole}$`, 'i') });
  await option.click();
  await page.waitForTimeout(1500);

  // Scan the rendered rows
  const rows = userMgmtPage.tableRows;
  const rowCount = await rows.count();
  let foundEmail = null;

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const emailText = (await row.locator('td').nth(2).textContent()).trim();
    const roleText = (await row.locator('td').nth(3).textContent()).trim();
    const statusText = (await row.locator('td').nth(6).textContent()).trim();
    const seatTypeText = (await row.locator('td').nth(8).textContent()).trim();
    const hasPrimaryChip = await row.locator('.MuiChip-root', { hasText: 'Primary' }).count() > 0;

    const matchesSeatType = !seatMatch || seatTypeText.toLowerCase().includes(seatMatch.toLowerCase());

    if (
      roleText.toLowerCase().includes(targetRole.toLowerCase()) &&
      statusText.toLowerCase() === 'active' &&
      matchesSeatType &&
      emailText !== excludeEmail &&
      !hasPrimaryChip
    ) {
      foundEmail = emailText;
      break;
    }
  }

  // Clear filters
  await userMgmtPage.filter_clearButton.click();
  await page.waitForTimeout(1000);

  // Toggle filter row closed if it remains open
  const isFilterStillVisible = await userMgmtPage.filter_roleSelect.isVisible().catch(() => false);
  if (isFilterStillVisible) {
    await userMgmtPage.filterButton.click();
    await page.waitForTimeout(1000);
  }

  if (!foundEmail) {
    throw new Error(`Dynamic search failed: Could not find user with Role: ${targetRole}${targetSeatType ? ', Seat Type: ' + targetSeatType : ''}`);
  }

  return foundEmail;
}

/**
 * Ensures a candidate user with specific role and seat type exists.
 * If the role is 'Admin' and no such user is found, it will locate a 'User' role member
 * with the matching seat type and promote them to 'Admin'.
 */
async function ensureCandidateExists(page, userMgmtPage, targetRole, targetSeatType, excludeEmail) {
  try {
    return await findUserDynamically(page, userMgmtPage, targetRole, targetSeatType, excludeEmail);
  } catch (error) {
    if (targetRole.toLowerCase() === 'admin') {
      console.log(`Candidate Admin not found. Promoting a ${targetSeatType || 'User'} role user to Admin...`);
      // Find a user with Role = "User" and the desired seat type
      const userEmail = await findUserDynamically(page, userMgmtPage, 'User', targetSeatType, excludeEmail);
      
      // Promote this user to Admin
      await userMgmtPage.searchUser(userEmail);
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
      
      // Wait for success alert
      const successAlert = page.locator('.MuiSnackbar-root').filter({ hasText: /success|updated/i }).first();
      await expect(successAlert).toBeVisible({ timeout: 10000 });
      
      // Clear search
      await userMgmtPage.searchUser('');
      await page.waitForTimeout(1000);

      return userEmail;
    }
    throw error;
  }
}

module.exports = {
  pollEmail,
  decodeQuotedPrintable,
  completeStripePayment,
  inviteAndRegisterMember,
  findUserDynamically,
  ensureCandidateExists,
};
