# E2E Test Documentation: Invite Member & User Management UI

This document provides execution details, step-by-step logic, and verification points for the Invite Member and general User Management UI test suite: `invite_member.spec.js`.

---

## 🚀 Execution Details

### How to Run

```bash
# Run the full suite
npx playwright test tests/specs/users/invite_member.spec.js

# Run in headed mode
npx playwright test tests/specs/users/invite_member.spec.js --headed

# Run a specific test case
npx playwright test tests/specs/users/invite_member.spec.js -g "TC_UM_005"
```

### Pre-conditions
- No existing account needed — the suite registers a **fresh Expert account** in `beforeAll`.
- Stripe test environment must be accessible.
- Gmail IMAP credentials configured in `tests/data/register.data.json`.

---

## ⚙️ Setup Flow

### `beforeAll` — Fresh Registration & Stripe Payment
Runs once before all tests. Registers a brand new Expert company account and completes Stripe payment to unlock the user management capabilities.
1. Navigates to the Subscription page.
2. Selects the **Expert** plan.
3. Adds **1 Read-Only seat** and selects the Fuzzy Match (**FC**) search goal.
4. Fills the registration form with a unique random email (`ankitqa.iihglobal+<uid>@gmail.com`).
5. Polls Gmail for the **OTP** email and submits the verification code.
6. Clicks **Email Invoice and Pay**.
7. Polls Gmail for the **Stripe invoice** email and extracts the payment URL.
8. Opens the Stripe hosted page in a new tab and completes payment with test card `4242 4242 4242 4242`.

### `beforeEach` — Login & Webhook Polling
Runs before each test. Logs in with the registered credentials and navigates to the Users tab.
1. Logs in via the login page.
2. Navigates to `/user-management` -> **My Subscription** tab.
3. Polls the subscription status until it changes from `Unpaid` to active (to handle Stripe webhook latency).
4. Navigates to the **Users** tab.

---

## 📋 Test Cases & Verification Points

### TC_UM_001: Verify Users tab renders all expected elements
- **Description**: Verify that the Users tab UI renders all expected toolbar controls, table structure, and column headers.
- **Steps**:
  1. Login and navigate to `/user-management`.
  2. Switch to the **Users** tab.
  3. Inspect the toolbar for the search bar, filter toggle, and invite button.
  4. Inspect the user listing table headers and verify columns.
- **Verification Points**:
  - **Users Tab Button**: Must be visible.
  - **Search Input**: Must be visible.
  - **Filter Button**: Must be visible.
  - **Invite Member Button**: Must be visible and **enabled** (indicates payment successfully cleared).
  - **Table Structure**: The main table, header (`thead`), and body (`tbody`) must be visible.
  - **Column Headers**: Column headers for **Name**, **Email**, and **Role** must be present, and the **Action** column (`...` menu) must be visible.
  - **Admin Row**: The first row representing the primary admin must be visible.

---

### TC_UM_002: Verify search by email filters the table correctly
- **Description**: Verify that typing an email in the Search input filters the table to show only matching rows, and clearing it restores all rows.
- **Steps**:
  1. Retrieve the email address of the primary administrator from the first row.
  2. Type the retrieved email address into the search input.
  3. Verify that only the matching row is visible in the table.
  4. Clear the search input field.
  5. Verify that all rows in the table are restored.
- **Verification Points**:
  - **Search Match**: Typing the primary admin's email must filter the table to only show the matching row.
  - **Search Input Clear**: Clearing the search input must restore all rows in the table.

---

### TC_UM_003: Verify Filter row toggles on and off
- **Description**: Verify that clicking the Filter button shows an inline filter row with filter inputs, and clicking it again hides it.
- **Steps**:
  1. Verify the initial state of the table (filter row should not be displayed).
  2. Click the **Filter** toggle button on the toolbar.
  3. Verify that the filter input fields are visible.
  4. Click the **Filter** toggle button again.
  5. Verify that the filter input fields are hidden.
- **Verification Points**:
  - **Initial State**: Filter row input fields must not be visible.
  - **Filter Toggle On**: Clicking the filter button must display filter inputs for **By Name**, **By Email**, **Role**, and **Status**.
  - **Filter Toggle Off**: Clicking the filter button again must hide all filter inputs.

---

### TC_UM_004: Verify Invite Member modal opens and renders correctly
- **Description**: Verify that clicking the Invite Member button opens a modal with all expected elements.
- **Steps**:
  1. Click the **Invite Member** button on the toolbar.
  2. Verify that the modal opens and all inputs and action buttons are rendered.
  3. Click the close button (`X` or Cancel) in the modal.
  4. Verify that the modal is dismissed.
