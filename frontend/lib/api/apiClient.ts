let Constants: any = null;
try {
  Constants = require('expo-constants')?.default || require('expo-constants');
} catch {}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  isOffline?: boolean;
}

const DEFAULT_PRODUCTION_CLOUD_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  'https://app.ongchu.cloud';

export function getBaseUrl(): string {
  // 1. Môi trường kiểm thử tự động
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_TARGET === 'vps' ? DEFAULT_PRODUCTION_CLOUD_URL : 'http://localhost:8080';
  }

  // 2. Cấu hình IP/Domain thủ công từ Cài Đặt của quán (nếu có)
  try {
    const { usePOSStore } = require('../store/usePOSStore');
    const settings = usePOSStore?.getState?.()?.storeSettings;
    if (settings && (settings as any).backendUrl) {
      return (settings as any).backendUrl;
    }
  } catch {}

  // 3. Biến môi trường ép dùng Local Backend khi dev offline
  if (process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true') {
    return 'http://localhost:8080';
  }

  // 4. Biến môi trường API URL tùy chỉnh
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 5. Khi chạy trên Web trình duyệt: ưu tiên origin của trang hiện tại
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return window.location.origin;
    }
  }

  // 6. Mặc định toàn hệ thống trỏ về Cloud URL
  return DEFAULT_PRODUCTION_CLOUD_URL;
}

/**
 * Lấy URL công khai tra cứu Hóa Đơn Điện Tử (e-Receipt)
 */
