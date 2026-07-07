# Security Handoff Report — Challenger M1.2 Auth Guard Security

This report challenges the security implementation of the Milestone 1 auth route guard in `e:\posa\frontend`.

## 1. Observation

### A. Auth Context & Route Guard Implementation (`lib/context/AuthContext.tsx`)
In `lib/context/AuthContext.tsx`, we observe the following route guard check inside `useEffect` (lines 95–127):
```typescript
  // Route guard
  useEffect(() => {
    if (!isInitialized) return;

    const rootSegment = segments[0];

    if (!token) {
      if (rootSegment !== 'login') {
        router.replace('/login');
      }
    } else {
      if (rootSegment === 'login' || !rootSegment) {
        // Redirect to default route
        if (userRole === 'admin') {
          router.replace('/quan-ly');
        } else if (userRole === 'cashier') {
          router.replace('/ban-hang');
        } else if (userRole === 'accountant') {
          router.replace('/ke-toan');
        }
      } else {
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
      }
    }
  }, [isInitialized, token, userRole, segments]);
```

### B. Pre-initialization Render State
The `AuthProvider` renders its children unconditionally:
```typescript
  return (
    <AuthContext.Provider value={{ token, username, userRole, login, logout, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
```
During the initial render, `isInitialized` is `false`, and `token` is `null`. The route guard `useEffect` returns early because of:
```typescript
if (!isInitialized) return;
```

### C. Available User Roles in System UI (`app/quan-ly/users.tsx`)
In `app/quan-ly/users.tsx`, the role chip options allowed during user creation are:
```typescript
{['cashier', 'kitchen', 'manager', 'accountant'].map(r => ( ...
```
And role translations in UI are defined as:
```typescript
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', manager: 'Quản lý', cashier: 'Thu ngân', kitchen: 'Bếp', accountant: 'Kế toán' };
```

### D. Automated Security Test Harness execution (`lib/__tests__/security-challenge.test.ts`)
We created and executed a test suite covering security logic, role bypass, automatic login hacks, and token leaks:
```bash
npx tsx --test lib/__tests__/security-challenge.test.ts
```
Output:
```
✔ Route Guard: Unauthenticated user is redirected to /login from nested paths (3.4053ms)
✔ Route Guard: Cashier is restricted strictly to /ban-hang (0.4101ms)
✔ Route Guard: Accountant can access /ke-toan and /quan-ly (0.4757ms)
✔ Route Guard Vulnerability: manager and kitchen roles are not handled, causing navigation lock and bypass (0.3584ms)
✔ Security Scan: No automatic login hacks exist in source files (33.4788ms)
✔ Security Scan: Token leakage via console.log or insecure exports (17.5536ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
```

---

## 2. Logic Chain

From the observations, the following logical reasoning applies:

