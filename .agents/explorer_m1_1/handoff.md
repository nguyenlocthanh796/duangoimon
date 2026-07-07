# Handoff Report: Authentication & Navigation Layout Investigation (Milestone 1)

## 1. Observation

During our read-only investigation of the React Native/Expo codebase under `e:\posa\frontend` and the backend codebase under `e:\posa\backend`, we observed the following:

### A. Login Flow (`app/login.tsx`)
- The login screen (`app/login.tsx`) presents a standard credential entry form with username and password text inputs.
- Validates that inputs are non-empty:
  ```typescript
  if (!username.trim() || !password.trim()) {
    Alert.alert('Lỗi đăng nhập', 'Vui lòng điền đầy đủ tài khoản và mật khẩu.');
    return;
  }
  ```
- Triggers the `api.login` helper from `lib/api.ts` (line 50).
- Upon successful login, it stores the token and redirects the user to `/ban-hang` after a UX delay:
  ```typescript
  await api.login(username, password);
  setTimeout(() => {
    router.replace('/ban-hang');
  }, 500);
  ```
- Contains three demo preset buttons:
  - **Admin**: `admin` / `admin123`
  - **Cashier (Thu Ngân)**: `cashier` / `cashier123`
  - **Accountant (Kế Toán)**: `accountant` / `acc123`

### B. Authentication Client & Token Storage (`lib/api.ts`)
- Stored token uses standard `localStorage` with the key `'pos_token'`:
  ```typescript
  const TOKEN_KEY = 'pos_token';

  export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  export function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  ```
- The `api.login` function calls the POST `/auth/login` endpoint (lines 43-50):
  ```typescript
  login: async (username: string, password: string) => {
    const data = await request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.access_token);
    return data;
  }
  ```

### C. JWT Structure and Backend Role Storage
- In `backend/app/core/auth.py` (lines 22-27), the JWT generator (`create_token`) encodes only the `sub` (user ID) and `exp` (expiration timestamp) claims:
  ```python
  def create_token(user_id: str) -> str:
      payload = {
          "sub": user_id,
          "exp": datetime.now(timezone.utc) + timedelta(hours=8),
      }
      return jwt.encode(payload, settings.secret_key, algorithm="HS256")
  ```
- In `backend/app/api/v1/auth.py` (lines 14-19), the users are hardcoded:
  - Admin ID: `"00000000-0000-0000-0000-000000000001"` (role: `admin`)
  - Cashier ID: `"00000000-0000-0000-0000-000000000002"` (role: `cashier`)
  - Accountant ID: `"00000000-0000-0000-0000-000000000003"` (role: `accountant`)
- In `backend/app/api/v1/auth.py` (line 28), the `/login` response payload returns the user metadata along with the token:
  ```python
  return {
      "access_token": token,
      "token_type": "bearer",
      "user": {"id": user["id"], "username": body.username, "role": user["role"], "full_name": user["full_name"]},
  }
  ```

### D. Routing Layout & Automatic Login Backdoor
- Root Layout (`app/_layout.tsx`) has no authentication checks (route guards) and immediately loads children via Expo Router Stack.
- nested layout structures:
  - `app/ban-hang/_layout.tsx` (screens: `index`, `pos`, `payment`, `kitchen`)
  - `app/quan-ly/_layout.tsx` (screens: `index`, `menu`, `tables`, `users`, `reports`)
  - `app/ke-toan/_layout.tsx` (screens: `index`, `invoices`)
- Automatic Login Backdoor: In `app/ban-hang/index.tsx` (lines 65-69), there is a temporary shortcut that bypasses the login screen by automatically performing a login as `'admin'` whenever no token is detected:
  ```typescript
  if (!getToken()) {
    try { const res = await api.login('admin', 'admin123'); setToken(res.access_token); } catch {}
  }
  ```

### E. Sidebar Component Usage (`lib/components/Sidebar.tsx`)
- The `Sidebar` is imported and instantiated locally in four files:
  1. `app/ban-hang/index.tsx`
  2. `app/ban-hang/kitchen.tsx`
  3. `app/ban-hang/payment.tsx`
  4. `app/ban-hang/pos.tsx`
- Each of these files duplicates sidebar open state management and manually sets up the toggle button:
  ```typescript
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // ...
  <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} ... />
  ```
- Current menu items inside `Sidebar.tsx` are hardcoded to show only "Thu Ngân (POS)" and "Nhà Bếp". It does not feature navigation links for management/accounting, nor a Logout option.

---

## 2. Logic Chain

From the direct observations above, we can establish the following chain of reasoning:
1. **Unsecured Routes**: Since `app/_layout.tsx` contains no auth guard check, any user can type in or navigate to sub-routes (e.g. `/ban-hang`, `/quan-ly`, `/ke-toan`) directly.
2. **Auto-Login Hack**: The silent login hack in `app/ban-hang/index.tsx` must be removed to restore the security of the application and ensure users are prompted for credentials.
3. **Stateless Role Handling**:
   - The backend token does not currently contain the user's role.
   - We can either modify the backend payload to contain `"role"` inside the JWT token (recommended for a production-ready application) or store the `"user"` dictionary locally (e.g. `localStorage.setItem('pos_user', JSON.stringify(data.user))`) during the login response.
   - A custom, dependency-free base64url-decoder in TypeScript can parse the token's JWT payload securely.
4. **Sidebar Redundancy**: Having 4 separate instances of `Sidebar` with local hooks across the `ban-hang` pages leads to high maintenance, code duplication, and inconsistent UI state. Replacing this with a React Context `SidebarProvider` wrapping sub-layouts will centralize sidebar toggle state, reduce screen boilerplate, and provide a single entry point for layout controls.
5. **Dynamic Sidebar & Role Matching**:
   - The Sidebar should restrict/display navigation items dynamically based on the current user's role.
   - Admin should see all navigation elements.
   - Cashier should see only point-of-sale/kitchen routes.
   - Accountant should see only accounting/transaction routes.
   - A "Logout" option should be integrated into the sidebar bottom to clear the active token and redirect to `/login`.

