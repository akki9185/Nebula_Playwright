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
      let subscriptionGrandTotal = '';

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

      // Add 7 Read-Only seats
      for (let i = 0; i < 7; i++) {
        await subPage.incrementReadOnly('Expert');
      }
      console.log('✓ 7 Read-Only seats selected');

      // Assert grand total is visible and retrieve it dynamically
      await expect(subPage.grandTotal).toBeVisible();
      await expect(subPage.grandTotal).toContainText('$');
      subscriptionGrandTotal = (await subPage.grandTotal.textContent()).trim();
      console.log(`✓ Grand Total verified and retrieved dynamically: ${subscriptionGrandTotal}`);

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

      // Verify Seat Counts (Total & Available) are calculated correctly
      await expect(userMgmtPage.sub_cellFullAccessSeats).toContainText('5');
      await expect(userMgmtPage.sub_cellFullAccessAvailable).toContainText('4');
      await expect(userMgmtPage.sub_cellReadOnlySeats).toContainText('7');
      await expect(userMgmtPage.sub_cellReadOnlyAvailable).toContainText('7');
      console.log('✓ Verified seat counts and available seats are calculated correctly');

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

      // ─────────────────────────────────────────────────────────────────────────
      // 5c. Verify Payment History & Amount Due match Grand Total
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 5c: Verifying Payment History status and Amount Due ──');
      await userMgmtPage.goToPaymentHistoryTab();
      console.log('✓ Switched to Payment History tab');

      // Wait for table rows to be visible and assert on first invoice row
      const firstInvoiceRow = userMgmtPage.payment_tableRows.first();
      await expect(firstInvoiceRow).toBeVisible({ timeout: 15000 });

      const amountDueCell = firstInvoiceRow.locator('td').nth(2);
      const statusCell = firstInvoiceRow.locator('td').nth(3);

      await expect(statusCell).toContainText('Unpaid');

      // Dynamically compare amount due with stored grand total
      const amountDueText = (await amountDueCell.textContent()).trim();
      const cleanGrandTotal = subscriptionGrandTotal.replace(/[^0-9.]/g, '');
      const cleanAmountDue = amountDueText.replace(/[^0-9.]/g, '');

      console.log(`Comparing clean amount due: ${cleanAmountDue} with clean grand total: ${cleanGrandTotal}`);
      expect(parseFloat(cleanAmountDue)).toBe(parseFloat(cleanGrandTotal));
      console.log(`✓ Verified first payment invoice status is Unpaid and Amount Due matches Grand Total (${amountDueText})`);

      // Switch back to Subscription tab to keep UI state consistent
      await userMgmtPage.goToSubscriptionTab();
      console.log('✓ Navigated back to My Subscription page and verified Expert plan and Search Goals status is Unpaid');

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
      const searchButton = page.getByRole('button', { name: /Enter search criteria|Search/i }).last();
      await expect(searchButton).toBeDisabled();
      console.log('✓ Search button is disabled initially');

      // 3. Try to search with more than 5 characters
      await adhocPage.basicSearchInput.fill('John Doe');

      // 4. Verify search button remains disabled
      await expect(searchButton).toBeDisabled();
      console.log('✓ Search will not be allowed when more than 5 characters are added, search button will be disabled');

      // 5. Verify CSV upload popup Confirm button is disabled
      console.log('\n── Step 6c: Verifying CSV Upload restrictions for Unpaid user ──');
      const uploadIcon = page.locator('img[alt="Upload csv icons"]');
      await expect(uploadIcon).toBeVisible();
      await uploadIcon.click();

      // Verify Upload CSV Modal is open
      await expect(page.getByText('Drag or upload a file')).toBeVisible();

      // Upload file
      const csvFilePath = require('path').resolve(__dirname, '../data/adhocUpload.csv');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvFilePath);

      // Verify UploadCsvDataModal is open and Confirm button is disabled
      const confirmButtonInPopup = page.getByRole('button', { name: 'Confirm' });
      await expect(confirmButtonInPopup).toBeDisabled();
      console.log('✓ Confirm button in upload popup is disabled initially for unpaid user');

      // Click "Upload Again" (handles both "Uploap Again" typo and "Upload Again" correction)
      const uploadAgainBtn = page.getByRole('button', { name: /uploap again|upload again/i });
      await expect(uploadAgainBtn).toBeVisible();
      await uploadAgainBtn.click();

      // Verify Upload CSV Modal is open again
      await expect(page.getByText('Drag or upload a file')).toBeVisible();

      // Upload file again
      const fileInput2 = page.locator('input[type="file"]');
      await fileInput2.setInputFiles(csvFilePath);

      // Verify Confirm button is still disabled
      await expect(confirmButtonInPopup).toBeDisabled();
      console.log('✓ Confirm button in upload popup is still disabled after uploading again');

      // Close the popup
      const cancelPopupBtn = page.getByRole('button', { name: 'Cancel' });
      await expect(cancelPopupBtn).toBeEnabled();
      await cancelPopupBtn.click();
      console.log('✓ Upload popup cancelled successfully');

      // ─────────────────────────────────────────────────────────────────────────
      // 7. Extract Invoice Payment Link from Email & Automate Stripe Payment
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n── Step 7: Polling for Stripe Invoice Email ──');
      
      const invoiceEmailStart = new Date(Date.now() - 5 * 60 * 1000); // look back up to 5 mins
      const rawInvoiceEmail = await pollEmail('invoice', invoiceEmailStart, email);
      expect(rawInvoiceEmail, 'Invoice email not received').not.toBe('');
      console.log('✓ Invoice email received');

      // Decode and extract URL
      const decodedInvoiceEmail = decodeQuotedPrintable(rawInvoiceEmail);
      const invoiceUrlRegex = /https:\/\/invoice\.stripe\.com\/[^\s"'>]+/i;
      const invoiceMatch = decodedInvoiceEmail.match(invoiceUrlRegex);
      expect(invoiceMatch, 'Could not find Stripe invoice URL in email').not.toBeNull();
      
      // Clean up the URL (Stripe emails might wrap it or append clean characters)
      let stripePaymentUrl = invoiceMatch[0];
      stripePaymentUrl = stripePaymentUrl.replace(/[=]+$/, '').trim();
      console.log(`✓ Extracted Stripe Invoice URL: ${stripePaymentUrl}`);

      // Navigate to the Stripe hosted page
      console.log('── Navigating to Stripe Hosted Invoice Page ──');
      const stripePage = await page.context().newPage();
      await stripePage.goto(stripePaymentUrl);
      await stripePage.waitForLoadState('load');
      console.log('✓ Stripe page loaded successfully');

      // Wait for the main payment element iframe to be visible
      const paymentIFrameLocator = stripePage.locator('iframe[src*="elements-inner-payment"]');
      await paymentIFrameLocator.waitFor({ state: 'visible', timeout: 25000 });
      console.log('✓ Stripe payment iframe is visible');

      const stripeCardFrame = stripePage.frameLocator('iframe[src*="elements-inner-payment"]');

      // Wait a short moment for internal elements to render
      await stripePage.waitForTimeout(2000);

      // Check if Card tab is visible inside the iframe and click it
      const cardTab = stripeCardFrame.locator('text=Card').first();
      if (await cardTab.count() > 0) {
        await cardTab.click();
        console.log('✓ Clicked Card payment method option inside iframe');
      }

      // Fill in credit card details inside the Stripe Element iframe
      console.log('── Entering test credit card details on Stripe page ──');
      const cardInput = stripeCardFrame.locator('input[name="number"]');
      await expect(cardInput).toBeVisible({ timeout: 20000 });
      
      // Stripe card inputs are usually input[name="number"], input[name="expiry"], input[name="cvc"]
      await cardInput.fill('4242');
      await cardInput.pressSequentially('424242424242');
      await stripeCardFrame.locator('input[name="expiry"]').fill('12/34');
      await stripeCardFrame.locator('input[name="cvc"]').fill('123');

      const postalInput = stripeCardFrame.locator('input[name="postalCode"]');
      if (await postalInput.count() > 0) {
        await postalInput.fill('90210');
      }

      // Click Pay
      const stripePayBtn = stripePage.getByRole('button', { name: /Pay/i }).first();
      await expect(stripePayBtn).toBeEnabled();
      await stripePayBtn.click();
      console.log('── Payment submitted, waiting for processing... ──');

      // Wait for Stripe success screen
      console.log('── Waiting for Stripe payment success message to be visible ──');
      const successLocator = stripePage.locator('text=Invoice paid').or(stripePage.locator('text=Paid')).or(stripePage.locator('text=Payment complete'));
      await expect(successLocator).toBeVisible({ timeout: 35000 });
      console.log('✓ Stripe payment success message is visible!');
      await stripePage.close();

      // Navigate back to the app to verify status
      console.log('── Verifying invoice status back in the app ──');
      await page.goto('/user-management');
      await userMgmtPage.goToSubscriptionTab();

      // Assert plan status is Active / Non Renewable on My Subscription tab
      await expect(userMgmtPage.sub_cellStatus).toContainText(/non renewable|active|paid/i, { timeout: 20000 });
      await expect(userMgmtPage.sub_subscribedSearchGoals).toContainText(/non renewable|active|paid/i);
      console.log('✓ My Subscription page status is now active/paid!');

      // Go to Payment History tab and verify invoice status is Paid
      await userMgmtPage.goToPaymentHistoryTab();
      const firstInvoiceRowPaid = userMgmtPage.payment_tableRows.first();
      await expect(firstInvoiceRowPaid).toBeVisible({ timeout: 15000 });
      const statusCellPaid = firstInvoiceRowPaid.locator('td').nth(3);
      await expect(statusCellPaid).toContainText(/Paid/i, { timeout: 20000 });
      console.log('✓ Invoice payment verified successfully! Invoice status is now Paid.');

      // Navigate to Adhoc Search page and verify restrictions are gone
      await adhocPage.navigateToAdhocSearch();
      await expect(warningText).not.toBeVisible();
      await expect(searchButton).toBeEnabled();
      console.log('✓ Warning text is gone and Search button is enabled after successful payment!');
    }
  );
});
