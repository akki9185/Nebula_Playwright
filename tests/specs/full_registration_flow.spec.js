/**
 * MASTER REGISTRATION & LOGIN FLOW TEST (FREE PLAN)
 *
 * A single E2E test that performs exactly ONE registration from start to finish:
 *  1. Navigates to Subscription (the initial entry point), verifies cards and validation.
 *  2. Selects Free plan, verifies free plan restrictions on subscription page.
 *  3. Navigates to Registration, verifies fields and validation (mismatched password, empty name, terms check)
 *     on the form BEFORE submitting.
 *  4. Fills valid unique details and submits (ONLY one registration submission).
 *  5. Retrieves OTP from Gmail, submits OTP.
 *  6. Verifies welcome email.
 *  7. Clicks "Email invoice and Pay" and redirects to /login.
 *  8. Logs the registered credentials clearly in the console.
 *  9. Performs Login with the newly registered user credentials.
 *  10. Asserts successful redirect to the Adhoc Search page.
 *  11. Navigates to User Management > Subscription tab by clicking the User Avatar and selecting "My Subscription".
 *  12. Verifies Free plan status.
 */

const { test, expect } = require('@playwright/test');
const { SubscriptionPage } = require('../pages/subscription.page');
const { RegisterPage } = require('../pages/register.page');
const { LoginPage } = require('../pages/login.page');
const { AdhocSearchPage } = require('../pages/adhoc_search.page');
const { UserManagementPage } = require('../pages/user_management.page');
const { pollGmailForMessage } = require('../utils/gmail.util');
const registerData = require('../data/register.data.json');

const GMAIL_ADDRESS = 'ankitqa.iihglobal@gmail.com';
const GMAIL_APP_PASSWORD = 'aglv lnoi qlxt rxbl';

async function pollEmail(subjectQuery, since) {
  return pollGmailForMessage({
    emailAddress: GMAIL_ADDRESS,
    appPassword: GMAIL_APP_PASSWORD,
    subjectQuery,
    since,
  });
}

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

      // ─────────────────────────────────────────────────────────────────────────
      // 1. Subscription Page UI & Selection
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 1: Navigating to Subscription Page ──');
      await subPage.navigateToSubscription();

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
      // 2. Registration Form UI & Pre-Submit Validations
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 2: Registration Form Validation ──');
      await expect(registerPage.companyNameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.nameInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.termsCheckbox).toBeVisible();
      await expect(
        page.locator('div, .MuiCard-root').filter({ hasText: /free/i }).first()
      ).toBeVisible();

      const uid = Date.now();
      const companyName = `Free Flow E2E ${uid}`;
      const email = `ankitqa.iihglobal+${uid}@gmail.com`;
      const password = registerData.validation.password;

      // Validation A: Password mismatch
      await registerPage.fillRegistrationForm({
        companyName,
        email,
        name: 'Free User',
        password,
        confirmPassword: registerData.validation.mismatchConfirmPassword
      });
      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeDisabled();
      console.log('✓ Submit disabled on password mismatch');

      // Validation B: Empty Name
      await registerPage.fillRegistrationForm({
        companyName,
        email,
        name: '',
        password,
        confirmPassword: password
      });
      await expect(registerPage.submitButton).toBeDisabled();
      console.log('✓ Submit disabled when Name is empty');

      // Validation C: Terms checkbox unchecked
      await registerPage.fillRegistrationForm({
        companyName,
        email,
        name: 'Free User',
        password,
        confirmPassword: password
      });
      // Uncheck terms if checked
      if (await registerPage.termsCheckbox.isChecked()) {
        await registerPage.termsCheckbox.click({ force: true });
      }
      await expect(registerPage.submitButton).toBeDisabled();
      console.log('✓ Submit disabled when Terms checkbox is unchecked');

      // ─────────────────────────────────────────────────────────────────────────
      // 3. E2E Registration Submission & Email Verification
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 3: Submitting Registration ──');
      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeEnabled();

      const testStartTime = new Date();
      await registerPage.clickSubmit();
      console.log('✓ Registration submitted. Polling for OTP email...');

      // Retrieve OTP from Gmail
      const otpBody = await pollEmail('Your Verification code for Company Registration', testStartTime);
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
      const welcomeBody = await pollEmail('User registration', welcomeStart);
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
      console.log('\n── Step 5: Navigating to User Management > My Subscription via clicks ──');

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
      await expect(userMgmtPage.sub_cellFullAccessSeats).toContainText('2');
      await expect(userMgmtPage.sub_cellFullAccessAvailable).toContainText('1');
      await expect(userMgmtPage.sub_cellReadOnlySeats).toContainText('0');
      await expect(userMgmtPage.sub_cellReadOnlyAvailable).toContainText('0');

      // Assert Subscribed Search Goals at the bottom
      await expect(userMgmtPage.sub_subscribedSearchGoals).toContainText(/ec/i);
      await expect(userMgmtPage.sub_subscribedSearchGoals).toContainText(/non renewable/i);
      
      console.log('✓ Navigated to My Subscription page and verified all details of the active Free plan');
    }
  );
});
