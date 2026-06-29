const { BasePage } = require('./base.page');

/**
 * Page Object for /webapp/user-management
 * Covers all tabs:
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
    // ── TAB 1: USERS (formerly UsersTabPage) ────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.searchInput = page.getByPlaceholder('Search employee'); // search-by-name-or-email field
    this.filterButton = page.getByRole('button', { name: /^filter$/i }); // toggles the inline filter row
    this.inviteMemberButton = page.getByRole('button', { name: /invite member/i }); // opens Invite Member modal

    this.table = page.locator('table[aria-label="data table"]');
    this.tableHead = this.table.locator('thead');
    this.tableBody = this.table.locator('tbody');
    this.tableRows = this.table.locator('tbody tr'); // all data rows (excludes filter row)

    // Column header cells (in order as rendered by UsersDataTable)
    this.col_srNo = this.tableHead.locator('th').nth(0); // #
    this.col_name = this.tableHead.locator('th').nth(1); // Name
    this.col_email = this.tableHead.locator('th').nth(2); // Email
    this.col_role = this.tableHead.locator('th').nth(3); // Role
    this.col_status = this.tableHead.locator('th').nth(4); // Status
    this.col_subscription = this.tableHead.locator('th').nth(5); // Subscription
    this.col_seatType = this.tableHead.locator('th').nth(6); // Seat Type
    this.col_renewable = this.tableHead.locator('th').nth(7); // Renewable
    this.col_lastLogin = this.tableHead.locator('th').nth(8); // Last Login
    this.col_action = this.tableHead.locator('th').nth(9); // Action

    // Filter row (visible after clicking Filter button)
    this.filter_clearButton = page.getByRole('button', { name: /clear filter/i }); // resets all filters
    this.filter_nameInput = page.getByPlaceholder('By name'); // filter by user name
    this.filter_emailInput = page.getByPlaceholder('By email'); // filter by email
    this.filter_roleSelect = page.getByRole('combobox').filter({ hasText: /select a role/i }); // Role dropdown
    this.filter_statusSelect = page.getByRole('combobox').filter({ hasText: /select status/i }); // Status dropdown

    // Row Action Menu (⋯ button → dropdown)
    this.actionMenu_editItem = page.getByRole('menuitem', { name: /^edit$/i });
    this.actionMenu_deleteItem = page.getByRole('menuitem', { name: /^delete$/i });
    this.actionMenu_changePasswordItem = page.getByRole('menuitem', { name: /change password/i });
    this.actionMenu_resendInviteItem = page.getByRole('menuitem', { name: /resend invite/i });
    this.actionMenu_setPrimaryItem = page.getByRole('menuitem').filter({ hasText: /set as primary/i });

    // Invite Member Modal
    this.invite_title = page.getByText(/invite a team member/i);
    this.invite_accessTypeSelect = page.locator('.MuiSelect-select').filter({ hasText: /select access type/i });
    this.invite_emailInput = page.getByPlaceholder('e.g. teammember@company.com');
    this.invite_sendButton = page.locator('button[type="submit"]').filter({ hasText: /send/i });
    this.invite_closeButton = page.locator('img[alt="Close icon"]');
    this.invite_linkInput = page.locator('input#link');
    this.invite_copyButton = page.getByRole('button', { name: /copy|copied/i });
    this.invite_successOkayButton = page.locator('button', { hasText: 'Okay' });

    // Edit User Modal (Update Member)
    this.edit_modal = page.locator('.MuiModal-root').filter({ hasText: /update member/i });
    this.edit_title = this.edit_modal.getByText(/update member/i);
    this.edit_roleSelect = this.edit_modal.getByRole('combobox', { name: /role/i });
    this.edit_seatSelect = this.edit_modal.locator('#viewType[role="combobox"]');
    this.edit_renewSelect = this.edit_modal.locator('#renewable[role="combobox"]');
    this.edit_saveButton = this.edit_modal.getByRole('button', { name: /save|update/i });
    this.edit_cancelButton = this.edit_modal.getByRole('button', { name: /cancel/i });

    // Delete Confirm Dialog
    this.delete_dialog = page.getByRole('dialog');
    this.delete_confirmButton = page.getByRole('dialog').getByRole('button', { name: /^delete$/i });
    this.delete_cancelButton = page.getByRole('dialog').getByRole('button', { name: /cancel/i });

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 2: AUTONOMOUS SEARCH ────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.as_table = page.locator('table').first();
    this.as_tableRows = page.locator('table tbody tr');

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 3: CONFIGURATION ────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.config_customLabelsHeading = page.getByText(/custom labels/i);
    this.config_addLabelButton = page.getByRole('button', { name: /add label/i });
    this.config_labelNameInput = page.getByPlaceholder(/label name/i);
    this.config_saveLabelButton = page.getByRole('button', { name: /save/i });
    this.config_userLabelsHeading = page.getByText(/user labels/i);

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 4: SUBSCRIPTION ─────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
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

    // Subscription details page
    this.sub_backButton = page.getByRole('button', { name: /back/i });

    // ════════════════════════════════════════════════════════════════════════
    // ── TAB 5: PAYMENT HISTORY ──────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════════════════
    this.payment_subtabTransactions = page.getByRole('tab', { name: /^transactions$/i });
    this.payment_subtabInvoices = page.getByRole('tab', { name: /^invoices$/i });
    this.payment_table = page.locator('table').first();
    this.payment_tableRows = page.locator('table tbody tr');
    this.payment_viewInvoiceBtn = page.getByRole('button', { name: /^view$/i });

    // Invoice viewer modal
    this.invoice_modal = page.getByRole('dialog');
    this.invoice_closeButton = page.getByRole('dialog').locator('button').filter({ has: page.locator('[data-testid="CloseIcon"]') });
    this.invoice_downloadBtn = page.getByRole('dialog').locator('a', { hasText: /download invoice/i });
    this.invoice_viewPdfBtn = page.getByRole('dialog').locator('a', { hasText: /view invoice/i });
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  /**
   * Navigate to the User Management page.
   */
  async navigateToUserManagement() {
    await this.navigate('/user-management');
    await this.tab_Users.waitFor({ state: 'visible', timeout: 15000 });
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
    await this.searchInput.fill(query);
  }

  /**
   * Toggle the inline filter row on/off.
   */
  async toggleFilter() {
    await this.filterButton.click();
  }

  /**
   * Get a data row locator by 0-based index.
   * @param {number} index
   */
  getRow(index = 0) {
    return this.tableRows.nth(index);
  }

  /**
   * Get a specific cell within a row.
   * @param {number} rowIndex  0-based row index
   * @param {number} colIndex  0-based column index
   */
  getCell(rowIndex = 0, colIndex = 0) {
    return this.getRow(rowIndex).locator('td').nth(colIndex);
  }

  /**
   * Click the ⋯ action button for a specific row (0-based index).
   * @param {number} rowIndex
   */
  async openRowActionMenu(rowIndex = 0) {
    await this.getRow(rowIndex).locator('button').last().click();
  }

  /**
   * Open the Invite Member modal by clicking the toolbar button.
   */
  async openInviteMemberModal() {
    await this.inviteMemberButton.click();
    try {
      await this.invite_emailInput.waitFor({ state: 'visible', timeout: 5000 });
    } catch (err) {
      console.log('Modal did not open on first click. Retrying click...');
      await this.inviteMemberButton.click({ force: true });
      await this.invite_emailInput.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  /**
   * Fill and submit the Invite Member modal.
   * @param {object} opts
   * @param {string} opts.email         Invitee email address
   * @param {string} [opts.accessType]  "Full Access" or "Read Only"
   */
  async inviteMember({ email, accessType } = {}) {
    await this.openInviteMemberModal();
    if (accessType) {
      await this.invite_accessTypeSelect.click();
      await this.page.getByRole('option', { name: new RegExp(accessType, 'i') }).first().click();
    }
    await this.invite_emailInput.fill(email);
    await this.invite_sendButton.click();
  }

  /**
   * Click the Okay button on the Invitation Success modal.
   */
  async clickOkay() {
    await this.invite_successOkayButton.click();
    await this.invite_successOkayButton.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Get the status chip text from a row (0-based index).
   * @param {number} rowIndex
   * @returns {Promise<string>}
   */
  async getRowStatus(rowIndex = 0) {
    return this.getRow(rowIndex).locator('.MuiChip-label').innerText();
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
   * Switch between Transactions and Invoices sub-tabs.
   * @param {'transactions' | 'invoices'} subtabName
   */
  async switchPaymentSubTab(subtabName) {
    if (subtabName.toLowerCase() === 'transactions') {
      await this.payment_subtabTransactions.click();
      await this.page.waitForTimeout(500);
    } else {
      await this.payment_subtabInvoices.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * View the invoice for a specific payment row (0-based index).
   * @param {number} rowIndex
   */
  async viewInvoice(rowIndex = 0) {
    await this.payment_tableRows.nth(rowIndex).getByRole('button', { name: /^view$/i }).click();
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
