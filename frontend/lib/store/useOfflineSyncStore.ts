import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../api/apiClient';

export interface OfflineOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  toppings?: string[];
  note?: string;
  station?: 'bar' | 'kitchen' | 'snack';
}

export interface QueuedOrder {
  clientOrderId: string;
  orderCode: string;
  tableId: string;
  tableName: string;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'tien_mat' | 'vietqr' | 'the' | 'hon_hop' | 'ghi_no';
  items: OfflineOrderItem[];
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface OfflineSyncState {
  queue: QueuedOrder[];
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: string | null;
  totalSyncedCount: number;
  lastError: string | null;

  // Actions
  enqueueOrder: (
    order: Omit<QueuedOrder, 'clientOrderId' | 'createdAt' | 'retryCount'> & {
      clientOrderId?: string;
      createdAt?: string;
    }
  ) => QueuedOrder;
  removeOrder: (clientOrderId: string) => void;
  clearQueue: () => void;
  setOnline: (online: boolean) => void;
  syncOrders: (
    serverBaseUrl?: string
  ) => Promise<{ synced_count: number; duplicate_count: number; error?: string }>;
}

// Generate RFC4122 v4 UUID without external dependencies
export function generateUUID(): string {
  let d = Date.now();
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      isOnline: true,
      syncStatus: 'idle',
      lastSyncTime: null,
      totalSyncedCount: 0,
      lastError: null,

      enqueueOrder: (orderData) => {
        const clientOrderId = orderData.clientOrderId || generateUUID();
        const newQueuedOrder: QueuedOrder = {
          ...orderData,
          clientOrderId,
          createdAt: orderData.createdAt || new Date().toISOString(),
          retryCount: 0,
        };

        const updatedQueue = [...get().queue, newQueuedOrder];
        set({ queue: updatedQueue, syncStatus: 'idle' });

        // Auto-trigger sync in background if online
        if (get().isOnline) {
          setTimeout(() => {
            get().syncOrders().catch(() => {});
          }, 500);
        }

        return newQueuedOrder;
      },

      removeOrder: (clientOrderId) => {
        set((state) => ({
          queue: state.queue.filter((o) => o.clientOrderId !== clientOrderId),
        }));
      },

      clearQueue: () => {
        set({ queue: [], lastError: null, syncStatus: 'idle' });
      },

      setOnline: (online) => {
        set({ isOnline: online });
        if (online && get().queue.length > 0) {
          get().syncOrders().catch(() => {});
        }
      },

      syncOrders: async (serverBaseUrl = getBaseUrl()) => {
        const currentQueue = get().queue;
        if (currentQueue.length === 0) {
          set({ syncStatus: 'idle' });
          return { synced_count: 0, duplicate_count: 0 };
        }

        set({ syncStatus: 'syncing', lastError: null });

        // Transform queue to standard Backend contract format
        const payloadOrders = currentQueue.map((item) => ({
          client_order_id: item.clientOrderId,
          order_code: item.orderCode,
          table_id: item.tableId,
          total_amount: item.totalAmount,
          payment_method: item.paymentMethod,
          items: item.items.map((it: any) => ({
            product_id: it.productId || it.product_id,
            product_name: it.productName || it.name || it.title || '',
            name: it.productName || it.name || it.title || '',
            quantity: it.quantity || it.qty || 1,
            unit_price: it.unitPrice || it.unit_price || it.price || 0,
            selected_size: it.selectedSize || it.selected_size,
            sugar_level: it.sugarLevel || it.sugar_level,
            ice_level: it.iceLevel || it.ice_level,
            toppings: it.toppings,
            note: it.note,
            station: it.station || 'kitchen',
          })),
        }));

        // Tự động lấy Tenant ID & Token để cách ly dữ liệu đa khách thuê
        let activeTenantId = 'tenant_ongchu';
        let authToken = '';
        try {
          const { useAuthStore } = require('./useAuthStore');
          const authState = useAuthStore.getState();
          if (authState.tenant?.id) activeTenantId = authState.tenant.id;
          if (authState.token) authToken = authState.token;
        } catch {}

        try {
          const res = await fetch(`${serverBaseUrl}/api/v1/sync/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': activeTenantId,
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ orders: payloadOrders }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => 'Lỗi kết nối máy chủ');
            set({
              syncStatus: 'error',
              lastError: `Lỗi máy chủ (${res.status}): ${errText}`,
            });
            return {
              synced_count: 0,
              duplicate_count: 0,
              error: `HTTP ${res.status}: ${errText}`,
            };
          }

          const data = await res.json();
          const syncedCount = Number(data.synced_count || 0);
          const duplicateCount = Number(data.duplicate_count || 0);

          // Remove all synced or duplicated orders from the local queue
          const syncedIds = new Set<string>();
          if (Array.isArray(data.results)) {
            data.results.forEach((r: { client_order_id?: string; status?: string }) => {
              if (r.client_order_id && (r.status === 'synced' || r.status === 'duplicate')) {
                syncedIds.add(r.client_order_id);
              }
            });
          }

          // If server confirmed all orders synced/duplicated or matched count, clear whole queue
          let remainingQueue: QueuedOrder[] = [];
          if (syncedIds.size > 0) {
            remainingQueue = get().queue.filter((q) => !syncedIds.has(q.clientOrderId));
          } else if (syncedCount + duplicateCount >= currentQueue.length) {
            remainingQueue = [];
          } else {
            remainingQueue = get().queue;
          }

          set((state) => ({
            queue: remainingQueue,
            syncStatus: 'synced',
            lastSyncTime: new Date().toISOString(),
            totalSyncedCount: state.totalSyncedCount + syncedCount,
            isOnline: true,
            lastError: null,
          }));

          // 🔄 Kéo ngay dữ liệu tươi mới từ máy chủ sau khi đồng bộ đơn thành công
          if (syncedCount > 0) {
            try {
              const { usePOSStore } = require('./usePOSStore');
              usePOSStore.getState().fetchMasterCatalog().catch(() => {});
            } catch {}
          }

          return {
            synced_count: syncedCount,
            duplicate_count: duplicateCount,
          };
        } catch (err: any) {
          // Network failure: retain queue and increment retry counts
          const updatedQueue = get().queue.map((item) => ({
            ...item,
            retryCount: item.retryCount + 1,
            lastError: err?.message || 'Không thể kết nối máy chủ',
          }));

          set({
            queue: updatedQueue,
            syncStatus: 'error',
            isOnline: false,
            lastError: err?.message || 'Mất kết nối mạng ngoại tuyến',
          });

          return {
            synced_count: 0,
            duplicate_count: 0,
            error: err?.message || 'Mạng ngoại tuyến',
          };
        }
      },
    }),
    {
      name: 'ongchu_offline_sync_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        lastSyncTime: state.lastSyncTime,
        totalSyncedCount: state.totalSyncedCount,
      }),
    }
  )
);

// 🌐 TỰ ĐỘNG LẮNG NGHE MẠNG VÀ ĐẨY ĐƠN NGOẠI TUYẾN NGAY TỨC THÌ KHI CÓ INTERNET
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('online', () => {
    useOfflineSyncStore.getState().setOnline(true);
    useOfflineSyncStore.getState().syncOrders().catch(() => {});
  });
  window.addEventListener('focus', () => {
    if (useOfflineSyncStore.getState().queue.length > 0) {
      useOfflineSyncStore.getState().syncOrders().catch(() => {});
    }
  });
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useOfflineSyncStore.getState().queue.length > 0) {
      useOfflineSyncStore.getState().syncOrders().catch(() => {});
    }
  });
}

// 📱 Hỗ trợ React Native AppState (iOS / Android Native)
try {
  const { AppState } = require('react-native');
  AppState.addEventListener('change', (nextState: string) => {
    if (nextState === 'active' && useOfflineSyncStore.getState().queue.length > 0) {
      useOfflineSyncStore.getState().syncOrders().catch(() => {});
    }
  });
} catch {}

