import { StateCreator } from 'zustand';
import { wsClient } from '../../api/wsClient';
import type { POSState, KDSOrder, KitchenCookingStatus } from '../usePOSStore';

export interface KDSSlice {
  kdsOrders: KDSOrder[];
  updateKDSItemStatus: (orderId: string, itemId: string, status: 'pending' | 'cooking' | 'done') => void;
  updateKDSOrderStatus: (orderId: string, status: 'pending' | 'cooking' | 'ready' | 'served') => void;
  markAllKDSItemsDone: (orderId: string) => void;
  autoCleanupKDSOrders: () => number;
}

export const createKDSSlice = (set: any, get: any): KDSSlice => ({
  kdsOrders: [],

  updateKDSItemStatus: (orderId: string, itemId: string, status: 'pending' | 'cooking' | 'done') => {
    const { kdsOrders, tableCarts } = get();
    let targetTableId: string | null = null;
    let targetCartItemId: string | null = null;

    const updated = kdsOrders.map((order: KDSOrder) => {
      if (order.id !== orderId) return order;
      targetTableId = order.tableId;
      const updatedItems = order.items.map((item: any) => {
        if (item.id === itemId) {
          targetCartItemId = item.cartItemId;
          return { ...item, status };
        }
        return item;
      });
      const allDone = updatedItems.every((item) => item.status === 'done');
      const anyCooking = updatedItems.some((item) => item.status === 'cooking');
      return {
        ...order,
        items: updatedItems,
        status: allDone ? ('ready' as const) : anyCooking ? ('cooking' as const) : order.status,
      };
    });

    let newTableCarts = tableCarts;
    if (targetTableId && targetCartItemId && tableCarts[targetTableId]) {
      const mappedStatus: KitchenCookingStatus =
        status === 'done' ? 'ready' : status === 'cooking' ? 'cooking' : 'pending';
      newTableCarts = {
        ...tableCarts,
        [targetTableId]: tableCarts[targetTableId].map((ci: any) =>
          ci.cartItemId === targetCartItemId ? { ...ci, status: mappedStatus } : ci
        ),
      };
    }

    set({ kdsOrders: updated, tableCarts: newTableCarts });

    try {
      wsClient.broadcastKDSItemStatus(orderId, itemId, status);
    } catch (_) {}
  },

  updateKDSOrderStatus: (orderId: string, status: 'pending' | 'cooking' | 'ready' | 'served') => {
    const { kdsOrders, tableCarts } = get();
    let targetTableId: string | null = null;

    const updated = kdsOrders.map((order: KDSOrder) => {
      if (order.id !== orderId) return order;
      targetTableId = order.tableId;
      const updatedItems = order.items.map((item: any) => ({
        ...item,
        status: status === 'ready' || status === 'served' ? ('done' as const) : item.status,
      }));
      return {
        ...order,
        status,
        autoCleaned: status === 'served' ? order.autoCleaned : false,
        items: updatedItems,
      };
    });

    let newTableCarts = tableCarts;
    if (targetTableId && tableCarts[targetTableId]) {
      newTableCarts = {
        ...tableCarts,
        [targetTableId]: tableCarts[targetTableId].map((ci: any) => ({
          ...ci,
          status,
        })),
      };
    }

    set({ kdsOrders: updated, tableCarts: newTableCarts });
  },

  markAllKDSItemsDone: (orderId: string) => {
    const { kdsOrders, tableCarts } = get();
    let targetTableId: string | null = null;

    const updated = kdsOrders.map((order: KDSOrder) => {
      if (order.id !== orderId) return order;
      targetTableId = order.tableId;
      return {
        ...order,
        status: 'ready' as const,
        autoCleaned: false,
        items: order.items.map((item: any) => ({ ...item, status: 'done' as const })),
      };
    });

    let newTableCarts = tableCarts;
    if (targetTableId && tableCarts[targetTableId]) {
      newTableCarts = {
        ...tableCarts,
        [targetTableId]: tableCarts[targetTableId].map((ci: any) => ({
          ...ci,
          status: 'ready' as const,
        })),
      };
    }

    set({ kdsOrders: updated, tableCarts: newTableCarts });
  },

  autoCleanupKDSOrders: () => {
    const { kdsOrders, storeSettings } = get();
    const thresholdMin = storeSettings.kdsAutoCleanupMinutes;
    if (!thresholdMin || thresholdMin <= 0) return 0;

    const thresholdMs = thresholdMin * 60000;
    const nowMs = Date.now();
    let cleanedCount = 0;

    const updated = kdsOrders.map((order: KDSOrder) => {
      if (!order.isPaid || order.status === 'served') return order;

      const paidTime = order.paidAt ? new Date(order.paidAt).getTime() : new Date(order.createdAt).getTime();
      const elapsedSincePaid = nowMs - paidTime;

      if (elapsedSincePaid >= thresholdMs) {
        cleanedCount++;
        return {
          ...order,
          status: 'served' as const,
          autoCleaned: true,
          items: order.items.map((it: any) => ({ ...it, status: 'done' as const })),
        };
      }
      return order;
    });

    if (cleanedCount > 0) {
      set({ kdsOrders: updated });
    }
    return cleanedCount;
  },
});
