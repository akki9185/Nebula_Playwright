# E2E Test Documentation: Change Password Feature

This document provides execution details, step-by-step logic, and verification points for the Change Password test suite: `change_password.spec.js`.

---

## 🚀 Execution Details

### How to Run

```bash
# Run the full Change Password suite
npx playwright test tests/specs/users/change_password.spec.js

# Run in headed mode
npx playwright test tests/specs/users/change_password.spec.js --headed

# Run a specific test case by ID
npx playwright test tests/specs/users/change_password.spec.js -g "TC_UM_022"
```

### Pre-conditions & Design Decisions
- Runs against an existing registered primary admin account (`ankitqa.iihglobal+nt18x@gmail.com`).
- To guarantee a known state and avoid password reuse rules or missing candidate user states:
  - **Fresh Invites**: Each test case (`TC_UM_021` through `TC_UM_025`) invites a fresh member with a unique case-identifying email pattern (e.g. containing `tc21` through `tc25` and a random suffix).
  - **Automated Registration**: The registration flow (filling the name/password, polling the OTP code from Gmail, and submitting it) is automated dynamically in each test case.
  - **Self-Service Cleanups**: At the end of each test, the admin account deletes the created test user to free the subscription seats and restore the tenant DB back to its original state.

---

## 📋 Test Cases & Verification Points

### TC_UM_019: Verify "Change Password" option is not available for Pending users
- **Description**: Verify that the **Change Password** action menu item is absent for users in a `Pending` status (i.e., users who have been invited but have not yet completed registration).
- **Steps**:
  1. Use the table **Filter** to select `Pending` status.
  2. Identify the first Pending user in the filtered table.
  3. Clear the filter and search for that user.
  4. Open the action menu (`...`) for that user's row.
  5. Check whether the **Change Password** option is present.
- **Verification Points**:
  - **Menu Option Hidden**: The `"Change Password"` option must be completely absent from the action menu for any row with `Pending` status.

---

### TC_UM_021: Verify Change Password modal UI elements and password validation rules
- **Description**: Verify that the Change Password modal renders the correct input fields and enforces password validation rules (mismatched passwords, weak/short passwords).
- **Steps**:
  1. Invite and register a fresh candidate user (`ankitqa.iihglobal+...tc21...@gmail.com`).
  2. Search for the candidate and verify their row is visible.
  3. Open the action menu and click **Change Password**.
  4. Verify the modal opens with **New Password** and **Confirm Password** input fields and a **Save** button.
  5. Enter a valid password in the New Password field but a different value in the Confirm field, then click **Save** — verify a mismatch error is shown (inline or snackbar).
  6. Enter a weak/short password (e.g., `abc`) in both fields, then click **Save** — verify a strength/length validation error is shown.
  7. Click **Cancel** (or press Escape) to close the modal without saving.
  8. Admin deletes the test user to clean up.
- **Verification Points**:
  - **Modal UI**: The Change Password modal must display two password input fields (`New Password`, `Confirm Password`) and a Save button.
  - **Mismatch Validation**: Submitting with non-matching passwords must display an error (inline or via snackbar).
  - **Strength Validation**: Submitting a weak/short password must display a validation error.
  - **Cancel**: Closing the modal via Cancel/Escape must dismiss the modal without making any changes.
  - **Cleanup**: The user is successfully deleted from the system at the end of the test.

---

### TC_UM_022: Verify changing a User's password blocks old password login and permits new password login
- **Description**: Verify the complete end-to-end Change Password flow for a **User** role user — changing the password must immediately invalidate the old password and allow login with the new one.
- **Steps**:
  1. Invite and register a fresh candidate user (`ankitqa.iihglobal+...tc22...@gmail.com`) with the default password `Pa$$w0rd!`.
  2. Search for the candidate, open the action menu, and click **Change Password**.
  3. Enter the new password (`NewPa$$w0rd@1`) in both fields and click **Save**.
  4. Verify a success notification is visible and the modal closes.
  5. In a **new browser context**, attempt login with the candidate email and the **old password** (`Pa$$w0rd!`) — verify it is rejected with an invalid password error.
  6. In another **new browser context**, attempt login with the candidate email and the **new password** (`NewPa$$w0rd@1`) — verify it succeeds and redirects to `/adhoc-search`.
  7. In the admin context, delete the candidate user to clean up.
