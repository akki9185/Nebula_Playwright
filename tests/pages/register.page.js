const { BasePage } = require('./base.page');

class RegisterPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.companyNameInput = page.locator('#companyName');
    this.emailInput = page.locator('#email');
    this.nameInput = page.locator('#name');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');

    this.termsCheckbox = page.locator('#register-terms-checkbox');
    this.submitButton = page.locator('button[type="submit"]'); // AuthButton

    // OTP fields
    this.otpInput = page.locator('input[placeholder*="OTP"]');

    // Promo Code
    this.promoCodeInput = page.locator('input[placeholder*="promo code" i]');
    this.promoApplyButton = page.locator('button', { hasText: /^apply$/i });

    // Payment Options / Invoice

    this.emailInvoiceButton = page.locator('button').filter({ hasText: /Email invoice and Pay|Confirm Subscription/i });

    // Invoice Dialog elements
    this.invoiceDialogTitle = page.locator('p').filter({ hasText: /^Invoice Sent!$/ });
    this.goToLoginButton = page.locator('button', { hasText: /Go to Login/i });
  }

  async navigateToRegister() {
    await this.navigate('/register');
  }

  async fillRegistrationForm({ companyName, email, name, password, confirmPassword }) {
    if (companyName !== undefined) await this.companyNameInput.fill(companyName);
    if (email !== undefined) await this.emailInput.fill(email);
    if (name !== undefined) await this.nameInput.fill(name);
    if (password !== undefined) await this.passwordInput.fill(password);
    if (confirmPassword !== undefined) await this.confirmPasswordInput.fill(confirmPassword);
  }

  async acceptTerms() {
    const isChecked = await this.termsCheckbox.isChecked();
    if (!isChecked) {
      await this.termsCheckbox.click({ force: true });
    }
  }

  async clickSubmit() {
    await this.submitButton.click();
    await this.wait(500);
  }

  async fillOtp(otp) {
    await this.otpInput.fill(otp);
  }

  async clickEmailInvoice() {
    await this.emailInvoiceButton.click();
    await this.wait(500);
  }
}

module.exports = { RegisterPage };
