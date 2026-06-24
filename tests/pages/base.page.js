class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Common elements present on most/all pages
    this.logo = page.locator('header img[alt="Logo"], a[href="/"]');
    this.navProfile = page.locator('nav').getByRole('button', { name: /profile|user/i });
    this.toastMessage = page.locator('.MuiAlert-message, [role="alert"]');
  }

  /**
   * Navigate to a specific path relative to the baseURL.
   * @param {string} path The URL path (e.g. '/dashboard')
   */
  async navigate(path = '') {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    await this.page.goto(cleanPath);
  }

  /**
   * Wait for a brief period of time (useful for animations or stability checks).
   * @param {number} ms Milliseconds to wait
   */
  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Get the page title.
   * @returns {Promise<string>}
   */
  async getTitle() {
    return this.page.title();
  }

  /**
   * Get toast notification message text.
   * @returns {Promise<string | null>}
   */
  async getToastMessage() {
    await this.toastMessage.waitFor({ state: 'visible', timeout: 5000 });
    return this.toastMessage.textContent();
  }
}

module.exports = { BasePage };
