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
   * @param {number} [retries=3] Number of retry attempts
   */
  async navigate(path = '', retries = 3) {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.page.goto(cleanPath, { timeout: 30000 });
        return;
      } catch (error) {
        console.warn(`[BasePage] Navigation attempt ${attempt} failed for path "${cleanPath}":`, error.message);
        if (attempt === retries) throw error;
        await this.page.waitForTimeout(1000 * attempt);
      }
    }
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
