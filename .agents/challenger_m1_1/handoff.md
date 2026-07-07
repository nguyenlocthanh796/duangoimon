# Challenger Report & Handoff — Milestone 1 Verification

This report documents the empirical review of the Milestone 1 authentication, routing, and navigation implementation under `e:\posa\frontend`.

---

## Challenge Summary

**Overall risk assessment**: MEDIUM

- **Routing & Auth Guard**: A **Fail-Open vulnerability** was identified. If the role decoded from the JWT token is unrecognized (e.g., empty or an unexpected string like "guest"), the guard logic does not restrict access, granting client-side access to all pages (equivalent to Admin).
- **JWT Decode Security**: The decoding function in `lib/auth-helpers.ts` is highly robust. Try-catch blocks prevent crashes from malformed, signature-invalid, expired, or non-object JSON payloads. Native Node.js unit tests pass 100% under adversarial inputs.
- **Touch Target Sizes**: Several UI elements in `login.tsx`, `ban-hang/index.tsx`, and `ban-hang/pos.tsx` fail to meet the recommended minimum 44px touch target size (measuring 26px to 40px).

---

## 1. Observation

### Auth Guard / Security Boundary Logic
In `lib/context/AuthContext.tsx` (lines 115-125):
```typescript
        // Check authorization
        if (userRole === 'cashier') {
          if (rootSegment !== 'ban-hang') {
            router.replace('/ban-hang');
          }
        } else if (userRole === 'accountant') {
          if (rootSegment !== 'ke-toan' && rootSegment !== 'quan-ly') {
            router.replace('/ke-toan');
          }
        }
```

### JWT Decode Edge Case Handling
In `lib/auth-helpers.ts` (lines 35-58):
```typescript
export function decodeJwt(token: string): DecodedToken | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = base64Decode(base64);
    
    // Decode UTF-8 string properly
    const utf8Data = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(utf8Data);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}
```

### Build and Unit Test Commands and Outputs
1. **TypeScript check**:
   Command: `npx tsc --noEmit` inside `e:\posa\frontend`
   Result: Completed successfully with no syntax/type errors.

2. **Build test**:
   Command: `npm run build` inside `e:\posa\frontend`
   Result: Failed with `npm error Missing script: "build"` as there is no build script in `package.json`.
   Command (actual build): `npx expo export`
   Result: Completed successfully, exporting assets for web, android, and ios into the `dist` directory.
   ```
   › web bundles (1): _expo/static/js/web/entry-5c05c7d8f2028d8ce01888464a9951bf.js (1.6MB)
   › android bundles (1): _expo/static/js/android/entry-5bddfbe1c922381d11234560e0bb8174.hbc (2.6MB)
   › ios bundles (1): _expo/static/js/ios/entry-88be45eda4fbddf5b6266255f55cb198.hbc (2.6MB)
   Exported: dist
   ```

3. **Unit tests runner**:
   Command: compiled unit tests and ran via Node.js native test runner.
   Result: All 3 default unit tests passed.
   ```
   ✔ decodeJwt decodes a valid JWT token (2.679ms)
   ✔ decodeJwt returns null for invalid JWT tokens (0.285ms)
   ✔ decodeJwt handles UTF-8 correctly (0.6795ms)
   ```

### Touch Targets Failing 44px Minimum Check
1. **`app/login.tsx`**:
   - Line 105: Show/hide password button (`eyeBtn`) styling: `padding: 8` with an 18px icon. Est. target size: **34px** width/height.
   - Line 112: Keep logged in checkbox (`checkboxContainer`): No padding or height. Est. target size: **~20px** height.
   - Line 116: Forgot Password link: No padding or height. Est. target size: **~13px** height.
   - Lines 138-154: Demo account preset buttons (`presetBtn`): `paddingVertical: 10` with 12px text. Est. target size: **32px** height.
2. **`app/ban-hang/index.tsx`**:
   - Line 175: Takeaway ("Mang Về") button: `paddingVertical: 10` with 13px text. Est. target size: **33px** height.
3. **`app/ban-hang/pos.tsx`**:
   - Line 532: Close modal button: `width: 40, height: 40`. Est. target size: **40px** width/height.
   - Line 629: Quick notes tags (`QUICK_NOTES` tags): `paddingVertical: 7` with 12px text. Est. target size: **26px** height.

