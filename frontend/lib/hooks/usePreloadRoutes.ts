import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Preload adjacent routes for instant navigation.
 * Call this in the Sidebar/navigation component.
 *
 * @param currentRoute - The current route path (e.g., 'quan-ly', 'ke-toan')
 */
export function usePreloadRoutes(currentRoute?: string) {
  const router = useRouter();

  useEffect(() => {
    if (!currentRoute) return;

    // Delay preload slightly to avoid competing with initial render
    const timer = setTimeout(() => {
      const preloadMap: Record<string, string[]> = {
        'quan-ly': ['ke-toan', 'ban-hang'],
        'ke-toan': ['quan-ly'],
        'ban-hang': ['quan-ly', 'ke-toan'],
        index: ['quan-ly', 'ban-hang'],
      };

      const routes = preloadMap[currentRoute] || [];
      routes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {
          // Silently ignore prefetch errors
        }
      });
    }, 2000); // Wait 2s after mount to avoid jank

    return () => clearTimeout(timer);
  }, [currentRoute, router]);
}