export function getPublicBillUrl(orderCode: string): string {
  const cleanCode = (orderCode || '').trim();
  const customBillDomain = process.env.EXPO_PUBLIC_BILL_URL;
  if (customBillDomain) {
    return `${customBillDomain.replace(/\/+$/, '')}/b/${cleanCode}`;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}/b/${cleanCode}`;
  }
  const base = getBaseUrl();
  return `${base.replace(/\/+$/, '')}/b/${cleanCode}`;
}

/**
 * Standard fetch with reliable network timeout and instant offline fallback
 */
export async function requestWithTimeout<T = any>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  let url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  // Tự động gắn Tenant ID & Token động từ Auth/POS Store (Zero Data Bleeding)
  let activeTenantId = '';
  let authToken = '';
  try {
    const { useAuthStore } = require('../store/useAuthStore');
    const authState = useAuthStore?.getState?.() || {};
    const { usePOSStore } = require('../store/usePOSStore');
    const posState = usePOSStore?.getState?.() || {};

    activeTenantId = authState.tenant?.id || authState.deviceBinding?.tenantId || posState.tenantId || '';
    authToken = authState.token || '';
  } catch {}

  if (activeTenantId && !url.includes('tenant_id=') && (options.method === 'GET' || !options.method)) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}tenant_id=${encodeURIComponent(activeTenantId)}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(activeTenantId ? { 'X-Tenant-ID': activeTenantId } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    clearTimeout(timer);

    let data: any = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }

    if (!res.ok) {
      // 🛡️ Khi API trả về 401 Unauthorized: Phiên/token đã hết hạn hoặc không hợp lệ -> Dọn dẹp token rác
      if (res.status === 401 && !url.includes('/api/v1/public/')) {
        try {
          const { useAuthStore } = require('../store/useAuthStore');
          if (useAuthStore.getState().isAuthenticated || useAuthStore.getState().token) {
            useAuthStore.setState({
              isAuthenticated: false,
              token: undefined,
            });
          }
        } catch (_) {}
      }

      const errorMsg =
        (data && typeof data === 'object' && (data.error || data.message)) ||
        (typeof data === 'string' && data) ||
        `Lỗi HTTP ${res.status}`;
      return {
        success: false,
        error: errorMsg,
        status: res.status,
        data,
      };
    }

    return {
      success: true,
      data,
      status: res.status,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      error: isTimeout ? 'Hết thời gian chờ kết nối máy chủ (500ms)' : 'Mất kết nối máy chủ (Ngoại tuyến)',
      status: 0,
      isOffline: true,
    };
  }
}

// REST Convenience Methods
export const apiClient = {
  get: <T = any>(path: string, options?: RequestInit) =>
    requestWithTimeout<T>(path, { ...options, method: 'GET' }),

  post: <T = any>(path: string, body?: any, options?: RequestInit) =>
    requestWithTimeout<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(path: string, body?: any, options?: RequestInit) =>
    requestWithTimeout<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(path: string, body?: any, options?: RequestInit) =>
    requestWithTimeout<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(path: string, options?: RequestInit) =>
    requestWithTimeout<T>(path, { ...options, method: 'DELETE' }),

  // 🛡️ Domain Endpoints
  verifyManagerPin: (pin: string, action = 'void_item') =>
    apiClient.post('/api/v1/auth/verify-pin', { pin, action }),

  getOrders: () =>
    apiClient.get('/api/v1/orders'),

  syncOrders: (orders: any[]) =>
    apiClient.post('/api/v1/sync/orders', { orders }),

  restoreBackup: (payload: any) =>
    apiClient.post('/api/v1/backup/restore', payload),

  getKDSOrders: (station?: string) =>
    apiClient.get(station && station !== 'all' ? `/api/v1/kds/orders?station=${station}` : '/api/v1/kds/orders'),

  updateKDSItemStatus: (itemId: string, status: string) =>
    apiClient.patch(`/api/v1/kds/items/${itemId}/status`, { status }),

  updateKDSOrderStatus: (orderId: string, status: string) =>
    apiClient.patch(`/api/v1/kds/orders/${orderId}/status`, { status }),

  voidOrder: (orderId: string, reason: string, pin?: string) =>
    apiClient.post(`/api/v1/orders/${orderId}/void`, { reason, pin }),

  payOrder: (orderId: string, paymentData: any) =>
    apiClient.post(`/api/v1/orders/${orderId}/pay`, paymentData),

  getCustomerByPhone: (phone: string) =>
    apiClient.get(`/api/v1/customers/by-phone/${phone}`),

  printReceipt: (orderData: any) =>
    apiClient.post('/api/v1/printer/print-receipt', orderData),

  openDrawer: () =>
    apiClient.post('/api/v1/printer/open-drawer', {}),

  getIngredients: () =>
    apiClient.get('/api/v1/inventory/ingredients'),

  createIngredient: (data: any) =>
    apiClient.post('/api/v1/inventory/ingredients', data),

  updateIngredient: (id: string, data: any) =>
    apiClient.put(`/api/v1/inventory/ingredients/${id}`, data),

  deleteIngredient: (id: string) =>
    apiClient.delete(`/api/v1/inventory/ingredients/${id}`),

  getLowStockIngredients: () =>
    apiClient.get('/api/v1/inventory/low-stock'),

  // 👥 Nhân Sự & Tiền Lương
  getStaff: () => apiClient.get('/api/v1/staff'),
  createStaff: (staff: any) => apiClient.post('/api/v1/staff', staff),
  updateStaff: (id: string, updates: any) => apiClient.put(`/api/v1/staff/${id}`, updates),
  deleteStaff: (id: string) => apiClient.delete(`/api/v1/staff/${id}`),
  clockInStaff: (id: string, shiftType = 'ca_sang') =>
    apiClient.post(`/api/v1/staff/${id}/clock-in`, { shift_type: shiftType }),
  clockOutStaff: (id: string, note?: string) =>
    apiClient.post(`/api/v1/staff/${id}/clock-out`, { note }),
  logManualShift: (id: string, shiftData: any) =>
    apiClient.post(`/api/v1/staff/${id}/shifts/manual`, shiftData),
  advanceStaff: (id: string, advanceData: any) =>
    apiClient.post(`/api/v1/staff/${id}/advances`, advanceData),
  calculateStaffSalary: (id: string) =>
    apiClient.get(`/api/v1/staff/${id}/calculate-salary`),
  payStaffSalary: (id: string, payData: any) =>
    apiClient.post(`/api/v1/staff/${id}/pay-salary`, payData),

  // ⚙️ Cài Đặt Cửa Hàng, VietQR & Bill
  getSettings: () => apiClient.get('/api/v1/settings'),
  updateSettings: (settings: any) => apiClient.put('/api/v1/settings', settings),
  testTelegramAlert: () => apiClient.post('/api/v1/settings/test-telegram', {}),

  // 🪑 Bàn Ăn & Khu Vực
  getTables: () => apiClient.get('/api/v1/tables'),
  createTable: (table: any) => apiClient.post('/api/v1/tables', table),
  updateTable: (id: string, updates: any) => apiClient.put(`/api/v1/tables/${id}`, updates),
  reorderTables: (ids: string[]) => apiClient.post('/api/v1/tables/reorder', { ids, table_ids: ids }),
  getAreas: () => apiClient.get('/api/v1/areas'),
  createArea: (name: string) => apiClient.post('/api/v1/areas', { name }),
  updateArea: (id: string, name: string) => apiClient.put(`/api/v1/areas/${id}`, { name }),
  deleteArea: (id: string) => apiClient.delete(`/api/v1/areas/${id}`),
  reorderAreas: (ids: string[]) => apiClient.post('/api/v1/areas/reorder', { ids, area_ids: ids }),

  // 📋 Thực Đơn & Toppings
  getCategories: () => apiClient.get('/api/v1/categories'),
  createCategory: (category: any) => apiClient.post('/api/v1/categories', category),
  updateCategory: (id: string, updates: any) => apiClient.put(`/api/v1/categories/${id}`, updates),
  deleteCategory: (id: string) => apiClient.delete(`/api/v1/categories/${id}`),
  reorderCategories: (ids: string[]) => apiClient.post('/api/v1/categories/reorder', { ids, category_ids: ids }),
  getProducts: () => apiClient.get('/api/v1/products'),
  createProduct: (product: any) => apiClient.post('/api/v1/products', product),
  updateProduct: (id: string, updates: any) => apiClient.put(`/api/v1/products/${id}`, updates),
  deleteProduct: (id: string) => apiClient.delete(`/api/v1/products/${id}`),
  reorderProducts: (ids: string[]) => apiClient.post('/api/v1/products/reorder', { ids, product_ids: ids }),
  toggle86: (productId: string) => apiClient.post(`/api/v1/products/${productId}/toggle-86`, {}),
  updateProductPrice: (productId: string, price: number) =>
    apiClient.patch(`/api/v1/products/${productId}/price`, { price }),
  getToppings: () => apiClient.get('/api/v1/toppings'),
  createTopping: (topping: any) => apiClient.post('/api/v1/toppings', topping),
  updateTopping: (id: string, updates: any) => apiClient.put(`/api/v1/toppings/${id}`, updates),
  deleteTopping: (id: string) => apiClient.delete(`/api/v1/toppings/${id}`),
  reorderToppings: (ids: string[]) => apiClient.post('/api/v1/toppings/reorder', { ids, topping_ids: ids }),

  // 📊 Chi Phí Cố Định
  getRecurringExpenses: () => apiClient.get('/api/v1/expenses/recurring'),
  createRecurringExpense: (expense: any) => apiClient.post('/api/v1/expenses/recurring', expense),
  updateRecurringExpense: (id: string, updates: any) => apiClient.put(`/api/v1/expenses/recurring/${id}`, updates),
  deleteRecurringExpense: (id: string) => apiClient.delete(`/api/v1/expenses/recurring/${id}`),
  recordRecurringExpense: (id: string) => apiClient.post(`/api/v1/expenses/recurring/${id}/record`, {}),

  // 💵 Sổ Quỹ & Giao Ca
  createCashTransaction: (tx: any) => apiClient.post('/api/v1/cash/transactions', tx),
  voidCashTransaction: (id: string, reason: string) =>
    apiClient.post(`/api/v1/cash/transactions/${id}/void`, { void_reason: reason }),
  getCashTransactions: () => apiClient.get('/api/v1/cash/transactions'),
  getCashSummary: () => apiClient.get('/api/v1/cash/summary'),
  openShift: (shiftData: any) => apiClient.post('/api/v1/shifts/open', shiftData),
  closeShift: (shiftId: string, closeData: any) => apiClient.post(`/api/v1/shifts/${shiftId}/close`, closeData),
  getCurrentShift: () => apiClient.get('/api/v1/shifts/current'),

  // 👑 Báo Cáo 3 Con Số Vàng (PnL)
  getOwnerPnLSummary: () => apiClient.get('/api/v1/owner/pnl-summary'),
};
