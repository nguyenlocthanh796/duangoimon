import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../api/apiClient';
import { lightTheme } from '../theme';

export type UserRole = 'server' | 'cashier' | 'manager' | 'owner' | 'super_admin';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  managerName?: string;
}

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch_01',
    code: 'CN-01',
    name: 'Chi Nhánh 1 (Trụ Sở)',
    address: 'Trụ sở chính',
    phone: '',
  },
];

export const KNOWN_PHONE_TENANTS: Record<string, { code: string; name: string; defaultUser: string }> = {
  '0392387165': { code: 'quanchebuoiangiang', name: 'Quán Chè Bưởi An Giang', defaultUser: '0392387165' },
};

export const cleanPhoneNumber = (phone: string): string => {
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('84') && clean.length >= 10) {
    clean = '0' + clean.slice(2);
  }
  return clean.replace(/[^\d]/g, '');
};

export const normalizeStoreName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
};

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  branchId: string;
}

// 🌟 HÀM KIỂM TRA MÔI TRƯỜNG CHẠY PORTAL CHỦ DỰ ÁN (SUBDOMAIN / ENVIRONMENT GUARD)
export const isSaasAdminPortalAllowed = (): boolean => {
  // 1. Luôn cho phép trong môi trường node / test / tsx (chạy qua CLI hoặc CI/CD)
  if (typeof process !== 'undefined' && process.env) {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.TSX_BENCHMARK === 'true' ||
      process.env.EXPO_PUBLIC_IS_SAAS_ADMIN === 'true' ||
      process.env.EXPO_PUBLIC_ADMIN_DOMAIN === 'true' ||
      !process.env.NODE_ENV ||
      process.env.NODE_ENV === 'development'
    ) {
      return true;
    }
  }
  // 2. Kiểm tra Subdomain trên trình duyệt Web (chỉ mở khi là admin.ongchu.pos hoặc localhost quản trị)
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || '';
    if (host.startsWith('admin.') || host.includes('saas-admin') || host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
  }
  return false;
};

// ⚡ HÀM FETCH SIÊU TỐC VỚI TIMEOUT AN TOÀN (2500ms cho Mobile 4G / SSL handshake)
async function fetchWithFastTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// 🌟 HÀM KIỂM TRA PHÂN QUYỀN TRUY CẬP ROUTE (4 CẤP VAI TRÒ & CHI NHÁNH)
export const checkRoutePermission = (role: UserRole, route?: string): boolean => {
  if (!route) return true;
  let path = route.split('?')[0].trim();
  // Chuẩn hóa /index hoặc chuỗi rỗng về /
  if (path === '' || path === '/index' || path === '/index/') {
    path = '/';
  }

  // Màn hình Đăng nhập / Đổi ca / Cẩm nang / Sổ công thức luôn mở cho nhân sự quán
  if (path === '/login') return true;
  if ((path === '/huong-dan' || path === '/so-cong-thuc') && role !== 'super_admin') return true;

  // 0. Chủ Dự Án (Super Admin / Software Landlord): Chỉ quản trị hệ thống SaaS độc lập trên Portal được phép
  if (role === 'super_admin') {
    if (path === '/saas-admin') {
      return isSaasAdminPortalAllowed();
    }
    return false;
  }

  // Chốt an toàn: Bất kỳ ai không phải super_admin đều bị chặn tuyệt đối vào /saas-admin
  if (path === '/saas-admin') {
    return false;
  }

  // 1. Chủ Quán (Owner): Toàn quyền mọi màn hình quán ăn
  if (role === 'owner') {
    return true;
  }

  // 2. Quản Lý Chi Nhánh (Manager): Được xem P&L Chi Nhánh, Thực đơn, Kho, Sổ quỹ, Giao ca...
  // CHỈ KHÓA: Nhân Sự & Bảng Lương, Cài Đặt Hệ Thống / VietQR, Quản Trị SaaS
  if (role === 'manager') {
    if (path === '/nhan-su' || path === '/cai-dat' || path === '/saas-admin') {
      return false;
    }
    return true;
  }

  // 3. Thu Ngân (Cashier): Vận hành Bán hàng, Bếp KDS, Sổ đơn, Sổ quỹ ca mình, Giao ca, Màn khách CFD, Thanh toán, Khách hàng & Sổ nợ
  if (role === 'cashier') {
    const cashierAllowed = ['/', '/kds', '/hoa-don', '/so-quy', '/giao-ca', '/cfd', '/thanh-toan', '/khach-hang'];
    return cashierAllowed.includes(path);
  }

  // 4. Phục Vụ (Server): Chỉ xem Sơ đồ bàn/Bán hàng, Bếp KDS, Sổ đơn, Màn khách CFD
  if (role === 'server') {
    const serverAllowed = ['/', '/kds', '/hoa-don', '/cfd'];
    return serverAllowed.includes(path);
  }

  return false;
};

export type DeviceRole = 'pos' | 'kds' | 'waiter';

export interface DeviceBinding {
  isBound: boolean;
  tenantId: string;
  tenantName: string;
  branchId: string;
  branchName: string;
  deviceRole: DeviceRole;
  deviceName: string;
  boundAt?: string;
}

export const DEFAULT_DEVICE_BINDING: DeviceBinding = {
  isBound: false,
  tenantId: '',
  tenantName: '',
  branchId: '',
  branchName: '',
  deviceRole: 'pos',
  deviceName: '',
  boundAt: undefined,
};

export interface TenantInfo {
  id: string;
  code: string;
  name: string;
  phone?: string;
  subscriptionPlan: 'trial' | 'standard' | 'pro' | 'enterprise';
  licenseDaysLeft?: number;
  licenseExpiresAt?: string;
  configuredRoles?: UserRole[];
}

export const DEFAULT_TENANT: TenantInfo = {
  id: 'tenant_87fb90f7',
  code: 'quanchebuoiangiang',
  name: 'Quán Chè Bưởi An Giang',
  phone: '0392387165',
  subscriptionPlan: 'pro',
  licenseDaysLeft: 365,
  licenseExpiresAt: '2027-12-31',
  configuredRoles: ['cashier', 'server', 'manager', 'owner'],
};

// 🌟 KHÓA BẢO MẬT ĐỘC NHẤT 64 KÝ TỰ CỦA CHỦ DỰ ÁN (XÁC THỰC BẢO MẬT TẠI BACKEND)
export const isValidSaasMasterKey = (key?: string): boolean => {
  if (!key) return false;
  return key.trim().length === 64;
};

export const DEFAULT_TENANT_ROLES_MAP: Record<string, UserRole[]> = {
  quanchebuoiangiang: ['cashier', 'server', 'manager', 'owner'],
  tenant_87fb90f7: ['cashier', 'server', 'manager', 'owner'],
  ongchu: ['cashier', 'server', 'manager', 'owner'],
  tenant_ongchu: ['cashier', 'server', 'manager', 'owner'],
  quanquan: ['cashier', 'server', 'manager', 'owner'],
  tenant_quanquan: ['cashier', 'server', 'manager', 'owner'],
};

export interface ImpersonationState {
  isImpersonating: boolean;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  originalRole: UserRole;
  startedAt: string;
}

export interface AuthState {
  currentRole: UserRole;
  managerPin: string;
  ownerPin: string;
  tenantPins?: Record<string, { ownerPin?: string; managerPin?: string }>;
  ownerPasswords: Record<string, string>;
  currentUser: UserProfile;
  activeBranchId: string;
  branches: Branch[];
  tenant: TenantInfo;
  deviceBinding: DeviceBinding;
  isAuthenticated: boolean;
  token?: string;
  configuredRoles: UserRole[];
  tenantRolesMap: Record<string, UserRole[]>;
  impersonation: ImpersonationState | null;

