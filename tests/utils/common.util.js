const { expect } = require('@playwright/test');
const { pollGmailForMessage } = require('./gmail.util');
const registerData = require('../data/register.data.json');

/**
 * Poll email using centralized gmail credentials
 */
async function pollEmail(subjectQuery, since, to) {
  return pollGmailForMessage({
    emailAddress: registerData.gmail.emailAddress,
    appPassword: registerData.gmail.appPassword,
    subjectQuery,
    since,
    to,
  });
}

/**
 * Decode quoted printable email body text
 */
function decodeQuotedPrintable(str) {
  let decoded = str.replace(/=\r?\n/g, '');
  decoded = decoded.replace(/=3D/g, '=');
  return decoded;
}

/**
 * Fill credit card inputs inside Stripe element iframe and submit payment
 */
async function completeStripePayment(stripePage) {
  const paymentIFrameLocator = stripePage.locator('iframe[src*="elements-inner-payment"]');
  await paymentIFrameLocator.waitFor({ state: 'visible', timeout: 25000 });
  const stripeCardFrame = stripePage.frameLocator('iframe[src*="elements-inner-payment"]');

  await stripePage.waitForTimeout(2000);

  const cardTab = stripeCardFrame.locator('text=Card').first();
  if (await cardTab.count() > 0) {
    await cardTab.click();
    console.log('✓ Clicked Card payment method option inside iframe');
  }

  console.log('── Entering test credit card details on Stripe page ──');
  const cardInput = stripeCardFrame.locator('input[name="number"]');
  await expect(cardInput).toBeVisible({ timeout: 20000 });

  await cardInput.fill('4242');
  await cardInput.pressSequentially('424242424242');
  await stripeCardFrame.locator('input[name="expiry"]').fill('12/34');
  await stripeCardFrame.locator('input[name="cvc"]').fill('123');

  const postalInput = stripeCardFrame.locator('input[name="postalCode"]');
  if (await postalInput.count() > 0) {
    await postalInput.fill('90210');
  }

  // Click Pay
  await stripePage.waitForTimeout(2000);
  const stripePayBtn = stripePage.getByRole('button', { name: /^Pay/i }).first();
  await expect(stripePayBtn).toBeEnabled();
  await stripePayBtn.click();
  console.log('── Payment submitted, waiting for processing... ──');

  // Wait for Stripe success screen with a retry click if not visible
  let paid = false;
  const successLocator = stripePage.locator('text=Invoice paid').or(stripePage.locator('text=Paid')).or(stripePage.locator('text=Payment complete')).first();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await expect(successLocator).toBeVisible({ timeout: 15000 });
      paid = true;
      break;
    } catch (e) {
      console.log(`Payment success screen not visible on attempt ${attempt}. Retrying click on Pay button...`);
      if (await stripePayBtn.isVisible()) {
        await stripePayBtn.click().catch(() => {});
      }
    }
  }
  if (!paid) {
    throw new Error("Stripe payment success screen not visible after retries");
  }
  console.log('✓ Stripe payment completed successfully!');
  // Wait 5 seconds for webhook processing to settle completely
  await stripePage.waitForTimeout(5000);
}

module.exports = {
  pollEmail,
  decodeQuotedPrintable,
  completeStripePayment,
};