- **Verification Points**:
  - **Success Notification**: After saving, a success snackbar must be visible and the modal must close.
  - **Old Password Rejected**: Login with the old password must fail with an error message (no redirect to `/adhoc-search`).
  - **New Password Accepted**: Login with the new password must succeed and redirect to `/adhoc-search`.
  - **Cleanup**: Candidate is successfully deleted to restore seat count.

---

### TC_UM_023: Verify Admin user password can be changed and login verified
- **Description**: Verify the Change Password flow works correctly for an **Admin** role user — target a newly created and promoted Admin user.
- **Steps**:
  1. Invite and register a fresh candidate user (`ankitqa.iihglobal+...tc23...@gmail.com`) with the default password `Pa$$w0rd!`.
  2. Edit the candidate user's role to **Admin** and save.
  3. Open the action menu and click **Change Password**.
  4. Enter the new password (`AdminNew@Pa$$1`) in both fields and click **Save**.
  5. Verify the success notification and that the modal closes.
  6. In a **new browser context**, attempt login with the Admin's email and the **new password** — verify it succeeds and redirects to `/adhoc-search`.
  7. In the main admin context, delete the candidate Admin user to clean up.
- **Verification Points**:
  - **Success Notification**: A success snackbar is shown and the modal closes after saving.
  - **New Password Accepted**: The Admin can successfully log in with the new password (`/adhoc-search` redirect).
  - **Cleanup**: Admin user is deleted to restore seat count.

---

### TC_UM_024: Verify Change Password modal closes on Cancel without changing the password
- **Description**: Verify that dismissing the Change Password modal via the **Cancel** button or **Escape** key does not apply any password change — the original password continues to work.
- **Steps**:
  1. Invite and register a fresh candidate user (`ankitqa.iihglobal+...tc24...@gmail.com`) with the default password `Pa$$w0rd!`.
  2. Search for the candidate, open the action menu, and click **Change Password**.
  3. Enter a new password (`ShouldNotSave@1!`) in both fields — do **not** click Save.
  4. Click **Cancel** (or press Escape).
  5. Verify the modal closes without triggering a success notification.
  6. In a **new browser context**, attempt login with the candidate email and the **original password** (`Pa$$w0rd!`) — verify it succeeds and redirects to `/adhoc-search`.
  7. In the admin context, delete the candidate user to clean up.
- **Verification Points**:
  - **Modal Dismissed**: The modal must close without triggering any success snackbar.
  - **Password Unchanged**: The user must still be able to log in with their original password (`Pa$$w0rd!`) confirming no change was persisted.
  - **Cleanup**: User is deleted at the end of the test.

---

### TC_UM_025: Verify logged-in Admin user can change own password via Users Action menu and login with new password
- **Description**: Verify that a logged-in **Admin** user can change **their own password** from the Users management page via **Action → Change Password**, and that the new password works for login while the old one is rejected.
- **Steps**:
  1. Primary Admin invites a fresh user (`ankitqa.iihglobal+...tc25...@gmail.com`) with a random suffix and **Full Access** seat.
  2. Complete registration via invitation email and OTP verification → user becomes **Active**.
  3. Primary Admin promotes the new user to **Admin** role (required to access User Management).
  4. In a **new browser context**, log in as the newly promoted Admin candidate with the default password.
  5. Navigate to **Company Settings → Users** tab and search for own email row.
  6. Open the **Action menu** on own row — verify **"Change Password"** option is visible.
  7. Click **Change Password** — verify the modal opens.
  8. Fill in new password (`SelfNew@Pa$$1`) in both fields and click **Save**.
  9. Verify success notification shown and modal closes.
  10. In a **new browser context**, attempt login with the **old password** (`Pa$$w0rd!`) — verify it is rejected.
  11. In another **new browser context**, attempt login with the **new password** (`SelfNew@Pa$$1`) — verify it redirects to `/adhoc-search`.
  12. Primary Admin **deletes** the test user to restore seats and clean up.
- **Verification Points**:
  - **Change Password Visible for Own Row**: The "Change Password" action menu item must be visible when a logged-in Admin opens their own row's action menu.
  - **Modal Opens**: The Change Password modal must appear after clicking the menu item.
  - **Success Notification**: A success snackbar is displayed and the modal closes after saving.
  - **Old Password Rejected**: Login with the old password (`Pa$$w0rd!`) must fail with an error message and no dashboard redirect.
  - **New Password Accepted**: Login with the new password (`SelfNew@Pa$$1`) must succeed and redirect to `/adhoc-search`.
  - **Cleanup**: The test user is deleted at the end to restore available seat counts.
