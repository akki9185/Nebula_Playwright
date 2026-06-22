# E2E Test Documentation: Adhoc Search Page Functional & Restriction Verification

This document consolidates all E2E test cases, validation restrictions, and functionality verified on the **Adhoc Search** page.

---

## 📂 Test Files Reference
* **Unpaid/Expert Registration Flow Spec:** [full_registration_expert_flow.spec.js](file:///var/www/html/IIH-POC-WEB/tests/specs/full_registration_expert_flow.spec.js)
* **Paid/Functional Search Flow Spec:** [adhoc_search.spec.js](file:///var/www/html/IIH-POC-WEB/tests/specs/adhoc_search.spec.js)
* **Test CSV File:** `tests/data/adhocUpload.csv`

---

## 🔍 PART 1: Unpaid Subscription Restrictions (Expert Plan)

These scenarios verify the behavior of the Adhoc Search page when a user has an **Unpaid** status (having selected invoice payment and not paid yet).

### Scenario 1.1: UI & Search Restrictions
1. **Warning Banner:**
   - Navigates to `/adhoc-search`.
   - Asserts that the warning banner: `"At least one data category license is needed to perform query."` is visible.
2. **Search Disablement:**
   - Asserts the main search button is disabled initially.
   - Fills in search input with `"John Doe"`.
   - Asserts that the search button remains disabled even with valid character length.

### Scenario 1.2: CSV Upload Restrictions
1. **Upload Initiation:**
   - Clicks the CSV Upload icon (`img[alt="Upload csv icons"]`).
   - Uploads the mock CSV file: `tests/data/adhocUpload.csv`.
2. **Confirm Button Blocked:**
   - Asserts that the **Confirm** button in the popup modal is **disabled** (since the user has no active licenses/unpaid state).
3. **Re-upload Flow:**
   - Clicks the `"Uploap Again"` option in the popup.
   - Uploads the same mock CSV file.
   - Asserts that the **Confirm** button remains **disabled**.
   - Clicks **Cancel** to exit the modal.

---

## 🔍 PART 2: Paid Subscription Functionality & Validations

These scenarios verify the positive and negative validation paths on the Adhoc Search page when logged in as a licensed user.

* **Credentials:** `ankitqa.iihglobal+ex19069@gmail.com` / `Pa$$w0rd!`

### Scenario 2.1: Fuzzy Search & Slider Visibility/Interaction (Basic & Advanced Search)
1. **Initial State Check:**
   - Asserts that both the slider and the `"Minimum Match Level (%)"` label are hidden by default.
2. **Checkbox Interaction:**
   - Clicks the `"Fuzzy search"` checkbox.
   - Asserts that the slider and label become visible.
3. **Slider Value Interaction (Aria-valuenow Check):**
   - Retrieves the initial slider value (50).
   - Simulates keyboard input by focusing on the slider and pressing `ArrowRight` twice.
   - Asserts that the slider's value is dynamically updated (changes to 52).
4. **Checkbox Unchecking:**
   - Unchecks the `"Fuzzy search"` checkbox.
   - Asserts that the slider and label become hidden again.

### Scenario 2.2: Basic Search Character Limits
1. **Initial State:**
   - Asserts the search button is disabled initially.
2. **Min Character Validation:**
   - Types `"J"` (1 character).
   - Asserts that the warning `"Search term must be at least 2 characters"` is visible.
   - Asserts that the search button is disabled.
3. **Successful Search:**
   - Types `"John Doe"`.
   - Asserts that the validation error is hidden.
   - Asserts that the search button is enabled.
   - Clicks search and verifies the search results table/grid is visible.

### Scenario 2.2: CSV Upload Verification
1. **Upload Flow:**
   - Reloads the page to clear the search view state.
   - Clicks the CSV Upload icon.
   - Uploads `tests/data/adhocUpload.csv`.
2. **Confirm Enabled:**
   - Asserts that the **Confirm** button is **enabled** for the paid company.
3. **Execution:**
   - Clicks **Confirm**.
   - Asserts that the search results container is displayed successfully.

### Scenario 2.3: Advanced Search Validation & Field Combinations

#### A. Single Field Searches (Allowed)
* **Name Only:**
  - Fills Name with `"John Doe"`. Asserts search button is enabled.
  - Clicks **Reset** and verifies Name field is cleared.
* **Identification Only:**
  - Fills Identification with `"12345"`. Asserts search button is enabled.
  - Clicks **Reset** and verifies Identification field is cleared.
* **Address Only:**
  - Fills Address with `"123 Street"`. Asserts search button is enabled.
  - Clicks **Reset** and verifies Address field is cleared.

#### B. Country-Only Restriction (Blocked)
* **Country Only:**
  - Selects `"United States"` from the State/Country dropdown.
  - Leaves all other fields blank.
  - Asserts warning message: `"Country cannot be the only search field. Please provide at least one other field (Name, Identification, or Address)."` is visible.
  - Asserts that the search button is disabled.

#### C. Country Combinations (Allowed)
* **Country + Name:**
  - State/Country: `"United States"`, Name: `"John Doe"`.
  - Asserts search button is enabled.
* **Country + Identification:**
  - State/Country: `"United States"`, Identification: `"12345"`.
  - Asserts search button is enabled.
* **Country + Address:**
  - State/Country: `"United States"`, Address: `"123 Street"`.
  - Asserts search button is enabled.

#### D. Multi-Field Combination Search
* **Steps:**
  - Populates all four fields (Name: `"Jane Doe"`, ID: `"12345"`, Address: `"123 Street"`, State/Country: `"United States"`).
  - Asserts that the search button is enabled.
  - Clicks search and asserts that the search results load successfully.
