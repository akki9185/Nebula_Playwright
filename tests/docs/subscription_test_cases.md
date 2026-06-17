# E2E Subscription Test Cases

This document defines the E2E test suite written in Playwright (JavaScript) for verifying subscription pricing, plans, seat calculations, search goals, and API boundary conditions.

---

## Test Suite Overview

- **Test Framework**: Playwright
- **Language**: JavaScript (CommonJS)
- **Base URL**: `http://206.189.23.26:3003/webapp/`
- **POM Files**:
  - `tests/pages/base.page.js` (Core layout & navigation)
  - `tests/pages/subscription.page.js` (Locators & interaction logic)
- **Mock Data**: `tests/data/mockData.js` (Simulates `/subscriptions/products` backend response)

---

## 1. UI & Calculation Test Cases

### TC_SUB_001: Verify Basic UI Rendering of Plans
- **Description**: Verify all plan options are correctly loaded and rendered as cards on the subscription screen.
- **Preconditions**: Navigate to `/subscription` page with mock API enabled.
- **Steps**:
  1. Inspect the plans container.
  2. Verify that cards for **Free**, **Essential**, **Professional**, **Expert**, and **Enterprise** are visible.
- **Expected Results**: All 5 plans are visible to the user.

### TC_SUB_002: Verify Search Goals Render on Initial Page Load
- **Description**: Verify that the search goals list is correctly loaded and rendered on the screen.
- **Preconditions**: Navigate to `/subscription` page.
- **Steps**:
  1. Verify that search goal cards (EC, GC, PM, FC) are rendered and visible.
- **Expected Results**: All search goals are visible on the page.

### TC_SUB_003: Select Essential Plan and Verify Defaults
- **Description**: Verify that selecting the Essential plan loads default values in the Order Summary.
- **Steps**:
  1. Click on the **Essential** plan.
  2. Verify that the **Order Summary** card appears.
  3. Verify that the **Grand Total** renders as `$50.00` (Essential base yearly price).
- **Expected Results**: Order summary displays correctly with Essential base pricing.

### TC_SUB_004: Verify Free Plan Restrictions (Fixed Seats & Restricted Search Goals)
- **Description**: Verify that the Free plan restricts seat count to 2, disables increments/decrements, selects the EC goal by default, and disables all other search goals.
- **Steps**:
  1. Click on the **Free** plan.
  2. Check the **Full Access** seats minus and plus buttons, and the input field.
  3. Verify that the **EC Goal** is selected by default and listed in the Order Summary as `$0.00`.
  4. Verify that other search goals (e.g., **GC**) are visually marked as disabled with `cursor: not-allowed`.
  5. Attempt to click on the **GC** search goal and verify it is not added to the Order Summary.
- **Expected Results**:
  - Minus button, plus button, and input field are **disabled** with value `2`.
  - EC Goal is automatically selected by default.
  - Other search goals are disabled and cannot be selected.

### TC_SUB_005: Switching Between Plans Resets Calculations
- **Description**: Verify that selecting a plan, customizing seats, and then switching to another plan resets all parameters to defaults.
- **Steps**:
  1. Select **Professional** plan.
  2. Increment **Full Access** seats once (adds `$15.00`, total = `$115.00`).
  3. Select **Essential** plan.
  4. Verify that **Grand Total** resets to Essential default (`$50.00`).
- **Expected Results**: Calculations and selections are completely reset upon switching plans.

### TC_SUB_006: Seat Increment/Decrement Management on Essential Plan
- **Description**: Verify that incrementing and decrementing seats updates the Grand Total correctly.
- **Steps**:
  1. Select **Essential** plan.
  2. Click the plus (+) button on **Full Access** seats twice (adds 2 seats @ `$10.00` = `$20.00`).
  3. Verify Grand Total is `$70.00`.
  4. Click the minus (-) button on **Full Access** seats once (subtracts `$10.00`).
  5. Verify Grand Total returns to `$60.00`.
- **Expected Results**: Pricing dynamically recalculates on seat adjustments.

### TC_SUB_007: Seat Decrement Back to Min Seats Deselects Plan
- **Description**: Verify that decrementing seats back to the minimum allowed value (2) when Read Only seats is 0 deselects the plan.
- **Steps**:
  1. Select **Essential** plan.
  2. Click the plus (+) button on **Full Access** seats once (adds `$10.00`, total = `$60.00`).
  3. Click the minus (-) button on **Full Access** seats once (decrements back to min seats = 2).
  4. Verify that the plan selection is cleared and the **Order Summary** is hidden.
- **Expected Results**: Plan selection is successfully cleared when seat count goes back to minimum.

### TC_SUB_008: Select Search Goal on Paid Plan
- **Description**: Verify that selecting a paid search goal updates the Grand Total.
- **Steps**:
  1. Select **Professional** plan (base `$100.00`).
  2. Select the **GC** search goal (adds `$10.00`).
  3. Verify Grand Total is `$110.00`.
- **Expected Results**: Selected search goal price is added to the Grand Total.

