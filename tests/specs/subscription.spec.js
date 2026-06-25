const { test, expect } = require('@playwright/test');
const { SubscriptionPage } = require('../pages');
const subscriptionData = require('../data/subscription.data.json');

test.describe('Subscription Page UI & Calculation Tests', () => {
  let subPage;

  test.beforeEach(async ({ page }) => {
    subPage = new SubscriptionPage(page);

    await subPage.navigateToSubscription();
    // Wait for the first plan card to be visible (up to 15 seconds) to ensure products are fully loaded
    await subPage.planCards.first().waitFor({ state: 'visible', timeout: 15000 });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const cleanTitle = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
      const screenshotPath = `test-results/screenshots/${cleanTitle}-failed.png`;
      console.log(`[Failure] Saving screenshot to: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  });

  test('TC_SUB_001: Verify basic UI rendering of plans', async () => {
    // Check that all plan cards are rendered
    await expect(subPage.page.locator('h5', { hasText: /^Free$/i })).toBeVisible();
    await expect(subPage.page.locator('h5', { hasText: /^Essential$/i })).toBeVisible();
    await expect(subPage.page.locator('h5', { hasText: /^Professional$/i })).toBeVisible();
    await expect(subPage.page.locator('h5', { hasText: /^Expert$/i })).toBeVisible();
    await expect(subPage.page.locator('h5', { hasText: /Enterprise/i })).toBeVisible();
  });

  test('TC_SUB_002: Verify search goals are rendered on initial page load', async () => {
    // Check that search goals are rendered
    await expect(subPage.page.locator('p', { hasText: /^EC$/i }).first()).toBeVisible();
    await expect(subPage.page.locator('p', { hasText: /^GC$/i }).first()).toBeVisible();
    await expect(subPage.page.locator('p', { hasText: /^PM$/i }).first()).toBeVisible();
    await expect(subPage.page.locator('p', { hasText: /^FC$/i }).first()).toBeVisible();
  });

  test('TC_SUB_003: Select Essential plan and verify default values and order summary', async () => {
    await subPage.selectPlan('Essential');

    // Verify Order Summary is visible
    await expect(subPage.orderSummaryCard).toBeVisible();

    // Default grand total should be $50.00
    await expect(subPage.grandTotal).toContainText('$50.00');
  });

  test('TC_SUB_004: Verify free plan restrictions: Fixed 2 Full Access seats and restricted search goals', async () => {
    await subPage.selectPlan('Free');

    // 1. Verify seat decrement and increment buttons are disabled
    const card = subPage.getPlanCard('Free');
    const minusButton = card.locator('.seat-button').nth(0);
    const plusButton = card.locator('.seat-button').nth(1);
    const fullAccessInput = card.locator('input').nth(0);

    await expect(minusButton).toBeDisabled();
    await expect(plusButton).toBeDisabled();
    await expect(fullAccessInput).toBeDisabled();
    await expect(fullAccessInput).toHaveValue('2');

    // 2. Verify EC Goal is selected by default and listed in Order Summary
    await expect(subPage.orderSummaryCard).toContainText('EC:');
    await expect(subPage.orderSummaryCard).toContainText('$0.00');

    // 3. Verify GC goal is disabled and has cursor: not-allowed
    const gcGoalOption = subPage.getSearchGoalCard('GC');
    await expect(gcGoalOption).toHaveCSS('cursor', 'not-allowed');

    // 4. Attempt to click on GC Goal and verify it is not selected
    await gcGoalOption.click({ force: true });
  });

  test('TC_SUB_005: Switching between plans resets calculations', async () => {
    // Select Professional and add a seat
    await subPage.selectPlan('Professional');
    await subPage.incrementFullAccess('Professional');
    // Base $100.00 + 1 extra seat ($15.00) = $115.00
    await expect(subPage.grandTotal).toContainText('$115.00');

    // Switch to Essential
    await subPage.selectPlan('Essential');

    // Verify it resets to Essential defaults ($50.00)
    await expect(subPage.grandTotal).toContainText('$50.00');
  });

  test('TC_SUB_006: Seat increment/decrement management and calculation logic on Essential plan', async () => {
    // Select Essential Plan
    await subPage.selectPlan('Essential');

    // Increment Full Access seats from 2 to 3 (Adds $10.00)
    await subPage.incrementFullAccess('Essential');
    await expect(subPage.grandTotal).toContainText('$60.00');

    // Increment Full Access seats from 3 to 4 (Adds another $10.00)
    await subPage.incrementFullAccess('Essential');
    await expect(subPage.grandTotal).toContainText('$70.00');

    // Decrement Full Access seats from 4 to 3 (Subtracts $10.00)
    await subPage.decrementFullAccess('Essential');
    await expect(subPage.grandTotal).toContainText('$60.00');
  });

  test('TC_SUB_007: Seat decrement back to min seats deselects the plan', async () => {
    // Select Essential Plan
    await subPage.selectPlan('Essential');

    // Increment Full Access seats from 2 to 3 (Adds $10.00)
    await subPage.incrementFullAccess('Essential');
    await expect(subPage.grandTotal).toContainText('$60.00');

    // Decrement Full Access seats from 3 to 2 (Since it hits min 2 and readOnly is 0, it clears plan selection)
    await subPage.decrementFullAccess('Essential');

    // Verify order summary card is hidden
    await expect(subPage.orderSummaryCard).not.toBeVisible();
  });

  test('TC_SUB_008: Select search goal on Paid Plan and verify total', async () => {
    await subPage.selectPlan('Professional');
    await subPage.selectSearchGoal('GC');
    // Base $100.00 + GC Goal ($10.00) = $110.00
    await expect(subPage.grandTotal).toContainText('$110.00');
  });

  test('TC_SUB_009: Essential Plan complex calculations with custom Full Access, Read Only seats, and multiple goals', async () => {
    await subPage.selectPlan('Essential');
    // Base $50.00
    await expect(subPage.grandTotal).toContainText('$50.00');

    // Add 2 Full Access seats (2 * $10.00 = $20.00)
    await subPage.incrementFullAccess('Essential');
    await subPage.incrementFullAccess('Essential');
    await expect(subPage.grandTotal).toContainText('$70.00');

    // Add 3 Read Only seats (3 * $5.00 = $15.00)
    await subPage.incrementReadOnly('Essential');
    await subPage.incrementReadOnly('Essential');
    await subPage.incrementReadOnly('Essential');
    await expect(subPage.grandTotal).toContainText('$85.00');

    // Add GC search goal (+$10.00) and FC search goal (+$10.00)
    await subPage.selectSearchGoal('GC');
    await expect(subPage.grandTotal).toContainText('$95.00');
    await subPage.selectSearchGoal('FC');
    await expect(subPage.grandTotal).toContainText('$105.00');
  });

  test('TC_SUB_010: Professional Plan complex calculations with custom Full Access, Read Only seats, and multiple goals', async () => {
    await subPage.selectPlan('Professional');
    // Base $100.00
    await expect(subPage.grandTotal).toContainText('$100.00');

    // Add 3 Full Access seats (3 * $15.00 = $45.00)
    await subPage.incrementFullAccess('Professional');
    await subPage.incrementFullAccess('Professional');
    await subPage.incrementFullAccess('Professional');
    await expect(subPage.grandTotal).toContainText('$145.00');

    // Add 2 Read Only seats (2 * $10.00 = $20.00)
    await subPage.incrementReadOnly('Professional');
    await subPage.incrementReadOnly('Professional');
    await expect(subPage.grandTotal).toContainText('$165.00');

    // Add PM search goal (+$10.00) and FC search goal (+$10.00)
    await subPage.selectSearchGoal('PM');
    await expect(subPage.grandTotal).toContainText('$175.00');
    await subPage.selectSearchGoal('FC');
    await expect(subPage.grandTotal).toContainText('$185.00');
  });

  test('TC_SUB_011: Expert Plan complex calculations with 5 minimum seats, additional custom seats, and multiple goals', async () => {
    await subPage.selectPlan('Expert');
    // Base $5000.00 + 3 required extra seats ($75.00) = $5075.00
    await expect(subPage.grandTotal).toContainText('$5075.00');

    // Add 1 more Full Access seat (+$25.00)
    await subPage.incrementFullAccess('Expert');
    await expect(subPage.grandTotal).toContainText('$5100.00');

    // Add 2 Read Only seats (2 * $15.00 = $30.00)
    await subPage.incrementReadOnly('Expert');
    await subPage.incrementReadOnly('Expert');
    await expect(subPage.grandTotal).toContainText('$5130.00');

    // Add PM search goal (+$10.00) and FC search goal (+$10.00)
    await subPage.selectSearchGoal('PM');
    await expect(subPage.grandTotal).toContainText('$5140.00');
    await subPage.selectSearchGoal('FC');
    await expect(subPage.grandTotal).toContainText('$5150.00');
  });

  test('TC_SUB_012: Verify EC goal is selected by default for all subscriptions', async () => {
    // Select Essential plan
    await subPage.selectPlan('Essential');

    // Verify EC Goal option box is rendered and visible
    const ecGoalOption = subPage.getSearchGoalCard('EC');
    await expect(ecGoalOption).toBeVisible();

    // Verify EC Goal is listed in the Order Summary as $0.00 by default
    await expect(subPage.orderSummaryCard).toContainText('EC:');
    await expect(subPage.orderSummaryCard).toContainText('$0.00');
  });

  test('TC_SUB_013: Verify the Tooltips on the Seat Information Icons', async () => {
    // Select Essential plan to ensure card is in view
    await subPage.selectPlan('Essential');

    const card = subPage.getPlanCard('Essential');

    // 1. Verify Full Access Tooltip
    const fullAccessInfoIcon = card.locator('[data-testid="InfoIcon"]').nth(0);
    await fullAccessInfoIcon.hover();
    await expect(subPage.page.locator('[role="tooltip"]', { hasText: /Full Access/ })).toHaveText(
      subscriptionData.tooltips.fullAccess
    );

    // Hover away to clear previous tooltip
    await subPage.page.locator('h5', { hasText: /^Essential$/i }).hover();

    // 2. Verify Read Only Tooltip
    const readOnlyInfoIcon = card.locator('[data-testid="InfoIcon"]').nth(1);
    await readOnlyInfoIcon.hover();
    await expect(subPage.page.locator('[role="tooltip"]', { hasText: /Read Only/ })).toHaveText(
      subscriptionData.tooltips.readOnly
    );
  });

  test('TC_SUB_014: Verify Next: Create Account button validation and navigation', async () => {
    // 1. Click Next without selecting any plan
    await subPage.clickNextCreateAccount();

    // Verify validation error is visible
    await expect(subPage.page.getByText(subscriptionData.validationMessages.selectSubscription)).toBeVisible();

    // 2. Select a plan (Essential) and click Next
    await subPage.selectPlan('Essential');
    await subPage.clickNextCreateAccount();

    // Verify it navigates to register page
    await expect(subPage.page).toHaveURL(/.*\/register/);
  });

  test('TC_SUB_015: Verify selected subscription card background color is blue and returns to white on deselection', async () => {
    const card = subPage.getPlanCard('Essential');

    // 1. Initially unselected card background should be white (rgb(255, 255, 255))
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    // 2. Select the card
    await subPage.selectPlan('Essential');

    // Verify selected card background turns to blue (rgb(36, 98, 255))
    await expect(card).toHaveCSS('background-color', 'rgb(36, 98, 255)');

    // 3. Click the card again to deselect it
    await card.click({ force: true });
    await subPage.wait(500); // Wait for transition animation to complete

    // Verify card background returns to white
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });
});
