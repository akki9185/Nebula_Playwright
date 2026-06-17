const { test, expect } = require('@playwright/test');
const { RegisterPage } = require('../pages/register.page');
const { SubscriptionPage } = require('../pages/subscription.page');
const { pollGmailForMessage } = require('../utils/gmail.util');
const registerData = require('../data/register.data.json');



test.describe('Registration Page E2E Tests', () => {
  let registerPage;
  let subPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    subPage = new SubscriptionPage(page);

    // We must select a plan first so the subscription page sets up sessionStorage and navigates us to /register
    await subPage.navigateToSubscription();
    await subPage.selectPlan('Essential');
    await subPage.clickNextCreateAccount();
    await expect(page).toHaveURL(/.*\/register/);
  });

  test('TC_REG_001: Verify registration page renders all fields and selected plan details', async () => {
    // 1. Verify all registration form fields are visible
    await expect(registerPage.companyNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.nameInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();

    // 2. Verify selected plan details card is visible on the page
    const planDetailCard = registerPage.page.locator('.MuiBox-root', { hasText: /Subscription Plan/i }).or(
      registerPage.page.locator('.MuiCard-root', { hasText: /Essential/i })
    ).or(
      registerPage.page.locator('div', { hasText: /Essential/i }).first()
    );
    await expect(planDetailCard).toBeVisible();
  });

  test('TC_REG_002: Form validation checks for name and passwords', async () => {
    // Fill form but leave Name empty, passwords mismatch
    await registerPage.fillRegistrationForm({
      companyName: registerData.validation.companyName,
      email: registerData.validation.email,
      name: '',
      password: registerData.validation.password,
      confirmPassword: registerData.validation.mismatchConfirmPassword
    });

    // Check terms
    await registerPage.acceptTerms();

    // Verify submit button is disabled due to validation errors (e.g. password mismatch or empty name)
    await expect(registerPage.submitButton).toBeDisabled();
  });

  test('TC_REG_003: Checkbox validation - Terms checkbox controls submit button state', async () => {
    await registerPage.fillRegistrationForm({
      companyName: registerData.validation.companyName,
      email: registerData.validation.email,
      name: 'Test User',
      password: registerData.validation.password,
      confirmPassword: registerData.validation.confirmPassword
    });

    // Initially terms checkbox is unchecked, submit button should be disabled
    await expect(registerPage.submitButton).toBeDisabled();

    // Check terms checkbox, submit button should be enabled
    await registerPage.acceptTerms();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test('TC_REG_004: Verify that When Open URL in another tab it should redirect on login page', async ({ page, context }) => {
    // Open a new isolated page/tab
    const newPage = await context.newPage();
    // Navigate directly to registration URL without plan selection in session state
    await newPage.goto('http://206.189.23.26:3003/webapp/register');
    // Verify it automatically redirects to the login screen
    await expect(newPage).toHaveURL(/.*\/login/);
  });

  test('TC_REG_005: Verify that duplicate company name and/or email registration is blocked', async ({ page }) => {
    const duplicateCompanyName = registerData.validation.duplicateCompanyName;
    const duplicateCompanyEmail = registerData.validation.duplicateCompanyEmail;
    const uniqueCompanyName = registerData.validation.companyName;

    // SCENARIO 1: Duplicate Company Name + Unique Email
    {
      const uniqueId = Date.now();
      const uniqueEmailDynamic = `unique_email_${uniqueId}@example.com`;

      await registerPage.fillRegistrationForm({
        companyName: duplicateCompanyName,
        email: uniqueEmailDynamic,
        name: `User ${uniqueId}`,
        password: registerData.validation.password,
        confirmPassword: registerData.validation.confirmPassword
      });

      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeEnabled();

      const otpPromise = page.waitForResponse(response => response.url().includes('/send-otp'));
      await registerPage.clickSubmit();

      const otpResponse = await otpPromise;
      const responseBody = await otpResponse.json();
      console.log("Scenario 1 OTP Response:", responseBody);

      expect(otpResponse.status() !== 200 || responseBody.success === false).toBe(true);
      const errorText = responseBody.message || 'already exists';
      await expect(page.locator('p, div, span').filter({ hasText: errorText }).first()).toBeVisible();
      await expect(registerPage.otpInput).not.toBeVisible();
    }

    // SCENARIO 2: Unique Company Name + Duplicate Email
    {
      await page.reload();
      const uniqueId = Date.now();
      const uniqueCompanyDynamic = `${uniqueCompanyName} ${uniqueId}`;

      await registerPage.fillRegistrationForm({
        companyName: uniqueCompanyDynamic,
        email: duplicateCompanyEmail,
        name: `User ${uniqueId}`,
        password: registerData.validation.password,
        confirmPassword: registerData.validation.confirmPassword
      });

      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeEnabled();

      const otpPromise = page.waitForResponse(response => response.url().includes('/send-otp'));
      await registerPage.clickSubmit();

      const otpResponse = await otpPromise;
      const responseBody = await otpResponse.json();
      console.log("Scenario 2 OTP Response:", responseBody);

      expect(otpResponse.status() !== 200 || responseBody.success === false).toBe(true);
      const errorText = responseBody.message || 'already exists';
      await expect(page.locator('p, div, span').filter({ hasText: errorText }).first()).toBeVisible();
      await expect(registerPage.otpInput).not.toBeVisible();
    }

    // SCENARIO 3: Duplicate Company Name + Duplicate Email
    {
      await page.reload();
      const uniqueId = Date.now();

      await registerPage.fillRegistrationForm({
        companyName: duplicateCompanyName,
        email: duplicateCompanyEmail,
        name: `User ${uniqueId}`,
        password: registerData.validation.password,
        confirmPassword: registerData.validation.confirmPassword
      });

      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeEnabled();

      const otpPromise = page.waitForResponse(response => response.url().includes('/send-otp'));
      await registerPage.clickSubmit();

      const otpResponse = await otpPromise;
      const responseBody = await otpResponse.json();
      console.log("Scenario 3 OTP Response:", responseBody);

      expect(otpResponse.status() !== 200 || responseBody.success === false).toBe(true);
      const errorText = responseBody.message || 'already exists';
      await expect(page.locator('p, div, span').filter({ hasText: errorText }).first()).toBeVisible();
      await expect(registerPage.otpInput).not.toBeVisible();
    }

    // SCENARIO 4: Unique Company Name + Unique Email (Should Succeed)
    {
      await page.reload();
      const uniqueId = Date.now();
      const uniqueCompanyDynamic = `${uniqueCompanyName} ${uniqueId}`;
      const uniqueEmailDynamic = `unique_email_${uniqueId}@example.com`;

      await registerPage.fillRegistrationForm({
        companyName: uniqueCompanyDynamic,
        email: uniqueEmailDynamic,
        name: `User ${uniqueId}`,
        password: registerData.validation.password,
        confirmPassword: registerData.validation.confirmPassword
      });

      await registerPage.acceptTerms();
      await expect(registerPage.submitButton).toBeEnabled();

      const otpPromise = page.waitForResponse(response => response.url().includes('/send-otp'));
      await registerPage.clickSubmit();

      const otpResponse = await otpPromise;
      const responseBody = await otpResponse.json();
      console.log("Scenario 4 OTP Response:", responseBody);

      expect(otpResponse.status()).toBe(200);
    }
  });

  test('TC_REG_006: Complete successful registration flow up to the Payment invoice screen and verify welcome/invoice emails', async ({ page }) => {
    test.setTimeout(150000); // Set high timeout to accommodate multiple Gmail IMAP polls

    const uniqueId = Date.now();
    const testStartTime = new Date();
    const companyName = `${registerData.validation.companyName} ${uniqueId}`;
    const email = `ankitqa.iihglobal+${uniqueId}@gmail.com`;

    await registerPage.fillRegistrationForm({
      companyName,
      email,
      name: `Test User ${uniqueId}`,
      password: registerData.validation.password,
      confirmPassword: registerData.validation.confirmPassword
    });

    await registerPage.acceptTerms();
    await expect(registerPage.submitButton).toBeEnabled();

    // 1. Click submit to trigger OTP email delivery
    await registerPage.clickSubmit();

    // 2. Poll Gmail inbox for the OTP email and extract the 6-digit code
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
    console.log(`[TC_REG_006] Extracted OTP from Gmail: ${fetchedOtp}`);

    // Set start time for the Welcome (User registration) email just before submitting OTP
    // (This welcome email is triggered immediately upon successful OTP verification/creation of the admin user)
    const welcomeStartTime = new Date();

    // 3. Fill the OTP code and proceed
    await registerPage.fillOtp(fetchedOtp);
    await registerPage.clickSubmit();

    // 4. Poll Gmail for welcome email (Subject: "User registration")
    console.log(`[TC_REG_006] Polling for welcome/user registration email...`);
    const welcomeEmailBody = await pollGmailForMessage({
      emailAddress: registerData.gmail.emailAddress,
      appPassword: registerData.gmail.appPassword,
      subjectQuery: 'User registration',
      since: welcomeStartTime,
    });
    expect(welcomeEmailBody, 'Welcome registration email was not received in Gmail').not.toBe('');
    console.log('[TC_REG_006] ✓ Confirmed: Welcome/User registration email received successfully');

    // 5. Verify payment/invoice options are rendered on the UI
    await expect(registerPage.emailInvoiceButton).toBeVisible();

    // Set start time for the invoice email polling right before clicking "Email invoice and Pay"
    const invoiceStartTime = new Date();

    // 6. Click "Email invoice and Pay"
    await registerPage.clickEmailInvoice();

    // 7. Verify invoice dialog appears with confirmation message
    await expect(registerPage.invoiceDialogTitle).toBeVisible({ timeout: 30000 });
    await expect(registerPage.invoiceDialogTitle).toHaveText(registerData.staticText.invoiceSentTitle);
    await expect(registerPage.goToLoginButton).toBeVisible({ timeout: 30000 });

    // 8. Poll Gmail for the invoice email (Subject: "Invoice")
    console.log(`[TC_REG_006] Polling for invoice email...`);
    const invoiceEmailBody = await pollGmailForMessage({
      emailAddress: registerData.gmail.emailAddress,
      appPassword: registerData.gmail.appPassword,
      subjectQuery: 'Invoice',
      since: invoiceStartTime,
    });
    expect(invoiceEmailBody, 'Invoice email was not received in Gmail').not.toBe('');

    // 9. Verify invoice email contains "Pay Now" or "PayNow" (case-insensitive)
    const hasPayNowButton = /Pay\s*Now|PayNow/i.test(invoiceEmailBody);
    expect(hasPayNowButton, 'Invoice email does not contain a "Pay Now" or "PayNow" button/link').toBe(true);
    console.log('[TC_REG_006] ✓ Confirmed: Invoice email contains "Pay Now" button/link');

    // 10. Click "Go to Login" and verify it redirects to /login
    await registerPage.goToLoginButton.click();
    await expect(page).toHaveURL(/.*\/login/);
  });
});
