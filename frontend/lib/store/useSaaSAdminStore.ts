import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../api/apiClient';
import { lightTheme } from '../theme';

export type SaaSPlan = 'trial' | 'standard' | 'pro' | 'enterprise';
export type SaaSTenantStatus = 'all' | 'active' | 'expiring' | 'suspended';

export interface TenantDevice {
  id: string;
  tenantId: string;
  branchId?: string;
  deviceName: string;
  deviceRole: 'pos' | 'kds' | 'cfd' | 'waiter';
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
  ipAddress?: string;
  isOnline: boolean;
  isActive?: boolean;
  lastActive: string;
}

export interface TenantAddon {
  id: string;
  tenantId: string;
  addonCode: 'kds' | 'cfd' | 'telegram_fraud' | 'pnl_reports' | 'cash_shifts' | 'multi_branch' | string;
  addonName: string;
  isEnabled: boolean;
  monthlyFee: number;
}

export interface TenantBranch {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isMain: boolean;
  isActive: boolean;
  deviceCount: number;
  createdAt: string;
}

export interface SaaSInvoiceRecord {
  id: string;
  tenantId: string;
  invoiceCode: string;
  amount: number;
  monthsAdded: number;
  paymentMethod: 'vietqr' | 'cash' | 'bank_transfer';
  note?: string;
  createdAt: string;
}

export interface SaaSTenant {
  id: string;
  name: string;
  subdomain: string;
  phone: string;
  ownerName: string;
  subscriptionPlan: SaaSPlan;
  licenseExpiresAt: string;
  licenseDaysLeft: number;
  isActive: boolean;
  branchCount: number;
  deviceCount: number;
  monthlyFee: number;
  createdAt: string;
  configuredRoles?: ('cashier' | 'server' | 'manager' | 'owner')[];
}

export interface SaaSLicenseKey {
  key: string;
  plan: SaaSPlan;
  durationDays: number;
  maxBranches: number | 'unlimited';
  maxDevices: number | 'unlimited';
  isUsed: boolean;
  usedByTenantId?: string;
  usedByTenantName?: string;
  usedAt?: string;
  note?: string;
  createdAt: string;
}

export interface SaaSPlanTier {
  id: SaaSPlan;
  name: string;
  pricePerMonth: number;
  maxBranches: number | 'unlimited';
  maxDevices: number | 'unlimited';
  tagline: string;
  badgeColor: string;
  features: string[];
  enabledAddons: string[]; // ['kds', 'cfd', 'telegram_fraud', 'pnl_reports', 'cash_shifts', 'multi_branch']
}

