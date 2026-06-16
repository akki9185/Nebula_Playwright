# Login Page E2E Test Cases

This document describes the automated E2E test cases created for the Login page.

## TC_LOG_001: Verify Login Page Renders All Elements
- **Description**: Verify that the login form, input fields (Email, Password), placeholders, Forgot Password link, and Login button are rendered and visible on the page.
- **Preconditions**: Navigate to the `/login` page.
- **Steps**:
  1. Verify the Email input field is visible.
  2. Verify the Password input field is visible.
  3. Verify the Forgot Password link is visible.
  4. Verify the Login button is visible.
- **Expected Results**: All login elements are correctly displayed.

## TC_LOG_002: Blank Form Submission Checks
- **Description**: Verify that validation errors are displayed for empty fields when clicking the Login button.
- **Preconditions**: Navigate to the `/login` page.
- **Steps**:
  1. Leave all input fields blank.
  2. Click the Login button.
  3. Verify the validation error message for Email: `"Please enter email address"`.
  4. Verify the validation error message for Password: `"Please enter password"`.
- **Expected Results**: Required field validation messages are displayed for both empty fields.

## TC_LOG_003: Invalid Email Format Validation Check
- **Description**: Verify that a validation error is displayed when entering an invalid email format.
- **Preconditions**: Navigate to the `/login` page.
- **Steps**:
  1. Fill the Email field with an invalid email format (e.g. `invalidemail`).
  2. Fill the Password field with any text.
  3. Click the Login button.
  4. Verify the validation error message for Email: `"Please enter a valid email address"`.
- **Expected Results**: The invalid email format validation message is displayed.

## TC_LOG_004: Invalid Credentials Login Check
- **Description**: Verify that an authentication failure message is displayed when submitting correct email format but incorrect credentials.
- **Preconditions**: Navigate to the `/login` page.
- **Steps**:
  1. Fill the Email field with a valid format email (e.g. `wronguser@example.com`).
  2. Fill the Password field with a wrong password.
  3. Click the Login button.
  4. Verify the error message above the Login button: `"Invalid Email or Password"`.
- **Expected Results**: The authentication failure error message is displayed.

## TC_LOG_005: Valid Credentials Login Check
- **Description**: Verify that a user can login successfully with valid credentials and is redirected to the home/dashboard page.
- **Preconditions**: Register a new company and user successfully.
- **Steps**:
  1. Register a new user dynamically via the registration flow.
  2. Navigate to the `/login` page.
  3. Fill the Email and Password fields with the registered credentials.
  4. Click the Login button.
  5. Verify successful login redirection to `/adhoc-search`.
- **Expected Results**: The user is successfully authenticated and redirected to the dashboard.