1. **Unauthenticated Access (Verification #1)**:
   - When a user has `token = null` and navigates to nested routes (e.g. `rootSegment === 'quan-ly'` or `'ke-toan'`), the guard checks `!token` and redirects to `/login` using `router.replace('/login')` (Observed in Section 1.A).
   - *However*, because the `AuthProvider` immediately renders `{children}` on mount before `isInitialized` becomes true (Observed in Section 1.B), the requested screen mounts and executes its lifecycle hooks.
   - For example, `app/quan-ly/index.tsx` immediately executes `api.get('/quan-ly/dashboard')` on mount (Observed in `app/quan-ly/index.tsx`). This triggers an API call with no token before the redirect occurs, resulting in a flash of unauthorized layout and a 401 API call.

2. **Role Bypass and Navigation Stuck (Verification #2)**:
   - While the guard correctly restricts `cashier` to `/ban-hang` and permits `accountant` to access `/ke-toan` and `/quan-ly` (Observed in Section 1.A), it fails to handle other defined roles.
   - The roles `manager` and `kitchen` are valid roles in the database and UI (Observed in Section 1.C).
   - If a user logs in with role `manager` or `kitchen`, they have a valid token (`!token` is false) and are redirected to `/login` or `/`. In the guard, there is no redirection target for `manager` or `kitchen` (the redirect only checks `admin`, `cashier`, `accountant`). Thus, **they remain stuck on `/login` or a blank page**.
   - If a `kitchen` user manually navigates to `/quan-ly` or `/ke-toan`, the guard block for `cashier` doesn't match, and the block for `accountant` doesn't match. No check blocks a `kitchen` role, so **the `kitchen` user bypasses the route guard and accesses the management screens on the client side**.
   - Furthermore, client-side JWT decoding (`decodeJwt`) doesn't verify the cryptographic signature of the token (which is standard for SPAs since the secret key is on the backend). A user can modify the token in `localStorage` to state `role: 'admin'`, causing the router to let them bypass any frontend path locks. Backend verification of JWT signatures is the true line of defense.

3. **Automatic Login Hack (Verification #3)**:
   - The security scan of all source files in `e:\posa\frontend` verified that no auto-login hacks, hardcoded tokens, or dev bypasses are in the codebase.
   - While `app/login.tsx` contains "Quick Demo Accounts" (pre-fills admin/cashier/accountant credentials), it requires explicit submission to the backend `/auth/login` API to get a JWT, meaning actual backend auth is never bypassed.

4. **Token Leakage (Verification #4)**:
   - Static analysis confirms that no `console.log` statements output `pos_token` or `access_token` values in any client-side file.
   - Tokens are stored in standard `localStorage`, which is standard for web, but lacks sandboxed encryption on native mobile targets (where `expo-secure-store` would be appropriate).

---

## 3. Caveats

- We assume backend routes (`/api/v1/quan-ly/*` and `/api/v1/ke-toan/*`) verify JWT signatures and perform strict role checks on every request. Client-side bypass only grants access to UI layouts, but backend security determines data exposure.
- Native mobile builds using Expo Go or bare React Native may store `localStorage` values in unencrypted plist/Preferences files unless `expo-secure-store` is used.

---

## 4. Conclusion

1. **Unauthenticated Route Guard (PASSED WITH UX/API WEAKNESS)**: Unauthenticated users are eventually redirected to `/login`. However, due to pre-initialization rendering, a Flash of Unauthorized Content (FOUC) and an unauthorized API call (401) happen when accessing protected paths directly.
2. **Role Bypass & Stuck State (FAILED/CRITICAL BUG)**:
   - Users with the `manager` or `kitchen` roles get stuck on `/login` upon successful authentication because the default route redirection lacks mapping for these roles.
   - A user with the `kitchen` role can manually access `/quan-ly` or `/ke-toan` paths without being redirected away, bypassing the guard.
   - Role verification is done by parsing JWT payload without signature verification on the client, exposing route access to client-side manipulation.
3. **Auto-Login Hack Removal (PASSED)**: The auto-login hack has been completely removed. Pre-filled demo accounts exist but perform full API authentication.
4. **Token Leakage & Storage (PASSED/LOW RISK)**: No console logs leak tokens. Storage uses unencrypted `localStorage`, which is low risk for web but moderate for native apps.

### Recommendations for Implementer
- Fix `AuthContext.tsx` to return a Loading indicator if `!isInitialized` instead of rendering `{children}`.
- Map the `manager` role as an alias to `admin` and handle `kitchen` routing (e.g. redirecting kitchen users to `/ban-hang/kitchen`).
- Secure route boundaries by verifying the role on the backend for all routes.

---

## 5. Verification Method

To verify these findings independently, run the following:

1. **Run security test suite**:
   ```bash
   npx tsx --test lib/__tests__/security-challenge.test.ts
   ```
   *Expected result*: All 6 tests pass, confirming the logic bypass of `kitchen` role and showing that no auto-login hacks are present.

2. **Inspect Auth Context**:
   Open `e:\posa\frontend\lib\context\AuthContext.tsx` and review line 95 to 127. Observe that `manager` and `kitchen` are not checked in the route guard `useEffect` block.