### TC_SUB_009: Essential Plan Complex Calculations
- **Description**: Verify the Essential plan pricing rules, including custom Full Access seats, Read Only seats, and multiple search goal selections.
- **Steps**:
  1. Select **Essential** plan (base `$50.00`).
  2. Click plus (+) on **Full Access** seats twice (adds 2 seats @ `$10.00` = `$20.00`).
  3. Click plus (+) on **Read Only** seats three times (adds 3 seats @ `$5.00` = `$15.00`).
  4. Select **GC** search goal (adds `$10.00`).
  5. Select **FC** search goal (adds `$10.00`).
- **Expected Results**: Grand Total calculations are correct:
  - Base: `$50.00`
  - Full Access: `$20.00`
  - Read Only: `$15.00`
  - GC Goal: `$10.00`
  - FC Goal: `$10.00`
  - **Grand Total**: `$105.00`

### TC_SUB_010: Professional Plan Complex Calculations
- **Description**: Verify the Professional plan pricing rules, including custom Full Access seats, Read Only seats, and multiple search goal selections.
- **Steps**:
  1. Select **Professional** plan (base `$100.00`).
  2. Click plus (+) on **Full Access** seats three times (adds 3 seats @ `$15.00` = `$45.00`).
  3. Click plus (+) on **Read Only** seats twice (adds 2 seats @ `$10.00` = `$20.00`).
  4. Select **PM** search goal (adds `$10.00`).
  5. Select **FC** search goal (adds `$10.00`).
- **Expected Results**: Grand Total calculations are correct:
  - Base: `$100.00`
  - Full Access: `$45.00`
  - Read Only: `$20.00`
  - PM Goal: `$10.00`
  - FC Goal: `$10.00`
  - **Grand Total**: `$185.00`

### TC_SUB_011: Expert Plan Complex Calculations
- **Description**: Verify the Expert plan pricing rules, including 5 minimum Full Access seats (2 free + 3 paid @ $25/yr each = $75.00), additional Full Access seats, Read Only seats, and multiple search goal selections.
- **Steps**:
  1. Select **Expert** plan.
  2. Verify initial Grand Total is `$5075.00` (Base `$5000.00` + `$75.00` for 3 additional required seats).
  3. Click plus (+) on **Full Access** seats once (adds 1 seat @ `$25.00` = `$25.00`).
  4. Click plus (+) on **Read Only** seats twice (adds 2 seats @ `$15.00` = `$30.00`).
  5. Select **PM** search goal (adds `$10.00`).
  6. Select **FC** search goal (adds `$10.00`).
- **Expected Results**: Grand Total calculations are correct:
  - Base: `$5000.00`
  - Required + Custom Full Access (4 extra): `$100.00`
  - Read Only: `$30.00`
  - PM Goal: `$10.00`
  - FC Goal: `$10.00`
  - **Grand Total**: `$5150.00`

### TC_SUB_012: EC Goal Selected by Default
- **Description**: Verify that the EC Goal is selected by default for all subscriptions when a plan is selected.
- **Steps**:
  1. Select any plan (e.g., **Essential** plan).
  2. Verify that the **EC Goal** option box is visually marked as selected.
  3. Verify that the **Order Summary** includes the EC goal with a price of `$0.00`.
- **Expected Results**: EC Goal is automatically selected by default and lists in the Order Summary at no additional cost.

### TC_SUB_013: Verify Seat Information Tooltip Texts
- **Description**: Verify that hovering over the information icons of Full Access and Read Only seats displays the correct descriptive tooltip texts.
- **Steps**:
  1. Navigate to the `/subscription` page.
  2. Hover over the **Info Icon (ℹ️)** next to the **Full Access** seats control.
  3. Verify that the tooltip popup appears with the text: `"Full Access users can view and manage all features, including editing and administrative actions."`
  4. Hover over the **Info Icon (ℹ️)** next to the **Read Only** seats control.
  5. Verify that the tooltip popup appears with the text: `"Read Only users can view data but cannot edit records, make updates, or change settings."`
- **Expected Results**: Descriptive tooltips are correctly rendered on hover and match the respective explanation texts.

### TC_SUB_014: Verify Next: Create Account Button Validation and Navigation
- **Description**: Verify that clicking the "Next : Create Account" button without a selected plan displays a validation error, and clicking it with a selected plan correctly routes the user to the registration page.
- **Steps**:
  1. Navigate to the `/subscription` page.
  2. Click on the **Next : Create Account** button.
  3. Verify that the error message `"Please select a subscription to continue"` appears.
  4. Select a plan (e.g. **Essential** plan).
  5. Click on the **Next : Create Account** button.
  6. Verify that the browser routes to the `/register` page.
- **Expected Results**: Validation error blocks action when no plan is selected, and successful plan selection enables routing to the next step.

### TC_SUB_015: Verify Selected Subscription Card Color Toggling
- **Description**: Verify that selecting a plan card changes its background color to blue (`rgb(36, 98, 255)` / `#2462FF`), and clicking it again to deselect it restores its background color to white (`rgb(255, 255, 255)` / `#ffffff`).
- **Steps**:
  1. Navigate to the `/subscription` page.
  2. Verify that the **Essential** plan card background color is initially white.
  3. Click on the **Essential** plan card to select it.
  4. Verify that the card's background color changes to blue.
  5. Click on the **Essential** plan card again to deselect it.
  6. Verify that the card's background color returns to white.
- **Expected Results**: Card background color visually indicates selection state dynamically.
