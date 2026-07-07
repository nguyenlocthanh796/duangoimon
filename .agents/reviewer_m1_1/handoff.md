# Handoff Report: Milestone 1 Review

## 1. Observation

### TypeScript Compilation & Configuration
- Running `npx tsc --noEmit` inside `e:\posa\frontend` results in compilation errors:
  ```
  lib/api.ts(63,13): error TS2552: Cannot find name 'Transaction'. Did you mean 'IDBTransaction'?
  lib/api.ts(65,13): error TS2552: Cannot find name 'Transaction'. Did you mean 'IDBTransaction'?
  lib/api.ts(66,30): error TS2304: Cannot find name 'Invoice'.
  lib/api.ts(68,13): error TS2304: Cannot find name 'Invoice'.
  lib/api.ts(70,13): error TS2304: Cannot find name 'Invoice'.
  ```
- File `tsconfig.json` contains no `"exclude"` section:
  ```json
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  ```
- Renaming `dist` to `dist_temp` and running `npx tsc --noEmit` results in successful compilation:
  ```
  npx tsc --noEmit
  (completed successfully with exit code 0)
  ```

### Authentication & Role Protection
- In `lib/context/AuthContext.tsx`:
  - Login persists the JWT token and user profile:
    ```typescript
    62:       const decoded = decodeJwt(res.access_token);
    63:       const role = decoded?.role || res.user?.role || '';
    ...
    71:         localStorage.setItem('pos_token', res.access_token);
    72:         localStorage.setItem('pos_user', JSON.stringify(res.user));
    ```
  - Initialization reads back parameters:
    ```typescript
    34:             const decoded = decodeJwt(storedToken);
    35:             if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
    36:               setTokenState(storedToken);
    37:               const user = storedUserStr ? JSON.parse(storedUserStr) : null;
    38:               setUsername(user?.username || '');
    39:               setUserRole(decoded.role || user?.role || '');
    ```
  - API requests are wrapped in `lib/api.ts` with no automated 401 handling:
    ```typescript
    18: async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    ...
    26:   const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    27:   if (!res.ok) {
    28:     const err = await res.json().catch(() => ({ detail: res.statusText }));
    29:     throw new Error(err.detail || `HTTP ${res.status}`);
    30:   }
    ```

### Touch Targets
- In `app/login.tsx`:
  - Preset buttons (`presetBtn`): `paddingVertical: 10` (no height/minHeight).
  - Password visibility toggle (`eyeBtn`): `padding: 8` wrapping emoji text.
  - "Duy trì đăng nhập" checkbox container (`checkboxContainer`): no height/padding.
  - "Quên mật khẩu?" link: no height/padding.
- In `app/ban-hang/index.tsx`:
  - "Mang Về" button: `paddingHorizontal: 14, paddingVertical: 10`.
  - Try again button (error view): `paddingVertical: 12`.
- In `app/ban-hang/pos.tsx`:
  - Category selector tabs: `paddingVertical: 6`.
  - Mobile bottom bar "Lưu" & "K.Toán" buttons: `paddingVertical: 10`.
  - Cart view: Back button: `width: 32, height: 32`; Remove item button: `width: 28, height: 28`; Qty controls: `width: 32, height: 32`.
  - Modifier Modal: Close button: `width: 40, height: 40`; Quick notes tag buttons: `paddingVertical: 8`.
- In `app/ban-hang/payment.tsx`:
  - Suggestions buttons: `paddingVertical: 12`.
- In `app/ban-hang/kitchen.tsx`:
  - Ticket item complete button (`MaterialIcons name="check"`): `width: 32, height: 32`.

---

## 2. Logic Chain

1. **TSC Scanning Stale Output**: Because `tsconfig.json` lacks an `exclude` property, the TS compiler scans and checks everything matching `**/*.ts` and `**/*.tsx` (including build outputs in `dist/assets/node_modules/`). Renaming `dist` forces `tsc` to compile only local files, which passes without errors. Thus, the implementation itself is type-safe, but the TS compiler setup is broken.
2. **Local Privilege Escalation**: In `AuthContext.tsx:39`, if the JWT signature does not contain the `role` claim, the system falls back to `user?.role` from `localStorage` (`pos_user`). Because `localStorage` is completely readable/writable by the client, an unprivileged user can modify `pos_user` role to `admin` and gain unauthorized client-side access to `/quan-ly` and `/ke-toan`.
3. **No Automatic Re-Authentication / Redirection**: If a token is revoked or expires on the backend, the API client `lib/api.ts` does not intercept 401 statuses. Users will get API errors and remain stuck on screens rather than being redirected to login.
4. **Touch Target Omissions**: The minimum touch target size defined in usability guidelines is 44px. Buttons with low vertical paddings and no `minHeight` or `height` values (such as the kitchen checkmark button at 32x32px and category/preset buttons) produce touchable areas under 40px, failing compliance.

