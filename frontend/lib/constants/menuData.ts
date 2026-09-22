import { MenuItemWithModifiers, ModifierOption, TableItem } from '../components/pos';

export type { ModifierOption, TableItem };

export const UNASSIGNED_TABLE: TableItem = {
  id: 'unassigned',
  name: 'Chưa Chọn Bàn',
  area: 'Đơn Mới',
  capacity: 1,
  status: 'trong',
};

export interface CategoryItem {
  id: string;
  name: string;
  icon?: string; // MaterialCommunityIcons name
  displayOrder: number;
}

export interface AreaItem {
  id: string;
  name: string;
  displayOrder: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'nguyen_lieu' | 'dong_goi' | 'hang_hoa_ban_ngay';
  unit: string; // kg, lon, hộp, bịch, chai, cây, lon, gói
  currentStock: number;
  minStockAlert: number;
  costPrice: number; // Đơn giá nhập gần nhất (VND)
  supplierName?: string;
  lastRestockedAt?: string;
  // ✨ Quản trị hao hụt sơ chế & Cảnh báo giá vốn
  yieldRate?: number; // % Tỷ lệ thành phẩm sau sơ chế (VD: 75% thịt bò, 85% rau, mặc định 100%)
  effectiveCostPrice?: number; // Giá vốn thực tế sau sơ chế = costPrice / (yieldRate / 100)
  previousCostPrice?: number; // Giá nhập kỳ trước để so sánh
  maxCostAlertThreshold?: number; // Giá vốn trần cảnh báo
}

/**
 * Tính giá vốn thực tế của nguyên liệu sau khi trừ hao hụt sơ chế
 */
export function calculateEffectiveCost(costPrice: number, yieldRate: number = 100): number {
  if (!yieldRate || yieldRate <= 0 || yieldRate >= 100) return costPrice;
  return Math.round(costPrice / (yieldRate / 100));
}

/**
 * Phát hiện biến động tăng giá vốn bất thường khi nhập hàng NCC
 */
export function checkCostPriceSpike(
  newCost: number,
  prevCost: number,
  thresholdPercent: number = 15
): { isSpike: boolean; percentChange: number } {
  if (!prevCost || prevCost <= 0) return { isSpike: false, percentChange: 0 };
  const percentChange = Math.round(((newCost - prevCost) / prevCost) * 100);
  return {
    isSpike: percentChange >= thresholdPercent,
    percentChange,
  };
}

export type InventoryTransactionType = 'nhap_kho' | 'xuat_kho' | 'kiem_ke';
export type InventoryStockOutReason = 'xuat_huy' | 'xuat_hong' | 'xuat_noi_bo' | 'xuat_tra_ncc' | 'xuat_che_bien';

export interface InventoryTransactionItem {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  systemStockBefore?: number;
  actualStockAfter?: number;
}

export interface InventoryTransaction {
  id: string;
  code: string; // PN-xxxxx, PX-xxxxx, PK-xxxxx
  type: InventoryTransactionType;
  stockOutReason?: InventoryStockOutReason;
  createdAt: string;
  performedBy: string;
  supplierName?: string;
  paymentMethod?: 'tien_mat' | 'chuyen_khoan' | 'chua_thanh_toan';
  totalAmount: number;
  note?: string;
  items: InventoryTransactionItem[];
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string; // 'chi_mat_bang' | 'chi_internet' | 'chi_phan_mem' | 'chi_khau_hao' | 'chi_rac' | 'chi_khac'
  expenseType: 'co_dinh' | 'hoat_dong';
  dueDay: number; // Ngày trong tháng
  paymentMethod: 'tien_mat' | 'chuyen_khoan';
  status: 'active' | 'paused';
  note?: string;
  lastAppliedAt?: string;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [];

export const INITIAL_AREAS: AreaItem[] = [];

export const INITIAL_TOPPINGS: ModifierOption[] = [];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const STANDARD_DRINK_SIZES: ModifierOption[] = [];

export const LARGE_DRINK_SIZES: ModifierOption[] = [];

export const INITIAL_MENU_ITEMS: MenuItemWithModifiers[] = [];

export const CATEGORIES_LIST = [
  'Tất Cả',
  'Trà Sữa',
  'Cà Phê',
  'Trà Trái Cây',
  'Ăn Vặt',
  'Nước Ép',
  'Đá Xay & Matcha',
];

export interface BankOption {
  code: string;
  name: string;
  shortName: string;
  bin: string;
}

export const VIETNAM_BANKS: BankOption[] = [
  { code: 'MB', name: 'Ngân hàng Quân Đội', shortName: 'MBBank', bin: '970422' },
  { code: 'VCB', name: 'Ngân hàng Ngoại Thương Việt Nam', shortName: 'Vietcombank', bin: '970436' },
  { code: 'TCB', name: 'Ngân hàng Kỹ Thương Việt Nam', shortName: 'Techcombank', bin: '970407' },
  { code: 'ACB', name: 'Ngân hàng Á Châu', shortName: 'ACB', bin: '970416' },
  { code: 'VPB', name: 'Ngân hàng Việt Nam Thịnh Vượng', shortName: 'VPBank', bin: '970432' },
  { code: 'TPB', name: 'Ngân hàng Tiên Phong', shortName: 'TPBank', bin: '970423' },
  { code: 'BIDV', name: 'Ngân hàng Đầu tư và Phát triển', shortName: 'BIDV', bin: '970418' },
  { code: 'CTG', name: 'Ngân hàng Công Thương Việt Nam', shortName: 'VietinBank', bin: '970415' },
  { code: 'VIB', name: 'Ngân hàng Quốc Tế Việt Nam', shortName: 'VIB', bin: '970441' },
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];

export const INITIAL_RECURRING_EXPENSES: RecurringExpense[] = [];
