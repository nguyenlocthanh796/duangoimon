import type { Category } from '../components/pos/types';

/** Category definitions for POS product tabs — id, name, MaterialCommunityIcons icon */
export const CATEGORIES: Category[] = [
  { id: 'all', name: 'Tất cả', icon: 'silverware-variant' },
  { id: 'sua-chua', name: 'Sữa chua', icon: 'cup' },
  { id: 'tra-chanh', name: 'Trà chanh', icon: 'coffee' },
  { id: 'do-an-vat', name: 'Đồ ăn vặt', icon: 'food' },
  { id: 'che', name: 'Chè', icon: 'cake' },
  { id: 'tra-sua', name: 'Trà sữa', icon: 'coffee' },
  { id: 'soda', name: 'Soda', icon: 'glass-cocktail' },
  { id: 'kem', name: 'Kem', icon: 'snowflake' },
];

/** Map backend category names (Vietnamese uppercase) → slug IDs */
export const CAT_MAP: Record<string, string> = {
  'SỮA CHUA': 'sua-chua',
  'TRÀ CHANH': 'tra-chanh',
  'ĐỒ ĂN VẶT': 'do-an-vat',
  CHÈ: 'che',
  'TRÀ SỮA': 'tra-sua',
  SODA: 'soda',
  KEM: 'kem',
  'ĐỒ ĂN': 'do-an-vat',
  'ĐỒ UỐNG': 'tra-sua',
  'TRÁNG MIỆNG': 'che',
  SNACK: 'do-an-vat',
};

/** Get categories merged with dynamic custom categories from localStorage */
export function getMergedCategories(): Category[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('@pos_custom_categories_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const dynamicList: Category[] = parsed
            .filter((c: any) => c.isActive)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              icon: c.icon || 'food',
            }));
          return [{ id: 'all', name: 'Tất cả', icon: 'silverware-variant' }, ...dynamicList];
        }
      }
    }
  } catch {
    /* ignore */
  }
  return CATEGORIES;
}
