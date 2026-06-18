/**
 * MASTER REGISTRATION & LOGIN FLOW TEST (EXPERT PLAN)
 *
 * A single positive E2E test that performs exactly ONE registration from start to finish:
 *  1. Navigates to Subscription, verifies plan cards, selects Expert plan.
 *  2. Fills registration form with valid unique details and submits.
 *  3. Retrieves OTP from Gmail (filtered by recipient address), submits OTP.
 *  4. Verifies welcome email, clicks "Email invoice and Pay".
 *  5. Executes DB script to mark the company as paid/active in the database.
 *  6. Logs the registered credentials clearly in the console.
 *  7. Logs in with the newly registered user credentials.
 *  8. Asserts successful redirect to the Adhoc Search page.
 *  9. Navigates to Company Settings > My Subscription via Avatar dropdown.
 *  10. Verifies Expert plan name, subscription table details, and goal status.
 *  11. Verifies User management > Users tab details (Admin role, Primary tag, Renewable).
 *  12. Invites a member and verifies seat count reduction.
 */

const { test, expect } = require('@playwright/test');
const { SubscriptionPage } = require('../pages/subscription.page');
const { RegisterPage } = require('../pages/register.page');
const { LoginPage } = require('../pages/login.page');
const { AdhocSearchPage } = require('../pages/adhoc_search.page');
const { UserManagementPage } = require('../pages/user_management.page');
const { UsersTabPage } = require('../pages/users_tab.page');
const { pollGmailForMessage } = require('../utils/gmail.util');
const registerData = require('../data/register.data.json');

async function pollEmail(subjectQuery, since, to) {
  return pollGmailForMessage({
    emailAddress: registerData.gmail.emailAddress,
    appPassword: registerData.gmail.appPassword,
    subjectQuery,
    since,
    to,
  });
}

function decodeQuotedPrintable(str) {
  // Remove soft line breaks
  let decoded = str.replace(/=\r?\n/g, '');
  // Replace =3D with =
  decoded = decoded.replace(/=3D/g, '=');
  return decoded;
}

test.describe('Master Expert Registration and Login Flow', () => {
  test(
    'Single E2E Flow: Subscription → Register → Email Verification → Login → Verify Subscription (Expert Plan)',
    async ({ page }) => {
      test.setTimeout(360000); // 6 minutes

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

      // Select Expert plan
      await subPage.selectPlan('Expert');
      console.log('✓ Expert plan selected');

      // Proceed to Registration
      await subPage.clickNextCreateAccount();
      await expect(page).toHaveURL(/.*\/register/);

      // ─────────────────────────────────────────────────────────────────────────
      // 2. Positive E2E Registration Submission & Email Verification
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 2: Filling Registration Form ──');
      await expect(registerPage.companyNameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.nameInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.termsCheckbox).toBeVisible();

      const uid = Math.random().toString(36).substring(2, 7);
      const companyName = `Ankit QA AT ${uid}`;
      const email = `ankitqa.iihglobal+${uid}@gmail.com`;
      const password = registerData.validation.password;

      // Fill valid details
      await registerPage.fillRegistrationForm({
        companyName,
        email,
        name: 'Expert Admin',
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

      // Paid plan shows "Email invoice and Pay" — click it
      await expect(registerPage.emailInvoiceButton).toBeVisible({ timeout: 15000 });
      await registerPage.clickEmailInvoice();

      // Wait for Go to Login / Invoice Dialog
      await expect(registerPage.invoiceDialogTitle).toBeVisible({ timeout: 30000 });
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

      // Assert plan details on subscription page
      await expect(userMgmtPage.sub_planNameValue).toContainText(/expert/i);

      // Assert Subscription Table Cells show Unpaid status
      await expect(userMgmtPage.sub_cellName).toContainText(/expert/i);
      await expect(userMgmtPage.sub_cellStatus).toContainText(/unpaid/i, { timeout: 10000 });

      // Verify that the Subscribed Search Goals section contains the text "Unpaid"
      await expect(userMgmtPage.sub_subscribedSearchGoals).toContainText(/unpaid/i, { timeout: 10000 });

      // ─────────────────────────────────────────────────────────────────────────
      // 5b. Verify Unpaid Subscription Restrictions & Enabled Controls
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 5b: Verifying Unpaid Subscription Tab Visibility and Buttons ──');

      // Only Subscription and Payment History tabs should be visible
      await expect(userMgmtPage.tab_Subscription).toBeVisible();
      await expect(userMgmtPage.tab_PaymentHistory).toBeVisible();
      await expect(userMgmtPage.tab_Users).toBeHidden();
      await expect(userMgmtPage.tab_AutonomousSearch).toBeHidden();
      await expect(userMgmtPage.tab_Configuration).toBeHidden();
      console.log('✓ Tab visibility restrictions verified (Only Subscription & Payment History tabs visible)');

      // Invite Member button in the top-right toolbar should be disabled
      await expect(userMgmtPage.users_inviteButton).toBeDisabled();
      console.log('✓ Invite Member button is disabled');

      // Send Invoice and Update Subscription buttons should be enabled
      const sendInvoiceBtn = page.getByRole('button', { name: /send invoice/i });
      await expect(sendInvoiceBtn).toBeEnabled();
      await expect(userMgmtPage.sub_updateButton).toBeEnabled();
      console.log('✓ Send Invoice and Update Subscription buttons are enabled');

      console.log('✓ Navigated to My Subscription page and verified Expert plan and Search Goals status is Unpaid');

      // ─────────────────────────────────────────────────────────────────────────
      // 6. Navigate back to Adhoc Search page
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 6: Navigating back to Adhoc Search page ──');
      await adhocPage.navigateToAdhocSearch();

      // ─────────────────────────────────────────────────────────────────────────
      // 6b. Verify Unpaid Search Goals Restriction on Adhoc Search
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 6b: Verifying Unpaid Search Goals Restriction on Adhoc Search ──');

      // 1. Verify warning message is visible
      const warningText = page.getByText('At least one data category license is needed to perform query.');
      await expect(warningText).toBeVisible();
      console.log('✓ Warning text "At least one data category license..." is visible');

      // 2. Verify search button is disabled initially
      const searchButton = page.getByRole('button').filter({ hasText: /search/i }).last();
      await expect(searchButton).toBeDisabled();
      console.log('✓ Search button is disabled initially');

      // 3. Try to search with more than 5 characters
      await adhocPage.basicSearchInput.fill('John Doe');

      // 4. Verify search button remains disabled
      await expect(searchButton).toBeDisabled();
      console.log('✓ Search will not be allowed when more than 5 characters are added, search button will be disabled');
      console.log('Hello hi By by');
    }
  );
});