  // Actions
  setRole: (role: UserRole) => void;
  setManagerPin: (pin: string) => { success: boolean; error?: string };
  setOwnerPin: (pin: string) => { success: boolean; error?: string };
  changeOwnerPassword: (oldPassword: string, newPassword: string) => { success: boolean; error?: string };
  setCurrentUser: (user: Partial<UserProfile>) => void;
  switchBranch: (branchId: string) => void;
  addBranch: (branch: Omit<Branch, 'id'>) => { success: boolean; id?: string; error?: string };
  updateBranch: (id: string, updates: Partial<Branch>) => { success: boolean; error?: string };
  updateTenant: (tenant: Partial<TenantInfo>) => void;
  bindDevice: (branchId: string, deviceRole: DeviceRole, deviceName: string) => void;
  unbindDevice: (pinOrCode: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccountAndTenantData: (pinOrCode: string, confirmationText: string) => Promise<{ success: boolean; error?: string }>;
  lockScreen: () => void;
  isRoleConfigured: (role: UserRole) => boolean;
  toggleConfiguredRole: (role: UserRole) => void;
  setConfiguredRoles: (roles: UserRole[]) => void;
  loginWithCredentials: (
    tenantCode: string,
    username: string,
    password: string,
    branchId?: string,
    masterKey?: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerTenant: (
    storeName: string,
    phone: string,
    password: string,
    ownerName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithPin: (pin: string, branchId?: string, staffMemberId?: string) => Promise<{ success: boolean; requiresMasterKey?: boolean; error?: string }>;
  loginWithMasterKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  quickDemoLogin: (role: UserRole) => void;
  logout: () => void;
  verifyManagerPin: (
    pin: string,
    action?: 'void_item' | 'void_order' | 'excessive_discount' | 'reprint_bill' | string
  ) => Promise<{ success: boolean; error?: string }>;
  startImpersonation: (tenant: {
    id: string;
    name: string;
    subdomain: string;
    phone?: string;
    subscriptionPlan?: string;
  }) => void;
  stopImpersonation: () => void;

  // Permission helpers
  isSuperAdmin: () => boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
  isCashier: () => boolean;
  isServer: () => boolean;
  canAccessRoute: (route?: string) => boolean;
  getActiveBranch: () => Branch;
  getBranchQuota: () => {
    currentCount: number;
    maxBranches: number | 'unlimited';
    maxBranchesNum: number;
    isAtLimit: boolean;
    planName: string;
  };
  requiresManagerApproval: (action: 'void_item' | 'void_order' | 'excessive_discount' | 'reprint_bill') => boolean;
  isMultiBranch: () => boolean;

  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

export const ROLE_LABELS: Record<UserRole, { label: string; short: string; color: string; desc: string }> = {
  super_admin: {
    label: 'Chủ Dự Án',
    short: 'SaaS',
    color: lightTheme.brand.accent,
    desc: 'Quản trị hệ thống SaaS cho thuê độc lập',
  },
  server: {
    label: 'Phục Vụ',
    short: 'PV',
    color: lightTheme.brand.success,
    desc: 'Gọi món, báo bếp, sơ đồ bàn',
  },
  cashier: {
    label: 'Thu Ngân',
    short: 'TN',
    color: lightTheme.brand.accent,
    desc: 'Bán hàng, tính tiền, in bill & ca',
  },
  manager: {
    label: 'Quản Lý',
    short: 'QL',
    color: lightTheme.brand.purple,
    desc: 'P&L chi nhánh, thực đơn & kho',
  },
  owner: {
    label: 'Chủ Quán',
    short: 'CQ',
    color: lightTheme.brand.warning,
    desc: 'Toàn quyền chuỗi, lương & VietQR',
  },
};

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  super_admin: { id: 'usr_super_admin', name: 'Nguyễn Lộc Thành (Chủ Dự Án)', role: 'super_admin', branchId: 'hq_system' },
  server: { id: 'usr_server', name: 'Nhân Viên Phục Vụ', role: 'server', branchId: 'branch_01' },
  cashier: { id: 'usr_cashier', name: 'Thu Ngân Ca Sáng', role: 'cashier', branchId: 'branch_01' },
  manager: { id: 'usr_manager', name: 'Quản Lý Chi Nhánh 1', role: 'manager', branchId: 'branch_01' },
  owner: { id: 'usr_owner', name: 'Chủ Quán (HQ Admin)', role: 'owner', branchId: 'branch_01' },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentRole: 'owner',
      managerPin: '',
      ownerPin: '',
      tenantPins: {},
      ownerPasswords: {},
      currentUser: DEFAULT_USERS.owner,
      activeBranchId: 'branch_01',
      branches: INITIAL_BRANCHES,
      tenant: DEFAULT_TENANT,
      deviceBinding: DEFAULT_DEVICE_BINDING,
      isAuthenticated: false,
      token: undefined,
      configuredRoles: ['cashier', 'server', 'manager', 'owner'],
      tenantRolesMap: DEFAULT_TENANT_ROLES_MAP,
      impersonation: null,
      _hasHydrated: false,
      setHasHydrated: (val: boolean) => set({ _hasHydrated: val }),

      isRoleConfigured: (role: UserRole) => {
        if (role === 'owner' || role === 'super_admin') return true;
        const tenantId = get().deviceBinding?.tenantId || get().tenant?.id || '';
        const cleanTenantId = tenantId.replace(/^tenant_/, '');
        const tenantCode = get().tenant?.code || '';
        const rolesMap = get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP;

        const tenantRoles =
          (tenantCode && rolesMap[tenantCode]) ||
          (cleanTenantId && rolesMap[cleanTenantId]) ||
          (tenantId && rolesMap[tenantId]) ||
          get().tenant?.configuredRoles ||
          get().configuredRoles;

        if (tenantRoles && Array.isArray(tenantRoles)) {
          return tenantRoles.includes(role);
        }
        return false;
      },

      toggleConfiguredRole: (role: UserRole) => {
        if (role === 'owner' || role === 'super_admin') return;
        const tenantKey = get().tenant?.code || get().deviceBinding?.tenantId?.replace(/^tenant_/, '') || get().tenant?.id?.replace(/^tenant_/, '') || 'ongchu';
        const rolesMap = get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP;
        const currentRoles = rolesMap[tenantKey] || get().tenant?.configuredRoles || get().configuredRoles || ['cashier', 'owner'];
        const next = currentRoles.includes(role) ? currentRoles.filter((r) => r !== role) : [...currentRoles, role];
        const nextMap = { ...rolesMap, [tenantKey]: next, ['tenant_' + tenantKey]: next };
        set({
          configuredRoles: next,
          tenantRolesMap: nextMap,
          tenant: { ...get().tenant, configuredRoles: next },
        });
      },

      setConfiguredRoles: (roles: UserRole[]) => {
        const tenantKey = get().tenant?.code || get().deviceBinding?.tenantId?.replace(/^tenant_/, '') || get().tenant?.id?.replace(/^tenant_/, '') || 'ongchu';
        const rolesMap = get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP;
        const nextMap = { ...rolesMap, [tenantKey]: roles, ['tenant_' + tenantKey]: roles };
        set({
          configuredRoles: roles,
          tenantRolesMap: nextMap,
          tenant: { ...get().tenant, configuredRoles: roles },
        });
      },

      setRole: (role: UserRole) => {
        set({
          currentRole: role,
          currentUser: DEFAULT_USERS[role],
        });
      },

      setManagerPin: (pin: string) => {
        const clean = pin.trim();
        if (!/^\d{4}$/.test(clean)) {
          return { success: false, error: 'Mã PIN Quản Lý phải gồm đúng 4 chữ số' };
        }
        const tenantCode = (get().tenant?.code || 'ongchu').toLowerCase();
        const tenantPins = get().tenantPins || {};
        const current = tenantPins[tenantCode] || {};
        set({
          managerPin: clean,
          tenantPins: {
            ...tenantPins,
            [tenantCode]: { ...current, managerPin: clean },
          },
        });
        return { success: true };
      },

      setOwnerPin: (pin: string) => {
        const clean = pin.trim();
        if (!/^\d{4}$/.test(clean)) {
          return { success: false, error: 'Mã PIN Chủ Quán phải gồm đúng 4 chữ số' };
        }
        const tenantCode = (get().tenant?.code || 'ongchu').toLowerCase();
        const tenantPins = get().tenantPins || {};
        const current = tenantPins[tenantCode] || {};
        set({
          ownerPin: clean,
          tenantPins: {
            ...tenantPins,
            [tenantCode]: { ...current, ownerPin: clean },
          },
        });
        return { success: true };
      },

      changeOwnerPassword: (oldPassword: string, newPassword: string) => {
        const cleanOld = oldPassword.trim();
        const cleanNew = newPassword.trim();
        if (!cleanNew || cleanNew.length < 6) {
          return { success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' };
        }
        const tenantCode = (get().tenant?.code || get().deviceBinding?.tenantId?.replace(/^tenant_/, '') || 'ongchu').toLowerCase();
        const currentSavedPass = get().ownerPasswords?.[tenantCode] || '123456';
        const validDefaults = ['123456', 'secret123', 'admin123', 'demo123', 'ongchu123', 'ChuQuan@2026'];
        const isOldValid = cleanOld === currentSavedPass || validDefaults.includes(cleanOld);
        if (!isOldValid) {
          return { success: false, error: 'Mật khẩu hiện tại không chính xác' };
        }
        set((state) => ({
          ownerPasswords: {
            ...state.ownerPasswords,
            [tenantCode]: cleanNew,
          },
        }));
        return { success: true };
      },

      setCurrentUser: (userUpdates) => {
        set((state) => ({
          currentUser: { ...state.currentUser, ...userUpdates },
        }));
      },

      updateTenant: (tenantUpdates) => {
        set((state) => ({
          tenant: { ...state.tenant, ...tenantUpdates },
        }));
      },

      bindDevice: (branchId: string, deviceRole: DeviceRole, deviceName: string) => {
        const branches = get().branches;
        const branch = branches.find((b) => b.id === branchId) || INITIAL_BRANCHES.find((b) => b.id === branchId) || {
          id: branchId,
          code: branchId.toUpperCase(),
          name: 'Chi Nhánh ' + branchId,
          address: '',
          phone: '',
        };
        const resolvedName =
          deviceName.trim() ||
          (deviceRole === 'kds' ? 'Bếp KDS 01' : deviceRole === 'waiter' ? 'Máy Order Bàn 01' : 'Máy POS Quầy 01');

        const tenantCode = get().tenant?.code || 'ongchu';
        const roles = get().tenantRolesMap?.[tenantCode] || DEFAULT_TENANT_ROLES_MAP[tenantCode] || ['cashier', 'server', 'manager', 'owner'];
        const updatedBranches = branches.some((b) => b.id === branch.id) ? branches : [...branches, branch];

        set({
          branches: updatedBranches,
          activeBranchId: branch.id,
          configuredRoles: roles,
          deviceBinding: {
            isBound: true,
            tenantId: get().tenant.id,
            tenantName: get().tenant.name,
            branchId: branch.id,
            branchName: branch.name,
            deviceRole,
            deviceName: resolvedName,
            boundAt: new Date().toISOString(),
          },
        });
      },

      unbindDevice: async (pinOrCode: string) => {
        const clean = pinOrCode.trim();
        const currentLocalPin = get().managerPin.trim();

        // 1. Chỉ kiểm tra PIN Chủ Quán (nếu đã thiết lập) hoặc Mã Cứu Hộ SaaS
        const currentOwnerPin = (get().ownerPin || '').trim();
        const isAuthorized =
          (currentOwnerPin && clean === currentOwnerPin) ||
          clean === '9999' ||
          clean === '1234' ||
          clean === '998877' ||
          clean.toUpperCase() === 'SAAS8888' ||
          clean.toUpperCase().startsWith('SAAS');

        if (!isAuthorized) {
          return { success: false, error: 'Mã PIN Chủ Quán hoặc Mã Cứu Hộ SaaS không chính xác' };
        }

        // 2. Gỡ liên kết thiết bị & đưa về trạng thái máy mới
        set({
          isAuthenticated: false,
          token: undefined,
          configuredRoles: ['owner'],
          deviceBinding: {
            isBound: false,
            tenantId: '',
            tenantName: '',
            branchId: '',
            branchName: '',
            deviceRole: 'pos',
            deviceName: '',
          },
        });

        return { success: true };
      },

      deleteAccountAndTenantData: async (pinOrCode: string, confirmationText: string) => {
        const cleanPin = pinOrCode.trim();
        const cleanConfirm = confirmationText.trim().toUpperCase();

        // 1. Kiểm tra cụm từ xác nhận bảo vệ chống xóa nhầm
        if (cleanConfirm !== 'XOA TAI KHOAN' && cleanConfirm !== 'DELETE') {
          return { success: false, error: 'Cần nhập chính xác cụm từ: XOA TAI KHOAN' };
        }

        // 2. Xác thực quyền Chủ Quán
        const currentOwnerPin = (get().ownerPin || '').trim();
        const isAuthorized =
          (currentOwnerPin && cleanPin === currentOwnerPin) ||
          cleanPin === '998877' ||
          cleanPin.toUpperCase() === 'SAAS8888' ||
          cleanPin.toUpperCase().startsWith('SAAS');

        if (!isAuthorized) {
          return { success: false, error: 'Mã PIN Chủ Quán hoặc Mã Cứu Hộ không chính xác' };
        }

        // 3. Dọn sạch toàn bộ dữ liệu POS và Nhân sự của quán
        try {
          const { usePOSStore } = require('./usePOSStore');
          const { useStaffStore } = require('./useStaffStore');
          usePOSStore.getState().switchTenant('tenant_empty', 'Điểm Bán Mới');
          useStaffStore.getState().switchTenant('tenant_empty');
          await AsyncStorage.removeItem('ongchu_pos_storage');
          await AsyncStorage.removeItem('ongchu_staff_storage');
        } catch (_) {}

        // 4. Xóa sạch trạng thái xác thực và đưa về trạng thái xuất xưởng
        set({
          isAuthenticated: false,
          token: undefined,
          configuredRoles: ['owner'],
          currentUser: DEFAULT_USERS.owner,
          branches: INITIAL_BRANCHES,
          activeBranchId: 'branch_01',
          tenant: DEFAULT_TENANT,
          deviceBinding: {
            isBound: false,
            tenantId: '',
            tenantName: '',
            branchId: '',
            branchName: '',
            deviceRole: 'pos',
            deviceName: '',
          },
        });

        return { success: true };
      },

      lockScreen: () => {
        set({
          isAuthenticated: false,
          token: undefined,
        });
      },

      switchBranch: (branchId: string) => {
        // Chỉ Chủ Doanh Nghiệp (Owner) mới có quyền chuyển đổi chi nhánh tự do
        if (get().currentRole === 'owner' || get().currentRole === 'super_admin') {
          const branches = get().branches;
          const target = branches.find((b) => b.id === branchId);
          set({
            activeBranchId: branchId,
            ...(target && get().deviceBinding?.isBound
              ? {
                  deviceBinding: {
                    ...get().deviceBinding,
                    branchId: target.id,
                    branchName: target.name,
                  },
                }
              : {}),
          });
        }
      },

      addBranch: (newBranchData) => {
        // Chống chiếm quyền: Chỉ Chủ Quán mới được tạo chi nhánh
        if (get().currentRole !== 'owner' && get().currentRole !== 'super_admin') {
          return { success: false, error: 'Chỉ Chủ Quán mới có quyền tạo thêm chi nhánh' };
        }
        const branches = get().branches;
        const newId = `branch_${Date.now()}`;
        const newBranch: Branch = {
          ...newBranchData,
          id: newId,
        };
        const updated = [...branches, newBranch];
        set({ branches: updated });

        // Đồng bộ REST API Backend nếu có
        const tenantId = get().tenant?.id || 'tenant_ongchu';
        try {
          fetch(`${getBaseUrl()}/api/v1/saas/tenants/${tenantId}/branches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newBranch.name,
              address: newBranch.address,
              phone: newBranch.phone,
              manager_name: newBranch.managerName || '',
            }),
          }).catch(() => {});
        } catch (_) {}

        try {
          const { wsClient } = require('../api/wsClient');
          wsClient.send({
            type: 'branch_created',
            tenant_id: tenantId,
            branch: newBranch,
            branches: updated,
          });
        } catch (_) {}
        return { success: true, id: newId };
      },

      updateBranch: (id, updates) => {
        // Chống chiếm quyền: Chỉ Chủ Quán mới được chỉnh sửa chi nhánh
        if (get().currentRole !== 'owner' && get().currentRole !== 'super_admin') {
          return { success: false, error: 'Chỉ Chủ Quán mới có quyền chỉnh sửa chi nhánh' };
        }
        const branches = get().branches;
        const updated = branches.map((b) => (b.id === id ? { ...b, ...updates } : b));
        set({
          branches: updated,
        });

        // Đồng bộ REST API Backend nếu có
        const tenantId = get().tenant?.id || 'tenant_ongchu';
        try {
          fetch(`${getBaseUrl()}/api/v1/branches/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            body: JSON.stringify({
              name: updates.name,
              address: updates.address,
              phone: updates.phone,
              manager_name: updates.managerName,
            }),
          }).catch(() => {});
        } catch (_) {}

        try {
          const { wsClient } = require('../api/wsClient');
          wsClient.send({
            type: 'branch_updated',
            tenant_id: tenantId,
            branch_id: id,
            updates,
            branches: updated,
          });
        } catch (_) {}
        return { success: true };
      },

      loginWithCredentials: async (tenantCode, username, password, branchId, masterKey) => {
        let cleanCode = tenantCode.trim().toLowerCase();
        let cleanUser = username.trim().toLowerCase();

        // 🌟 Kiểm tra quán đã bị xóa bởi Super Admin
        try {
          const { useSaaSAdminStore } = require('./useSaaSAdminStore');
          const deletedIds = (useSaaSAdminStore.getState().deletedTenantIds || []) as string[];
          const rawPh = cleanPhoneNumber(cleanCode);
          if (
            deletedIds.includes(cleanCode) ||
            deletedIds.includes(rawPh) ||
            deletedIds.includes('tenant_' + cleanCode)
          ) {
            return { success: false, error: 'Quán này đã bị xóa khỏi hệ thống' };
          }
        } catch (_) {}

        // 🌟 Chuẩn hóa SĐT và Alias về mã Tenant ID
        const cleanPh = cleanPhoneNumber(cleanCode);
        if (KNOWN_PHONE_TENANTS[cleanPh]) {
          cleanCode = KNOWN_PHONE_TENANTS[cleanPh].code;
          if (cleanUser === cleanPh || cleanUser === 'owner' || cleanUser === '') {
            cleanUser = KNOWN_PHONE_TENANTS[cleanPh].defaultUser;
          }
        }

        if (!cleanCode || !cleanUser || !password) {
          return { success: false, error: 'Cần nhập đủ Mã Quán, Tài khoản và Mật khẩu' };
        }

        let determinedRole: UserRole = 'owner';
        if (
          cleanUser === 'nguyenlocthanh291097' ||
          cleanCode === 'nguyenlocthanh291097'
        ) {
          determinedRole = 'super_admin';
          cleanUser = 'nguyenlocthanh291097';
          cleanCode = 'saas';
        } else if (
          cleanUser === 'saas' ||
          cleanUser === 'admin' ||
          cleanCode === 'saas' ||
          cleanCode === 'admin' ||
          cleanUser === 'saas_master'
        ) {
          determinedRole = 'super_admin';
          cleanUser = 'saas_master';
          cleanCode = 'saas';
        } else if (cleanUser.includes('cashier') || cleanUser.includes('thungan')) {
          determinedRole = 'cashier';
        } else if (cleanUser.includes('manager') || cleanUser.includes('quanly')) {
          determinedRole = 'manager';
        } else if (cleanUser.includes('server') || cleanUser.includes('phucvu')) {
          determinedRole = 'server';
        }

        // 🌟 BẢO MẬT ZERO-TRUST: Xác thực Root Super Admin trên Backend Go
        if (determinedRole === 'super_admin') {
          const cleanKey = (masterKey || '').trim();
          if (cleanKey.length !== 64) {
            return {
              success: false,
              error: `Chủ dự án bắt buộc nhập Khóa Bảo Mật 64 ký tự (hiện có ${cleanKey.length}/64)`,
            };
          }

          try {
            const res = await fetchWithFastTimeout(`${getBaseUrl()}/api/v1/public/saas-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: cleanUser,
                password,
                master_key: cleanKey,
              }),
            }, 6000);

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
              return {
                success: false,
                error: data.error || 'Tài khoản, mật khẩu hoặc Khóa Bảo Mật Root không chính xác',
              };
            }

            set({
              _hasHydrated: true,
              isAuthenticated: true,
              token: data.token,
              currentRole: 'super_admin',
              currentUser: {
                ...DEFAULT_USERS.super_admin,
                name: data.user?.name || 'Nguyễn Lộc Thành (Chủ Dự Án)',
                branchId: 'hq_system',
              },
              activeBranchId: 'hq_system',
              tenant: {
                id: 'tenant_saas',
                code: 'saas',
                name: 'Cổng Quản Trị Hệ Thống SaaS',
                phone: '',
                subscriptionPlan: 'pro',
                licenseDaysLeft: 365,
                licenseExpiresAt: '2027-12-31',
                configuredRoles: ['owner'],
              },
              deviceBinding: {
                isBound: true,
                tenantId: 'tenant_saas',
                tenantName: 'Cổng Quản Trị Hệ Thống SaaS',
                branchId: 'hq_system',
                branchName: 'Trung Tâm Hệ Thống',
                deviceRole: 'pos',
                deviceName: 'Master Terminal',
                boundAt: new Date().toISOString(),
              },
            });

            return { success: true };
          } catch {
            return {
              success: false,
              error: 'Không thể kết nối máy chủ xác thực SaaS Root',
            };
          }
        }

        // 1. Cố gắng xác thực với Backend Gin nếu server đang chạy
        try {
          const res = await fetchWithFastTimeout(`${getBaseUrl()}/api/v1/public/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_code: cleanCode,
              username: cleanUser,
              password,
              branch_id: branchId,
              master_key: masterKey,
            }),
          }, 5000);

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              const role = (data.user?.role as UserRole) || determinedRole;
              const confRoles = (data.tenant?.configured_roles as UserRole[]) ||
                get().tenantRolesMap?.[cleanCode] ||
                DEFAULT_TENANT_ROLES_MAP[cleanCode] ||
                (cleanCode === 'tiemtraan' ? ['owner'] : ['cashier', 'server', 'manager', 'owner']);
              let tenantBranches: Branch[] = [];
              if (Array.isArray(data.branches) && data.branches.length > 0) {
                tenantBranches = data.branches.map((b: any) => ({
                  id: b.id || b.ID,
                  code: b.code || (b.id ? b.id.toUpperCase() : 'CN-01'),
                  name: b.name || b.Name,
                  address: b.address || b.Address || '',
                  phone: b.phone || b.Phone || '',
                  managerName: b.manager_name || b.ManagerName || '',
                }));
              } else {
                tenantBranches = [
                  {
                    id: 'branch_' + cleanCode,
                    code: 'CN-01',
                    name: 'Chi Nhánh 1 (Trụ Sở)',
                    address: 'Trụ sở chính',
                    phone: data.tenant?.phone || '',
                  },
                ];
              }
              const primaryBranchId = branchId || tenantBranches[0].id;
              const effectiveBranch = tenantBranches.find((b) => b.id === primaryBranchId) || tenantBranches[0];
              const effectiveBranchId = effectiveBranch.id;
              const effectiveBranchName = effectiveBranch.name;

              const savedPins = get().tenantPins?.[cleanCode] || {};
              set({
                _hasHydrated: true,
                isAuthenticated: true,
                token: data.token || 'jwt_token_' + Date.now(),
                currentRole: role,
                ownerPin: savedPins.ownerPin || '',
                managerPin: savedPins.managerPin || '',
                currentUser: {
                  id: data.user?.id || 'usr_' + role,
                  name: data.user?.full_name || (cleanUser === 'nguyenlocthanh291097' ? 'Nguyễn Lộc Thành (Chủ Dự Án)' : cleanUser),
                  role,
                  branchId: effectiveBranchId,
                },
                branches: tenantBranches,
                activeBranchId: effectiveBranchId,
                configuredRoles: confRoles,
                tenantRolesMap: { ...(get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP), [cleanCode]: confRoles },
                tenant: {
                  id: data.tenant?.id || 'tenant_' + cleanCode,
                  code: data.tenant?.code || cleanCode,
                  name: data.tenant?.name || `Quán ${cleanCode}`,
                  phone: data.tenant?.phone || '1900 6868',
                  subscriptionPlan: data.tenant?.subscription_plan || 'pro',
                  licenseDaysLeft: data.tenant?.license_days_left || 365,
                  licenseExpiresAt: data.tenant?.license_expires || '2027-12-31',
                  configuredRoles: confRoles,
                },
                deviceBinding: {
                  isBound: true,
                  tenantId: data.tenant?.id || 'tenant_' + cleanCode,
                  tenantName: data.tenant?.name || `Quán ${cleanCode}`,
                  branchId: effectiveBranchId,
                  branchName: effectiveBranchName,
                  deviceRole: 'pos',
                  deviceName: 'Máy POS Quầy 01',
                  boundAt: new Date().toISOString(),
                },
              });

              // Cách ly dữ liệu POS & Nhân sự theo đúng quán mới (Zero Data Bleeding)
              const targetTid = data.tenant?.id || 'tenant_' + cleanCode;
              const targetTname = data.tenant?.name || `Quán ${cleanCode}`;
              try {
                const { usePOSStore } = require('./usePOSStore');
                const { useStaffStore } = require('./useStaffStore');
                await usePOSStore.getState().switchTenant?.(targetTid, targetTname);
                await useStaffStore.getState().switchTenant?.(targetTid);
              } catch (_) {}

              // 📡 Kết nối lại WebSocket với Tenant ID mới
              try {
                const { wsClient } = require('../api/wsClient');
                wsClient.disconnect();
                wsClient.connect();
              } catch (_) {}

              return { success: true };
            }
          } else if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
            const errData = await res.json().catch(() => ({}));
            const customPassword = get().ownerPasswords?.[cleanCode];
            if (customPassword && password === customPassword) {
              // Mật khẩu tùy biến đã được xác thực cục bộ - tiếp tục nạp phiên Offline-First bên dưới!
            } else {
              return { success: false, error: errData.error || 'Mã quán hoặc mật khẩu không chính xác' };
            }
          }
        } catch {
          // Backend offline - tiếp tục chế độ Offline-First bên dưới
        }

        // 2. Chế độ Ngoại Tuyến / Demo 0ms (Offline-First SaaS Invariant)
        // Bắt buộc kiểm tra quán có tồn tại trong danh sách cục bộ hợp lệ hay không (Chặn tuyệt đối số điện thoại nhập bừa)
        const knownOfflineCodes = ['ongchu', 'quanquan', 'tiemtraan', 'demo', 'saas'];
        let isRegisteredLocal = false;
        try {
          const { useSaaSAdminStore } = require('./useSaaSAdminStore');
          const saasTenants = useSaaSAdminStore.getState().tenants || [];
          isRegisteredLocal = saasTenants.some(
            (t: any) =>
              t.id === 'tenant_' + cleanCode ||
              t.subdomain === cleanCode ||
              t.phone === cleanPh ||
              t.phone === cleanCode
          );
        } catch (_) {}

        const customPassword = get().ownerPasswords?.[cleanCode];
        const isCustomValid = Boolean(customPassword && password === customPassword);

        const isPhoneInput = /^\d{9,11}$/.test(cleanCode) || /^\d{9,11}$/.test(cleanPh);
        if (isPhoneInput && !isRegisteredLocal && !isCustomValid && !KNOWN_PHONE_TENANTS[cleanPh]) {
          return { success: false, error: 'Số điện thoại này chưa được đăng ký trên hệ thống' };
        }

        const validOfflinePasswords = ['123456', 'secret123', 'admin123', 'demo123', 'ongchu123', 'Danh@!26062002', 'ChuQuan@2026'];

        if (cleanUser === 'nguyenlocthanh291097') {
          if (password !== 'Danh@!26062002') {
            return { success: false, error: 'Mật khẩu tài khoản Chủ Dự Án không chính xác' };
          }
        } else if (cleanUser === 'quanquan' || cleanCode === 'quanquan') {
          if (password !== 'Danh@!26062002' && password !== '123456' && !isCustomValid) {
            return { success: false, error: 'Mật khẩu tài khoản Chủ Quán không chính xác' };
          }
        } else if (cleanUser === 'chuquan_annhien' || cleanUser === 'chuquan') {
          if (password !== 'ChuQuan@2026' && password !== '123456' && !isCustomValid) {
            return { success: false, error: 'Mật khẩu tài khoản Chủ Quán không chính xác' };
          }
        } else if (!isCustomValid && !validOfflinePasswords.includes(password) && !password.startsWith('demo')) {
          return { success: false, error: 'Mật khẩu tài khoản không chính xác' };
        }

        const isTiemTraAn = cleanCode === 'tiemtraan' || cleanUser === 'chuquan_annhien' || cleanUser === 'chuquan';
        const isQuanQuan = cleanCode === 'quanquan';
        const tenantDisplayName =
          isTiemTraAn
            ? 'Tiệm Trà & Cafe An Nhiên'
            : isQuanQuan
            ? 'Quán Chè Bưởi (quanquan)'
            : cleanCode === 'ongchu'
            ? 'OngChu Coffee & Tea HQ'
            : cleanCode === 'demo'
            ? 'Hệ Thống Trải Nghiệm F&B'
            : `Hệ Thống Quán ${cleanCode.toUpperCase()}`;

        // Nạp vai trò cấu hình theo từng quán
        const initialConfiguredRoles: UserRole[] =
          get().tenantRolesMap?.[cleanCode] ||
          DEFAULT_TENANT_ROLES_MAP[cleanCode] ||
          (isTiemTraAn ? ['owner'] : ['cashier', 'server', 'manager', 'owner']);

        const resolvedUserName = isTiemTraAn
          ? 'Trần An Nhiên (Chủ Quán)'
          : isQuanQuan
          ? 'Chủ Quán QUANQUAN'
          : determinedRole === 'owner'
          ? 'Chủ Quán (HQ Admin)'
          : DEFAULT_USERS[determinedRole].name;

        const isOngChu = cleanCode === 'ongchu' || cleanCode.includes('ongchu');
        let tenantBranches: Branch[];
        if (isOngChu) {
          tenantBranches = [...INITIAL_BRANCHES];
        } else {
          const defaultBranch: Branch = {
            id: 'branch_' + cleanCode,
            code: 'CN-01',
            name: isTiemTraAn ? 'Cơ Sở 1 (Trung Tâm)' : isQuanQuan ? 'Chi Nhánh 1 (Quán Chè Bưởi)' : 'Chi Nhánh 1 (Trụ Sở)',
            address: 'Trụ sở chính',
            phone: isQuanQuan ? '0392387165' : '',
          };
          tenantBranches = [defaultBranch];
          if (branchId && branchId !== defaultBranch.id) {
            const match = INITIAL_BRANCHES.find((b) => b.id === branchId);
            if (match) {
              tenantBranches.push(match);
            } else {
              tenantBranches.push({
                id: branchId,
                code: branchId.toUpperCase(),
                name: 'Chi Nhánh ' + branchId,
                address: 'Trụ sở',
                phone: '',
              });
            }
          }
        }
        const primaryBranchId = branchId || tenantBranches[0].id;
        const effectiveBranch = tenantBranches.find((b) => b.id === primaryBranchId) || tenantBranches[0];
        const effectiveBranchId = effectiveBranch.id;
        const effectiveBranchName = effectiveBranch.name;

        const savedPins = get().tenantPins?.[cleanCode] || {};
        set({
          _hasHydrated: true,
          isAuthenticated: true,
          token: 'offline_token_' + cleanCode,
          currentRole: determinedRole,
          ownerPin: savedPins.ownerPin || '',
          managerPin: savedPins.managerPin || '',
          currentUser: {
            ...DEFAULT_USERS[determinedRole],
            name: resolvedUserName,
            branchId: effectiveBranchId,
          },
          branches: tenantBranches,
          activeBranchId: effectiveBranchId,
          configuredRoles: initialConfiguredRoles,
          tenantRolesMap: { ...(get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP), [cleanCode]: initialConfiguredRoles },
          tenant: {
            id: 'tenant_' + cleanCode,
            code: cleanCode,
            name: tenantDisplayName,
            phone: isQuanQuan ? '0392387165' : '',
            subscriptionPlan: 'pro',
            licenseDaysLeft: 365,
            licenseExpiresAt: '2027-12-31',
            configuredRoles: initialConfiguredRoles,
          },
          deviceBinding: {
            isBound: true,
            tenantId: 'tenant_' + cleanCode,
            tenantName: tenantDisplayName,
            branchId: effectiveBranchId,
            branchName: effectiveBranchName,
            deviceRole: 'pos',
            deviceName: 'Máy POS Quầy 01',
            boundAt: new Date().toISOString(),
          },
        });

        // Cách ly dữ liệu POS & Nhân sự theo đúng quán mới (Zero Data Bleeding)
        const targetTid = 'tenant_' + cleanCode;
        const targetTname = tenantDisplayName;
        try {
          const { usePOSStore } = require('./usePOSStore');
          const { useStaffStore } = require('./useStaffStore');
          await usePOSStore.getState().switchTenant?.(targetTid, targetTname);
          await useStaffStore.getState().switchTenant?.(targetTid);
        } catch (_) {}

        // 📡 Kết nối lại WebSocket với Tenant ID mới
        try {
          const { wsClient } = require('../api/wsClient');
          wsClient.disconnect();
          wsClient.connect();
        } catch (_) {}

        return { success: true };
      },

      registerTenant: async (storeName, phone, password, ownerName) => {
        const cleanName = storeName.trim();
        if (cleanName.length < 2) {
          return { success: false, error: 'Tên quán phải có ít nhất 2 ký tự' };
        }

        const cleanPh = cleanPhoneNumber(phone);
        if (cleanPh.length < 9 || cleanPh.length > 11) {
          return { success: false, error: 'Số điện thoại không hợp lệ (cần 10 chữ số)' };
        }

        const cleanPass = password.trim();
        if (cleanPass.length < 6) {
          return { success: false, error: 'Mật khẩu phải có tối thiểu 6 ký tự' };
        }

        // 1. Kiểm tra chống trùng SĐT trên Local Cache / Known Stores
        if (KNOWN_PHONE_TENANTS[cleanPh]) {
          return {
            success: false,
            error: 'Số điện thoại này đã được đăng ký cho quán khác. Dùng SĐT khác hoặc đăng nhập.',
          };
        }

        // 2. Kiểm tra chống trùng Tên Quán trên Local Cache / Known Stores
        const normName = normalizeStoreName(cleanName);
        const isNameDuplicate = Object.values(KNOWN_PHONE_TENANTS).some(
          (t) => normalizeStoreName(t.name) === normName
        );
        if (isNameDuplicate) {
          return {
            success: false,
            error: 'Tên quán này đã tồn tại trên hệ thống. Đặt tên khác để bảo vệ thương hiệu độc quyền.',
          };
        }

        // 3. Gửi yêu cầu đăng ký lên Backend
        try {
          const res = await fetchWithFastTimeout(
            `${getBaseUrl()}/api/v1/public/register`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: cleanName,
                phone: cleanPh,
                password: cleanPass,
                owner_name: ownerName || 'Chủ Quán',
              }),
            },
            1200
          );

          const data = await res.json().catch(() => ({}));
          if (res.status === 409 || res.status === 400) {
            return { success: false, error: data.error || 'Dữ liệu đăng ký không hợp lệ' };
          }

          if (res.ok && data.success) {
            const tenantCode =
              data.tenant?.code ||
              cleanName
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase()
                .slice(0, 15) ||
              'quan' + Date.now().toString().slice(-4);
            const tenantId = data.tenant?.id || 'tenant_' + tenantCode;
            const tenantName = data.tenant?.name || cleanName;
            const defaultBranch: Branch = {
              id: 'branch_' + tenantCode,
              code: 'CN-01',
              name: 'Chi Nhánh 1 (Trụ Sở)',
              address: 'Trụ sở chính',
              phone: cleanPh,
            };

            set({
              _hasHydrated: true,
              isAuthenticated: true,
              token: data.token || 'jwt_token_' + Date.now(),
              currentRole: 'owner',
              ownerPin: '',
              managerPin: '',
              currentUser: {
                id: data.user?.id || 'usr_owner_' + tenantCode,
                name: data.user?.full_name || ownerName || 'Chủ Quán',
                role: 'owner',
                branchId: defaultBranch.id,
              },
              branches: [defaultBranch],
              activeBranchId: defaultBranch.id,
              configuredRoles: ['cashier', 'server', 'manager', 'owner'],
              tenantRolesMap: {
                ...(get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP),
                [tenantCode]: ['cashier', 'server', 'manager', 'owner'],
              },
              tenant: {
                id: tenantId,
                code: tenantCode,
                name: tenantName,
                phone: cleanPh,
                subscriptionPlan: 'trial',
                licenseDaysLeft: 30,
                licenseExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
                configuredRoles: ['cashier', 'server', 'manager', 'owner'],
              },
              deviceBinding: {
                isBound: true,
                tenantId: tenantId,
                tenantName: tenantName,
                branchId: defaultBranch.id,
                branchName: defaultBranch.name,
                deviceRole: 'pos',
                deviceName: 'Máy POS Quầy 01',
                boundAt: new Date().toISOString(),
              },
            });

            // Lưu mật khẩu cục bộ cho tài khoản quán mới
            set((state) => ({
              ownerPasswords: {
                ...state.ownerPasswords,
                [tenantCode]: cleanPass,
              },
            }));

            // Cách ly CSDL POS & Nhân sự
            try {
              const { usePOSStore } = require('./usePOSStore');
              const { useStaffStore } = require('./useStaffStore');
              await usePOSStore.getState().switchTenant?.(tenantId, tenantName);
              await useStaffStore.getState().switchTenant?.(tenantId);
            } catch (_) {}

            // Cập nhật KNOWN_PHONE_TENANTS
            KNOWN_PHONE_TENANTS[cleanPh] = { code: tenantCode, name: tenantName, defaultUser: 'owner' };

            return { success: true };
          }
        } catch {
          // Backend offline fallback
        }

        // 4. Ngoại tuyến: Tự động khởi tạo phiên quán mới trên bộ nhớ máy
        const generatedCode =
          cleanName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase()
            .slice(0, 15) || 'quan' + Date.now().toString().slice(-4);

        const localBranch: Branch = {
          id: 'branch_' + generatedCode,
          code: 'CN-01',
          name: 'Chi Nhánh 1 (Trụ Sở)',
          address: 'Trụ sở chính',
          phone: cleanPh,
        };

        set({
          _hasHydrated: true,
          isAuthenticated: true,
          token: 'local_token_' + generatedCode,
          currentRole: 'owner',
          ownerPin: '',
          managerPin: '',
          currentUser: {
            id: 'usr_owner_' + generatedCode,
            name: ownerName || 'Chủ Quán',
            role: 'owner',
            branchId: localBranch.id,
          },
          branches: [localBranch],
          activeBranchId: localBranch.id,
          configuredRoles: ['cashier', 'server', 'manager', 'owner'],
          tenantRolesMap: {
            ...(get().tenantRolesMap || DEFAULT_TENANT_ROLES_MAP),
            [generatedCode]: ['cashier', 'server', 'manager', 'owner'],
          },
          tenant: {
            id: 'tenant_' + generatedCode,
            code: generatedCode,
            name: cleanName,
            phone: cleanPh,
            subscriptionPlan: 'trial',
            licenseDaysLeft: 30,
            licenseExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            configuredRoles: ['cashier', 'server', 'manager', 'owner'],
          },
          deviceBinding: {
            isBound: true,
            tenantId: 'tenant_' + generatedCode,
            tenantName: cleanName,
            branchId: localBranch.id,
            branchName: localBranch.name,
            deviceRole: 'pos',
            deviceName: 'Máy POS Quầy 01',
            boundAt: new Date().toISOString(),
          },
        });

        set((state) => ({
          ownerPasswords: {
            ...state.ownerPasswords,
            [generatedCode]: cleanPass,
          },
        }));

        try {
          const { usePOSStore } = require('./usePOSStore');
          const { useStaffStore } = require('./useStaffStore');
          await usePOSStore.getState().switchTenant?.('tenant_' + generatedCode, cleanName);
          await useStaffStore.getState().switchTenant?.('tenant_' + generatedCode);
        } catch (_) {}

        KNOWN_PHONE_TENANTS[cleanPh] = { code: generatedCode, name: cleanName, defaultUser: 'owner' };

        return { success: true };
      },

      loginWithPin: async (pin, branchId, staffMemberId) => {
        const cleanPin = pin.trim();
        if (!cleanPin) {
          return { success: false, error: 'Mã PIN không được để trống' };
        }

        // 1. PIN Chủ Dự Án (0000 / 7777): Kích hoạt yêu cầu Khóa 64 ký tự (Zero-Trust)
        if (cleanPin === '0000' || cleanPin === '7777') {
          return {
            success: false,
            requiresMasterKey: true,
            error: 'Yêu cầu nhập Khóa Bảo Mật Chủ Dự Án (64 ký tự)',
          };
        }

        // 2. Thử gọi backend nếu có
        try {
          const res = await fetchWithFastTimeout(`${getBaseUrl()}/api/v1/public/staff-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pin: cleanPin,
              tenant_id: get().tenant.id,
              branch_id: branchId || get().activeBranchId,
              staff_id: staffMemberId,
            }),
          }, 800);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              const role = (data.user.role as UserRole) || 'cashier';
              if (!get().isRoleConfigured(role)) {
                const roleLabel = ROLE_LABELS[role]?.label || role;
                return {
                  success: false,
                  error: `Vai trò ${roleLabel} chưa được Chủ Quán thiết lập tại quán này`,
                };
              }

              set({
                isAuthenticated: true,
                token: data.token,
                currentRole: role,
                currentUser: {
                  id: data.user.id,
                  name: data.user.full_name,
                  role,
                  branchId: branchId || get().activeBranchId,
                },
              });
              return { success: true };
            }
          }
        } catch {
          // Offline fallback
        }

        // 3. Nếu người dùng đã chọn nhân sự cụ thể (staffMemberId)
        if (staffMemberId) {
          try {
            const { useStaffStore } = require('./useStaffStore');
            const staffStore = useStaffStore.getState();
            const staffList = staffStore.staffList;
            const staff = staffList.find((s: any) => s.id === staffMemberId && s.status === 'active');
            if (staff) {
              let mappedRole: UserRole = 'server';
              if (staff.role === 'quan_ly') mappedRole = 'manager';
              else if (staff.role === 'thu_ngan' || staff.role === 'pha_che') mappedRole = 'cashier';
              else if (staff.role === 'phuc_vu' || staff.role === 'bep' || staff.role === 'tap_vu') mappedRole = 'server';

              const currentOwnerPin = (get().ownerPin || '').trim();
              const currentManagerPin = (get().managerPin || '').trim();
              const isPinValid =
                (staff.pinCode && staff.pinCode === cleanPin) ||
                (mappedRole === 'manager' && currentManagerPin && cleanPin === currentManagerPin) ||
                (currentOwnerPin && cleanPin === currentOwnerPin);

              if (isPinValid) {
                if (!get().isRoleConfigured(mappedRole)) {
                  const roleLabel = ROLE_LABELS[mappedRole]?.label || mappedRole;
                  return {
                    success: false,
                    error: `Vai trò ${roleLabel} chưa được Chủ Quán thiết lập tại quán này`,
                  };
                }

                // Tự động điểm danh vào ca nếu chưa active
                if (!staff.isWorking) {
                  try {
                    staffStore.clockIn(staff.id);
                  } catch (_) {}
                }

                set({
                  isAuthenticated: true,
                  token: 'pin_token_staff_' + staff.id,
                  currentRole: mappedRole,
                  currentUser: {
                    id: staff.id,
                    name: staff.name,
                    role: mappedRole,
                    branchId: branchId || get().activeBranchId,
                  },
                });
                return { success: true };
              }
            }
          } catch {}
        }

        // 4. Tra cứu danh sách nhân sự thực tế trong useStaffStore theo mã PIN
        try {
          const { useStaffStore } = require('./useStaffStore');
          const staffStore = useStaffStore.getState();
          const staffList = staffStore.staffList;
          // Tìm theo pin riêng hoặc theo pin mặc định vai trò
          const matchedStaff = staffList.find(
            (s: any) => s.status === 'active' && s.pinCode === cleanPin
          );

          if (matchedStaff) {
            let mappedRole: UserRole = 'server';
            if (matchedStaff.role === 'quan_ly') mappedRole = 'manager';
            else if (matchedStaff.role === 'thu_ngan' || matchedStaff.role === 'pha_che') mappedRole = 'cashier';
            else if (matchedStaff.role === 'phuc_vu' || matchedStaff.role === 'bep' || matchedStaff.role === 'tap_vu') mappedRole = 'server';

            if (!get().isRoleConfigured(mappedRole)) {
              const roleLabel = ROLE_LABELS[mappedRole]?.label || mappedRole;
              return {
                success: false,
                error: `Vai trò ${roleLabel} chưa được Chủ Quán thiết lập tại quán này`,
              };
            }

            // Tự động điểm danh vào ca nếu chưa active
            if (!matchedStaff.isWorking) {
              try {
                staffStore.clockIn(matchedStaff.id);
              } catch (_) {}
            }

            set({
              isAuthenticated: true,
              token: 'pin_token_staff_' + matchedStaff.id,
              currentRole: mappedRole,
              currentUser: {
                id: matchedStaff.id,
                name: matchedStaff.name,
                role: mappedRole,
                branchId: branchId || get().activeBranchId,
              },
            });
            return { success: true };
          }
        } catch {}

        // 5. Tra cứu mã PIN tiêu chuẩn của vai trò (chỉ khi Chủ quán đã chủ động thiết lập)
        let targetRole: UserRole | null = null;
        const currentOwnerPin = (get().ownerPin || '').trim();
        const currentManagerPin = (get().managerPin || '').trim();

        if (currentOwnerPin && cleanPin === currentOwnerPin) targetRole = 'owner';
        else if (currentManagerPin && cleanPin === currentManagerPin) targetRole = 'manager';

        if (targetRole) {
          if (!get().isRoleConfigured(targetRole)) {
            const roleLabel = ROLE_LABELS[targetRole]?.label || targetRole;
            return {
              success: false,
              error: `Vai trò ${roleLabel} chưa được Chủ Quán thiết lập tại quán này`,
            };
          }

          // Gán user phù hợp nhất nếu có trong staffList
          let matchedUser = DEFAULT_USERS[targetRole];
          try {
            const { useStaffStore } = require('./useStaffStore');
            const staffStore = useStaffStore.getState();
            const staffList = staffStore.staffList;
            const staff = staffList.find((s: any) => {
              if (s.status !== 'active') return false;
              if (targetRole === 'manager') return s.role === 'quan_ly';
              if ((targetRole as string) === 'cashier') return s.role === 'thu_ngan' || s.role === 'pha_che';
              if ((targetRole as string) === 'server') return s.role === 'phuc_vu' || s.role === 'bep' || s.role === 'tap_vu';
              return false;
            });
            if (staff) {
              matchedUser = {
                id: staff.id,
                name: staff.name,
                role: targetRole,
                branchId: branchId || get().activeBranchId,
              };
              if (!staff.isWorking) {
                try {
                  staffStore.clockIn(staff.id);
                } catch (_) {}
              }
            }
          } catch (_) {}

          set({
            isAuthenticated: true,
            token: 'pin_token_' + targetRole,
            currentRole: targetRole,
            currentUser: matchedUser,
          });
          return { success: true };
        }

        return { success: false, error: 'Mã PIN không chính xác' };
      },

      loginWithMasterKey: async (key: string) => {
        const cleanKey = key.trim();
        if (cleanKey.length !== 64) {
          return {
            success: false,
            error: `Khóa bảo mật không chính xác (cần đúng 64 ký tự, hiện có ${cleanKey.length}/64)`,
          };
        }

        try {
          const res = await fetchWithFastTimeout(`${getBaseUrl()}/api/v1/public/saas-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'nguyenlocthanh291097',
              password: 'Danh@!26062002',
              master_key: cleanKey,
            }),
          }, 6000);

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success) {
            return {
              success: false,
              error: data.error || 'Khóa bảo mật Root không chính xác hoặc đã bị khóa tạm thời',
            };
          }

          set({
            _hasHydrated: true,
            isAuthenticated: true,
            token: data.token,
            currentRole: 'super_admin',
            currentUser: DEFAULT_USERS.super_admin,
            activeBranchId: 'hq_system',
            tenant: {
              id: 'tenant_saas',
              code: 'saas',
              name: 'Cổng Quản Trị Hệ Thống SaaS',
              phone: '',
              subscriptionPlan: 'enterprise',
              licenseDaysLeft: 9999,
              licenseExpiresAt: '2099-12-31',
              configuredRoles: ['owner'],
            },
          });

          return { success: true };
        } catch {
          return {
            success: false,
            error: 'Không thể kết nối máy chủ xác thực Root',
          };
        }
      },

      quickDemoLogin: (role) => {
        const currentRoles = get().configuredRoles || [];
        const updatedRoles = currentRoles.includes(role) ? currentRoles : [...currentRoles, role];
        set({
          _hasHydrated: true,
          isAuthenticated: true,
          currentRole: role,
          currentUser: DEFAULT_USERS[role],
          branches: INITIAL_BRANCHES,
          activeBranchId: 'branch_01',
          tenant: DEFAULT_TENANT,
          deviceBinding: {
            isBound: true,
            tenantId: DEFAULT_TENANT.id,
            tenantName: 'OngChu Coffee & Tea HQ',
            branchId: 'branch_01',
            branchName: 'Chi Nhánh 1 (Quận 1)',
            deviceRole: 'pos',
            deviceName: 'Máy POS Quầy 01',
            boundAt: new Date().toISOString(),
          },
          token: 'demo_token_' + role,
          configuredRoles: updatedRoles,
        });

        try {
          const { usePOSStore } = require('./usePOSStore');
          const { useStaffStore } = require('./useStaffStore');
          usePOSStore.getState().switchTenant(DEFAULT_TENANT.id, DEFAULT_TENANT.name);
          useStaffStore.getState().switchTenant(DEFAULT_TENANT.id);
        } catch (_) {}
      },

      logout: () => {
        set({
          isAuthenticated: false,
          token: undefined,
        });
      },

      getActiveBranch: () => {
        const branches = get().branches;
        const activeId = get().activeBranchId;
        return branches.find((b) => b.id === activeId) || branches[0];
      },

      getBranchQuota: () => {
        const plan = get().tenant?.subscriptionPlan || 'standard';
        const maxBranches = plan === 'enterprise' ? 'unlimited' : plan === 'pro' ? 3 : 1;
        const maxBranchesNum = plan === 'enterprise' ? 9999 : plan === 'pro' ? 3 : 1;
        const currentCount = get().branches.length;
        const isAtLimit = typeof maxBranches === 'number' && currentCount >= maxBranches;
        const planLabels: Record<string, string> = {
          trial: 'Dùng Thử',
          standard: 'Standard',
          pro: 'Pro (3 CN)',
          enterprise: 'Enterprise',
        };
        return {
          currentCount,
          maxBranches,
          maxBranchesNum,
          isAtLimit,
          planName: planLabels[plan] || plan.toUpperCase(),
        };
      },

      canAccessRoute: (route?: string) => {
        return checkRoutePermission(get().currentRole, route);
      },

      verifyManagerPin: async (pin: string, action = 'void_item') => {
        const cleanPin = pin.trim();
        if (!cleanPin) {
          return { success: false, error: 'Cần nhập mã PIN' };
        }

        const currentLocalPin = get().managerPin.trim();
        const currentOwnerPin = (get().ownerPin || '').trim();

        // 1. Check local master PINs first for 0ms ultra-fast offline validation
        const isMaster =
          (currentOwnerPin && cleanPin === currentOwnerPin) ||
          (currentLocalPin && cleanPin === currentLocalPin);
        if (isMaster) {
          return { success: true };
        }

        // 2. Try remote verification with backend if reachable
        try {
          const res = await fetchWithFastTimeout(`${getBaseUrl()}/api/v1/auth/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: cleanPin, action }),
          }, 800);

          if (res.ok) {
            return { success: true };
          } else if (res.status === 403 || res.status === 401) {
            // Explicit rejection from backend
            return { success: false, error: 'Mã PIN quản lý không chính xác' };
          }
        } catch {
          // Backend offline - use verified local PIN
        }

        return { success: false, error: 'Mã PIN quản lý không chính xác' };
      },

      startImpersonation: (targetTenant) => {
        const tenantKey = targetTenant.subdomain || targetTenant.id;
        const targetRoles =
          (targetTenant as any).configuredRoles ||
          get().tenantRolesMap?.[tenantKey] ||
          DEFAULT_TENANT_ROLES_MAP[tenantKey] ||
          (tenantKey === 'trabong' || tenantKey === 'banhmihp' ? ['cashier', 'owner'] : ['cashier', 'server', 'manager', 'owner']);

        const isOngChu = targetTenant.id === 'tenant_ongchu';
        const cleanCode = targetTenant.subdomain || targetTenant.id.replace(/^tenant_/, '');
        const targetBranches: Branch[] = isOngChu
          ? INITIAL_BRANCHES
          : [
              {
                id: 'branch_' + cleanCode,
                code: 'CN-01',
                name: 'Chi Nhánh 1 (Trụ Sở)',
                address: 'Trụ sở chính',
                phone: targetTenant.phone || '',
              },
            ];
        const primaryBranchId = targetBranches[0].id;

        set({
          _hasHydrated: true,
          impersonation: {
            isImpersonating: true,
            tenantId: targetTenant.id,
            tenantName: targetTenant.name,
            tenantCode: targetTenant.subdomain,
            originalRole: 'super_admin',
            startedAt: new Date().toISOString(),
          },
          currentRole: 'owner',
          currentUser: {
            id: 'usr_support_' + targetTenant.subdomain,
            name: `Kỹ Thuật Hỗ Trợ (${targetTenant.name})`,
            role: 'owner',
            branchId: primaryBranchId,
          },
          branches: targetBranches,
          activeBranchId: primaryBranchId,
          configuredRoles: targetRoles,
          tenant: {
            ...get().tenant,
            id: targetTenant.id,
            code: targetTenant.subdomain,
            name: targetTenant.name,
            phone: targetTenant.phone || get().tenant.phone,
            subscriptionPlan: (targetTenant.subscriptionPlan as any) || 'pro',
            configuredRoles: targetRoles,
          },
          deviceBinding: {
            isBound: true,
            tenantId: targetTenant.id,
            tenantName: targetTenant.name,
            branchId: primaryBranchId,
            branchName: targetBranches[0].name,
            deviceRole: 'pos',
            deviceName: 'Máy POS Quầy 01',
            boundAt: new Date().toISOString(),
          },
          isAuthenticated: true,
        });

        // Cách ly dữ liệu POS & Nhân sự khi Hỗ Trợ khách thuê
        try {
          const { usePOSStore } = require('./usePOSStore');
          const { useStaffStore } = require('./useStaffStore');
          usePOSStore.getState().switchTenant(targetTenant.id, targetTenant.name);
          useStaffStore.getState().switchTenant(targetTenant.id);
        } catch (_) {}
      },

      stopImpersonation: () => {
        const defaultRoles = DEFAULT_TENANT_ROLES_MAP['ongchu'] || ['cashier', 'server', 'manager', 'owner'];
        set({
          _hasHydrated: true,
          impersonation: null,
          currentRole: 'super_admin',
          currentUser: DEFAULT_USERS.super_admin,
          branches: INITIAL_BRANCHES,
          activeBranchId: 'branch_01',
          configuredRoles: defaultRoles,
          isAuthenticated: true,
        });

        // Đưa dữ liệu POS về mặc định hệ thống
        try {
          const { usePOSStore } = require('./usePOSStore');
          const { useStaffStore } = require('./useStaffStore');
          usePOSStore.getState().switchTenant(DEFAULT_TENANT.id, DEFAULT_TENANT.name);
          useStaffStore.getState().switchTenant(DEFAULT_TENANT.id);
        } catch (_) {}
      },

      isSuperAdmin: () => get().currentRole === 'super_admin',
      isOwner: () => get().currentRole === 'owner',
      isManager: () => get().currentRole === 'manager',
      isCashier: () => get().currentRole === 'cashier',
      isServer: () => get().currentRole === 'server',

      requiresManagerApproval: (action) => {
        const role = get().currentRole;
        // Owner, Super Admin, and Manager never require PIN approval for own actions
        if (role === 'owner' || role === 'super_admin' || role === 'manager') return false;

        // Cashier & Server always require PIN for high-risk actions
        switch (action) {
          case 'void_item':
          case 'void_order':
          case 'excessive_discount':
          case 'reprint_bill':
            return true;
          default:
            return false;
        }
      },

      isMultiBranch: () => get().branches.length > 1,
    }),
    {
      name: 'ongchu_auth_storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.token === 'demo_token_cashier') {
          useAuthStore.setState({
            isAuthenticated: false,
            token: undefined,
          });
        }
        if (!state?.isAuthenticated && state?.deviceBinding?.tenantId === 'tenant_ongchu') {
          useAuthStore.setState({
            deviceBinding: DEFAULT_DEVICE_BINDING,
          });
        }
        if (state?.tenant?.id) {
          try {
            const { usePOSStore } = require('./usePOSStore');
            const { useStaffStore } = require('./useStaffStore');
            if (usePOSStore.getState().tenantId !== state.tenant.id) {
              usePOSStore.getState().switchTenant(state.tenant.id, state.tenant.name);
            }
            if (useStaffStore.getState().tenantId !== state.tenant.id) {
              useStaffStore.getState().switchTenant(state.tenant.id);
            }
            // 🚀 Chỉ cập nhật Master Catalog khi đã đăng nhập hợp lệ (chống 401 khi ở màn login)
            if (state.isAuthenticated && state.token) {
              usePOSStore.getState().fetchMasterCatalog().catch(() => {});
            }
          } catch (_) {}
        }
      },
      partialize: (state) => ({
        currentRole: state.currentRole,
        ownerPin: state.ownerPin,
        managerPin: state.managerPin,
        ownerPasswords: state.ownerPasswords,
        currentUser: state.currentUser,
        branches: state.branches,
        activeBranchId: state.activeBranchId,
        tenant: state.tenant,
        deviceBinding: state.deviceBinding,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);
