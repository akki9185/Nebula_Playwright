const { test, expect } = require('@playwright/test');
const {
  LoginPage, AdhocSearchPage } = require('../pages');

test.describe('Adhoc Search Page Functional & Validation Tests', () => {
  let loginPage;
  let adhocPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    adhocPage = new AdhocSearchPage(page);

    // Login using the provided Paid Company credentials
    console.log('\n── Logging in with Paid Company Credentials ──');
    await loginPage.navigateToLogin();
    await loginPage.login('ankitqa.iihglobal+ex19069@gmail.com', 'Pa$$w0rd!');
    await expect(page).toHaveURL(/.*\/adhoc-search/, { timeout: 15000 });
    console.log('✓ Logged in and redirected to Adhoc Search page');
  });

  test('Basic Search & CSV Upload Verification', async ({ page }) => {
    console.log('\n── Step 1: Basic Search Flow & Verification ──');
    await expect(adhocPage.basicSearchInput).toBeVisible();

    // 1. Initial State: Button should be disabled
    const searchButton = page.getByRole('button', { name: /Enter search criteria|Search/i }).last();
    await expect(searchButton).toBeDisabled();
    console.log('✓ Search button is disabled initially');

    // Fuzzy Search Checkbox & Slider Validation (Basic Search)
    console.log('\n── Verifying Fuzzy Search & Slider on Basic Search ──');
    await expect(adhocPage.fuzzySliderLabel).not.toBeVisible();
    await expect(adhocPage.fuzzySlider).not.toBeVisible();

    await adhocPage.fuzzySearchCheckbox.click();
    await expect(adhocPage.fuzzySliderLabel).toBeVisible();
    await expect(adhocPage.fuzzySlider).toBeVisible();

    // Verify Slider is working
    const initialVal = await adhocPage.fuzzySlider.getAttribute('aria-valuenow');
    await adhocPage.fuzzySlider.focus();
    await adhocPage.fuzzySlider.press('ArrowRight');
    await adhocPage.fuzzySlider.press('ArrowRight');
    const updatedVal = await adhocPage.fuzzySlider.getAttribute('aria-valuenow');
    expect(Number(updatedVal)).toBeGreaterThan(Number(initialVal));
    console.log(`✓ Slider value updated from ${initialVal} to ${updatedVal}`);

    await adhocPage.fuzzySearchCheckbox.click(); // Uncheck
    await expect(adhocPage.fuzzySliderLabel).not.toBeVisible();
    await expect(adhocPage.fuzzySlider).not.toBeVisible();
    console.log('✓ Fuzzy search checkbox and slider visibility state verified');

    // 2. Minimum Character Validation
    await adhocPage.basicSearchInput.fill('J');
    await expect(page.getByText('Search term must be at least 2 characters')).toBeVisible();
    await expect(searchButton).toBeDisabled();
    console.log('✓ Under 2 character warning and disabled search button verified');

    // 3. Successful Basic Search
    await adhocPage.basicSearchInput.fill('John Doe');
    await expect(page.getByText('Search term must be at least 2 characters')).not.toBeVisible();
    await expect(searchButton).toBeEnabled();
    await searchButton.click();

    // Verify results container is visible
    await expect(adhocPage.resultsContainer).toBeVisible({ timeout: 15000 });
    console.log('✓ Basic search completed successfully and results displayed');

    console.log('\n── Step 2: CSV Upload Verification (Confirm Enabled for Paid User) ──');
    // Reload the page to reset the search view state
    await page.reload();
    await expect(adhocPage.basicSearchInput).toBeVisible();

    // Click upload icon to open CSV modal
    const uploadIcon = page.locator('img[alt="Upload csv icons"]');
    await expect(uploadIcon).toBeVisible();
    await uploadIcon.click();

    // Verify Upload CSV Modal is open
    await expect(page.getByText('Drag or upload a file')).toBeVisible();

    // Upload file
    const csvFilePath = require('path').resolve(__dirname, '../data/adhocUpload.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvFilePath);

    // Verify UploadCsvDataModal is open and Confirm button is ENABLED for paid user
    const confirmBtn = page.getByRole('button', { name: 'Confirm' });
    await expect(confirmBtn).toBeEnabled();
    console.log('✓ Confirm button in upload popup is enabled for paid user');

    // Click Confirm
    await confirmBtn.click();

    // Verify results container is visible
    await expect(adhocPage.resultsContainer).toBeVisible({ timeout: 15000 });
    console.log('✓ CSV upload confirmed and search results displayed successfully');
  });

  test('Advanced Search Validation and Field Combinations', async ({ page }) => {
    console.log('\n── Step 1: Navigating to Advanced Search ──');
    await adhocPage.switchToAdvancedSearch();
    await expect(adhocPage.advNameInput).toBeVisible();

    // Fuzzy Search Checkbox & Slider Validation (Advanced Search)
    console.log('\n── Verifying Fuzzy Search & Slider on Advanced Search ──');
    await expect(adhocPage.fuzzySliderLabel).not.toBeVisible();
    await expect(adhocPage.fuzzySlider).not.toBeVisible();

    await adhocPage.fuzzySearchCheckbox.click();
    await expect(adhocPage.fuzzySliderLabel).toBeVisible();
    await expect(adhocPage.fuzzySlider).toBeVisible();

    // Verify Slider is working
    const initialVal = await adhocPage.fuzzySlider.getAttribute('aria-valuenow');
    await adhocPage.fuzzySlider.focus();
    await adhocPage.fuzzySlider.press('ArrowRight');
    await adhocPage.fuzzySlider.press('ArrowRight');
    const updatedVal = await adhocPage.fuzzySlider.getAttribute('aria-valuenow');
    expect(Number(updatedVal)).toBeGreaterThan(Number(initialVal));
    console.log(`✓ Slider value updated from ${initialVal} to ${updatedVal}`);

    await adhocPage.fuzzySearchCheckbox.click(); // Uncheck
    await expect(adhocPage.fuzzySliderLabel).not.toBeVisible();
    await expect(adhocPage.fuzzySlider).not.toBeVisible();
    console.log('✓ Fuzzy search checkbox and slider visibility state verified');

    const searchButton = page.getByRole('button', { name: /search/i }).last();

    console.log('\n── Step 2: Verifying Single Field Searches ──');
    // 1. Name Only
    await adhocPage.advNameInput.fill('John Doe');
    await expect(searchButton).toBeEnabled();
    await adhocPage.resetAdvancedSearch();
    await expect(adhocPage.advNameInput).toHaveValue('');
    console.log('✓ Name only search is allowed');

    // 2. Identification Only
    await adhocPage.advIdentificationInput.fill('12345');
    await expect(searchButton).toBeEnabled();
    await adhocPage.resetAdvancedSearch();
    await expect(adhocPage.advIdentificationInput).toHaveValue('');
    console.log('✓ Identification only search is allowed');

    // 3. Address Only
    await adhocPage.advAddressInput.fill('123 Street');
    await expect(searchButton).toBeEnabled();
    await adhocPage.resetAdvancedSearch();
    await expect(adhocPage.advAddressInput).toHaveValue('');
    console.log('✓ Address only search is allowed');

    console.log('\n── Step 3: Verifying Country-Only Restriction ──');
    await adhocPage.advCountryInput.fill('United States');
    await page.getByRole('option', { name: 'United States' }).first().click();

    // Verify Country-only warning is visible and button is disabled
    await expect(page.getByText('Country cannot be the only search field')).toBeVisible();
    await expect(searchButton).toBeDisabled();
    console.log('✓ Country-only warning and search button disablement verified');

    console.log('\n── Step 4: Verifying Country Combinations ──');
    // 1. Country + Name
    await adhocPage.advNameInput.fill('John Doe');
    await expect(page.getByText('Country cannot be the only search field')).not.toBeVisible();
    await expect(searchButton).toBeEnabled();
    await adhocPage.advNameInput.fill(''); // Clear Name
    await expect(searchButton).toBeDisabled();
    console.log('✓ Country + Name combo allowed');

    // 2. Country + Identification
    await adhocPage.advIdentificationInput.fill('12345');
    await expect(searchButton).toBeEnabled();
    await adhocPage.advIdentificationInput.fill(''); // Clear ID
    await expect(searchButton).toBeDisabled();
    console.log('✓ Country + Identification combo allowed');

    // 3. Country + Address
    await adhocPage.advAddressInput.fill('123 Street');
    await expect(searchButton).toBeEnabled();
    await adhocPage.advAddressInput.fill(''); // Clear Address
    await expect(searchButton).toBeDisabled();
    console.log('✓ Country + Address combo allowed');

    console.log('\n── Step 5: Verifying Multi-Field Combination Search and Reset ──');
    await adhocPage.advNameInput.fill('Jane Doe');
    await adhocPage.advIdentificationInput.fill('12345');
    await adhocPage.advAddressInput.fill('123 Street');
    // Country + Name + ID + Address combo is active
    await expect(searchButton).toBeEnabled();
    await searchButton.click();

    // Verify results load
    await expect(adhocPage.resultsContainer).toBeVisible({ timeout: 15000 });
    console.log('✓ Advanced search with multiple fields executed successfully');
  });
});
