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
  icon?: string;
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
  unit: string;
  currentStock: number;
  minStockAlert: number;
  costPrice: number;
  supplierName?: string;
  lastRestockedAt?: string;
  yieldRate?: number;
  effectiveCostPrice?: number;
  previousCostPrice?: number;
  maxCostAlertThreshold?: number;
}

export function calculateEffectiveCost(costPrice: number, yieldRate: number = 100): number {
  if (!yieldRate || yieldRate <= 0 || yieldRate >= 100) return costPrice;
  return Math.round(costPrice / (yieldRate / 100));
}

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
  code: string;
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
  category: string;
  expenseType: 'co_dinh' | 'hoat_dong';
  dueDay: number;
  paymentMethod: 'tien_mat' | 'chuyen_khoan';
  status: 'active' | 'paused';
  note?: string;
  lastAppliedAt?: string;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat_che', name: 'Chè Truyền Thống', icon: 'food', displayOrder: 1 },
  { id: 'cat_trasua', name: 'Trà Sữa & Trà Trái Cây', icon: 'coffee', displayOrder: 2 },
  { id: 'cat_caphe', name: 'Cà Phê & Đồ Uống', icon: 'cup', displayOrder: 3 },
  { id: 'cat_anvat', name: 'Ăn Vặt & Topping', icon: 'cookie', displayOrder: 4 },
];

export const INITIAL_AREAS: AreaItem[] = [
  { id: 'area_tret', name: 'Tầng Trệt', displayOrder: 1 },
  { id: 'area_lau1', name: 'Lầu 1 (Máy Lạnh)', displayOrder: 2 },
];

export const INITIAL_TOPPINGS: ModifierOption[] = [
  { id: 'top_tran_chau', name: 'Trân Châu Đen', priceDelta: 5000 },
  { id: 'top_khuc_bach', name: 'Khúc Bạch Phô Mai', priceDelta: 8000 },
  { id: 'top_hat_dac', name: 'Hạt Đác Rim Đường Phèn', priceDelta: 6000 },
  { id: 'top_sau_rieng', name: 'Thịt Sầu Riêng Tươi', priceDelta: 12000 },
];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const STANDARD_DRINK_SIZES: ModifierOption[] = [
  { id: 'size_m', name: 'Size M (Vừa)', priceDelta: 0 },
  { id: 'size_l', name: 'Size L (Lớn)', priceDelta: 6000 },
];

export const LARGE_DRINK_SIZES: ModifierOption[] = [
  { id: 'size_m', name: 'Size M', priceDelta: 0 },
  { id: 'size_l', name: 'Size L', priceDelta: 6000 },
  { id: 'size_xl', name: 'Size Khổng Lồ', priceDelta: 10000 },
];

export const INITIAL_MENU_ITEMS: MenuItemWithModifiers[] = [
  {
    id: 'prod_che_buoi',
    code: 'CB01',
    name: 'Chè Bưởi An Giang (Đặc Sản)',
    price: 28000,
    costPrice: 10000,
    unit: 'Phần',
    station: 'bar',
    category: 'Chè Truyền Thống',
    sizes: [
      { id: 'sz_chuan', name: 'Tô Vừa', priceDelta: 0 },
      { id: 'sz_dac_biet', name: 'Tô Đặc Biệt', priceDelta: 7000 },
    ],
    toppings: [
      { id: 'top_hat_dac', name: 'Hạt Đác Rim', priceDelta: 6000 },
      { id: 'top_nuoc_cot_dua', name: 'Thêm Nước Cốt Dừa', priceDelta: 4000 },
    ],
  },
  {
    id: 'prod_che_thai',
    code: 'CT02',
    name: 'Chè Thái Sầu Riêng',
    price: 35000,
    costPrice: 14000,
    unit: 'Tô',
    station: 'bar',
    category: 'Chè Truyền Thống',
    sizes: [
      { id: 'sz_chuan', name: 'Tô Vừa', priceDelta: 0 },
      { id: 'sz_dac_biet', name: 'Gấp Đôi Sầu Riêng', priceDelta: 12000 },
    ],
  },
  {
    id: 'prod_che_khuc_bach',
    code: 'CKB03',
    name: 'Chè Khúc Bạch Hạnh Nhân',
    price: 32000,
    costPrice: 12000,
    unit: 'Chén',
    station: 'bar',
    category: 'Chè Truyền Thống',
  },
  {
    id: 'prod_tra_sua_oolong',
    code: 'TS01',
    name: 'Trà Sữa Oolong Nướng',
    price: 32000,
    costPrice: 11000,
    unit: 'Ly',
    station: 'bar',
    category: 'Trà Sữa & Trà Trái Cây',
    sizes: STANDARD_DRINK_SIZES,
    toppings: [
      { id: 'top_tc', name: 'Trân Châu Đen', priceDelta: 5000 },
      { id: 'top_pudding', name: 'Pudding Trứng', priceDelta: 6000 },
    ],
    allowSugarIce: true,
  },
  {
    id: 'prod_tra_dao',
    code: 'TD02',
    name: 'Trà Đào Cam Sả Tươi',
    price: 30000,
    costPrice: 9000,
    unit: 'Ly',
    station: 'bar',
    category: 'Trà Sữa & Trà Trái Cây',
    sizes: STANDARD_DRINK_SIZES,
    allowSugarIce: true,
  },
  {
    id: 'prod_cf_muoi',
    code: 'CF01',
    name: 'Cà Phê Muối Cố Đô',
    price: 25000,
    costPrice: 7000,
    unit: 'Ly',
    station: 'bar',
    category: 'Cà Phê & Đồ Uống',
  },
  {
    id: 'prod_bac_xiu',
    code: 'BX02',
    name: 'Bạc Xỉu Sữa Dừa Sài Gòn',
    price: 25000,
    costPrice: 8000,
    unit: 'Ly',
    station: 'bar',
    category: 'Cà Phê & Đồ Uống',
  },
  {
    id: 'prod_banh_trang',
    code: 'AV01',
    name: 'Bánh Tráng Trộn Long An',
    price: 20000,
    costPrice: 7000,
    unit: 'Đĩa',
    station: 'kitchen',
    category: 'Ăn Vặt & Topping',
  },
  {
    id: 'prod_khoai_tay',
    code: 'AV02',
    name: 'Khoai Tây Chiên Lắc Phô Mai',
    price: 25000,
    costPrice: 9000,
    unit: 'Đĩa',
    station: 'kitchen',
    category: 'Ăn Vặt & Topping',
  },
];

export const CATEGORIES_LIST = [
  'Tất Cả',
  'Chè Truyền Thống',
  'Trà Sữa & Trà Trái Cây',
  'Cà Phê & Đồ Uống',
  'Ăn Vặt & Topping',
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
