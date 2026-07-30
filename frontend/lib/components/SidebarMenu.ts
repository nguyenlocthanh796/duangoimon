import { SidebarItem, SidebarSubGroup, SidebarGroup } from './Sidebar';

// ─── All menu items ──────────────────────────────────────
export const allMenuItems: Record<string, SidebarItem> = {
  pos: {
    path: '/ban-hang',
    icon: 'cash-register',
    label: 'Thu Ngân (POS)',
    description: 'Sơ đồ bàn & bán hàng',
    isActive: (segs) => segs[0] === 'ban-hang' && segs[1] !== 'kitchen' && segs[1] !== 'settings',
  },
  posSettings: {
    path: '/ban-hang/settings',
    icon: 'cog-outline',
    label: 'Cài Đặt POS',
    description: 'Cấu hình máy in & hóa đơn',
    isActive: (segs) => segs[0] === 'ban-hang' && segs[1] === 'settings',
  },
  kitchen: {
    path: '/ban-hang/kitchen',
    icon: 'chef-hat',
    label: 'Nhà Bếp (KDS)',
    description: 'Quản lý món chế biến',
    isActive: (segs) => segs[0] === 'ban-hang' && segs[1] === 'kitchen',
  },
  quanLy: {
    path: '/quan-ly',
    icon: 'home-outline',
    label: 'Tổng Quan Kinh Doanh',
    description: 'Dashboard chỉ số chính',
    isActive: (segs) => segs[0] === 'quan-ly' && !segs[1],
  },
  products: {
    path: '/quan-ly/products',
    icon: 'package-variant-closed',
    label: 'Sản Phẩm & Kho Hàng',
    description: 'Thực đơn, BOM & kho',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'products',
  },
  crm: {
    path: '/quan-ly/crm',
    icon: 'account-group',
    label: 'Khách Hàng & CRM',
    description: 'Hội viên, KM & đặt bàn',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'crm',
  },
  analytics: {
    path: '/quan-ly/analytics',
    icon: 'chart-bar',
    label: 'Báo Cáo & Phân Tích',
    description: 'Báo cáo BI & dự báo',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'analytics',
  },
  system: {
    path: '/quan-ly/system',
    icon: 'cog-outline',
    label: 'Hệ Thống Vận Hành',
    description: 'Nhân sự, bàn & bếp',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'system',
  },
  keToanHub: {
    path: '/ke-toan',
    icon: 'wallet',
    label: 'Kế Toán & Thuế HKD',
    description: 'Quản lý thu chi & thuế',
    isActive: (segs) => segs[0] === 'ke-toan',
  },
};

export type ActiveModule = 'ban-hang' | 'quan-ly' | 'ke-toan';

// ─── Pre-built sections per module ────────────────────────
import { getKitchenModuleEnabled } from '../utils/kitchenSettings';

export function getSections(module: ActiveModule): SidebarGroup[] {
  switch (module) {
    case 'ban-hang':
      return [
        {
          label: 'Bán Hàng',
          items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings],
        },
        {
          label: 'Phân Hệ Khác',
          items: [allMenuItems.quanLy, allMenuItems.keToanHub],
        },
      ];

    case 'quan-ly':
      return [
        {
          label: 'Quản Lý',
          items: quanLySubGroups as unknown as (SidebarItem | SidebarSubGroup)[],
        },
        {
          label: 'Phân Hệ Khác',
          items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.keToanHub],
        },
      ];

    case 'ke-toan':
      return [
        {
          label: 'Kế Toán & Thuế',
          items: [allMenuItems.keToanHub],
        },
        {
          label: 'Phân Hệ Khác',
          items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.quanLy],
        },
      ];
  }
}

// ─── Role-based menus ────────────────────────────────────
const keToanThueItems: SidebarItem[] = [allMenuItems.keToanHub];

const quanLySubGroups: SidebarSubGroup[] = [
  {
    label: 'Trung Tâm Quản Lý',
    items: [
      allMenuItems.quanLy,
      allMenuItems.products,
      allMenuItems.crm,
      allMenuItems.analytics,
      allMenuItems.system,
    ],
  }
];

export const menuByRole: Record<string, SidebarGroup[]> = {
  cashier: [{ label: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings] }],
  kitchen: [{ label: 'Nhà Bếp', items: [allMenuItems.kitchen] }],
  accountant: [
    { label: 'Kế Toán & Thuế', items: keToanThueItems },
    { label: 'Quản Lý', items: [allMenuItems.quanLy] },
  ],
  admin: [
    { label: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings] },
    { label: 'Kế Toán & Thuế', items: keToanThueItems },
    { label: 'Quản Lý', items: quanLySubGroups },
  ],
  manager: [
    { label: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings] },
    { label: 'Kế Toán & Thuế', items: keToanThueItems },
    { label: 'Quản Lý', items: quanLySubGroups },
  ],
};
