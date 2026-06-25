# Bug Report: Promotion Code Fields Enable State Transition Failure

## Metadata
* **Bug ID**: BUG-UM-PROMO-001
* **Severity**: Medium
* **Component**: Auth / Registration (`src/app/(auth)/register/page.tsx` & `src/app/(auth)/registerNewCompany/page.tsx`)
* **Environment**: Local / Staging
* **Associated Test Spec**: [user_management.spec.js](file:///var/www/html/IIH-POC-WEB/tests/specs/user_management.spec.js)
* **Date Reported**: June 25, 2026

---

## Description
During the registration flow, after a user fills out the form and clicks the **"Verify Email"** button, the registration form transitions to the OTP (One-Time Password) verification step. 

While other form inputs (such as Company Name and Email) are properly disabled or made read-only at this stage, the **Promotion Code** input field and the **"Apply"** button remain fully active (enabled).

---

## Steps to Reproduce
1. Navigate to the subscription plan selection page.
2. Select any paid plan (e.g., **Expert**).
3. Fill out the registration form details (Company Name, Email, Username, Password).
4. Verify that the **Promotion Code** field is enabled and the **"Apply"** button is visible.
5. Click **"Verify Email"** to submit the form and trigger the OTP verification code email.
6. When the OTP input field appears, inspect the state of the **Promotion Code** text field and **"Apply"** button.

---

## Expected vs Actual Behavior

### Expected Behavior
Once the user clicks **"Verify Email"** and the OTP screen is showing, both the **Promotion Code** input field and the **"Apply"** button should become disabled / read-only to prevent any modifications post-submission.

### Actual Behavior
The **Promotion Code** input field remains enabled (`disabled` state is not updated), allowing users to type and attempt to apply a code. The **"Apply"** button also remains active.

---

## Automated Test Failure Output
```bash
1) [chromium] › tests/specs/user_management.spec.js:209:3 › User Management — Users Tab Tests › TC_UM_001: Verify Users tab renders all expected elements 

    Error: Promotion code input field should be disabled after Verify Email is clicked

    expect(locator).toBeDisabled() failed

    Locator:  locator('input[placeholder*="promo code" i]')
    Expected: disabled
    Received: enabled
    Timeout:  5000ms

    Call log:
      - Promotion code input field should be disabled after Verify Email is clicked with timeout 5000ms
      - waiting for locator('input[placeholder*="promo code" i]')
        14 × locator resolved to <input id="_r_19_" type="text" value="TESTCODE" aria-invalid="false" placeholder="Have a promo code?" class="MuiInputBase-input MuiOutlinedInput-input mui-1pk1fka"/>
           - unexpected value "enabled"


      107 |
      108 |     // ── Promotion Code field verification AFTER Verify Email click ─────────
    > 109 |     await expect(registerPage.promoCodeInput, 'Promotion code input field should be disabled after Verify Email is clicked').toBeDisabled();
          |                                                                                                                              ^
      110 |     await expect(registerPage.promoApplyButton, 'Apply button should be disabled after Verify Email is clicked').toBeDisabled();
```

---

## Recommended Solution
Update the disabled props for the promo code inputs in both `register/page.tsx` and `registerNewCompany/page.tsx` to include `showOtpField || showPaymentOptions`:

### `register/page.tsx`
```tsx
// Promo Code Input
disabled={validatingPromo || !!promoCodeId || showOtpField || showPaymentOptions}

// Apply Button
disabled={validatingPromo || !promoCode.trim() || showOtpField || showPaymentOptions}
```

### `registerNewCompany/page.tsx`
```tsx
// Promo Code Input
disabled={validatingPromo || !!promoCodeId || showOtpField}

// Apply Button
disabled={validatingPromo || !promoCode.trim() || showOtpField}
```
