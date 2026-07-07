# Handoff Report: Milestone 2 Auth & Layout Hardening

This report details the investigation and proposed implementation strategy for the critical auth, layout, storage, and configuration fixes carried over from Milestone 1.

---

## 1. Observation

### A. Flash of Unauthorized Content (FOUC)
In `lib/context/AuthContext.tsx` (lines 129–133), the context provider renders children directly on mount without checking `isInitialized`:
```tsx
129:   return (
130:     <AuthContext.Provider value={{ token, username, userRole, login, logout, isInitialized }}>
131:       {children}
132:     </AuthContext.Provider>
133:   );
```
Since the route guard `useEffect` is deferred when `isInitialized` is false (line 96: `if (!isInitialized) return;`), unauthorized layouts or screens render transiently until the effects run and issue a redirect.

### B. Auth Guard Security
In `lib/context/AuthContext.tsx` (lines 95–127), the route guard does not explicitly validate against a set of allowed roles, nor does it handle the `manager` or `kitchen` roles:
```tsx
95:   useEffect(() => {
96:     if (!isInitialized) return;
97: 
98:     const rootSegment = segments[0];
99: 
100:     if (!token) {
101:       if (rootSegment !== 'login') {
102:         router.replace('/login');
103:       }
104:     } else {
105:       if (rootSegment === 'login' || !rootSegment) {
106:         // Redirect to default route
107:         if (userRole === 'admin') {
108:           router.replace('/quan-ly');
109:         } else if (userRole === 'cashier') {
110:           router.replace('/ban-hang');
111:         } else if (userRole === 'accountant') {
112:           router.replace('/ke-toan');
113:         }
114:       } else {
115:         // Check authorization
116:         if (userRole === 'cashier') {
117:           if (rootSegment !== 'ban-hang') {
118:             router.replace('/ban-hang');
119:           }
120:         } else if (userRole === 'accountant') {
121:           if (rootSegment !== 'ke-toan' && rootSegment !== 'quan-ly') {
122:             router.replace('/ke-toan');
123:           }
124:         }
125:       }
126:     }
127:   }, [isInitialized, token, userRole, segments]);
```
- No default-deny policy exists for unknown roles (e.g. they bypass restrictions).
- `manager` is completely missing from default route mapping and restrictions.
- `kitchen` is completely missing from default route mapping and restrictions.

### C. Local Storage JSON Safety
In `lib/context/AuthContext.tsx` (lines 32 and 37), the `pos_user` key is parsed without a dedicated try-catch block:
```tsx
32:           const storedUserStr = localStorage.getItem('pos_user');
...
37:               const user = storedUserStr ? JSON.parse(storedUserStr) : null;
```
If `storedUserStr` is corrupt (e.g., incomplete string, manual manipulation), `JSON.parse` throws a syntax error. This halts the outer `initAuth` block, leaving `setTokenState` unexecuted while the token remains in localStorage, breaking user session consistency.

### D. Device Orientation Changes
- **Sidebar.tsx (lines 115–116)**: Screen width is evaluated once at the module level:
  ```tsx
  115: const { width: SCREEN_WIDTH } = Dimensions.get('window');
  116: const SIDEBAR_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);
  ```
  If a user rotates the screen, `SIDEBAR_WIDTH` does not update, and the sidebar retains its initial layout dimensions.
- **app/ban-hang/index.tsx (lines 101–103)**:
  ```tsx
  101:   const { width: W } = Dimensions.get('window');
  102:   const numCols = W > 768 ? 4 : 3;
  103:   const cardWidth = (W - 16 * 2 - 10 * (numCols - 1)) / numCols;
  ```
- **app/ban-hang/pos.tsx (lines 37–38)**:
  ```tsx
  37:   const { width: SCREEN_WIDTH } = Dimensions.get('window');
  38:   const isWide = SCREEN_WIDTH > 768;
  ```
  Both files query dimensions inside the functional components using static `Dimensions.get('window')` which does not automatically trigger component re-rendering upon device orientation changes.

