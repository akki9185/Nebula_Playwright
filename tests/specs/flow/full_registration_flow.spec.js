/**
 * MASTER REGISTRATION & LOGIN FLOW TEST (FREE PLAN)
 *
 * A single positive E2E test that performs exactly ONE registration from start to finish:
 *  1. Navigates to Subscription, verifies plan cards, selects Free plan.
 *  2. Fills registration form with valid unique details and submits.
 *  3. Retrieves OTP from Gmail (filtered by recipient address), submits OTP.
 *  4. Verifies welcome email, clicks "Email invoice and Pay", redirects to /login.
 *  5. Logs the registered credentials clearly in the console.
 *  6. Logs in with the newly registered user credentials.
 *  7. Asserts successful redirect to the Adhoc Search page.
 *  8. Navigates to Company Settings > My Subscription via Avatar dropdown.
 *  9. Verifies Free plan name, Search Goals (EC), subscription table details,
 *     expiry date (1 month from registration), seat counts, and goal status.
 */

const { test, expect } = require('@playwright/test');
const { SubscriptionPage } = require('../../pages/subscription.page');
const { RegisterPage } = require('../../pages/register.page');
const { LoginPage } = require('../../pages/login.page');
const { AdhocSearchPage } = require('../../pages/adhoc_search.page');
const { UserManagementPage } = require('../../pages/user_management.page');
const { UsersTabPage } = require('../../pages/users_tab.page');
const { pollEmail, decodeQuotedPrintable, completeStripePayment } = require('../../utils/common.util');
const registerData = require('../../data/register.data.json');

