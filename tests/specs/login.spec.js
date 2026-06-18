const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/login.page');
const { RegisterPage } = require('../pages/register.page');
const { SubscriptionPage } = require('../pages/subscription.page');
const { pollGmailForMessage } = require('../utils/gmail.util');
const loginData = require('../data/login.data.json');
const registerData = require('../data/register.data.json');



test.describe('Login Page E2E Tests', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test('TC_LOG_001: Verify Login Page Renders All Elements', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOG_002: Blank Form Submission Checks', async () => {
    // Clear fields and click login
    await loginPage.emailInput.fill('');
    await loginPage.passwordInput.fill('');
    await loginPage.loginButton.click();

    // Verify field validation helper texts are displayed
    await expect(loginPage.emailHelperText).toBeVisible();
    await expect(loginPage.emailHelperText).toHaveText(loginData.validationMessages.emailRequired);

    await expect(loginPage.passwordHelperText).toBeVisible();
    await expect(loginPage.passwordHelperText).toHaveText(loginData.validationMessages.passwordRequired);
  });

  test('TC_LOG_003: Invalid Email Format Validation Check', async () => {
    // Fill invalid email format and random password
    await loginPage.emailInput.fill('invalidemail');
    await loginPage.passwordInput.fill('password123');
    await loginPage.loginButton.click();

    // Verify email format validation error helper text is visible
    await expect(loginPage.emailHelperText).toBeVisible();
    await expect(loginPage.emailHelperText).toHaveText(loginData.validationMessages.emailInvalid);
  });

  test('TC_LOG_004: Invalid Credentials Login Check', async () => {
    // Fill valid email format but wrong credentials
    await loginPage.emailInput.fill('nonexistentuser@example.com');
    await loginPage.passwordInput.fill('wrongpassword123');
    await loginPage.loginButton.click();

    // Verify authentication error message is displayed
    await expect(loginPage.errorMessage.first()).toBeVisible();
    await expect(loginPage.errorMessage.first()).toHaveText(new RegExp(loginData.validationMessages.authFailed, 'i'));
  });

  test('TC_LOG_005: Valid Credentials Login Check', async ({ page }) => {
    test.setTimeout(90000);

    // Instantiate page objects needed only for this test
    const registerPage = new RegisterPage(page);
    const subPage = new SubscriptionPage(page);

    // Step 1: Register a new user dynamically to obtain valid credentials
    await subPage.navigateToSubscription();
    await subPage.selectPlan('Essential');
    await subPage.clickNextCreateAccount();
    await expect(page).toHaveURL(/.*\/register/);

    const uniqueId = Math.random().toString(36).substring(2, 7);
    const testStartTime = new Date();
    const companyName = `Login Test Company ${uniqueId}`;
    const email = `ankitqa.iihglobal+${uniqueId}@gmail.com`;
    const password = registerData.validation.password;

    await registerPage.fillRegistrationForm({
      companyName,
      email,
      name: `Login User ${uniqueId}`,
      password,
      confirmPassword: password
    });

    await registerPage.acceptTerms();
    await expect(registerPage.submitButton).toBeEnabled();

    // Trigger OTP email
    await registerPage.clickSubmit();

    // Poll Gmail inbox for the OTP email and extract the 6-digit code
    const otpEmailBody = await pollGmailForMessage({
      emailAddress: registerData.gmail.emailAddress,
      appPassword: registerData.gmail.appPassword,
      subjectQuery: 'Your Verification code for Company Registration',
      since: testStartTime,
    });
    expect(otpEmailBody, 'OTP email was not received in Gmail').not.toBe('');

    const otpMatch = otpEmailBody.match(/\b\d{6}\b/);
    expect(otpMatch, 'Could not extract 6-digit OTP from email body').not.toBeNull();
    const fetchedOtp = otpMatch[0];
    console.log(`[TC_LOG_005] Extracted OTP from Gmail: ${fetchedOtp}`);

    await registerPage.fillOtp(fetchedOtp);
    await registerPage.clickSubmit();

    // Select invoice and complete registration
    await expect(registerPage.emailInvoiceButton).toBeVisible();
    await registerPage.clickEmailInvoice();
    await expect(registerPage.invoiceDialogTitle).toBeVisible({ timeout: 30000 });

    // Go to login page
    await registerPage.goToLoginButton.click();
    await expect(page).toHaveURL(/.*\/login/);

    // Step 2: Login with the newly registered valid credentials
    await loginPage.login(email, password);

    // Verify successful login redirection to /adhoc-search
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
  });
});
