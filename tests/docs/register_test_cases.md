# Registration Page Test Cases

This document defines the E2E test cases for the User & Company Registration page.

## Test Suite Overview

- **Test Framework**: Playwright
- **Language**: JavaScript (CommonJS)
- **Base URL**: `http://206.189.23.26:3003/webapp/`
- **POM Files**:
  - `tests/pages/base.page.js`
  - `tests/pages/register.page.js`
- **Spec File**: `tests/specs/register.spec.js`


## 1. UI & Flow Test Cases

### TC_REG_001: Verify Registration Page Basic Rendering
- **Description**: Verify that navigating to the registration page renders all registration form fields and shows the selected plan overview details.
- **Steps**:
  1. Select **Essential** plan on the subscription screen.
  2. Click **Next : Create Account**.
  3. Verify that **Company Name**, **Email**, **User Name**, **Password**, and **Re-type password** fields are visible.
  4. Verify that the right-hand container shows selected plan details (e.g. "Essential", Full Access, Read Only counts).
- **Expected Results**: All fields and selected plan details are correctly displayed to the user.

### TC_REG_002: Verify Form Validation Logic
- **Description**: Verify that invalid input (missing name, mismatching passwords) prevents submission.
- **Steps**:
  1. Fill out the registration form.
  2. Leave the **User Name** field blank.
  3. Fill mismatching passwords in **Password** and **Re-type password** fields.
  4. Check the Terms & Conditions consent checkbox.
  5. Verify that the submit button remains disabled.
- **Expected Results**: The submit button remains disabled because of invalid form state.

### TC_REG_003: Verify Checkbox State Controls Submit Button
- **Description**: Verify that the Terms & Conditions checkbox state toggles the enabled/disabled state of the main registration submit button.
- **Steps**:
  1. Fill out the registration form with valid credentials.
  2. Verify that the **Verify Email** button is disabled.
  3. Check the **Terms & Conditions** checkbox.
  4. Verify that the **Verify Email** button is enabled.
- **Expected Results**: Submit button state directly responds to the terms acceptance checkbox.

### TC_REG_004: Redirect to Login on Session Loss / Direct Navigation
- **Description**: Verify that opening the registration URL directly or in another tab/context without selecting a plan redirects the user to the login page.
- **Steps**:
  1. Open a new, isolated browser page or tab.
  2. Navigate directly to `/register`.
  3. Verify that the browser is automatically redirected to `/login`.
- **Expected Results**: Direct navigation is blocked and redirected to the login screen.

### TC_REG_005: Verify Duplicate Company Name Registration Blocked
- **Description**: Verify that trying to register a company name that already exists in the system shows an error message and blocks progress.
- **Steps**:
  1. Fill out the registration form with valid inputs, but use an already registered company name.
  2. Check the Terms & Conditions checkbox.
  3. Click **Verify Email**.
  4. Verify that an error alert appears indicating the company is already registered, and the OTP verification field is not shown.
- **Expected Results**: The user is prevented from registering a duplicate company and see a clear server validation message.

### TC_REG_006: Complete Registration Flow with OTP, Welcome Email, and Invoice Verification
- **Description**: Verify the complete end-to-end registration flow. This checks live OTP retrieval, OTP verification, delivery of the "User registration" welcome email, triggering the payment invoice, and verifying that the delivered invoice email contains a "Pay Now" link/button.
- **Steps**:
  1. Fill out the registration form with unique credentials using a real Gmail address.
  2. Check the Terms & Conditions checkbox and click **Verify Email**.
  3. Poll the Gmail inbox for the verification email and extract the OTP.
  4. Input the code into the OTP verification field and click **Next : Payment**.
  5. Poll the Gmail inbox to verify that the welcome registration email (Subject: "User registration") is successfully delivered.
  6. On the Webapp invoice page, click **Email invoice and Pay**.
  7. Verify the success dialog with header `"Invoice Sent!"` and subtitle `"Your subscription invoice is on its way"`.
  8. Poll the Gmail inbox for the invoice email (Subject: "Invoice").
  9. Verify the invoice email is delivered and contains a valid "Pay Now" or "PayNow" link/button.
  10. Click **Go to Login** and verify redirection to `/login`.
- **Expected Results**: The complete registration flow is executed successfully; both the welcome email and invoice email are delivered, and the invoice email includes the "Pay Now" button.


