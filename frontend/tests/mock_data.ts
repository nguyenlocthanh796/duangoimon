/**
 * 👑 OngChu Lean POS - Test Fixtures & Mock Data
 */

import { MenuItemWithModifiers, SelectedModifierData, TableItem } from '../lib/components/pos';

export const mockMenuItems: MenuItemWithModifiers[] = [
  {
    id: 'prod_1',
    name: 'Trà Sữa Trân Châu Hoàng Gia',
    price: 35000,
    category: 'Trà Sữa',
    code: 'TSTC',
    sizes: [
      { id: 'size_m', name: 'Size Vừa (M)', priceDelta: 0 },
      { id: 'size_l', name: 'Size Lớn (L)', priceDelta: 7000 },
    ],
    toppings: [
      { id: 'top_1', name: 'Trân Châu Hoàng Gia', priceDelta: 5000 },
      { id: 'top_2', name: 'Thạch Phô Mai', priceDelta: 8000 },
      { id: 'top_3', name: 'Pudding Trứng', priceDelta: 6000 },
    ],
  },
  {
    id: 'prod_2',
    name: 'Trà Đào Cam Sả Tươi',
    price: 39000,
    category: 'Trà Sữa',
    code: 'TDCS',
    sizes: [
      { id: 'size_m', name: 'Size Vừa (M)', priceDelta: 0 },
      { id: 'size_l', name: 'Size Lớn (L)', priceDelta: 6000 },
    ],
    toppings: [
      { id: 'top_4', name: 'Đào Miếng Giòn', priceDelta: 8000 },
    ],
  },
  {
    id: 'prod_3',
    name: 'Cà Phê Muối Cố Đô',
    price: 29000,
    category: 'Cà Phê',
    code: 'CPM',
    sizes: [
      { id: 'size_std', name: 'Size Tiêu Chuẩn', priceDelta: 0 },
    ],
  },
  {
    id: 'prod_4',
    name: 'Khoai Tây Chiên Lắc Phô Mai',
    price: 30000,
    category: 'Ăn Vặt',
    code: 'KTCPM',
  },
  {
    id: 'prod_5',
    name: 'Bánh Mì Nướng Muối Ớt',
    price: 25000,
    category: 'Ăn Vặt',
    code: 'BMNMO',
  },
];

export const mockTables: TableItem[] = [
  { id: 't1', name: 'Bàn 01', area: 'Tầng Trệt', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 't2', name: 'Bàn 02', area: 'Tầng Trệt', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 't3', name: 'Bàn 03', area: 'Tầng Trệt', capacity: 2, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 't4', name: 'Bàn 04 (VIP)', area: 'Tầng Trệt', capacity: 8, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 't5', name: 'Bàn 05', area: 'Lầu 1', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 't6', name: 'Bàn 06', area: 'Lầu 1', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'mv1', name: 'Mang Về 01', area: 'Mang Về', capacity: 1, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
];

export function createSampleModifierData(
  item: MenuItemWithModifiers,
  overrides?: Partial<SelectedModifierData>
): SelectedModifierData {
  return {
    item,
    qty: 1,
    selectedSize: 'Size Vừa (M)',
    sugarLevel: '100%',
    iceLevel: '100%',
    selectedToppings: [],
    note: '',
    unitPrice: item.price,
    ...overrides,
  };
}