### E. TSConfig Build Failure
In `tsconfig.json`, there is no `exclude` list defined to exclude build artifacts:
```json
1: {
2:   "compilerOptions": { ... },
21:   "include": [
22:     "**/*.ts",
23:     "**/*.tsx"
24:   ],
25:   "extends": "expo/tsconfig.base"
26: }
```
TypeScript compilation artifacts written to `dist/` are matched by the wildcard patterns, causing compilation output checks to fail due to duplicated declaration files.

---

## 2. Logic Chain

1. **FOUC Fix**: Showing raw routes before initializing state exposes unauthenticated views briefly. By adding a block `if (!isInitialized) return <ActivityIndicator />` layout compilation is halted until auth verification completes, removing FOUC.
2. **Auth Guard Security**:
   - Defining a set of explicit valid roles (`['admin', 'manager', 'cashier', 'accountant', 'kitchen']`) lets us distinguish authorized roles from arbitrary role inputs.
   - Enforcing a default-deny check (`if (!VALID_ROLES.includes(role)) logout()`) secures the app against unexpected/corrupted claims.
   - Mapping `manager` to redirect to `/quan-ly` (same as `admin`) and allowing full path access implements the requested admin-level access for managers.
   - Restricting `kitchen` to only access `/ban-hang/kitchen` routes redirects non-matching segments to `/ban-hang/kitchen`, keeping the kitchen user boxed inside their workspace.
3. **Local Storage JSON Safety**: Wrapping `JSON.parse` in a specialized `try-catch` prevents standard syntax exceptions from breaking state initialization. If an exception occurs, clearing `pos_token` and `pos_user` recovers the storage state gracefully by resetting the session.
4. **Dynamic Orientation**:
   - Swapping `Dimensions.get('window')` with `useWindowDimensions()` registers the components to React Native's window change event loop.
   - React Native automatically triggers a re-render when dimensions update, ensuring column counts, card widths, and responsive layouts adapt instantly.
   - For `Sidebar.tsx`, synchronizing the closed translation value `translateX` with the new width via a `useEffect` prevents visual misalignment after screen rotation.
5. **TSConfig Exclude**: Adding `"exclude": ["dist"]` explicitly informs the TypeScript compiler to ignore build directories, preventing double declaration check errors during builds.

---

## 3. Caveats

- **Web Mode Local Storage**: Local storage helper objects rely on `typeof window !== 'undefined'`. This block must remain to avoid breaking SSR or build steps.
- **Expo Router Navigation Timing**: Redirection (`router.replace`) requires the navigation tree to be mounted. Putting the redirect inside a `useEffect` keyed on `isInitialized` ensures the router is ready.

---

## 4. Conclusion & Implementation Strategy

Below is the detailed implementation strategy.

### Item 1: FOUC & Local Storage Safety (`AuthContext.tsx`)

#### Proposed Imports & Styles Additions:
```tsx
import { ActivityIndicator, View, StyleSheet } from 'react-native';
```

```tsx
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
```

#### Proposed Safe Initializer Block:
Replace the mount effect in `lib/context/AuthContext.tsx` with:
```tsx
  // On mount, read pos_token and pos_user from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('pos_token');
          const storedUserStr = localStorage.getItem('pos_user');
          if (storedToken) {
            const decoded = decodeJwt(storedToken);
            if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
              setTokenState(storedToken);
              
              let user = null;
              if (storedUserStr) {
                try {
                  user = JSON.parse(storedUserStr);
                } catch (parseError) {
                  console.error('Failed to parse pos_user from localStorage:', parseError);
                  // Clear corrupted values
                  localStorage.removeItem('pos_token');
                  localStorage.removeItem('pos_user');
                }
              }
              
              setUsername(user?.username || '');
              setUserRole(decoded.role || user?.role || '');
            } else {
              // Token is expired, clear
              localStorage.removeItem('pos_token');
              localStorage.removeItem('pos_user');
              setTokenState(null);
              setUsername('');
              setUserRole('');
            }
          }
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
      } finally {
        setIsInitialized(true);
      }
    };
    initAuth();
  }, []);
```

#### Proposed Render Loading Block:
```tsx
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ token, username, userRole, login, logout, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
```

---