test.describe('Master Registration and Login Flow', () => {
  // Test 1: Single E2E Flow (Kept exactly as it is)
  test(
    'Single E2E Flow: Subscription → Register → Email Verification → Login → Verify Subscription',
    async ({ page }) => {
      test.setTimeout(240000); // 4 minutes

      const subPage = new SubscriptionPage(page);
      const registerPage = new RegisterPage(page);
      const loginPage = new LoginPage(page);
      const adhocPage = new AdhocSearchPage(page);
      const userMgmtPage = new UserManagementPage(page);
      const usersTabPage = new UsersTabPage(page);

      // ─────────────────────────────────────────────────────────────────────────
      // 1. Subscription Page UI & Selection
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 1: Navigating to Subscription Page ──');
      // Clear cookies to avoid Next.js chunk loading issues
      await page.context().clearCookies();

      let loaded = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Navigation attempt ${attempt}...`);
        await subPage.navigateToSubscription();

        try {
          await expect(page.locator('h5', { hasText: /^Free$/i })).toBeVisible({ timeout: 5000 });
          loaded = true;
          console.log('✓ Subscription page loaded successfully');
          break;
        } catch (err) {
          console.log(`Attempt ${attempt} failed to load subscription page. Retrying...`);
          const tryAgain = page.locator('button', { hasText: /Try\s*Again/i });
          if (await tryAgain.isVisible()) {
            await tryAgain.click();
          } else {
            await page.reload();
          }
          await page.waitForTimeout(3000);
        }
      }
      if (!loaded) {
        throw new Error('Failed to load subscription page after 3 attempts');
      }

      // Verify all plans are visible
      for (const plan of ['Free', 'Essential', 'Professional', 'Expert']) {
        await expect(
          page.locator('h5', { hasText: new RegExp(`^${plan}$`, 'i') })
        ).toBeVisible();
      }

      // Verify validation when next is clicked without selecting plan
      await subPage.clickNextCreateAccount();
      await expect(page.getByText('Please select a subscription to continue')).toBeVisible();

      // Select Free plan and verify restrictions
      await subPage.selectPlan('Free');
      const freeCard = subPage.getPlanCard('Free');
      await expect(freeCard.locator('.seat-button').nth(0)).toBeDisabled();
      await expect(freeCard.locator('.seat-button').nth(1)).toBeDisabled();
      await expect(freeCard.locator('input').nth(0)).toHaveValue('2');
      await expect(subPage.orderSummaryCard).toContainText('$0.00');
      await expect(subPage.getSearchGoalCard('GC')).toHaveCSS('cursor', 'not-allowed');
      console.log('✓ Free plan selected and restrictions verified');

      // Proceed to Registration
      await subPage.clickNextCreateAccount();
      await expect(page).toHaveURL(/.*\/register/);

      // ─────────────────────────────────────────────────────────────────────────
      // 2. Positive E2E Registration Submission & Email Verification
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 2: Filling Registration Form (Positive Case) ──');
      await expect(registerPage.companyNameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.nameInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.termsCheckbox).toBeVisible();
      await expect(
        page.locator('div, .MuiCard-root').filter({ hasText: /free/i }).first()
      ).toBeVisible();

      const uid = Math.random().toString(36).substring(2, 7);
      const companyName = `Ankit QA AT ${uid}`;
      const email = `ankitqa.iihglobal+${uid}@gmail.com`;
      const password = registerData.validation.password;

      // Fill valid details
      await registerPage.fillRegistrationForm({
        companyName,
        email,
        name: 'Free User',
        password,
        confirmPassword: password
      });

      // Accept terms
      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeEnabled();

      console.log('\n── Step 3: Submitting Registration ──');
      const testStartTime = new Date();
      await registerPage.clickSubmit();
      console.log('✓ Registration submitted. Polling for OTP email...');

      // Retrieve OTP from Gmail
      const otpBody = await pollEmail('Your Verification code for Company Registration', testStartTime, email);
      expect(otpBody, 'OTP email not received').not.toBe('');
      const otpMatch = otpBody.match(/\b\d{6}\b/);
      expect(otpMatch, 'Could not extract OTP').not.toBeNull();
      const otp = otpMatch[0];
      console.log(`✓ OTP received: ${otp}`);

      // Submit OTP → welcome email fires
      const welcomeStart = new Date();
      await registerPage.fillOtp(otp);
      await registerPage.clickSubmit();

      // Verify welcome email
      const welcomeBody = await pollEmail('User registration', welcomeStart, email);
      expect(welcomeBody, 'Welcome email not received').not.toBe('');
      console.log('✓ Welcome email received');

      // Free plan also shows "Email invoice and Pay" — click it
      await expect(registerPage.emailInvoiceButton).toBeVisible({ timeout: 15000 });
      await registerPage.clickEmailInvoice();

      // Wait for Go to Login
      await expect(registerPage.goToLoginButton).toBeVisible({ timeout: 30000 });

      // Log the credentials
      console.log('\n==================================================');
      console.log('REGISTERED CREDENTIALS');
      console.log(`Company Name: ${companyName}`);
      console.log(`Email:    ${email}`);
      console.log(`Password: ${password}`);
      console.log('==================================================\n');

      // Redirect to /login by clicking the button
      await registerPage.goToLoginButton.click();
      await expect(page).toHaveURL(/.*\/login/);
      console.log('✓ Registration completed successfully and redirected to Login');

      // ─────────────────────────────────────────────────────────────────────────
      // 4. Login with newly registered user
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 4: Logging in with Registered User ──');
      await loginPage.login(email, password);

      // Assert redirection to Adhoc Search page
      await expect(page).toHaveURL(/.*\/adhoc-search/);
      await expect(adhocPage.basicSearchInput).toBeVisible();
      console.log('✓ Logged in successfully and asserted Adhoc Search page');

      // ─────────────────────────────────────────────────────────────────────────
      // 5. Navigate to My Subscription under Company Settings via clicks
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 5: Navigating to Company Settings > My Subscription via clicks ──');

      // Open profile dropdown by clicking the Avatar in the header
      const avatar = page.locator('.MuiAvatar-root').first();
      await expect(avatar).toBeVisible();
      await avatar.click();

      // Click "My Subscription" from the profile dropdown menu
      const mySubMenuItem = page.getByRole('menuitem', { name: /my subscription/i });
      await expect(mySubMenuItem).toBeVisible();
      await mySubMenuItem.click();

      // Verify redirection to user-management page
      await expect(page).toHaveURL(/.*\/user-management.*/);

      // Make sure the Subscription tab is active/selected
      await userMgmtPage.tab_Subscription.click();

      // Assert free plan details on subscription page
      await expect(userMgmtPage.sub_planNameValue).toContainText(/free/i);
      await expect(userMgmtPage.sub_searchGoalsBox).toContainText(/ec/i);

      // Assert Subscription Table Cells
      await expect(userMgmtPage.sub_cellName).toContainText(/free/i);
      await expect(userMgmtPage.sub_cellDesc).toContainText(/free starter plan/i);
      await expect(userMgmtPage.sub_cellStatus).toContainText(/non renewable/i);

      // Verify Expiry Date is 1 month from registration date
      const renewalDateText = await userMgmtPage.sub_cellRenewalDate.innerText();
      const expiryDateParsed = new Date(renewalDateText);
      const registrationDate = new Date();
      const diffTime = Math.abs(expiryDateParsed - registrationDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`✓ Expiry date on UI: ${renewalDateText} (Difference: ${diffDays} days from registration)`);
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(32);

      await expect(userMgmtPage.sub_cellFullAccessSeats).toContainText('2');
      await expect(userMgmtPage.sub_cellFullAccessAvailable).toContainText('1');
      await expect(userMgmtPage.sub_cellReadOnlySeats).toContainText('0');
      await expect(userMgmtPage.sub_cellReadOnlyAvailable).toContainText('0');

      // Assert Subscribed Search Goals at the bottom
      await expect(userMgmtPage.sub_subscribedSearchGoals).toContainText(/ec/i); // Subscribed Search Goals shows 'EC'
      await expect(userMgmtPage.sub_subscribedSearchGoals).toContainText(/non renewable/i); // Search goal status is 'Non Renewable'

      console.log('✓ Navigated to My Subscription page and verified all details of the active Free plan');

      // ─────────────────────────────────────────────────────────────────────────
      // 6. Verify User management > Users tab details
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 6: Verifying Registered User details on Users tab ──');
      await userMgmtPage.tab_Users.click(); // Switch to Users tab

      await expect(usersTabPage.getCell(0, 1)).toContainText('Free User'); // Verify Name column contains registered user name
      await expect(usersTabPage.getCell(0, 1)).toContainText('Primary'); // Verify Name column contains 'Primary' tag/chip
      await expect(usersTabPage.getCell(0, 2)).toContainText(email); // Verify Email column matches registration email
      await expect(usersTabPage.getCell(0, 3)).toContainText('Admin'); // Verify Role column has Admin role
      await expect(usersTabPage.getCell(0, 6)).toContainText('Active'); // Verify Status column is Active (index 6 due to User Labels)
      await expect(usersTabPage.getCell(0, 7)).toContainText(/free/i); // Verify Subscription column shows the selected Free plan (index 7 due to User Labels)
      await expect(usersTabPage.getCell(0, 9)).toContainText('Renewable'); // Verify Renewable column shows Renewable status (index 9 due to User Labels)

      console.log('✓ Verified user has Admin Role, Primary Tag beside name, Active status, Free subscription, Renewable option, and correct Email');

      // ─────────────────────────────────────────────────────────────────────────
      // 7. Invite a member and verify seat count reduction
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 7: Inviting new member and verifying available seat reduction ──');
      const invitedEmail = `ankitqa.iihglobal+mb${Math.random().toString(36).substring(2, 7)}@gmail.com`;
      await usersTabPage.inviteMember({
        email: invitedEmail,
        accessType: 'Full Access'
      }); // Fill and submit invitation modal
      await usersTabPage.clickOkay(); // Close invitation success modal

      // Verify invited user details in the table
      const invitedRow = usersTabPage.tableBody.locator('tr').filter({ hasText: invitedEmail });
      await expect(invitedRow).toBeVisible({ timeout: 10000 });

      const cells = invitedRow.locator('td');
      const nameText = (await cells.nth(1).innerText()).trim();
      expect(nameText === '' || nameText === '-').toBe(true);
      await expect(cells.nth(2)).toContainText(invitedEmail);
      await expect(cells.nth(3)).toContainText('User');
      await expect(cells.nth(6)).toContainText('Pending');
      await expect(cells.nth(7)).toContainText(/free/i);
      await expect(cells.nth(8)).toContainText(/Full/i);
      await expect(cells.nth(9)).toContainText('Renewable');
      console.log('✓ Verified invited member details in table (blank name, email, User role, Pending status, Free subscription, Full Access seat, Renewable)');

      // Verify available Full Access seats decreased by waiting for the response when switching to Subscription tab
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/company/subscriptionsByCompanyId') && response.status() === 200
      );
      await userMgmtPage.goToSubscriptionTab();
      await responsePromise;

      await expect(userMgmtPage.sub_cellFullAccessAvailable).toContainText('0'); // Verify Full Access Available seats decreased from 1 to 0

      console.log('✓ Successfully invited new member and verified available seats decreased on My Subscription tab');
    }
  );
});
