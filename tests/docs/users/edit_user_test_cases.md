# E2E Test Documentation: Edit User & Seat Allocation Management

This document provides execution details, step-by-step logic, and verification points for the Edit User and Seat Allocation test suite: `edit_user.spec.js`.

---

## 🚀 Execution Details

### How to Run

```bash
# Run the full suite
npx playwright test tests/specs/users/edit_user.spec.js

# Run in headed mode
npx playwright test tests/specs/users/edit_user.spec.js --headed

# Run a specific test case (e.g., Seat Type changes)
npx playwright test tests/specs/users/edit_user.spec.js -g "TC_UM_016"
```

### Pre-conditions
- Runs against an existing registered admin account (`ankitqa.iihglobal+nt18x@gmail.com`).
- Assumes the existence of active candidate users under the tenant for role-switching and seat-reallocation tests.

---

## 📋 Test Cases & Verification Points

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
  - **Edit Modal Inputs**: Opening the edit modal for the logged-in admin must show the fields **Role**, **Email**, **Status**, **Seat Type**, and **Renew Status** disabled.

---

### TC_UM_009: Verify Admin + Full Access user can be set as Primary Admin
- **Description**: Verify that an active Administrator user with a Full Access seat type can be promoted to Primary Admin.
- **Steps**:
  1. Find or create an active Admin user with a Full Access seat type.
  2. Open the Action menu for that row and click **Set as Primary**.
  3. Wait for the success snackbar notification.
  4. Clear the search and locate the promoted row.
  5. Verify the Primary chip appears on the promoted user's row.
  6. **Restoration**: Log out of the current admin, log in as the newly promoted Primary Admin, locate the original admin, and set them back as the Primary Admin. Finally, demote the candidate back to User.
- **Verification Points**:
  - **"Set as Primary" Menu Option**: Opening the action menu on a qualifying Admin row must show the `"Set as Primary"` option enabled.
  - **Success Toast**: Clicking this option must show a success snackbar/alert.
  - **Primary Badge Migration**: The `"Primary"` chip must migrate from the logged-in admin's row to the promoted Admin's row in the Users table.

---

### TC_UM_010: Verify Admin + ReadOnly user cannot be set as Primary Admin
- **Description**: Verify that an Administrator with a Read Only seat type is blocked from being set as the Primary Admin.
- **Steps**:
  1. Find or create an Admin user with a Read Only seat type.
  2. Locate the row and click the action button.
  3. Inspect the opacity and styling of the **Set as Primary** option.
  4. Click the option and verify no changes take place.
  5. Demote the candidate back to User role to clean up.
- **Verification Points**:
  - **Disabled Menu Option**: The `"Set as Primary"` option inside the action menu for the Read-Only Admin row must be visually disabled (opacity < 1).
  - **Constraint Enforcement**: Clicking this disabled option must have no effect, and the `"Primary"` chip must not migrate.

---

### TC_UM_011: Verify User role cannot be set as Primary Admin (seat type irrelevant)
- **Description**: Verify that any member with a `User` role (regardless of their seat type) does not have the option to be set as the Primary Admin.
- **Steps**:
  1. Locate or create a candidate user with the `User` role.
  2. Open the Action menu (`...`) on that row.
  3. Verify that the **Set as Primary** option is hidden.
- **Verification Points**:
  - **Menu Option Hidden**: The `"Set as Primary"` option must be completely absent from the action menu of any row with the role `User`.

---

### TC_UM_013: Verify changing user Renew Status updates and reflects in user listing table
- **Description**: Verify that changing a user's Renew Status toggles properly and updates immediately in the data grid.
- **Steps**:
  1. Find an active User candidate and record their current Renew status.
  2. Edit the user and toggle the Renew status selection.
  3. Save the modal changes and wait for success confirmation.
  4. Search for the candidate again and verify their status column updates.
  5. Restore the user's original Renew status.
- **Verification Points**:
  - **State Transition**: Editing the user and toggling the Renew dropdown (e.g., from `Renewable` to `Non Renewable`) must display a success snackbar.
  - **Table Update**: The cell in the Renew status column for that user must immediately display the new state.

---

### TC_UM_014 & TC_UM_015: Verify User/Admin status changes Active <> Inactive affect login permissions and seat counts
- **Description**: Verify that toggling a user's status to `Inactive` blocks their login capability, releases their subscription seat, and that toggling them back to `Active` restores login capability and re-occupies the seat.
- **Steps**:
  1. Find an active User/Admin role candidate.
  2. Navigate to the **Subscription** tab and record the initial available seat count of their seat type.
  3. Switch back to the **Users** tab, edit the candidate, and set status to **Inactive**.
  4. Verify that **Seat Type** and **Renew Status** fields are disabled in the modal.
  5. Click Save, and verify the row status displays **Inactive**.
  6. Navigate to the **Subscription** tab and verify the available seat count has **increased** by 1.
  7. In a new browser context, verify the deactivated user is blocked from logging in (displays `"Inactive account. Please contact admin"`).
  8. In the admin context, edit the user and reactivate them to **Active** (restoring their seat type and renew status).
  9. Verify the status in the table returns to **Active**.
  10. Navigate to the **Subscription** tab and verify the available seat count has **decreased** back to its initial value.
  11. In the other context, verify that the reactivated user is now permitted to log in.
