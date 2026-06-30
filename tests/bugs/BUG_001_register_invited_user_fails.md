# Bug Report: BUG-001

## Title
Registering an invited user fails with "Company already exists with this name" when subscription details are not returned or after updating the pending user's email.

## Severity
High

## Affected Component
- Frontend Registration Page (`src/app/(auth)/register/page.tsx`)
- User Management Invitation / Change Email Flow

## Pre-conditions / Test Case
- **Test ID**: `TC_UM_017` (Change Email Feature - Verify editing email of Pending user resends invitation, invalidates old link, registers on new link, and checks seats)

## Steps to Reproduce
1. Log in as an Administrator.
2. Go to **Company Settings > Users** and invite a new member with a Full Access seat.
3. Edit the invited pending member's email address (Change Email feature). This sends a new invitation token/link to the updated email address.
4. Open the new invitation registration link in a new browser session.
5. Fill in the user's details (Name, Password, Confirm Password) and click the **Register** button.

## Observed Behavior
The registration page fails with the validation error:
**"Company already exists with this name"**

Because of this, the verification OTP is never sent to the new email address, and the registration process cannot be completed.

## Expected Behavior
The registration form should recognize that this is an invited member registration (based on the presence of the `invitationToken` in the URL query parameters). It should proceed with the invitation registration flow, send a verification code, and allow the user to complete their registration under the existing company.

## Root Cause Analysis
In `src/app/(auth)/register/page.tsx`, the frontend decides whether to use the member invitation registration flow or the new company registration flow by checking both the invitation token and the subscription object in the invitation data:

```typescript
// src/app/(auth)/register/page.tsx line 243
if (invitationToken && data?.subscription) {
  // invitation registration flow
} else {
  // regular/new company registration flow
}
```

When a pending user's email is updated via the Change Email feature:
1. The invitation API returns details for the token, but under this state or configuration, the `data.subscription` field is `null` or missing.
2. Because `data?.subscription` is falsy, the frontend falls back to the `else` block (the new company registration flow).
3. The new company registration flow dispatches the `sendOtp` action, which performs a check to ensure the company name does not already exist in the database.
4. Since the company already exists (the user is joining an existing company), the API returns the error: `"Company already exists with this name"`.

Additionally, the input field for entering the OTP code also fails to render because of a similar check:
```typescript
// src/app/(auth)/register/page.tsx line 775
{((invitationToken && data?.subscription && showOtpField) || (!invitationToken && selectedPlan && showOtpField)) && (
  // ... OTP Field Box ...
)}
```

## Recommended Fix (For Frontend Developers)
Modify `src/app/(auth)/register/page.tsx` to handle invited registrations based solely on the presence of `invitationToken`:

1. Change the registration flow check to:
   ```typescript
   if (invitationToken) {
   ```
2. Change the OTP field rendering condition to:
   ```typescript
   {((invitationToken && showOtpField) || (!invitationToken && selectedPlan && showOtpField)) && (
   ```
