import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { UserRole, checkRoutePermission } from '../../store/useAuthStore';

export interface NavItemConfig {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Icon.glyphMap;
  route?: string;
  badgeKey?: 'occupied' | 'pendingKds' | 'outOfStock' | 'lowStock' | 'orderHistory';
  metricText?: string;
  isAction?: boolean;
  isBottomAction?: boolean;
}

export interface NavGroupConfig {
  groupTitle: string;
  items: NavItemConfig[];
}

export const RAW_NAV_GROUPS: NavGroupConfig[] = [
  {
    groupTitle: 'VẬN HÀNH BÁN HÀNG',
    items: [
      {
        id: 'pos_home',
        title: 'Bán Hàng & Gọi Món',
        subtitle: 'Sơ đồ bàn, mang về & thanh toán',
        icon: 'silverware-fork-knife',
        route: '/',
        badgeKey: 'occupied',
      },
      {
        id: 'kds_screen',
        title: 'Màn Hình Bếp / Bar',
        subtitle: 'Nhận món, trả món & chống sót đơn',
        icon: 'pot-steam',
        route: '/kds',
        badgeKey: 'pendingKds',
      },
      {
        id: 'hoa_don',
        title: 'Lịch Sử Đơn & Trả Món',
        subtitle: 'Soi đơn hủy, in lại bill & tra cứu',
        icon: 'receipt',
        route: '/hoa-don',
        badgeKey: 'orderHistory',
        metricText: 'Sổ đơn',
      },
    ],
  },
  {
    groupTitle: 'QUẢN LÝ BÀN & THỰC ĐƠN',
    items: [
      {
        id: 'thuc_don',
        title: 'Thực Đơn & Món Ăn',
        subtitle: 'Giá bán, size, topping & hết món',
        icon: 'food-fork-drink',
        route: '/thuc-don',
        badgeKey: 'outOfStock',
      },
      {
        id: 'kho_hang',
        title: 'Kho & Nguyên Liệu',
        subtitle: 'Nhập hàng, hao hụt & cảnh báo tồn',
        icon: 'package-variant-closed',
        route: '/kho-hang',
        badgeKey: 'lowStock',
        metricText: 'Tồn kho',
      },
      {
        id: 'so_cong_thuc',
        title: 'Sổ Công Thức (SOP)',
        subtitle: 'Định lượng, giá cost & pha chế',
        icon: 'book-open-variant',
        route: '/so-cong-thuc',
        metricText: 'Công thức',
      },
      {
        id: 'quan_ly_ban',
        title: 'Sắp Xếp Phòng Bàn',
        subtitle: 'Kê thêm bàn, đổi tên tầng & khu vực',
        icon: 'table-chair',
        route: '/quan-ly-ban',
        metricText: 'Khu vực',
      },
    ],
  },
  {
    groupTitle: 'TÀI CHÍNH & CHỦ QUÁN',
    items: [
      {
        id: 'so_quy',
        title: 'Sổ Quỹ Thu - Chi',
        subtitle: 'Chi chợ, đá, rau & phụ phí tức thì',
        icon: 'wallet-plus-outline',
        route: '/so-quy',
        metricText: 'Chi chợ 3s',
      },
      {
        id: 'giao_ca',
        title: 'Chốt Két Giao Ca',
        subtitle: 'Đếm tiền thực tế & kiểm lệch két',
        icon: 'account-cash-outline',
        route: '/giao-ca',
        metricText: 'Két 30s',
      },
      {
        id: 'pnl_report',
        title: 'Báo Cáo Lợi Nhuận',
        subtitle: '3 số vàng: Két, Bank, Lãi ròng',
        icon: 'chart-box-outline',
        route: '/bao-cao-loi-nhuan',
        metricText: '3 số vàng',
      },
      {
        id: 'khach_hang',
        title: 'Khách Quen & Sổ Nợ',
        subtitle: 'Tích điểm thành viên & công nợ gối đầu',
        icon: 'account-clock-outline',
        route: '/khach-hang',
        metricText: 'Sổ nợ',
      },
      {
        id: 'nhan_su',
        title: 'Nhân Viên & Bảng Ca',
        subtitle: 'Phân quyền vai trò, ca làm & chấm công',
        icon: 'account-group-outline',
        route: '/nhan-su',
        metricText: 'Chấm công',
      },
    ],
  },
  {
    groupTitle: 'HỆ THỐNG & THIẾT BỊ',
    items: [
      {
        id: 'cai_dat',
        title: 'Máy In & Thiết Bị',
        subtitle: 'Máy in LAN 9100, két RJ11 & mẫu bill',
        icon: 'cog-outline',
        route: '/cai-dat',
        metricText: 'TCP 9100',
      },
      {
        id: 'cfd_screen',
        title: 'Màn Phụ Khách (CFD)',
        subtitle: 'Giỏ hàng cho khách & VietQR động',
        icon: 'monitor-dashboard',
        route: '/cfd',
        metricText: 'VietQR',
      },
      {
        id: 'huong_dan',
        title: 'Cẩm Nang 1-Chạm',
        subtitle: 'Thao tác nhanh & xử lý sự cố POS',
        icon: 'help-circle-outline',
        route: '/huong-dan',
        metricText: 'Trợ giúp',
        isBottomAction: true,
      },
      {
        id: 'lock_screen',
        title: 'Khóa Máy (Tạm Rời)',
        subtitle: 'Bảo vệ máy thu ngân khi rời quầy',
        icon: 'lock-outline',
        metricText: 'Khóa 0s',
        isAction: true,
        isBottomAction: true,
      },
      {
        id: 'login_screen',
        title: 'Đổi Ca / Vào Ca Mới',
        subtitle: 'Chuyển tài khoản thu ngân, mã PIN',
        icon: 'account-sync-outline',
        metricText: 'Mã PIN',
        isAction: true,
        isBottomAction: true,
      },
    ],
  },
];

/**
 * Lọc nhóm và mục theo quyền vai trò (RBAC Clean Menu)
 * - Quyền bị chặn sẽ bị ẩn hoàn toàn để tối giản giao diện di động
 * - Nhóm rỗng sau khi lọc sẽ tự động bị loại bỏ
 */
export function getFilteredNavGroups(role: UserRole, enableKds: boolean = true): NavGroupConfig[] {
  return RAW_NAV_GROUPS.map((group) => ({
    groupTitle: group.groupTitle,
    items: group.items.filter((item) => {
      if (!enableKds && item.route === '/kds') return false;
      if (item.isAction || !item.route) return true;
      return checkRoutePermission(role, item.route);
    }),
  })).filter((group) => group.items.length > 0);
}

/**
 * Tách riêng các nhóm điều hướng thông thường và các phím tác vụ nhanh dưới đáy (Khóa máy, Đổi ca, Hướng dẫn)
 * Giúp giao diện di động hiển thị 16 chức năng mà không cần cuộn trang.
 */
export function getSplitNavConfig(role: UserRole, enableKds: boolean = true) {
  const fullGroups = getFilteredNavGroups(role, enableKds);
  const bottomActions: NavItemConfig[] = [];

  const mainGroups = fullGroups.map((group) => ({
    groupTitle: group.groupTitle,
    items: group.items.filter((item) => {
      if (item.isBottomAction) {
        bottomActions.push(item);
        return false;
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return { mainGroups, bottomActions };
}

