const { BasePage } = require('./base.page');

class ProfilePage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // ── Page Heading ─────────────────────────────────────────────────────
    this.pageTitle = page.getByRole('heading', { name: /my profile/i });

    // ── User Header Section ───────────────────────────────────────────────
    /** Avatar circle showing user's initial */
    this.avatarIcon         = page.locator('.MuiAvatar-root').first();
    /** User display name shown below avatar */
    this.displayName        = page.locator('h5, h6').filter({ hasText: /[a-z]/i }).first();
    /** User email shown below display name in the header */
    this.headerEmail        = page.getByText(/ankitqa|@gmail\.com/i).first();
    /** "Change Password" button in the user header */
    this.changePasswordBtn  = page.getByRole('button', { name: /change password/i });

    // ── Personal Information Card ─────────────────────────────────────────
    this.personalInfoCard   = page.locator('.MuiCard-root, .MuiPaper-root').filter({ hasText: /full name/i }).first();
    /** Full Name read-only field value */
    this.fullNameValue      = this.personalInfoCard.locator('p, span').filter({ hasText: /[a-z]/i }).first();
    /** Email Address read-only field value */
    this.emailValue         = this.personalInfoCard.getByText(/@/i);
    /** Role chip (e.g. "Admin") */
    this.roleChip           = this.personalInfoCard.locator('.MuiChip-root').filter({ hasText: /admin|user/i }).first();
    /** "PRIMARY" badge chip */
    this.primaryChip        = this.personalInfoCard.locator('.MuiChip-root').filter({ hasText: /primary/i });
    /** Last Login value text */
    this.lastLoginValue     = this.personalInfoCard.locator('p').filter({ hasText: /202/i }).first();
    /** Member Since value text */
    this.memberSinceValue   = this.personalInfoCard.locator('p').filter({ hasText: /202/i }).last();

    // ── Subscription Details Card ─────────────────────────────────────────
    this.subscriptionCard   = page.locator('.MuiCard-root, .MuiPaper-root').filter({ hasText: /plan name/i }).first();
    /** Plan name value (e.g. "Expert", "Essential") */
    this.planNameValue      = this.subscriptionCard.locator('p').filter({ hasText: /expert|essential|free|professional/i }).first();
    /** Subscription status chip (e.g. "Active") */
    this.subscriptionStatusChip = this.subscriptionCard.locator('.MuiChip-root').filter({ hasText: /active|inactive/i });
    /** Renewal status value text */
    this.renewalStatusValue = this.subscriptionCard.getByText(/renewable|non-renewable/i);
    /** Seat type value (e.g. "Full", "ReadOnly") */
    this.seatTypeValue      = this.subscriptionCard.getByText(/full|readonly|read only/i);
    /** Search goal chips (e.g. "EC") */
    this.searchGoalChips    = this.subscriptionCard.locator('.MuiChip-root');

    // ── Change Password Modal ─────────────────────────────────────────────
    /** Dialog/modal container */
    this.changePasswordModal    = page.getByRole('dialog');
    /** Modal title */
    this.changePasswordTitle    = page.getByRole('dialog').getByText(/change password/i);
    /** New Password input inside the modal */
    this.newPasswordInput       = page.locator('#password');
    /** Re-type / Confirm Password input */
    this.confirmPasswordInput   = page.locator('#confirmPassword');
    /** Cancel button inside the modal */
    this.cancelBtn              = page.getByRole('dialog').getByRole('button', { name: /cancel/i });
    /** Change / Submit button inside the modal */
    this.changeBtn              = page.getByRole('dialog').getByRole('button', { name: /^change$/i });
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  /**
   * Navigate to the Profile page.
   */
  async navigateToProfile() {
    await this.navigate('/profile');
    await this.page.waitForLoadState('networkidle');
  }

  // ── Change Password ──────────────────────────────────────────────────────

  /**
   * Open the Change Password modal by clicking the button.
   */
  async openChangePasswordModal() {
    await this.changePasswordBtn.click();
    await this.changePasswordModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill in and submit the Change Password form.
   * @param {string} newPassword
   * @param {string} confirmPassword
   */
  async submitChangePassword(newPassword, confirmPassword) {
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.changeBtn.click();
  }

  /**
   * Close the Change Password modal using the Cancel button.
   */
  async cancelChangePassword() {
    await this.cancelBtn.click();
    await this.changePasswordModal.waitFor({ state: 'hidden' });
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  /**
   * Get the user's display name shown in the header.
   * @returns {Promise<string>}
   */
  async getDisplayName() {
    return this.displayName.textContent();
  }

  /**
   * Get the plan name shown in the Subscription Details card.
   * @returns {Promise<string>}
   */
  async getPlanName() {
    return this.planNameValue.textContent();
  }

  /**
   * Get all search goal chip labels.
   * @returns {Promise<string[]>}
   */
  async getSearchGoals() {
    return this.searchGoalChips.allTextContents();
  }
}

module.exports = { ProfilePage };