### Item 2: Secure Auth Guard & Redirects (`AuthContext.tsx`)

Replace the Guard `useEffect` in `lib/context/AuthContext.tsx` with:
```tsx
  // Route guard
  useEffect(() => {
    if (!isInitialized) return;

    const rootSegment = segments[0];
    const VALID_ROLES = ['admin', 'manager', 'cashier', 'accountant', 'kitchen'];

    if (!token) {
      if (rootSegment !== 'login') {
        router.replace('/login');
      }
    } else {
      // 1. Default-deny policy: check for unrecognized roles
      if (!userRole || !VALID_ROLES.includes(userRole)) {
        console.warn(`Unrecognized or missing role: "${userRole}". Force logging out.`);
        logout();
        return;
      }

      // 2. Redirect on login page or index root
      if (rootSegment === 'login' || !rootSegment) {
        if (userRole === 'admin' || userRole === 'manager') {
          router.replace('/quan-ly');
        } else if (userRole === 'cashier') {
          router.replace('/ban-hang');
        } else if (userRole === 'accountant') {
          router.replace('/ke-toan');
        } else if (userRole === 'kitchen') {
          router.replace('/ban-hang/kitchen');
        }
      } else {
        // 3. Subroute access authorization restrictions
        if (userRole === 'cashier') {
          if (rootSegment !== 'ban-hang') {
            router.replace('/ban-hang');
          }
        } else if (userRole === 'accountant') {
          if (rootSegment !== 'ke-toan' && rootSegment !== 'quan-ly') {
            router.replace('/ke-toan');
          }
        } else if (userRole === 'kitchen') {
          // kitchen can ONLY access /ban-hang/kitchen routes
          if (rootSegment !== 'ban-hang' || segments[1] !== 'kitchen') {
            router.replace('/ban-hang/kitchen');
          }
        }
        // admin and manager roles have access to all routes (unrestricted)
      }
    }
  }, [isInitialized, token, userRole, segments]);
```

---

### Item 3: Sidebar Configuration & Orientation Support

#### Update `Sidebar.tsx`:
1. **Imports**: Add `useWindowDimensions` from `'react-native'`.
2. **Remove Static Dimensions**:
   Remove lines 115–116:
   ```tsx
   // BEFORE:
   const { width: SCREEN_WIDTH } = Dimensions.get('window');
   const SIDEBAR_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8);
   ```
3. **Add Hooks & Dynamic Variables**:
   Inside `Sidebar()` component body:
   ```tsx
   const { width: screenWidth } = useWindowDimensions();
   const sidebarWidth = Math.min(300, screenWidth * 0.8);

   const translateX = useRef(new Animated.Value(-sidebarWidth)).current;
   ```
   Modify layout dynamic style widths (replace references of `SIDEBAR_WIDTH` with `sidebarWidth`):
   ```tsx
   // In first animation useEffect:
   useEffect(() => {
     if (!rendered) return;
     Animated.parallel([
       Animated.timing(translateX, {
         toValue: isOpen ? 0 : -sidebarWidth,
         duration: 280,
         useNativeDriver: true,
       }),
       Animated.timing(overlayOpacity, {
         toValue: isOpen ? 1 : 0,
         duration: 280,
         useNativeDriver: true,
       }),
     ]).start(() => {
       if (!isOpen) setRendered(false);
     });
   }, [isOpen, rendered, sidebarWidth]);
   ```
   Add a synchronization effect to keep translateX bounds updated during screen orientation shifts while closed:
   ```tsx
   useEffect(() => {
     if (!isOpen) {
       translateX.setValue(-sidebarWidth);
     }
   }, [sidebarWidth, isOpen]);
   ```
   Update Style widths:
   ```tsx
   // Sidebar panel style width:
   width: sidebarWidth,
   ```

