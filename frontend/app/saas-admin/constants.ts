import { SaaSPlan } from '../../lib/store/useSaaSAdminStore';

export const SAAS_ADDON_OPTIONS: { code: string; name: string; icon: any; desc: string }[] = [
  { code: 'kds', name: 'Bếp KDS', icon: 'chef-hat', desc: 'Màn hình bếp realtime' },
  { code: 'cfd', name: 'Màn Khách CFD', icon: 'monitor-cellphone', desc: 'Màn phụ hiển thị QR' },
  { code: 'telegram_fraud', name: 'Bot Telegram', icon: 'robot', desc: 'Cảnh báo chống gian lận' },
  { code: 'pnl_reports', name: 'Báo Cáo P&L', icon: 'chart-box-outline', desc: '3 con số vàng bỏ túi' },
  { code: 'cash_shifts', name: 'Sổ Quỹ & Két', icon: 'cash-register', desc: 'Chi chợ 3s & Giao ca' },
  { code: 'multi_branch', name: 'Đa Chi Nhánh', icon: 'source-branch', desc: 'Chuỗi điểm tập trung' },
];

export const SAAS_PLAN_NAMES: Record<SaaSPlan, string> = {
  trial: 'Dùng Thử',
  standard: 'Gói Chuẩn',
  pro: 'Chuyên Nghiệp',
  enterprise: 'Doanh Nghiệp',
};

export const SAAS_PLAN_LIMIT_DESC: Record<SaaSPlan, string> = {
  trial: '1 CN · 2 POS',
  standard: '1 CN · 3 POS',
  pro: '3 CN · 10 POS',
  enterprise: '∞ CN · ∞ POS',
};

export type SaaSAdminTab = 'overview' | 'tenants' | 'new_tenant' | 'plans';
export type SaaSDetailSegment = 'plan' | 'branches' | 'devices' | 'addons' | 'invoices';

export type TenantSortOption = 'expiry_asc' | 'revenue_desc' | 'created_desc' | 'name_asc';

export interface ExpiryTierInfo {
  level: 'expired' | 'urgent' | 'warning' | 'safe';
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const getExpiryTier = (daysLeft: number, isActive: boolean): ExpiryTierInfo => {
  if (!isActive || daysLeft <= 0) {
    return {
      level: 'expired',
      label: 'Quá Hạn / Tạm Khóa',
      color: 'rgb(239, 68, 68)',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      icon: 'alert-octagon',
    };
  }
  if (daysLeft <= 7) {
    return {
      level: 'urgent',
      label: `Khẩn Cấp (${daysLeft} ngày)`,
      color: 'rgb(234, 88, 12)',
      bgColor: 'rgba(234, 88, 12, 0.1)',
      icon: 'clock-alert-outline',
    };
  }
  if (daysLeft <= 30) {
    return {
      level: 'warning',
      label: `Sắp Thu Phí (${daysLeft} ngày)`,
      color: 'rgb(217, 119, 6)',
      bgColor: 'rgba(217, 119, 6, 0.1)',
      icon: 'calendar-clock',
    };
  }
  return {
    level: 'safe',
    label: `Hoạt Động (${daysLeft} ngày)`,
    color: 'rgb(22, 163, 74)',
    bgColor: 'rgba(22, 163, 74, 0.1)',
    icon: 'check-circle-outline',
  };
};
