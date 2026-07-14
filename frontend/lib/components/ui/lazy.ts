import { lazy } from 'react';

// ─── Lazy-loaded heavy components ─────────────────────────
// These are loaded on-demand to reduce initial bundle size.
// Each component is wrapped in <Suspense fallback={<Skeleton />}>.

export const LazyDataTable = lazy(() =>
  import('./DataTable').then((m) => ({ default: m.default })),
);

export const LazyFormModal = lazy(() =>
  import('./FormModal').then((m) => ({ default: m.default })),
);

export const LazyFAB = lazy(() =>
  import('./FAB').then((m) => ({ default: m.default })),
);

// Note: ChartComponents is lazy-loaded directly in ke-toan screens.
// ScreenHeader and ScreenContainer are kept eager (needed immediately).
