const { BasePage } = require('./base.page');

/**
 * Page Object for /webapp/user-management
 *
 * Tabs (in order):
 *  1. Users
 *  2. Autonomous Search
 *  3. Configuration
 *  4. Subscription
 *  5. Payment History
 */
class UserManagementPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // ════════════════════════════════════════════════════════════════════════
    // ── TABS ────────────────────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.tab_Users = page.getByRole('tab', { name: /^users$/i });
    this.tab_AutonomousSearch = page.getByRole('tab', { name: /autonomous search/i });
    this.tab_Configuration = page.getByRole('tab', { name: /configuration/i });
    this.tab_Subscription = page.getByRole('tab', { name: /subscription/i });
    this.tab_PaymentHistory = page.getByRole('tab', { name: /payment history/i });

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 1: USERS ────────────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════

    // Toolbar controls
    this.users_searchInput = page.getByPlaceholder(/search by name or email/i);
    this.users_filterButton = page.getByRole('button', { name: /filter/i });
    this.users_inviteButton = page.getByRole('button', { name: /invite member/i });

    // Filter panel (visible after clicking filterButton)
    this.users_filterByStatus = page.getByRole('combobox', { name: /status/i });
    this.users_filterByRole = page.getByRole('combobox', { name: /role/i });

    // Users table
    this.users_table = page.locator('table').first();
    this.users_tableRows = page.locator('table tbody tr');

    // Row-level action menu (three-dot "…" button — per row)
    this.users_actionMenuBtn = page.locator('button[aria-label*="more"], button[title*="action"], [data-testid*="action"]');

    // Action menu items (appear after clicking row action menu)
    this.users_editMenuItem = page.getByRole('menuitem', { name: /edit/i });
    this.users_deleteMenuItem = page.getByRole('menuitem', { name: /delete/i });

    // ── Invite Member modal ──────────────────────────────────────────────────
    this.invite_modal = page.getByRole('dialog');
    this.invite_emailInput = page.getByRole('dialog').getByPlaceholder(/email/i);
    this.invite_roleDropdown = page.getByRole('dialog').getByRole('combobox', { name: /role/i });
    this.invite_sendButton = page.getByRole('dialog').getByRole('button', { name: /send invite|invite/i });
    this.invite_closeButton = page.getByRole('dialog').getByRole('button', { name: /close|cancel/i });

    // ── Update Member modal ──────────────────────────────────────────────────
    this.update_modal = page.getByRole('dialog');
    this.update_nameInput = page.getByRole('dialog').getByPlaceholder(/name/i);
    this.update_roleDropdown = page.getByRole('dialog').getByRole('combobox', { name: /role/i });
    this.update_statusDropdown = page.getByRole('dialog').getByRole('combobox', { name: /status/i });
    this.update_saveButton = page.getByRole('dialog').getByRole('button', { name: /save|update/i });
    this.update_cancelButton = page.getByRole('dialog').getByRole('button', { name: /cancel/i });

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 2: AUTONOMOUS SEARCH ────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.as_table = page.locator('table').first();
    this.as_tableRows = page.locator('table tbody tr');

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 3: CONFIGURATION ────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════

    // Custom Labels section
    this.config_customLabelsHeading = page.getByText(/custom labels/i);
    this.config_addLabelButton = page.getByRole('button', { name: /add label/i });
    this.config_labelNameInput = page.getByPlaceholder(/label name/i);
    this.config_saveLabelButton = page.getByRole('button', { name: /save/i });

    // User Labels section
    this.config_userLabelsHeading = page.getByText(/user labels/i);

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 4: SUBSCRIPTION ─────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════

    // Current plan overview
    this.sub_planNameValue = page.getByText('MY Subscription').locator('xpath=..');
    this.sub_statusChip = page.locator('.MuiChip-root').filter({ hasText: /active|inactive|renewable|non renewable/i }).first();
    this.sub_updateButton = page.getByRole('button', { name: /update subscription/i });

    // Subscription table cells (first row)
    const row = page.locator('table tbody tr').first();
    this.sub_cellName = row.locator('td').nth(0);
    this.sub_cellDesc = row.locator('td').nth(1);
    this.sub_cellStatus = row.locator('td').nth(2);
    this.sub_cellRenewalDate = row.locator('td').nth(3);
    this.sub_cellFullAccessSeats = row.locator('td').nth(4);
    this.sub_cellFullAccessAvailable = row.locator('td').nth(5);
    this.sub_cellReadOnlySeats = row.locator('td').nth(6);
    this.sub_cellReadOnlyAvailable = row.locator('td').nth(7);

    // Subscribed Search Goals Section
    this.sub_subscribedSearchGoals = page.getByText('Subscribed Search Goals').locator('xpath=..');
    this.sub_searchGoalsBox = page.getByText('Search Goals', { exact: true }).locator('xpath=..');

    // Update Subscription confirmation modal
    this.sub_confirmModal = page.getByRole('dialog');
    this.sub_confirmContinueBtn = page.getByRole('dialog').getByRole('button', { name: /continue/i });
    this.sub_confirmCancelBtn = page.getByRole('dialog').getByRole('button', { name: /cancel/i });

    // Subscription details page (after clicking Update Subscription → Continue)
    this.sub_backButton = page.getByRole('button', { name: /back/i });

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 5: PAYMENT HISTORY ──────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.payment_table = page.locator('table').first();
    this.payment_tableRows = page.locator('table tbody tr');
    this.payment_viewInvoiceBtn = page.getByRole('button', { name: /view invoice/i });

    // Invoice viewer modal
    this.invoice_modal = page.getByRole('dialog');
    this.invoice_closeButton = page.getByRole('dialog').getByRole('button', { name: /close/i });
    this.invoice_downloadBtn = page.getByRole('dialog').getByRole('button', { name: /download/i });
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  /**
   * Navigate to the User Management page.
   */
  async navigateToUserManagement() {
    await this.navigate('/user-management');
    await this.page.waitForLoadState('networkidle');
  }

  // ── Tab Switching ─────────────────────────────────────────────────────────

  async goToUsersTab() { await this.tab_Users.click(); }
  async goToAutonomousSearchTab() { await this.tab_AutonomousSearch.click(); }
  async goToConfigurationTab() { await this.tab_Configuration.click(); }
  async goToSubscriptionTab() { await this.tab_Subscription.click(); }
  async goToPaymentHistoryTab() { await this.tab_PaymentHistory.click(); }

  // ── Users Tab Actions ────────────────────────────────────────────────────

  /**
   * Search for a user by name or email.
   * @param {string} query
   */
  async searchUser(query) {
    await this.users_searchInput.fill(query);
  }

  /**
   * Open the Invite Member modal.
   */
  async openInviteModal() {
    await this.users_inviteButton.click();
    await this.invite_modal.waitFor({ state: 'visible' });
  }

  /**
   * Invite a member by email.
   * @param {string} email
   */
  async inviteMember(email) {
    await this.openInviteModal();
    await this.invite_emailInput.fill(email);
    await this.invite_sendButton.click();
  }

  /**
   * Click the action menu (⋯) for a specific row by index (0-based).
   * @param {number} rowIndex
   */
  async openRowActionMenu(rowIndex = 0) {
    await this.users_tableRows.nth(rowIndex).locator('button').last().click();
  }

  // ── Subscription Tab Actions ──────────────────────────────────────────────

  /**
   * Click Update Subscription and confirm the dialog.
   */
  async updateSubscription() {
    await this.sub_updateButton.click();
    await this.sub_confirmModal.waitFor({ state: 'visible' });
    await this.sub_confirmContinueBtn.click();
  }

  // ── Payment History Tab Actions ───────────────────────────────────────────

  /**
   * View the invoice for a specific payment row (0-based index).
   * @param {number} rowIndex
   */
  async viewInvoice(rowIndex = 0) {
    await this.payment_tableRows.nth(rowIndex).getByRole('button', { name: /view invoice/i }).click();
    await this.invoice_modal.waitFor({ state: 'visible' });
  }

  /**
   * Close the Invoice modal.
   */
  async closeInvoiceModal() {
    await this.invoice_closeButton.click();
    await this.invoice_modal.waitFor({ state: 'hidden' });
  }
}

module.exports = { UserManagementPage };