4. **Map `kitchen` Role In Sidebar**:
   Update `menuByRole` configuration:
   ```tsx
   const menuByRole: Record<string, MenuGroup[]> = {
     cashier: [
       {
         groupLabel: 'Bán Hàng',
         items: [allMenuItems.pos, allMenuItems.kitchen],
       },
     ],
     kitchen: [
       {
         groupLabel: 'Nhà Bếp',
         items: [allMenuItems.kitchen],
       },
     ],
     accountant: [
       {
         groupLabel: 'Kế Toán',
         items: [allMenuItems.keToan, allMenuItems.invoices],
       },
       {
         groupLabel: 'Quản Lý',
         items: [allMenuItems.quanLy],
       },
     ],
     admin: [
       {
         groupLabel: 'Bán Hàng',
         items: [allMenuItems.pos, allMenuItems.kitchen],
       },
       {
         groupLabel: 'Kế Toán',
         items: [allMenuItems.keToan, allMenuItems.invoices],
       },
       {
         groupLabel: 'Quản Lý',
         items: [allMenuItems.quanLy],
       },
     ],
     manager: [
       {
         groupLabel: 'Bán Hàng',
         items: [allMenuItems.pos, allMenuItems.kitchen],
       },
       {
         groupLabel: 'Kế Toán',
         items: [allMenuItems.keToan, allMenuItems.invoices],
       },
       {
         groupLabel: 'Quản Lý',
         items: [allMenuItems.quanLy],
       },
     ],
   };
   ```

5. **Map `kitchen` to display properties**:
   Update `ROLE_DISPLAY` configuration:
   ```tsx
   const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
     admin: { label: 'Quản trị viên', color: '#7C3AED', bg: '#F5F3FF' },
     manager: { label: 'Quản lý', color: '#2563EB', bg: '#EFF6FF' },
     accountant: { label: 'Kế toán', color: '#059669', bg: '#ECFDF5' },
     cashier: { label: 'Thu ngân', color: '#D97706', bg: '#FFFBEB' },
     kitchen: { label: 'Nhà bếp', color: '#DC2626', bg: '#FEF2F2' },
   };
   ```
   And the user emoji selector:
   ```tsx
   userRole === 'admin' ? '👑' : userRole === 'manager' ? '🏢' : userRole === 'accountant' ? '📊' : userRole === 'kitchen' ? '🍳' : '💵'
   ```
   And fallback default-deny for groups mapping:
   ```tsx
   const groups: MenuGroup[] = menuByRole[userRole] ?? [];
   ```

#### Update screen width calculation in POS screens:
- **app/ban-hang/index.tsx**:
  ```tsx
  import { useWindowDimensions } from 'react-native';
  ...
  // Inside TableSelection:
  const { width: W } = useWindowDimensions();
  ```
- **app/ban-hang/pos.tsx**:
  ```tsx
  import { useWindowDimensions } from 'react-native';
  ...
  // Inside POSScreen:
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  ```

---

### Item 5: tsconfig.json

Modify `tsconfig.json` to append the `"exclude"` key at the root level:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "app/*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "dist"
  ],
  "extends": "expo/tsconfig.base"
}
```

---

## 5. Verification Method

- **TypeScript Compilation**:
  Run `npx tsc --noEmit` from `e:\posa\frontend` to ensure the updated code meets all compiler checks and does not generate type conflicts.
- **Login Redirect Verification**:
  1. Authenticate with a payload containing `role: 'kitchen'`. Verify redirection resolves to `/ban-hang/kitchen`.
  2. Authenticate with a payload containing `role: 'manager'`. Verify redirection resolves to `/quan-ly`.
  3. Attempt to bypass `/ban-hang/kitchen` routes as a `kitchen` role. Verify navigation forces a redirect back.
  4. Attempt to login with an unrecognized role (e.g. `role: 'hacker'`). Verify the app triggers `logout()` and reverts back to the `/login` route.
- **Local Storage Error Recovery**:
  1. Insert a corrupt JSON string in `localStorage.setItem('pos_user', 'invalid-json')`.
  2. Refresh the app. Confirm the page does not crash, clears both `pos_user` and `pos_token`, and routes to `/login`.
- **Dynamic Orientation Check**:
  1. Open the sidebar in portrait mode, rotate to landscape, and inspect that the width recalculates and overlays correctly.
  2. Perform rotation in `app/ban-hang/index.tsx` and verify table grids adapt instantly (e.g., changing from 3 columns to 4 columns).
