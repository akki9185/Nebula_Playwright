const { BasePage } = require('./base.page');

/**
 * Page Object for the Users tab inside /user-management (Company Settings).
 *
 * Covers:
 *  - Toolbar: search input, Filter button, Invite Member button
 *  - Table: headers, body rows, status chips, row action (⋯) menu
 *  - Filter row: By name, By email, Role select, Status select, Clear Filter
 *  - Invite Member modal: subscription select, access-type select, email input, Send Invite
 *  - Edit User modal: name, role, seat type, renew status, save / cancel
 *  - Confirm-delete dialog
 */
class UsersTabPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // ══════════════════════════════════════════════════════════════════════════
    // ── TOOLBAR ──────────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    this.searchInput = page.getByPlaceholder('Search employee'); // search-by-name-or-email field
    this.filterButton = page.getByRole('button', { name: /^filter$/i }); // toggles the inline filter row
    this.inviteMemberButton = page.getByRole('button', { name: /invite member/i }); // opens Invite Member modal

    // ══════════════════════════════════════════════════════════════════════════
    // ── USERS TABLE ──────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════════════════════════
    // ── FILTER ROW (visible after clicking Filter button) ────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    this.filter_clearButton = page.getByRole('button', { name: /clear filter/i }); // resets all filters
    this.filter_nameInput = page.getByPlaceholder('By name'); // filter by user name
    this.filter_emailInput = page.getByPlaceholder('By email'); // filter by email
    this.filter_roleSelect = page.getByRole('combobox').filter({ hasText: /select a role/i }); // Role dropdown: Admin | User
    this.filter_statusSelect = page.getByRole('combobox').filter({ hasText: /select status/i }); // Status dropdown: Active | Pending

    // ══════════════════════════════════════════════════════════════════════════
    // ── ROW ACTION MENU (⋯ button → dropdown) ────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    // The action button per row renders <Button><b>...</b></Button>
    this.actionMenu_editItem = page.getByRole('menuitem', { name: /^edit$/i });
    this.actionMenu_deleteItem = page.getByRole('menuitem', { name: /^delete$/i });
    this.actionMenu_changePasswordItem = page.getByRole('menuitem', { name: /change password/i });
    this.actionMenu_resendInviteItem = page.getByRole('menuitem', { name: /resend invite/i });
    this.actionMenu_setPrimaryItem = page.getByRole('menuitem', { name: /set as primary/i });

    // ══════════════════════════════════════════════════════════════════════════
    // ── INVITE MEMBER MODAL ──────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    this.invite_title = page.getByText(/invite a team member/i);
    this.invite_accessTypeSelect = page.locator('.MuiSelect-select').filter({ hasText: /select access type/i });
    this.invite_emailInput = page.getByPlaceholder('e.g. teammember@company.com');
    this.invite_sendButton = page.locator('button[type="submit"]').filter({ hasText: /send/i });
    this.invite_closeButton = page.locator('img[alt="Close icon"]');
    this.invite_linkInput = page.locator('input#link');
    this.invite_copyButton = page.getByRole('button', { name: /copy|copied/i });
    this.invite_successOkayButton = page.locator('button', { hasText: 'Okay' });

    // ══════════════════════════════════════════════════════════════════════════
    // ── EDIT USER MODAL (Update Member) ──────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    this.edit_modal = page.getByRole('dialog');
    this.edit_title = page.getByRole('dialog').getByText(/update member/i);
    this.edit_roleSelect = page.getByRole('dialog').getByRole('combobox', { name: /role/i });
    this.edit_seatSelect = page.getByRole('dialog').getByRole('combobox', { name: /seat type/i });
    this.edit_renewSelect = page.getByRole('dialog').getByRole('combobox', { name: /renew status/i });
    this.edit_saveButton = page.getByRole('dialog').getByRole('button', { name: /save|update/i });
    this.edit_cancelButton = page.getByRole('dialog').getByRole('button', { name: /cancel/i });

    // ══════════════════════════════════════════════════════════════════════════
    // ── DELETE CONFIRM DIALOG ────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    this.delete_dialog = page.getByRole('dialog');
    this.delete_confirmButton = page.getByRole('dialog').getByRole('button', { name: /^delete$/i });
    this.delete_cancelButton = page.getByRole('dialog').getByRole('button', { name: /cancel/i });
  }

  // ── Helper Methods ─────────────────────────────────────────────────────────

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
   * @param {string} [opts.subscription] Subscription option text (optional)
   * @param {string} [opts.accessType]  "Full Access" or "Read Only"
   */
  async inviteMember({ email, accessType } = {}) {
    await this.openInviteMemberModal();
    if (accessType) {
      await this.invite_accessTypeSelect.click();
      // The dropdown option contains the access type text and seat count e.g. "Full Access (4 seats)"
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
  }

  /**
   * Get the status chip text from a row (0-based index).
   * @param {number} rowIndex
   * @returns {Promise<string>}
   */
  async getRowStatus(rowIndex = 0) {
    return this.getRow(rowIndex).locator('.MuiChip-label').innerText();
  }
}

module.exports = { UsersTabPage };