---

## 3. Caveats

- **Storage Compatibility**: `localStorage` is used in `lib/api.ts`. If this application is run in native iOS/Android builds (rather than Expo Web), standard `localStorage` will throw errors. To make the code multi-platform, we should replace `localStorage` usage with `@react-native-async-storage/async-storage` or `expo-secure-store`.
- **Backend Edit Constraint**: We assume backend code changes (to add the `role` claim to the token) are preferred but optional. If we cannot edit backend code, we will fall back to caching the `user` metadata object in storage upon login.

---

## 4. Conclusion

The current auth and layout systems contain demo bypasses and redundant layouts. To prepare the project for Milestone 1, we must:
1. Implement a clean TypeScript JWT decoding utility.
2. Build an `AuthContext` to centralize auth state, check for token expiry, perform role-based route guards, and clean up the automatic login hack in `/ban-hang/index.tsx`.
3. Wrap layout directories with a `SidebarProvider` to enable global sidebar triggers.
4. Refactor the `Sidebar` component to support dynamic links by role and include a Logout option.
5. Standardize Safe Area wrapping.

---

## 5. Implementation Plan (Milestone 1)

### Phase 1: Custom JWT Decoder & Storage Standardization
Implement a dependency-free JWT decoder in `lib/auth-helpers.ts`:

```typescript
export interface DecodedToken {
  sub?: string;
  role?: string;
  exp?: number;
  [key: string]: any;
}

// Pure JS Base64 Decoder (Safe for all React Native platforms without node Buffer or atob)
function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = '';
  const cleaned = str.replace(/=+$/, '');
  
  for (let i = 0, bc = 0, bs = 0; i < cleaned.length; i++) {
    const char = cleaned.charAt(i);
    const idx = chars.indexOf(char);
    if (idx === -1) continue;
    
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      buffer += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return buffer;
}

export function decodeJwt(token: string): DecodedToken | null {
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

*Optional Backend Change (in `backend/app/core/auth.py`):*
Modify `create_token` to append `role`:
```python
def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")
```

### Phase 2: Centralized Auth Guard (`lib/context/AuthContext.tsx`)
Create `AuthContext` to manage the authentication state, token storage, and route authorization guards.

- **Check Session**: On mount, read the token and check expiration (`decoded.exp * 1000 > Date.now()`).
- **Route Guard Logic**:
  - Unauthenticated users trying to access `/ban-hang`, `/quan-ly`, or `/ke-toan` are redirected to `/login`.
  - Authenticated users trying to access `/login` are redirected to their default screen based on role:
    - `admin` -> `/quan-ly`
    - `cashier` -> `/ban-hang`
    - `accountant` -> `/ke-toan`
  - Unauthorized users trying to access paths above their clearance levels are redirected to their default screen.
- **Auto-Login Clean Up**: Remove the `api.login` automatic login in `app/ban-hang/index.tsx` (lines 65-69).

### Phase 3: Global Sidebar & React Context (`lib/context/SidebarContext.tsx`)
Create a context to manage the sidebar toggle.

- **Hook**: `useSidebar()` exposes `{ openSidebar, closeSidebar, toggleSidebar, isOpen }`.
- **Layout wrapper**: Wrap the top layouts (`app/ban-hang/_layout.tsx`, `app/quan-ly/_layout.tsx`, `app/ke-toan/_layout.tsx`) inside this provider, rendering the `<Sidebar>` once at layout root.
- **Dynamic Menu rendering**: Refactor `Sidebar.tsx` to read the current user's role from `AuthContext` and show appropriate navigation targets:
  - Admin: Bán Hàng (`/ban-hang`), Quản Lý (`/quan-ly`), Kế Toán (`/ke-toan`).
  - Cashier: Bán Hàng (`/ban-hang`), Nhà Bếp (`/ban-hang/kitchen`).
  - Accountant: Kế Toán (`/ke-toan`).
- **Logout Action**: Add a Logout row at the bottom of the Sidebar.

### Phase 4: Safe Area Standardizing
- Wrap the main layouts inside `SafeAreaProvider` at `app/_layout.tsx`.
- Replace manual header paddings with structured `SafeAreaView` components or inline edge insets in layouts.

---

## 6. Verification Method

To verify the correct functionality of this Milestone 1 implementation:

1. **Routing Guard Check**:
   - Clear storage. Navigate directly to `/ban-hang`, `/quan-ly`, or `/ke-toan`. Verify that the screen immediately redirects to `/login`.
   - Confirm that the auto-login bypass does not trigger.
2. **Demo User Redirection Check**:
   - Log in as `admin`. Verify you redirect to `/quan-ly` or `/ban-hang`. Ensure the Sidebar contains links to all sections.
   - Log in as `cashier`. Verify you redirect to `/ban-hang`. Ensure sidebar has POS/Kitchen links but restricts management/accounting.
   - Log in as `accountant`. Verify you redirect to `/ke-toan`. Ensure sidebar displays only Accountant links.
3. **Sidebar Triggering**:
   - Navigate to different screens. Click the top-left menu toggle on any dashboard screen. Verify the sidebar slides in correctly.
   - Click "Logout" from the sidebar and verify that storage is cleared and navigation redirects to `/login`.
4. **Compile and Type Checks**:
   - Run type checks and compilation builds in the terminal:
     ```powershell
     cd e:\posa\frontend
     npx tsc --noEmit
     npm run build
     ```
