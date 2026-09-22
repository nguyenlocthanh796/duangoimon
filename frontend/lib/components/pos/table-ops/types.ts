import { TableItem } from '../TableCard';
import { CartItem, TableDiscount, MergePreviewData } from '../../../store/usePOSStore';

export type OpsViewMode = 'hub' | 'move' | 'merge' | 'split' | 'prebill' | 'discount' | 'guest_note' | 'void';

export const VOID_REASONS = [
  'Khách đổi ý',
  'Mở nhầm bàn',
  'Đổi mang về',
  'Đợi quá lâu',
];

export const PERCENT_PRESETS = [5, 10, 15, 20];
export const AMOUNT_PRESETS = [20000, 50000, 100000];
