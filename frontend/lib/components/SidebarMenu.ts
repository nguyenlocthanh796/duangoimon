import { SidebarItem, SidebarSubGroup, SidebarGroup } from './Sidebar';

// ─── All menu items ──────────────────────────────────────
export const allMenuItems: Record<string, SidebarItem> = {
  pos: {
    path: '/ban-hang',
    icon: 'cash-register',
    label: 'Thu Ngân (POS)',
    description: 'Bàn & đặt món',
    isActive: (segs) => segs[0] === 'ban-hang' && segs[1] !== 'kitchen',
  },
  posSettings: {
    path: '/ban-hang/settings',
    icon: 'cog-outline',
    label: 'Cài Đặt Bán Hàng',
    description: 'Cấu hình in, VAT, POS',
    isActive: (segs) => segs[0] === 'ban-hang' && segs[1] === 'settings',
  },
  kitchen: {
    path: '/ban-hang/kitchen',
    icon: 'chef-hat',
    label: 'Nhà Bếp',
    description: 'Quản lý order bếp',
    isActive: (segs) => segs[0] === 'ban-hang' && segs[1] === 'kitchen',
  },
  invoices: {
    path: '/ke-toan/invoices',
    icon: 'receipt',
    label: 'Hóa đơn VAT',
    description: 'Xuất & quản lý HĐ',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'invoices',
  },
  quanLy: {
    path: '/quan-ly',
    icon: 'home-outline',
    label: 'Tổng Quan',
    description: 'Dashboard',
    isActive: (segs) => segs[0] === 'quan-ly' && !segs[1],
  },
  products: {
    path: '/quan-ly/products',
    icon: 'package-variant-closed',
    label: 'Sản Phẩm & Kho',
    description: 'Thực đơn, kho hàng',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'products',
  },
  crm: {
    path: '/quan-ly/crm',
    icon: 'account-group',
    label: 'Khách & Marketing',
    description: 'CRM & Khuyến mãi',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'crm',
  },
  analytics: {
    path: '/quan-ly/analytics',
    icon: 'chart-bar',
    label: 'Báo Cáo & Phân Tích',
    description: 'Số liệu kinh doanh',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'analytics',
  },
  system: {
    path: '/quan-ly/system',
    icon: 'cog-outline',
    label: 'Hệ Thống & Vận Hành',
    description: 'Nhân sự, chi nhánh',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'system',
  },
  recipes: {
    path: '/quan-ly/recipes',
    icon: 'flask-outline',
    label: 'Công Thức',
    description: 'Recipe BOM & giá thành',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'recipes',
  },
  stock: {
    path: '/quan-ly/stock',
    icon: 'package-variant-closed',
    label: 'Tồn Kho',
    description: 'Nguyên liệu & nhập hàng',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'stock',
  },
  suppliers: {
    path: '/quan-ly/suppliers',
    icon: 'truck-delivery',
    label: 'Nhà Cung Cấp',
    description: 'NCC & đơn đặt hàng',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'suppliers',
  },
  purchaseOrders: {
    path: '/quan-ly/purchase-orders',
    icon: 'file-document-outline',
    label: 'Đơn Đặt Hàng',
    description: 'PO & nhập kho',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'purchase-orders',
  },
  shifts: {
    path: '/quan-ly/shifts',
    icon: 'clock-outline',
    label: 'Ca Làm Việc',
    description: 'Mở/kết ca & doanh thu',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'shifts',
  },
  audit: {
    path: '/quan-ly/audit',
    icon: 'clipboard-text-outline',
    label: 'Audit Log',
    description: 'Lịch sử thao tác',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'audit',
  },
  booking: {
    path: '/quan-ly/booking',
    icon: 'calendar-text',
    label: 'Đặt Bàn',
    description: 'Quản lý đặt bàn trước',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'booking',
  },
  customers: {
    path: '/quan-ly/customers',
    icon: 'account-group',
    label: 'Khách Hàng',
    description: 'CRM & lịch sử KH',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'customers',
  },
  marketing: {
    path: '/quan-ly/marketing',
    icon: 'bullhorn',
    label: 'Marketing',
    description: 'Chiến dịch & gửi tin',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'marketing',
  },
  membership: {
    path: '/quan-ly/membership',
    icon: 'crown',
    label: 'Hội Viên',
    description: 'Hạng & tích điểm',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'membership',
  },
  promo: {
    path: '/quan-ly/promo',
    icon: 'ticket-percent',
    label: 'Khuyến Mãi',
    description: 'Voucher & quy tắc KM',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'promo',
  },
  menuEng: {
    path: '/quan-ly/menu-eng',
    icon: 'chart-pie',
    label: 'Menu Eng.',
    description: 'BCG matrix & top/bottom',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'menu-eng',
  },
  biReports: {
    path: '/quan-ly/bi-reports',
    icon: 'chart-box-outline',
    label: 'BI Reports',
    description: 'Báo cáo doanh thu & food cost',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'bi-reports',
  },
  execDashboard: {
    path: '/quan-ly/exec-dashboard',
    icon: 'view-dashboard',
    label: 'Exec Dashboard',
    description: 'Dashboard lãnh đạo',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'exec-dashboard',
  },
  stations: {
    path: '/quan-ly/stations',
    icon: 'stove',
    label: 'Trạm Bếp',
    description: 'Phân luồng món & máy in',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'stations',
  },
  branches: {
    path: '/quan-ly/branches',
    icon: 'domain',
    label: 'Chi Nhánh',
    description: 'Quản lý chi nhánh',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'branches',
  },
  forecast: {
    path: '/quan-ly/forecast',
    icon: 'chart-timeline-variant',
    label: 'Dự Báo',
    description: 'Dự báo nhu cầu',
    isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'forecast',
  },
  keToanHub: {
    path: '/ke-toan',
    icon: 'wallet',
    label: 'Kế toán & Thuế',
    description: 'Tổng quan & nghĩa vụ thuế HKD',
    isActive: (segs) => segs[0] === 'ke-toan',
  },
  thuChi: {
    path: '/ke-toan/thu-chi',
    icon: 'swap-vertical',
    label: 'Thu Chi',
    description: 'Quản lý thu chi kế toán',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thu-chi',
  },
  thueTier: {
    path: '/ke-toan/thue/tier',
    icon: 'chart-bell-curve',
    label: 'Phân Tầng HKD',
    description: 'Nhóm 1-4 & cảnh báo',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thue' && segs[2] === 'tier',
  },
  thueSoSach: {
    path: '/ke-toan/thue/so-sach',
    icon: 'book-open-page-variant',
    label: 'Sổ Kế Toán',
    description: 'S1a / S2a-e / S3a',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thue' && segs[2] === 'so-sach',
  },
  thueDecl: {
    path: '/ke-toan/thue/declaration',
    icon: 'file-document-edit',
    label: 'Kê Khai Thuế',
    description: 'Xuất XML 01/CNKD',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thue' && segs[2] === 'declaration',
  },
  thueBank: {
    path: '/ke-toan/thue/bank-accounts',
    icon: 'bank',
    label: 'TK Ngân Hàng',
    description: '01/BK-STK',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thue' && segs[2] === 'bank-accounts',
  },
  thueDeadline: {
    path: '/ke-toan/thue/deadlines',
    icon: 'calendar-alert',
    label: 'Hạn Nộp & Cảnh báo',
    description: 'Lịch & leo thang',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thue' && segs[2] === 'deadlines',
  },
  thueLegacy: {
    path: '/ke-toan/thue/legacy',
    icon: 'package-variant-closed',
    label: 'Kê Khai Chuyển Tiếp',
    description: '01/BK-HTK',
    isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'thue' && segs[2] === 'legacy',
  },
};

