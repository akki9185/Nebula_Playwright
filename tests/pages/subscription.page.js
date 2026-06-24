const { BasePage } = require('./base.page');

class SubscriptionPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    // Selects only the plan cards (Free, Essential, Professional, Expert)
    this.planCards = page.locator('.MuiCard-root').filter({ has: page.locator('.plan-name') });

    // Order summary elements
    this.orderSummaryCard = page.locator('.MuiCard-root').filter({ hasText: /Order Summary/i });
    this.grandTotal = this.orderSummaryCard.locator('p').last();
    
    // Action buttons
    this.nextCreateAccountButton = page.locator('button', { hasText: /Next\s*:\s*Create\s*Account/i });
  }

  /**
   * Navigate to the subscription selection page.
   */
  async navigateToSubscription() {
    const t = Math.random().toString(36).substring(2, 7);
    await this.navigate(`/subscription?nocache=${t}`);
  }

  /**
   * Get the card element of a subscription plan by name.
   * @param {string} planName Name of the plan, e.g. "Free", "Essential", "Professional", "Expert"
   */
  getPlanCard(planName) {
    return this.page.locator('.MuiCard-root').filter({
      has: this.page.locator('h5', { hasText: new RegExp(`^${planName}$`, 'i') })
    }).first();
  }

  /**
   * Select a plan by name.
   * @param {string} planName Name of the plan, e.g. "Free", "Essential", etc.
   */
  async selectPlan(planName) {
    const card = this.getPlanCard(planName);
    await card.click({ force: true });
    // Wait for card selection CSS transition/animation (300ms) to settle completely
    await this.wait(500);
  }

  /**
   * Get the card element of a search goal.
   * @param {string} name
   */
  getSearchGoalCard(name) {
    return this.page.locator('div').filter({ has: this.page.locator('> p', { hasText: new RegExp(`^${name}$`) }) }).first();
  }

  /**
   * Increment full access seats by clicking the plus button.
   * @param {string} planName Name of the plan
   */
  async incrementFullAccess(planName = 'Essential') {
    const card = this.getPlanCard(planName);
    await card.locator('.seat-button').nth(1).click();
    await this.wait(200); // small delay for state update
  }

  /**
   * Decrement full access seats by clicking the minus button.
   * @param {string} planName Name of the plan
   */
  async decrementFullAccess(planName = 'Essential') {
    const card = this.getPlanCard(planName);
    await card.locator('.seat-button').nth(0).click();
    await this.wait(200); // small delay for state update
  }

  /**
   * Increment read-only seats by clicking the plus button.
   * @param {string} planName Name of the plan
   */
  async incrementReadOnly(planName = 'Essential') {
    const card = this.getPlanCard(planName);
    await card.locator('.seat-button').nth(3).click();
    await this.wait(200); // small delay for state update
  }

  /**
   * Decrement read-only seats by clicking the minus button.
   * @param {string} planName Name of the plan
   */
  async decrementReadOnly(planName = 'Essential') {
    const card = this.getPlanCard(planName);
    await card.locator('.seat-button').nth(2).click();
    await this.wait(200); // small delay for state update
  }

  /**
   * Select a search goal by name.
   * @param {string} name Name of the search goal, e.g. "EC" or "GC"
   */
  async selectSearchGoal(name) {
    const goalOption = this.getSearchGoalCard(name);
    await goalOption.click();
    await this.wait(200); // small delay for state update
  }

  /**
   * Click the "Next : Create Account" button.
   */
  async clickNextCreateAccount() {
    await this.nextCreateAccountButton.click();
    await this.wait(500); // Wait for potential routing or state transition
  }
}

module.exports = { SubscriptionPage };