export const SAAS_PLAN_TIERS: Record<SaaSPlan, SaaSPlanTier> = {
  trial: {
    id: 'trial',
    name: 'Dùng Thử',
    pricePerMonth: 0,
    maxBranches: 1,
    maxDevices: 2,
    tagline: 'Trải nghiệm 14 ngày không rủi ro',
    badgeColor: lightTheme.text.muted,
    features: ['1 Chi nhánh', '2 Thiết bị POS', 'Hỗ trợ giờ hành chính', 'Đầy đủ tính năng POS'],
    enabledAddons: ['cash_shifts'],
  },
  standard: {
    id: 'standard',
    name: 'Chuẩn (Gói Quán Đơn)',
    pricePerMonth: 199000,
    maxBranches: 1,
    maxDevices: 3,
    tagline: 'Phù hợp quán cà phê, trà sữa 1 điểm',
    badgeColor: lightTheme.brand.success,
    features: ['1 Chi nhánh', '3 Thiết bị POS/KDS', 'In nhiệt ESC/POS 9100', 'Sổ quỹ chi chợ & Giao ca 30s'],
    enabledAddons: ['cash_shifts', 'pnl_reports'],
  },
  pro: {
    id: 'pro',
    name: 'Chuyên Nghiệp (Gói Hot)',
    pricePerMonth: 399000,
    maxBranches: 3,
    maxDevices: 10,
    tagline: 'Tối ưu cho quán đông khách & 2-3 chi nhánh',
    badgeColor: lightTheme.brand.cyan,
    features: ['Tối đa 3 Chi nhánh', '10 Thiết bị (POS + KDS + Order)', 'Bot Telegram cảnh báo gian lận', 'Báo cáo P&L 3 số vàng bỏ túi'],
    enabledAddons: ['kds', 'cfd', 'telegram_fraud', 'pnl_reports', 'cash_shifts', 'multi_branch'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Doanh Nghiệp (Chuỗi Lớn)',
    pricePerMonth: 799000,
    maxBranches: 'unlimited',
    maxDevices: 'unlimited',
    tagline: 'Toàn quyền chuỗi đa điểm không giới hạn',
    badgeColor: lightTheme.brand.purple,
    features: ['Không giới hạn Chi nhánh', 'Không giới hạn Thiết bị', 'Máy chủ riêng biệt 99.9% Uptime', 'Hỗ trợ kỹ thuật 24/7 ưu tiên'],
    enabledAddons: ['kds', 'cfd', 'telegram_fraud', 'pnl_reports', 'cash_shifts', 'multi_branch'],
  },
};

export const DEFAULT_LICENSE_KEYS: SaaSLicenseKey[] = [];

export const INITIAL_SAAS_TENANTS: SaaSTenant[] = [];

export const DEFAULT_TENANT_BRANCHES: Record<string, TenantBranch[]> = {};

export const DEFAULT_TENANT_DEVICES: Record<string, TenantDevice[]> = {};

export const DEFAULT_TENANT_ADDONS: Record<string, TenantAddon[]> = {};

export const DEFAULT_SAAS_INVOICES: Record<string, SaaSInvoiceRecord[]> = {};

export interface SaaSOverviewMetrics {
  totalTenants: number;
  activeTenants: number;
  expiringTenants: number;
  suspendedTenants: number;
  urgentTenantsCount: number;
  totalMRR: number;
  annualARR: number;
  renewalRate: number;
}

export interface SaaSAdminState {
  tenants: SaaSTenant[];
  searchQuery: string;
  selectedPlanFilter: 'all' | SaaSPlan;
  selectedStatusFilter: SaaSTenantStatus;
  isLoading: boolean;

  // Multi-Tenant Branches, Device Fleet, Addons & Invoices
  branchesByTenant: Record<string, TenantBranch[]>;
  devicesByTenant: Record<string, TenantDevice[]>;
  addonsByTenant: Record<string, TenantAddon[]>;
  invoicesByTenant: Record<string, SaaSInvoiceRecord[]>;

  // Pricing Plans & License Key Engine
  plans: Record<SaaSPlan, SaaSPlanTier>;
  licenseKeys: SaaSLicenseKey[];
  deletedTenantIds: string[];

  // Actions
  setSearchQuery: (query: string) => void;
  setPlanFilter: (plan: 'all' | SaaSPlan) => void;
  setStatusFilter: (status: SaaSTenantStatus) => void;
  createTenant: (params: {
    name: string;
    subdomain: string;
    phone: string;
    ownerName?: string;
    subscriptionPlan: SaaSPlan;
    durationMonths?: number;
    ownerUsername?: string;
    ownerPassword?: string;
    ownerPin?: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    tenantCode?: string;
    ownerUsername?: string;
    ownerPassword?: string;
    ownerPin?: string;
  }>;
  fetchTenants: () => Promise<void>;
  deleteTenant: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
  toggleTenantStatus: (tenantId: string) => Promise<{ success: boolean; newStatus: boolean }>;
  renewTenantLicense: (tenantId: string, months: number) => Promise<{ success: boolean; newExpiry: string }>;
  resetTenantPin: (tenantId: string) => Promise<{ success: boolean; ownerPin: string; rescueCode: string }>;
  getMetrics: () => SaaSOverviewMetrics;
  getUrgentTenants: () => SaaSTenant[];
  getFilteredTenants: () => SaaSTenant[];

  // Branches, Fleet, Addons & Invoices Actions
  fetchTenantBranches: (tenantId: string) => Promise<TenantBranch[]>;
  createTenantBranch: (tenantId: string, params: { name: string; address?: string; phone?: string; managerName?: string }) => Promise<{ success: boolean; error?: string; branch?: TenantBranch }>;
  toggleTenantBranchStatus: (tenantId: string, branchId: string) => Promise<{ success: boolean; newStatus: boolean }>;
  changeTenantPlan: (tenantId: string, newPlan: SaaSPlan) => Promise<{ success: boolean; warning?: string; monthlyFee: number }>;
  getTenantQuota: (tenantId: string) => {
    branchCount: number;
    branchUsage: number;
    maxBranches: number | 'unlimited';
    branchPercent: number;
    isAtBranchLimit: boolean;
    isOverBranchLimit: boolean;
    deviceCount: number;
    deviceUsage: number;
    maxDevices: number | 'unlimited';
    devicePercent: number;
    isAtDeviceLimit: boolean;
    isOverDeviceLimit: boolean;
  };
  fetchTenantDevices: (tenantId: string) => Promise<TenantDevice[]>;
  unbindTenantDevice: (tenantId: string, deviceId: string) => Promise<{ success: boolean }>;
  fetchTenantAddons: (tenantId: string) => Promise<TenantAddon[]>;
  toggleTenantAddon: (tenantId: string, addonCode: string, isEnabled: boolean, customFee?: number) => Promise<{ success: boolean }>;
  fetchTenantInvoices: (tenantId: string) => Promise<SaaSInvoiceRecord[]>;

  // Pricing Plans & License Key Actions
  updatePlanConfig: (planId: SaaSPlan, updates: Partial<SaaSPlanTier>) => Promise<{ success: boolean; error?: string }>;
  resetPlanConfigs: () => Promise<{ success: boolean; error?: string }>;
  fetchPlanConfigs: () => Promise<void>;
  createLicenseKey: (params: { plan: SaaSPlan; durationDays: number; maxBranches?: number | 'unlimited'; maxDevices?: number | 'unlimited'; note?: string }) => Promise<{ success: boolean; key?: SaaSLicenseKey; error?: string }>;
  redeemLicenseKey: (tenantId: string, key: string) => Promise<{ success: boolean; message?: string; daysAdded?: number; plan?: SaaSPlan; error?: string }>;
  deleteLicenseKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  fetchLicenseKeys: () => Promise<SaaSLicenseKey[]>;

  // Aliases & Backwards Compatibility
  fetchPlans?: () => Promise<void>;
  resetPlansToDefault?: () => Promise<{ success: boolean; error?: string }>;
  generateLicenseKey?: (plan: SaaSPlan, durationDays: number, note?: string) => Promise<SaaSLicenseKey>;
  updateTenantPlan?: (tenantId: string, newPlan: SaaSPlan) => Promise<{ success: boolean; warning?: string; monthlyFee: number }>;
  renewTenant?: (tenantId: string, months: number) => Promise<{ success: boolean; newExpiry: string }>;
  generateRescueCode?: (tenantId: string) => Promise<{ success: boolean; ownerPin: string; ownerPinReset: string; rescueCode: string }>;
  addTenantBranch?: (tenantId: string, params: { name: string; address?: string; phone?: string; managerName?: string }) => Promise<{ success: boolean; error?: string; branch?: TenantBranch }>;
  toggleBranchStatus?: (tenantId: string, branchId: string) => Promise<{ success: boolean; newStatus: boolean }>;
  toggleDeviceStatus?: (tenantId: string, deviceId: string) => Promise<{ success: boolean; newStatus: boolean }>;
  toggleTenantDeviceStatus?: (tenantId: string, deviceId: string) => Promise<{ success: boolean; newStatus: boolean }>;
  unbindDevice?: (tenantId: string, deviceId: string) => Promise<{ success: boolean }>;
}

export function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  let token = '';
  try {
    const { useAuthStore } = require('./useAuthStore');
    token = useAuthStore.getState().token || '';
  } catch (_) {}

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const useSaaSAdminStore = create<SaaSAdminState>()(
  persist(
    (set, get) => ({
      tenants: INITIAL_SAAS_TENANTS,
      searchQuery: '',
      selectedPlanFilter: 'all',
      selectedStatusFilter: 'all',
      isLoading: false,

      // Multi-Tenant Branches, Device Fleet, Addons & Invoices
      branchesByTenant: DEFAULT_TENANT_BRANCHES,
      devicesByTenant: DEFAULT_TENANT_DEVICES,
      addonsByTenant: DEFAULT_TENANT_ADDONS,
      invoicesByTenant: DEFAULT_SAAS_INVOICES,

      // Pricing Plans & License Key Engine
      plans: SAAS_PLAN_TIERS,
      licenseKeys: DEFAULT_LICENSE_KEYS,
      deletedTenantIds: [],

      setSearchQuery: (query) => set({ searchQuery: query }),
      setPlanFilter: (plan) => set({ selectedPlanFilter: plan }),
      setStatusFilter: (status) => set({ selectedStatusFilter: status }),

      fetchTenants: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.tenants)) {
              // Map remote data if present
              const mapped: SaaSTenant[] = data.tenants.map((t: any) => {
                const basePrice = SAAS_PLAN_TIERS[(t.subscription_plan as SaaSPlan) || 'standard']?.pricePerMonth || 199000;
                const tenantAddons = get().addonsByTenant[t.id] || DEFAULT_TENANT_ADDONS[t.id] || [];
                const addonsFee = tenantAddons.filter((a) => a.isEnabled).reduce((sum, a) => sum + a.monthlyFee, 0);
                return {
                  id: t.id,
                  name: t.name,
                  subdomain: t.subdomain,
                  phone: t.phone || '',
                  ownerName: t.owner_name || 'Chủ Quán',
                  subscriptionPlan: t.subscription_plan || 'standard',
                  licenseExpiresAt: t.license_expires_at || new Date().toISOString(),
                  licenseDaysLeft: t.license_days_left || 30,
                  isActive: t.is_active !== false,
                  branchCount: t.branch_count ?? 1,
                  deviceCount: t.device_count ?? 0,
                  monthlyFee: basePrice + addonsFee,
                  createdAt: t.created_at || new Date().toISOString(),
                };
              });
              set({ tenants: mapped });
            }
          }
        } catch {
          // Offline fallback - preserve local cache
        } finally {
          set({ isLoading: false });
        }
      },

      createTenant: async (params) => {
        const cleanName = params.name.trim();
        const cleanSubdomain = params.subdomain.trim().toLowerCase();
        const cleanPh = params.phone.replace(/[^\d]/g, '');

        if (!cleanName || !cleanSubdomain) {
          return { success: false, error: 'Tên quán và mã quán không được để trống' };
        }

        // 1. Kiểm tra trùng Tên Quán
        const nameDup = get().tenants.find(
          (t) => t.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (nameDup) {
          return { success: false, error: `Tên quán "${cleanName}" đã tồn tại trên hệ thống` };
        }

        // 2. Kiểm tra trùng Số Điện Thoại
        if (cleanPh) {
          const phoneDup = get().tenants.find(
            (t) => t.phone.replace(/[^\d]/g, '') === cleanPh
          );
          if (phoneDup) {
            return {
              success: false,
              error: `Số điện thoại "${params.phone}" đã được đăng ký cho quán "${phoneDup.name}"`,
            };
          }
        }

        // 3. Kiểm tra trùng Mã Quán (Subdomain)
        const existing = get().tenants.find((t) => t.subdomain === cleanSubdomain);
        if (existing) {
          return { success: false, error: `Mã quán "${cleanSubdomain}" đã tồn tại` };
        }

        const duration = params.durationMonths || 1;
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + duration);

        const username = params.ownerUsername?.trim() || cleanPh || 'owner';
        const password = params.ownerPassword?.trim() || '123456';
        const pin = params.ownerPin?.trim() || '9999';

        const newTenant: SaaSTenant = {
          id: 'tenant_' + cleanSubdomain,
          name: params.name.trim(),
          subdomain: cleanSubdomain,
          phone: params.phone.trim(),
          ownerName: params.ownerName?.trim() || 'Chủ Quán',
          subscriptionPlan: params.subscriptionPlan,
          licenseExpiresAt: expiryDate.toISOString(),
          licenseDaysLeft: duration * 30,
          isActive: true,
          branchCount: 1,
          deviceCount: 1,
          monthlyFee: SAAS_PLAN_TIERS[params.subscriptionPlan].pricePerMonth,
          createdAt: new Date().toISOString(),
        };

        // Call backend
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({
              name: newTenant.name,
              subdomain: newTenant.subdomain,
              phone: newTenant.phone,
              subscription_plan: newTenant.subscriptionPlan,
              duration_months: duration,
              owner_username: username,
              owner_password: password,
              owner_pin: pin,
            }),
          });
          const data = await res.json();
          if (data && data.success === false) {
            return { success: false, error: data.error || 'Lỗi từ máy chủ khi tạo quán' };
          }
        } catch {
          // Offline fallback
        }

        set((state) => ({
          tenants: [newTenant, ...state.tenants],
        }));

        return {
          success: true,
          tenantCode: cleanSubdomain,
          ownerUsername: username,
          ownerPassword: password,
          ownerPin: pin,
        };
      },

      deleteTenant: async (tenantId: string) => {
        const target = get().tenants.find((t) => t.id === tenantId);
        if (!target) return { success: false, error: 'Không tìm thấy quán cần xóa' };

        fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}`, {
          method: 'DELETE',
          headers: getAdminHeaders(),
        }).catch(() => {});

        // Dọn sạch mapping số điện thoại nếu có
        try {
          const { KNOWN_PHONE_TENANTS } = require('./useAuthStore');
          if (target.phone && KNOWN_PHONE_TENANTS[target.phone]) {
            delete KNOWN_PHONE_TENANTS[target.phone];
          }
          const cleanPh = target.phone.replace(/[^\d]/g, '');
          if (cleanPh && KNOWN_PHONE_TENANTS[cleanPh]) {
            delete KNOWN_PHONE_TENANTS[cleanPh];
          }
        } catch (_) {}

        set((state) => {
          const remainingTenants = state.tenants.filter((t) => t.id !== tenantId);
          const { [tenantId]: _b, ...remainingBranches } = state.branchesByTenant;
          const { [tenantId]: _d, ...remainingDevices } = state.devicesByTenant;
          const { [tenantId]: _a, ...remainingAddons } = state.addonsByTenant;
          const { [tenantId]: _i, ...remainingInvoices } = state.invoicesByTenant;

          const toDelete = [
            tenantId,
            target.subdomain,
            target.phone,
            target.phone ? target.phone.replace(/[^\d]/g, '') : '',
          ].filter(Boolean);
          const newDeleted = Array.from(new Set([...(state.deletedTenantIds || []), ...toDelete]));

          return {
            tenants: remainingTenants,
            branchesByTenant: remainingBranches,
            devicesByTenant: remainingDevices,
            addonsByTenant: remainingAddons,
            invoicesByTenant: remainingInvoices,
            deletedTenantIds: newDeleted,
          };
        });

        return { success: true };
      },

      toggleTenantStatus: async (tenantId) => {
        const target = get().tenants.find((t) => t.id === tenantId);
        if (!target) return { success: false, newStatus: false };

        const updatedStatus = !target.isActive;

        fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/status`, {
          method: 'PATCH',
          headers: getAdminHeaders(),
        }).catch(() => {});

        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === tenantId ? { ...t, isActive: updatedStatus } : t
          ),
        }));

        return { success: true, newStatus: updatedStatus };
      },

      renewTenantLicense: async (tenantId, months) => {
        const target = get().tenants.find((t) => t.id === tenantId);
        if (!target) return { success: false, newExpiry: '' };

        const currentExpiry = new Date(target.licenseExpiresAt);
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        baseDate.setMonth(baseDate.getMonth() + months);
        const newExpiryStr = baseDate.toISOString();
        const daysLeft = Math.max(0, Math.round((baseDate.getTime() - Date.now()) / (24 * 3600 * 1000)));

        fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/renew`, {
          method: 'POST',
          headers: getAdminHeaders(),
          body: JSON.stringify({ months }),
        }).catch(() => {});

        const invoiceAmount = (target.monthlyFee || 199000) * months;
        const newInvoice: SaaSInvoiceRecord = {
          id: 'inv_' + Date.now(),
          tenantId,
          invoiceCode: 'INV-2026-' + Math.floor(1000 + Math.random() * 9000),
          amount: invoiceAmount,
          monthsAdded: months,
          paymentMethod: 'vietqr',
          note: `Gia hạn ${months} tháng bản quyền (${target.name})`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === tenantId
              ? {
                  ...t,
                  licenseExpiresAt: newExpiryStr,
                  licenseDaysLeft: daysLeft,
                  isActive: true,
                }
              : t
          ),
          invoicesByTenant: {
            ...state.invoicesByTenant,
            [tenantId]: [newInvoice, ...(state.invoicesByTenant[tenantId] || [])],
          },
        }));

        return { success: true, newExpiry: newExpiryStr };
      },

      resetTenantPin: async (tenantId) => {
        const rescueCode = 'SAAS' + Math.floor(100000 + Math.random() * 900000);

        fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/rescue-pin`, {
          method: 'POST',
          headers: getAdminHeaders(),
        }).catch(() => {});

        return {
          success: true,
          ownerPin: '9999',
          rescueCode,
        };
      },

      fetchTenantBranches: async (tenantId) => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/branches`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.branches)) {
              const mapped: TenantBranch[] = data.branches.map((b: any) => ({
                id: b.id,
                tenantId: b.tenant_id,
                name: b.name,
                address: b.address || '',
                phone: b.phone || '',
                managerName: b.manager_name || '',
                isMain: b.is_main === true,
                isActive: b.is_active !== false,
                deviceCount: b.device_count || 0,
                createdAt: b.created_at || new Date().toISOString(),
              }));
              set((state) => ({
                branchesByTenant: { ...state.branchesByTenant, [tenantId]: mapped },
                tenants: state.tenants.map((t) =>
                  t.id === tenantId ? { ...t, branchCount: mapped.length } : t
                ),
              }));
              return mapped;
            }
          }
        } catch {}
        return get().branchesByTenant[tenantId] || [];
      },

      createTenantBranch: async (tenantId, params) => {
        const tenant = get().tenants.find((t) => t.id === tenantId);
        if (!tenant) return { success: false, error: 'Không tìm thấy quán' };

        const planCfg = SAAS_PLAN_TIERS[tenant.subscriptionPlan];
        const currentBranches = get().branchesByTenant[tenantId] || [];
        if (typeof planCfg.maxBranches === 'number' && currentBranches.length >= planCfg.maxBranches) {
          return {
            success: false,
            error: `Gói ${planCfg.name} chỉ cho phép tối đa ${planCfg.maxBranches} chi nhánh. Hãy nâng cấp gói!`,
          };
        }

        const newBranch: TenantBranch = {
          id: 'branch_' + Date.now(),
          tenantId,
          name: params.name.trim(),
          address: params.address?.trim() || '',
          phone: params.phone?.trim() || '',
          managerName: params.managerName?.trim() || '',
          isMain: currentBranches.length === 0,
          isActive: true,
          deviceCount: 0,
          createdAt: new Date().toISOString(),
        };

        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/branches`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({
              name: newBranch.name,
              address: newBranch.address,
              phone: newBranch.phone,
            }),
          });
        } catch {}

        set((state) => {
          const updated = [...(state.branchesByTenant[tenantId] || []), newBranch];
          return {
            branchesByTenant: { ...state.branchesByTenant, [tenantId]: updated },
            tenants: state.tenants.map((t) =>
              t.id === tenantId ? { ...t, branchCount: updated.length } : t
            ),
          };
        });

        return { success: true, branch: newBranch };
      },

      toggleTenantBranchStatus: async (tenantId, branchId) => {
        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/branches/${branchId}/status`, {
            method: 'PATCH',
            headers: getAdminHeaders(),
          });
        } catch {}

        let newStatus = true;
        set((state) => {
          const current = state.branchesByTenant[tenantId] || [];
          const updated = current.map((b) => {
            if (b.id === branchId) {
              newStatus = !b.isActive;
              return { ...b, isActive: newStatus };
            }
            return b;
          });
          return {
            branchesByTenant: { ...state.branchesByTenant, [tenantId]: updated },
          };
        });

        return { success: true, newStatus };
      },

      changeTenantPlan: async (tenantId, newPlan) => {
        const tenant = get().tenants.find((t) => t.id === tenantId);
        if (!tenant) return { success: false, monthlyFee: 0 };

        let warning: string | undefined;
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/plan`, {
            method: 'PATCH',
            headers: getAdminHeaders(),
            body: JSON.stringify({ subscription_plan: newPlan }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.warning) warning = data.warning;
          }
        } catch {}

        const currentPlanCfg = get().plans[newPlan] || SAAS_PLAN_TIERS[newPlan];
        const newBasePrice = currentPlanCfg.pricePerMonth;
        const tenantAddons = get().addonsByTenant[tenantId] || DEFAULT_TENANT_ADDONS[tenantId] || [];
        const addonsFee = tenantAddons.filter((a) => a.isEnabled).reduce((s, a) => s + a.monthlyFee, 0);
        const newMonthlyFee = newBasePrice + addonsFee;

        // Quota check warning if downgrade
        const planCfg = currentPlanCfg;
        const branches = get().branchesByTenant[tenantId] || [];
        const devices = get().devicesByTenant[tenantId] || [];
        if (typeof planCfg.maxBranches === 'number' && branches.length > planCfg.maxBranches) {
          warning = `Cảnh báo: Quán hiện có ${branches.length} CN, vượt trần ${planCfg.maxBranches} CN của gói ${planCfg.name}!`;
        }
        if (typeof planCfg.maxDevices === 'number' && devices.length > planCfg.maxDevices) {
          warning = `Cảnh báo: Quán hiện có ${devices.length} POS, vượt trần ${planCfg.maxDevices} POS của gói ${planCfg.name}!`;
        }

        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === tenantId
              ? {
                  ...t,
                  subscriptionPlan: newPlan,
                  monthlyFee: newMonthlyFee,
                }
              : t
          ),
        }));

        return { success: true, warning, monthlyFee: newMonthlyFee };
      },

      getTenantQuota: (tenantId) => {
        const tenant = get().tenants.find((t) => t.id === tenantId);
        const plan = tenant?.subscriptionPlan || 'standard';
        const planCfg = get().plans[plan] || SAAS_PLAN_TIERS[plan];

        const branches = get().branchesByTenant[tenantId] || [];
        const devices = get().devicesByTenant[tenantId] || [];

        const branchUsage = branches.length;
        const maxBranches = planCfg.maxBranches;
        const branchPercent =
          maxBranches === 'unlimited' ? 20 : Math.min(100, Math.round((branchUsage / maxBranches) * 100));

        const deviceUsage = devices.length;
        const maxDevices = planCfg.maxDevices;
        const devicePercent =
          maxDevices === 'unlimited' ? 20 : Math.min(100, Math.round((deviceUsage / maxDevices) * 100));

        const isAtBranchLimit = typeof maxBranches === 'number' && branchUsage >= maxBranches;
        const isOverBranchLimit = typeof maxBranches === 'number' && branchUsage > maxBranches;
        const isAtDeviceLimit = typeof maxDevices === 'number' && deviceUsage >= maxDevices;
        const isOverDeviceLimit = typeof maxDevices === 'number' && deviceUsage > maxDevices;

        return {
          branchCount: branchUsage,
          branchUsage,
          maxBranches,
          branchPercent,
          isAtBranchLimit,
          isOverBranchLimit,
          deviceCount: deviceUsage,
          deviceUsage,
          maxDevices,
          devicePercent,
          isAtDeviceLimit,
          isOverDeviceLimit,
        };
      },

      fetchTenantDevices: async (tenantId) => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/devices`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.devices) && data.devices.length > 0) {
              const mapped: TenantDevice[] = data.devices.map((d: any) => ({
                id: d.id,
                tenantId: d.tenant_id,
                branchId: d.branch_id,
                deviceName: d.device_name,
                deviceRole: d.device_role,
                platform: d.platform,
                appVersion: d.app_version,
                ipAddress: d.ip_address,
                isOnline: d.is_online,
                lastActive: d.last_active,
              }));
              set((state) => ({
                devicesByTenant: { ...state.devicesByTenant, [tenantId]: mapped },
              }));
              return mapped;
            }
          }
        } catch {}
        return get().devicesByTenant[tenantId] || DEFAULT_TENANT_DEVICES[tenantId] || [];
      },

      unbindTenantDevice: async (tenantId, deviceId) => {
        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/devices/${deviceId}`, {
            method: 'DELETE',
            headers: getAdminHeaders(),
          });
        } catch {}
        set((state) => {
          const current = state.devicesByTenant[tenantId] || [];
          const updated = current.filter((d) => d.id !== deviceId);
          return {
            devicesByTenant: { ...state.devicesByTenant, [tenantId]: updated },
            tenants: state.tenants.map((t) =>
              t.id === tenantId ? { ...t, deviceCount: Math.max(0, updated.length) } : t
            ),
          };
        });
        return { success: true };
      },

      fetchTenantAddons: async (tenantId) => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/addons`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.addons)) {
              const mapped: TenantAddon[] = data.addons.map((a: any) => ({
                id: a.id,
                tenantId: a.tenant_id,
                addonCode: a.addon_code,
                addonName: a.addon_name,
                isEnabled: a.is_enabled,
                monthlyFee: a.monthly_fee,
              }));
              set((state) => ({
                addonsByTenant: { ...state.addonsByTenant, [tenantId]: mapped },
              }));
              return mapped;
            }
          }
        } catch {}
        return get().addonsByTenant[tenantId] || [];
      },

      toggleTenantAddon: async (tenantId, addonCode, isEnabled, customFee) => {
        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/addons/${addonCode}`, {
            method: 'PATCH',
            headers: getAdminHeaders(),
            body: JSON.stringify({ is_enabled: isEnabled, monthly_fee: customFee }),
          });
        } catch {}

        set((state) => {
          const currentAddons = state.addonsByTenant[tenantId] || (DEFAULT_TENANT_ADDONS[tenantId] || []);
          const updatedAddons = currentAddons.map((a) =>
            a.addonCode === addonCode
              ? { ...a, isEnabled, ...(customFee !== undefined ? { monthlyFee: customFee } : {}) }
              : a
          );

          if (!updatedAddons.some((a) => a.addonCode === addonCode)) {
            updatedAddons.push({
              id: `addon_${addonCode}`,
              tenantId,
              addonCode,
              addonName: addonCode,
              isEnabled,
              monthlyFee: customFee || 0,
            });
          }

          const tenant = state.tenants.find((t) => t.id === tenantId);
          let newMonthlyFee = tenant?.monthlyFee || 0;
          if (tenant) {
            const basePlanFee = SAAS_PLAN_TIERS[tenant.subscriptionPlan]?.pricePerMonth || 199000;
            const addonsTotal = updatedAddons
              .filter((a) => a.isEnabled)
              .reduce((sum, a) => sum + a.monthlyFee, 0);
            newMonthlyFee = basePlanFee + addonsTotal;
          }

          return {
            addonsByTenant: { ...state.addonsByTenant, [tenantId]: updatedAddons },
            tenants: state.tenants.map((t) =>
              t.id === tenantId ? { ...t, monthlyFee: newMonthlyFee } : t
            ),
          };
        });

        return { success: true };
      },

      fetchTenantInvoices: async (tenantId) => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/invoices`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.invoices)) {
              const mapped: SaaSInvoiceRecord[] = data.invoices.map((inv: any) => ({
                id: inv.id,
                tenantId: inv.tenant_id,
                invoiceCode: inv.invoice_code,
                amount: inv.amount,
                monthsAdded: inv.months_added,
                paymentMethod: inv.payment_method || 'vietqr',
                note: inv.note,
                createdAt: inv.created_at,
              }));
              set((state) => ({
                invoicesByTenant: { ...state.invoicesByTenant, [tenantId]: mapped },
              }));
              return mapped;
            }
          }
        } catch {}
        return get().invoicesByTenant[tenantId] || [];
      },

      getMetrics: () => {
        const list = get().tenants;
        let active = 0;
        let expiring = 0;
        let suspended = 0;
        let totalMRR = 0;

        for (const t of list) {
          if (!t.isActive || t.licenseDaysLeft <= 0) {
            suspended++;
          } else {
            active++;
            totalMRR += t.monthlyFee;
            if (t.licenseDaysLeft <= 14) {
              expiring++;
            }
          }
        }

        return {
          totalTenants: list.length,
          activeTenants: active,
          expiringTenants: expiring,
          suspendedTenants: suspended,
          urgentTenantsCount: expiring + suspended,
          totalMRR,
          annualARR: totalMRR * 12,
          renewalRate: list.length > 0 ? Math.round((active / list.length) * 100) : 100,
        };
      },

      getUrgentTenants: () => {
        return get().tenants.filter((t) => !t.isActive || t.licenseDaysLeft <= 14);
      },

      getFilteredTenants: () => {
        const { tenants, searchQuery, selectedPlanFilter, selectedStatusFilter } = get();
        const q = searchQuery.toLowerCase().trim();

        return tenants.filter((t) => {
          // Search match
          const matchSearch =
            q === '' ||
            t.name.toLowerCase().includes(q) ||
            t.subdomain.toLowerCase().includes(q) ||
            t.phone.includes(q) ||
            t.ownerName.toLowerCase().includes(q);

          // Plan match
          const matchPlan = selectedPlanFilter === 'all' || t.subscriptionPlan === selectedPlanFilter;

          // Status match
          let matchStatus = true;
          if (selectedStatusFilter === 'active') {
            matchStatus = t.isActive && t.licenseDaysLeft > 14;
          } else if (selectedStatusFilter === 'expiring') {
            matchStatus = t.isActive && t.licenseDaysLeft <= 14 && t.licenseDaysLeft > 0;
          } else if (selectedStatusFilter === 'suspended') {
            matchStatus = !t.isActive || t.licenseDaysLeft <= 0;
          }

          return matchSearch && matchPlan && matchStatus;
        });
      },

      updatePlanConfig: async (planId, updates) => {
        const currentPlans = get().plans;
        const target = currentPlans[planId];
        if (!target) return { success: false };

        const updatedPlan: SaaSPlanTier = {
          ...target,
          ...updates,
        };

        set({
          plans: {
            ...currentPlans,
            [planId]: updatedPlan,
          },
        });

        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/plans/${planId}`, {
            method: 'PUT',
            headers: getAdminHeaders(),
            body: JSON.stringify({
              price_per_month: updatedPlan.pricePerMonth,
              max_branches: updatedPlan.maxBranches === 'unlimited' ? 9999 : updatedPlan.maxBranches,
              max_devices: updatedPlan.maxDevices === 'unlimited' ? 9999 : updatedPlan.maxDevices,
              enabled_addons: updatedPlan.enabledAddons?.join(','),
            }),
          });
        } catch {}

        return { success: true };
      },

      resetPlanConfigs: async () => {
        set({ plans: SAAS_PLAN_TIERS });
        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/plans/reset`, {
            method: 'POST',
            headers: getAdminHeaders(),
          });
        } catch {}
        return { success: true };
      },

      fetchPlanConfigs: async () => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/plans`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.plans && Array.isArray(data.plans)) {
              const newPlans = { ...get().plans };
              for (const p of data.plans) {
                const pid = p.plan_id as SaaSPlan;
                if (newPlans[pid]) {
                  newPlans[pid] = {
                    ...newPlans[pid],
                    pricePerMonth: p.price_per_month,
                    maxBranches: p.max_branches >= 9999 ? 'unlimited' : p.max_branches,
                    maxDevices: p.max_devices >= 9999 ? 'unlimited' : p.max_devices,
                    enabledAddons: p.enabled_addons ? p.enabled_addons.split(',') : newPlans[pid].enabledAddons,
                  };
                }
              }
              set({ plans: newPlans });
            }
          }
        } catch {}
      },

      createLicenseKey: async ({ plan, durationDays, note }) => {
        if (durationDays <= 0) {
          return { success: false, error: 'Số ngày phải lớn hơn 0' };
        }

        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randomStr2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const planCode = plan.substring(0, 3).toUpperCase();
        const keyStr = `OC-${planCode}-${durationDays}D-${randomStr}-${randomStr2}`;

        const currentPlanCfg = get().plans[plan] || SAAS_PLAN_TIERS[plan];
        const newKey: SaaSLicenseKey = {
          key: keyStr,
          plan,
          durationDays,
          maxBranches: currentPlanCfg.maxBranches,
          maxDevices: currentPlanCfg.maxDevices,
          isUsed: false,
          note: note?.trim(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          licenseKeys: [newKey, ...state.licenseKeys],
        }));

        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/license-keys`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({
              plan,
              duration_days: durationDays,
              note: note?.trim(),
            }),
          });
        } catch {}

        return { success: true, key: newKey };
      },

      redeemLicenseKey: async (tenantId, keyString) => {
        const cleanKey = keyString.trim().toUpperCase();
        const currentKeys = get().licenseKeys;
        const targetKey = currentKeys.find((k) => k.key.toUpperCase() === cleanKey);

        const tenants = get().tenants;
        const tenant = tenants.find((t) => t.id === tenantId);
        if (!tenant) {
          return { success: false, error: 'Không tìm thấy quán' };
        }

        if (targetKey && targetKey.isUsed) {
          return { success: false, error: `Key này đã được dùng bởi ${targetKey.usedByTenantName || 'quán khác'}` };
        }

        // Tính ngày hết hạn mới
        const now = Date.now();
        const currentExp = new Date(tenant.licenseExpiresAt).getTime();
        const baseTime = currentExp > now ? currentExp : now;
        const daysToAdd = targetKey ? targetKey.durationDays : 30;
        const newExpDate = new Date(baseTime + daysToAdd * 24 * 3600 * 1000);
        const daysLeft = Math.ceil((newExpDate.getTime() - now) / (24 * 3600 * 1000));
        const newPlan = targetKey ? targetKey.plan : tenant.subscriptionPlan;

        // Cập nhật tenant
        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === tenantId
              ? {
                  ...t,
                  subscriptionPlan: newPlan,
                  licenseExpiresAt: newExpDate.toISOString(),
                  licenseDaysLeft: daysLeft,
                  isActive: true,
                }
              : t
          ),
          licenseKeys: state.licenseKeys.map((k) =>
            k.key.toUpperCase() === cleanKey
              ? {
                  ...k,
                  isUsed: true,
                  usedByTenantId: tenant.id,
                  usedByTenantName: tenant.name,
                  usedAt: new Date().toISOString(),
                }
              : k
          ),
        }));

        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/license-keys/redeem`, {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({ tenant_id: tenantId, key: cleanKey }),
          });
          if (res.ok) {
            const data = await res.json();
            return {
              success: true,
              message: data.message,
              daysAdded: daysToAdd,
              plan: newPlan,
            };
          }
        } catch {}

        return {
          success: true,
          message: `Đã nạp Key thành công! Cộng thêm ${daysToAdd} ngày gói ${newPlan.toUpperCase()}`,
          daysAdded: daysToAdd,
          plan: newPlan,
        };
      },

      deleteLicenseKey: async (keyString) => {
        const cleanKey = keyString.trim().toUpperCase();
        const keyObj = get().licenseKeys.find((k) => k.key.toUpperCase() === cleanKey);
        if (keyObj && keyObj.isUsed) {
          return { success: false, error: 'Không thể xóa Key đã được kích hoạt' };
        }

        set((state) => ({
          licenseKeys: state.licenseKeys.filter((k) => k.key.toUpperCase() !== cleanKey),
        }));

        try {
          await fetch(`${getBaseUrl()}/api/v1/saas/license-keys/${cleanKey}`, {
            method: 'DELETE',
            headers: getAdminHeaders(),
          });
        } catch {}

        return { success: true };
      },

      fetchLicenseKeys: async () => {
        try {
          const res = await fetch(`${getBaseUrl()}/api/v1/saas/license-keys`, {
            headers: getAdminHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.keys && Array.isArray(data.keys)) {
              const mappedKeys: SaaSLicenseKey[] = data.keys.map((k: any) => ({
                key: k.key,
                plan: k.plan,
                durationDays: k.duration_days,
                maxBranches: k.max_branches >= 9999 ? 'unlimited' : k.max_branches,
                maxDevices: k.max_devices >= 9999 ? 'unlimited' : k.max_devices,
                isUsed: k.is_used,
                usedByTenantId: k.used_by_tenant_id,
                usedByTenantName: k.used_by_tenant_name,
                usedAt: k.used_at,
                note: k.note,
                createdAt: k.created_at,
              }));
              set({ licenseKeys: mappedKeys });
              return mappedKeys;
            }
          }
        } catch {}
        return get().licenseKeys;
      },

      // Aliases & Backwards-compatible action bridges
      fetchPlans: async () => {
        await get().fetchPlanConfigs();
      },
      resetPlansToDefault: async () => {
        return await get().resetPlanConfigs();
      },
      generateLicenseKey: async (plan: SaaSPlan, durationDays: number, note?: string) => {
        const res = await get().createLicenseKey({ plan, durationDays, note });
        if (res.key) return res.key;
        throw new Error(res.error || 'Không thể tạo key');
      },
      updateTenantPlan: async (tenantId: string, newPlan: SaaSPlan) => {
        return await get().changeTenantPlan(tenantId, newPlan);
      },
      renewTenant: async (tenantId: string, months: number) => {
        return await get().renewTenantLicense(tenantId, months);
      },
      generateRescueCode: async (tenantId: string) => {
        const res = await get().resetTenantPin(tenantId);
        return { ...res, ownerPinReset: res.ownerPin };
      },
      addTenantBranch: async (tenantId: string, params: { name: string; address?: string; phone?: string; managerName?: string }) => {
        return await get().createTenantBranch(tenantId, params);
      },
      toggleBranchStatus: async (tenantId: string, branchId: string) => {
        return await get().toggleTenantBranchStatus(tenantId, branchId);
      },
      toggleTenantDeviceStatus: async (tenantId: string, deviceId: string) => {
        let newStatus = false;
        set((state) => {
          const current = state.devicesByTenant[tenantId] || [];
          const updated = current.map((d) => {
            if (d.id === deviceId) {
              newStatus = !d.isActive;
              return { ...d, isActive: !d.isActive };
            }
            return d;
          });
          return {
            devicesByTenant: { ...state.devicesByTenant, [tenantId]: updated },
          };
        });
        return { success: true, newStatus };
      },
      toggleDeviceStatus: async (tenantId: string, deviceId: string) => {
        return await get().toggleTenantDeviceStatus!(tenantId, deviceId);
      },
      unbindDevice: async (tenantId: string, deviceId: string) => {
        return await get().unbindTenantDevice(tenantId, deviceId);
      },
    }),
    {
      name: 'ongchu_saas_admin_storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const deleted = state.deletedTenantIds || [];
        const isDeleted =
          deleted.includes('tenant_quanquan') ||
          deleted.includes('quanquan') ||
          deleted.includes('0392387165');
        if (isDeleted) {
          return;
        }

        const hasQuanQuan = (state.tenants || []).some(
          (t) => t.id === 'tenant_quanquan' || t.subdomain === 'quanquan' || t.phone === '0392387165'
        );
        if (!hasQuanQuan) {
          const quanquanTenant: SaaSTenant = {
            id: 'tenant_quanquan',
            name: 'Quán Chè Bưởi',
            subdomain: 'quanquan',
            phone: '0392387165',
            ownerName: 'Lộc Thanh (Chủ Quán)',
            subscriptionPlan: 'pro',
            licenseExpiresAt: '2028-12-31T23:59:59.000Z',
            licenseDaysLeft: 835,
            isActive: true,
            branchCount: 1,
            deviceCount: 2,
            monthlyFee: 399000,
            createdAt: '2025-01-01T00:00:00.000Z',
            configuredRoles: ['cashier', 'server', 'manager', 'owner'],
          };
          useSaaSAdminStore.setState({
            tenants: [quanquanTenant, ...(state.tenants || [])],
            branchesByTenant: {
              ...state.branchesByTenant,
              tenant_quanquan: DEFAULT_TENANT_BRANCHES.tenant_quanquan,
            },
            devicesByTenant: {
              ...state.devicesByTenant,
              tenant_quanquan: DEFAULT_TENANT_DEVICES.tenant_quanquan,
            },
            addonsByTenant: {
              ...state.addonsByTenant,
              tenant_quanquan: DEFAULT_TENANT_ADDONS.tenant_quanquan,
            },
            invoicesByTenant: {
              ...state.invoicesByTenant,
              tenant_quanquan: DEFAULT_SAAS_INVOICES.tenant_quanquan,
            },
          });
        }
      },
      partialize: (state) => ({
        tenants: state.tenants,
        branchesByTenant: state.branchesByTenant,
        devicesByTenant: state.devicesByTenant,
        addonsByTenant: state.addonsByTenant,
        invoicesByTenant: state.invoicesByTenant,
        plans: state.plans,
        licenseKeys: state.licenseKeys,
        deletedTenantIds: state.deletedTenantIds || [],
      }),
    }
  )
);