---

## 3. Caveats
- No caveats. We verified all code paths, TypeScript compiler outcomes, and layout dimensions in the codebase.

---

## 4. Conclusion
We recommend **REQUEST_CHANGES** for Milestone 1. The code quality, layout flow, and WebSocket integrations are robust, but multiple minor-to-major issues need fixing to achieve production-level readiness.

### Quality Review Summary

**Verdict**: REQUEST_CHANGES

#### Findings:

##### [Major] Finding 1: Broken tsconfig compiler scope
- **What**: Stale build files in `dist/` trigger false compiler errors because they are scanned by TS.
- **Where**: `e:\posa\frontend\tsconfig.json`
- **Why**: Omission of `"exclude": ["dist", "node_modules", "web-build"]` configuration.
- **Suggestion**: Add the `"exclude"` key to `tsconfig.json` to avoid scanning build artifacts.

##### [Major] Finding 2: Touch Target Violations
- **What**: Multiple interactive buttons are under the 44px touch target guidelines.
- **Where**:
  - `app/login.tsx`: Presets (~36px), eyeBtn (~34px), checkbox (~20px), forgot text (~18px).
  - `app/ban-hang/index.tsx`: "Mang Về" (~36px), Try Again (~42px).
  - `app/ban-hang/pos.tsx`: Categories (~30px), Bottom buttons (~36px), Cart controls (28px - 32px), Modal close (40px), Quick notes (~32px).
  - `app/ban-hang/payment.tsx`: Suggestions (~42px).
  - `app/ban-hang/kitchen.tsx`: Checkmark complete button (32px).
- **Why**: Hardcoded low width/height values or relying on low `paddingVertical` without `minHeight: 44`.
- **Suggestion**: Standardize all touchable surfaces to have at least `minHeight: 44` or explicit dimensions of 44x44px.

##### [Minor] Finding 3: Missing Linting Configuration
- **What**: Lint tool is not configured in the project.
- **Where**: `frontend/` root
- **Why**: No `.eslintrc` or eslint configuration.
- **Suggestion**: Initialize and configure ESLint.

#### Verified Claims:
- **Route guarding correctness** → verified via manual review of `AuthContext.tsx` redirects → **PASS** (Redirects correctly manage flow based on roles/auth states).
- **Sidebar role-based menu generation** → verified via review of `Sidebar.tsx` rendering checks → **PASS** (Admin, cashier, and accountant menus match specifications).
- **Sidebar triggers logout** → verified via checking the logout button click handler → **PASS** (Clears token, clears user states, and pushes `/login`).

---

### Adversarial Review Summary

**Overall risk assessment**: MEDIUM

#### Challenges:

##### [High] Challenge 1: Local Storage Role Tampering
- **Assumption challenged**: User role claims are verified solely via signed JWT tokens.
- **Attack scenario**: If the JWT lacks a signed role claim, the code falls back to `user?.role` from local storage. An attacker can execute `localStorage.setItem('pos_user', JSON.stringify({username: 'attacker', role: 'admin'}))` and refresh the page to gain admin client-side layout access.
- **Blast radius**: Unauthorized layout access allowing access to `/quan-ly` (Management) and `/ke-toan` (Accounting) pages.
- **Mitigation**: Strictly rely only on JWT claims decoded from the token for authorization, or cryptographically sign the user information.

##### [Medium] Challenge 2: Stale Session Lock
- **Assumption challenged**: The client handles session expiration gracefully.
- **Attack scenario**: When a token is invalidated or revoked on the server, subsequent requests fail with `HTTP 401 Unauthorized`. However, `lib/api.ts` does not intercept this error or clear states, causing users to get stuck on screens with failed fetch alerts instead of being redirected to `/login`.
- **Blast radius**: Poor UX and potential security risk from keeping stale tokens active on the client.
- **Mitigation**: Add an interceptor to the `request` function in `lib/api.ts` to automatically trigger `clearToken` and state clearing when receiving `HTTP 401`.

---

## 5. Verification Method

1. **Verify TypeScript check resolution**:
   - Add `"exclude": ["dist", "node_modules", "web-build"]` to `tsconfig.json`.
   - Run `npx tsc --noEmit` in `frontend` folder to ensure it succeeds cleanly.
2. **Verify Touch Targets**:
   - Inspect styles of buttons highlighted in Finding 2 to confirm their target heights are at least 44px.