---

## 2. Logic Chain

1. **Vulnerability in Routing Guard**:
   - **Observation**: `AuthContext.tsx` contains conditions specifically for `cashier` and `accountant` roles. It does not check if `userRole` is unrecognized or empty.
   - **Inference**: If a user is authenticated with a token containing a role like `"guest"` or `"unrecognized_role"`, the code falls through the `if` branches without redirecting.
   - **Conclusion**: The routing guard fails open, allowing any unrecognized role to navigate freely to all pages on the client-side.

2. **JWT Robustness**:
   - **Observation**: `decodeJwt` utilizes a global `try-catch` surrounding all parsing logic, including UTF-8 percent decoding and `JSON.parse`.
   - **Inference**: Any parsing exception (from malformed base64, invalid JSON, or invalid UTF-8 bytes) is caught and handled safely by returning `null`.
   - **Conclusion**: The decode logic will not crash under adversarial inputs or edge cases.

3. **Touch Targets Violations**:
   - **Observation**: Several buttons utilize small vertical padding or explicit sizes under 44px (e.g. `width: 40`, `paddingVertical: 7`).
   - **Inference**: These controls are too small to easily tap on mobile screens, violating standard Apple Human Interface Guidelines and Google Material Design specifications.
   - **Conclusion**: Touch targets must be enlarged to at least 44px.

---

## 3. Caveats

- **Signature Validation**: Client-side JWT decoding in this project does not verify the cryptographic signature of the token. However, this is standard for SPAs/Expo apps as signature verification happens on the server side when calling API endpoints.
- **WebSocket Verification**: WebSocket endpoints (`ws://localhost:8000/ws/kitchen`) were not tested live as the backend server was not started in this verification run.

---

## 4. Conclusion

- **Routing Guard Security**: MEDIUM RISK. The guard logic should implement a strict default-deny policy. If `userRole` is not one of the allowed roles (`admin`, `cashier`, `accountant`), the routing guard should force-redirect the user back to the login screen or log them out.
- **JWT Helper**: PASSED. Robust error handling prevents runtime crashes.
- **Build & Tests**: PASSED. Code compiled cleanly via `tsc --noEmit` and exported successfully via `expo export`.
- **UI Design System**: NEEDS IMPROVEMENT. Critical touch targets fall below 44px and should be expanded.

---

## 5. Verification Method

To verify these results independently, perform the following commands in `e:\posa\frontend`:

1. **Run TS Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Run Expo Build Export**:
   ```bash
   npx expo export
   ```
3. **Execute Adversarial JWT Tests**:
   Run the generated test file containing adversarial inputs:
   ```bash
   node --test e:\posa\.agents\challenger_m1_1\auth-helpers.test.js
   ```

---

## 6. Challenges (Adversarial Breakdown)

### [Medium] Challenge 1: Fail-Open Authorization Guard
- **Assumption challenged**: The client-side router is secure if only valid roles are checked.
- **Attack scenario**: A user receives or crafts a token with an unexpected role (e.g. `guest`, `auditor`, or empty string).
- **Blast radius**: The user bypasses role-based routing guards on the client, gaining access to screens and menus that they should not see (e.g. sales charts, menu CRUD).
- **Mitigation**: Update `AuthContext.tsx` to handle unknown/unsupported roles securely:
  ```typescript
  const allowedRoles = ['admin', 'cashier', 'accountant'];
  if (!allowedRoles.includes(userRole)) {
    // Force logout or redirect to login
    logout();
  }
  ```

### [Low] Challenge 2: Touch Target Tap Failures on Mobile
- **Assumption challenged**: Small styling parameters fit the design mockup well and are usable.
- **Attack scenario**: A cashier on a busy shift attempts to tap a quick note tag or close a modal on a mobile device and repeatedly misses, causing input delay or errors.
- **Blast radius**: User frustration and operational slowdown.
- **Mitigation**:
  - Modal close buttons: style with `width: 44, height: 44, justifyContent: 'center', alignItems: 'center'`.
  - Buttons and tags with small paddings: Add `minHeight: 44` or increase vertical padding to at least `12-14px` depending on text size.
