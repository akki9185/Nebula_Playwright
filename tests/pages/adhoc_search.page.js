const { BasePage } = require('./base.page');

class AdhocSearchPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // ── Tabs ─────────────────────────────────────────────────────────────
    this.basicSearchTab    = page.getByRole('tab', { name: /basic search/i });
    this.advancedSearchTab = page.getByRole('tab', { name: /advanced search/i });

    // ── Basic Search ─────────────────────────────────────────────────────
    /** Main name lookup input on the Basic Search tab */
    this.basicSearchInput  = page.getByPlaceholder(/enter one or more names/i);
    /** Bulk-upload icon next to the basic search input */
    this.uploadButton      = page.locator('button[aria-label*="upload"], button[title*="upload"]').first();
    /** Fuzzy search checkbox (shared between both tabs) */
    this.fuzzySearchCheckbox = page.getByRole('checkbox', { name: /fuzzy search/i });
    /** Fuzzy search minimum match level slider */
    this.fuzzySlider         = page.getByRole('slider');
    /** Fuzzy search minimum match level slider label */
    this.fuzzySliderLabel    = page.getByText('Minimum Match Level (%)');
    /** Info text about search category */
    this.categoryInfoText  = page.getByText(/your searches apply to category/i);
    /** Primary Search / Submit button */
    this.searchButton      = page.getByRole('button', { name: /search/i }).last();

    // ── Advanced Search ──────────────────────────────────────────────────
    /** Name field on the Advanced Search tab */
    this.advNameInput          = page.getByPlaceholder(/^name$/i);
    /** Identification field */
    this.advIdentificationInput = page.getByPlaceholder(/identification/i);
    /** Address field */
    this.advAddressInput        = page.getByPlaceholder(/address/i);
    /** Country dropdown (MUI Autocomplete combobox) */
    this.advCountryInput        = page.locator('#state');
    /** Reset button on the Advanced Search tab */
    this.resetButton            = page.locator('button', { hasText: /^Reset/i }).first();

    // ── Results area ─────────────────────────────────────────────────────
    /** Container that holds search result rows/cards */
    this.resultsContainer = page.locator('table, [role="table"], .MuiDataGrid-root').first();
    /** "No results" or empty-state message */
    this.noResultsMessage = page.getByText(/no results|no records found/i);
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  /**
   * Navigate to the Adhoc Search page.
   */
  async navigateToAdhocSearch() {
    await this.navigate('/adhoc-search');
    await this.page.waitForLoadState('load');
  }

  // ── Tab Switching ────────────────────────────────────────────────────────

  /**
   * Switch to the Basic Search tab.
   */
  async switchToBasicSearch() {
    await this.basicSearchTab.click();
  }

  /**
   * Switch to the Advanced Search tab.
   */
  async switchToAdvancedSearch() {
    await this.advancedSearchTab.click();
  }

  // ── Basic Search actions ─────────────────────────────────────────────────

  /**
   * Type a query into the Basic Search input and submit.
   * @param {string} query - One or more names separated by commas.
   */
  async basicSearch(query) {
    await this.basicSearchInput.fill(query);
    await this.searchButton.click();
  }

  /**
   * Toggle the Fuzzy Search checkbox.
   */
  async toggleFuzzySearch() {
    await this.fuzzySearchCheckbox.click();
  }

  // ── Advanced Search actions ───────────────────────────────────────────────

  /**
   * Fill and submit an advanced search query.
   * @param {{ name?: string, identification?: string, address?: string, country?: string }} params
   */
  async advancedSearch({ name = '', identification = '', address = '', country = '' } = {}) {
    if (name)           await this.advNameInput.fill(name);
    if (identification) await this.advIdentificationInput.fill(identification);
    if (address)        await this.advAddressInput.fill(address);
    if (country) {
      await this.advCountryInput.fill(country);
      // Select the first matching option in the MUI autocomplete dropdown
      await this.page.getByRole('option', { name: country }).first().click();
    }
    await this.searchButton.click();
  }

  /**
   * Reset all Advanced Search fields.
   */
  async resetAdvancedSearch() {
    await this.resetButton.click();
  }
}

module.exports = { AdhocSearchPage };
