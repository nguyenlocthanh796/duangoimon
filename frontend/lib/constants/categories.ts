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
};