- **Verification Points**:
  - **Modal Title**: The text `"Invite a team member"` must be visible in the modal header.
  - **Access Type Select**: The dropdown for selecting access type must be visible.
  - **Email Input**: The input field for the invitee's email must be visible.
  - **Send Button**: The send invitation button must be visible.
  - **Close Button**: The modal close/cancel button must be visible and click to successfully dismiss the modal.

---

### TC_UM_005: Invite Full Access member — verify Pending status in table
- **Description**: Verify that inviting a Full Access member creates a new row in the Users table with the correct Pending details.
- **Steps**:
  1. Click the **Invite Member** button.
  2. Select **Full Access** from the access type dropdown.
  3. Enter a unique generated email address and click **Send**.
  4. Wait for the success popup and click **Okay**.
  5. Locate the newly added row matching the invited email.
  6. Inspect the user details in the row cells.
- **Verification Points**:
  - **Success Toast**: Sending the invitation must show a success snackbar/alert.
  - **User Table Insertion**: A new row containing the invited email must appear in the table.
  - **Row Data Verification**:
    - **Name**: Empty or `-` (as registration is not yet complete).
    - **Email**: Matches the invited email address.
    - **Role**: Defaults to `User`.
    - **Status**: Displays `Pending`.
    - **Subscription**: Displays the active plan (`Expert`).
    - **Seat Type**: Displays `Full` or `Full Access`.
    - **Renewable**: Defaults to `Renewable`.

---

### TC_UM_006: Invite Read Only member — verify Pending status in table
- **Description**: Verify that inviting a Read Only member creates a new row in the Users table with the correct Pending details.
- **Steps**:
  1. Click the **Invite Member** button.
  2. Select **Read Only** from the access type dropdown.
  3. Enter a unique generated email address and click **Send**.
  4. Wait for the success popup and click **Okay**.
  5. Locate the newly added row matching the invited email.
  6. Inspect the user details in the row cells.
- **Verification Points**:
  - **Success Toast**: Sending the invitation must show a success snackbar/alert.
  - **User Table Insertion**: A new row containing the invited email must appear in the table.
  - **Row Data Verification**:
    - **Name**: Empty or `-`.
    - **Email**: Matches the invited email address.
    - **Role**: Defaults to `User`.
    - **Status**: Displays `Pending`.
    - **Subscription**: Displays the active plan (`Expert`).
    - **Seat Type**: Displays `ReadOnly` or `Read Only`.
    - **Renewable**: Defaults to `Renewable`.

---

### TC_UM_007: Verify registeredEmail is marked as Primary admin
- **Description**: Verify that the main registered email (the primary contact who registered the account) displays a "Primary" status chip next to their name in the Users table.
- **Steps**:
  1. Locate the row representing the primary company admin (`registeredEmail`).
  2. Inspect the Name/Details cell for the status chip.
- **Verification Points**:
  - **Primary Badge**: A badge or chip with text `"Primary"` must be rendered next to the main registered email inside the table.

---

### TC_UM_008: Verify logged-in user cannot edit their own Role, Email, Status, Seat Type, and Renew Status
- **Description**: Verify that the logged-in user cannot edit their own Role, Email, Status, Seat Type, and Renew Status fields when opening the Edit User modal for themselves.
- **Steps**:
  1. Locate the row representing the logged-in user.
  2. Click the Action menu (`...`) button for that row and select **Edit**.
  3. Check the editable state of the form controls inside the modal.
  4. Click the cancel/close button on the modal.
- **Verification Points**:
  - **Edit Modal Inputs**: Opening the edit modal for the logged-in admin must show the fields **Role**, **Email**, **Status**, **Seat Type**, and **Renew Status** disabled (i.e. have `disabled` attribute or class indicator).

---

### TC_UM_012: Verify Payment History Tab — Transactions, Invoices, and Invoice Modal Details
- **Description**: Verify the Payment History tab, showing correct transactions and invoices details after Stripe registration payment.
- **Steps**:
  1. Navigate to `/user-management` and click the **Payment History** tab.
  2. Inspect the transaction details list under the active **Transactions** sub-tab.
  3. Click the **Invoices** sub-tab.
  4. Click the action button for the primary invoice to open details.
  5. Inspect total paid, amount due, and PDF action controls inside the modal.
  6. Click the Close button to dismiss the invoice details modal.
- **Verification Points**:
  - **Transactions Sub-tab**:
    - Displays a table showing the subscription purchase transaction.
    - Verifies the total amount matches the purchased items ($5100.00).
    - Verifies the payment status displays `succeeded` or `paid`.
  - **Invoices Sub-tab**:
    - Displays the list of generated invoices containing the correct total amount and paid status.
  - **Invoice Details Dialog**:
    - Displays `"Total Paid"` matching `$5,100.00`.
    - Displays `"Amount Due"` matching `$0.00`.
    - Contains `"Download Invoice"` and `"View PDF"` action buttons.