- **Verification Points**:
  - **Seat Deallocation (Deactivation)**:
    - Change status from `Active` to `Inactive`.
    - **Form Restrictions**: When `Inactive` is selected in the Edit modal, the **Seat Type** and **Renew Status** inputs must become disabled.
    - **Subscription Seats**: The available seat count for the user's seat type (Full Access or Read Only) on the Subscription tab must **increase** by 1.
  - **Login Block**: Attempting to log in as the deactivated user must be rejected with the error: `"Inactive account. Please contact admin"`.
  - **Seat Re-allocation (Re-activation)**:
    - Change status back to `Active`.
    - Select their original Seat Type and Renew status.
    - **Subscription Seats**: The available seat count for the user's seat type on the Subscription tab must **decrease** by 1 (restoring the original available seats).
  - **Login Permitted**: Attempting to log in as the reactivated user must redirect successfully to `/adhoc-search`.

---

### TC_UM_016: Verify changing user seat type affects available seat counts of both types
- **Description**: Verify that modifying a user's seat type from `Full Access` to `Read Only` (or vice-versa) updates the remaining available counts of both subscription seat categories.
- **Steps**:
  1. Navigate to the **Subscription** tab and record the initial available Full Access and Read-Only seat counts.
  2. Switch back to the **Users** tab.
  3. Find an active candidate member (excluding the logged-in admin).
  4. Search for the candidate and note their initial seat type.
  5. Edit the user and toggle their seat type to the opposite option (e.g., from `Full Access` to `Read Only` or vice-versa) and click Save.
  6. Navigate to the **Subscription** tab.
  7. Verify that the available Full Access seat count and Read-Only seat count are updated correctly (one increases by 1, and the other decreases by 1).
  8. Switch back to the **Users** tab, edit the candidate user, and restore their original seat type.
  9. Navigate back to the **Subscription** tab and verify that the available seat counts return to their initial values.
- **Verification Points**:
  - **Full Access to Read Only Conversion**:
    - Updates a candidate user's seat type from `Full Access` to `Read Only`.
    - **Subscription Seats Impact**: The available Full Access seat count must **increase** by 1, and the available Read-Only seat count must **decrease** by 1.
  - **Read Only to Full Access Restoration**:
    - Restores the candidate user's seat type back to `Full Access`.
    - **Subscription Seats Impact**: The available Full Access seat count must **decrease** by 1, and the available Read-Only seat count must **increase** by 1 (returning to their initial counts).

---

### TC_UM_017: Change Email Feature - Verify editing email of Pending user resends invitation, invalidates old link, registers on new link, and checks seats
- **Description**: Verify that updating the email address of a user in a "Pending" status triggers a new invitation email to the updated email address, invalidates the old link, permits successful registration on the new link, updates seat counts, and that deleting the user restores the seat counts.
- **Steps**:
  1. Navigate to the **Subscription** tab and record the initial available Full Access and Read-Only seat counts.
  2. Switch back to the **Users** tab.
  3. Click **Invite Member**, enter a new candidate email, and click Send.
  4. Wait for the invitation email to arrive and extract the link (this will serve as the "old invitation link").
  5. Search for the newly invited pending user, open the action menu, and select **Edit**.
  6. Enter a new, unique email address in the Email field and click Save.
  7. Verify that the table grid immediately updates and displays the new email address for the pending user.
  8. In a new browser context, navigate to the old invitation link.
  9. Attempt to register by filling out the form, submitting to receive the OTP, entering the OTP, and clicking Register. Verify that registration fails with an error and does not redirect to the dashboard. Close the browser context.
  10. Wait for a new invitation email to arrive at the updated email address and extract the new registration link.
  11. In a new browser context, navigate to the new invitation link and complete registration (fill form, submit, retrieve OTP sent to updated email, enter OTP, and register). Verify redirection to the `/adhoc-search` dashboard. Close the browser context.
  12. Navigate to the **Subscription** tab and verify the available Full Access seat count has decreased by 1.
  13. Switch back to the **Users** tab, search for the registered user, open the action menu, and click **Delete**. Confirm the deletion.
  14. Navigate to the **Subscription** tab and verify the available Full Access seat count returns to its initial value.
- **Verification Points**:
  - **Grid Update**: The user's email address in the grid must update to the new email address.
  - **Old Link Invalidation**: Submitting registration using the old invitation link must fail/be rejected by the backend, displaying an error and preventing dashboard redirection.
  - **New Link Success**: Registering via the new invitation link with the updated email must succeed, redirecting the user to `/adhoc-search`.
  - **Seat Count decrement**: The available Full Access seat count on the Subscription page must decrease by 1 after the new user successfully registers.
  - **User Deletion**: The user must be successfully deleted from the Users management grid.
  - **Seat Count restoration**: The available Full Access seat count must increase by 1 (restoring the original available seats) after the registered user is deleted.