export type ActiveModule = 'ban-hang' | 'quan-ly' | 'ke-toan';

// ─── Pre-built sections per module ────────────────────────
import { getKitchenModuleEnabled } from '../utils/kitchenSettings';

export function getSections(module: ActiveModule): SidebarGroup[] {
  const showKitchen = getKitchenModuleEnabled();
  switch (module) {
    case 'ban-hang':
      return [
        {
          label: 'Bán Hàng',
          items: showKitchen
            ? [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings]
            : [allMenuItems.pos, allMenuItems.posSettings],
        },
        {
          label: 'Khác',
          items: [allMenuItems.quanLy, allMenuItems.keToanHub, allMenuItems.invoices],
        },
      ];

    case 'quan-ly':
      return [
        {
          label: 'Quản Lý',
          items: quanLySubGroups as unknown as (SidebarItem | SidebarSubGroup)[],
        },
        {
          label: 'Khác',
          items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.keToanHub, allMenuItems.invoices],
        },
      ];

    case 'ke-toan':
      return [
        {
          label: 'Kế Toán & Thuế',
          items: [
            allMenuItems.keToanHub,
            allMenuItems.thuChi,
            allMenuItems.invoices,
            {
              label: 'Thuế',
              items: [
                allMenuItems.thueTier,
                allMenuItems.thueSoSach,
                allMenuItems.thueDecl,
                allMenuItems.thueBank,
                allMenuItems.thueDeadline,
                allMenuItems.thueLegacy,
              ],
            },
          ],
        },
        {
          label: 'Khác',
          items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.quanLy],
        },
      ];
  }
}

// ─── Role-based menus ────────────────────────────────────
const keToanThueItems: SidebarItem[] = [allMenuItems.keToanHub];

const quanLySubGroups: SidebarSubGroup[] = [
  {
    label: 'Module Quản Lý',
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
    { label: 'Kế toán & Thuế', items: keToanThueItems },
    { label: 'Quản Lý', items: [allMenuItems.quanLy] },
  ],
  admin: [
    { label: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings] },
    { label: 'Kế toán & Thuế', items: keToanThueItems },
    { label: 'Quản Lý', items: quanLySubGroups },
  ],
  manager: [
    { label: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen, allMenuItems.posSettings] },
    { label: 'Kế toán & Thuế', items: keToanThueItems },
    { label: 'Quản Lý', items: quanLySubGroups },
  ],
};
