const { BasePage } = require('./base.page');

class LoginPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.emailHelperText = page.locator('#email-helper-text');
    this.passwordHelperText = page.locator('#password-helper-text');
    this.loginButton = page.getByRole('button', { name: /login/i });
    this.forgotPasswordLink = page.getByText('Forgot Password?');
    this.errorMessage = page.locator('p').filter({ hasText: /Invalid Email or Password|Authentication failed|already exists/i });
  }

  /**
   * Navigate directly to the login page.
   */
  async navigateToLogin() {
    await this.navigate('/login');
  }

  /**
   * Perform standard login action flow.
   * @param {string} email User email
   * @param {string} password User password
   */
  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

module.exports = { LoginPage };
