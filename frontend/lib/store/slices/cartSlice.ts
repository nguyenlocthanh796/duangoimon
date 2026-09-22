import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { wsClient } from '../../api/wsClient';
import { isSameModifierConfig, getModifierConfigSignature } from '../../utils/cartAlgorithms';
import type {
  POSState,
  CartItem,
  TableItem,
  TableDiscount,
  SelectedModifierData,
  MenuItemWithModifiers,
  KitchenCookingStatus,
  KDSOrder,
  KDSItem,
} from '../usePOSStore';
import { UNASSIGNED_TABLE } from '../../constants/menuData';

export interface CartSlice {
  tableCarts: Record<string, CartItem[]>;
  tableDiscounts: Record<string, TableDiscount | undefined>;
  tableVoidLogs?: Record<string, { itemName: string; qty: number; reason: string; time: string }[]>;

  getCart: () => CartItem[];
  getDiscount: () => TableDiscount | undefined;
  addToCart: (data: SelectedModifierData) => void;
  addCustomItem: (name: string, price: number, qty?: number) => void;
  updateCartItem: (cartItemId: string, data: SelectedModifierData) => void;
  toggleCartItemTakeaway: (cartItemId: string) => void;
  updateCartQty: (cartItemId: string, delta: number) => void;
  removeCartItem: (cartItemId: string) => void;
  voidItem: (cartItemId: string, reason: string) => void;
  sendToKitchen: () => { newCount: number; allSent: boolean };
  updateCartItemStatus: (tableId: string, cartItemId: string, status: KitchenCookingStatus) => void;
  moveTable: (targetTableId: string) => boolean;
  mergeTable: (targetTableId: string) => boolean;
  splitTable: (targetTableId: string, itemIdsToSplit: string[]) => boolean;
  updateTableInfo: (guestCount: number, note?: string) => void;
  applyDiscount: (type: 'percent' | 'fixed', value: number, note: string) => void;
  clearDiscount: () => void;
  clearCart: () => void;
  assignCartToTable: (targetTable: TableItem) => void;
  startNewOrder: () => void;
}

export const createCartSlice = (set: any, get: any): CartSlice => ({
  tableCarts: {},
  tableDiscounts: {},
  tableVoidLogs: {},

  getCart: () => {
    const { tableCarts, selectedTable } = get();
    return tableCarts[selectedTable.id] || [];
  },

  getDiscount: () => {
    const { tableDiscounts, selectedTable } = get();
    return tableDiscounts[selectedTable.id];
  },

  addToCart: (data: SelectedModifierData) => {
    const { selectedTable, tableCarts, tables } = get();
    const currentCart = tableCarts[selectedTable.id] || [];

    const existingIndex = currentCart.findIndex((c: CartItem) => !c.sentToKitchen && isSameModifierConfig(c, data));
    let updatedCart: CartItem[];

    if (existingIndex !== -1) {
      updatedCart = currentCart.map((c: CartItem, idx: number) =>
        idx === existingIndex ? { ...c, qty: c.qty + data.qty } : c
      );
    } else {
      const cartItemId = data.item.id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const configSignature = getModifierConfigSignature(
        data.item.id,
        data.unitPrice,
        data.selectedSize,
        data.sugarLevel,
        data.iceLevel,
        data.selectedToppings,
        data.note,
        data.isTakeaway
      );
      const newCartItem: CartItem = {
        cartItemId,
        item: data.item,
        qty: data.qty,
        selectedSize: data.selectedSize,
        sugarLevel: data.sugarLevel,
        iceLevel: data.iceLevel,
        selectedToppings: data.selectedToppings,
        note: data.note,
        unitPrice: data.unitPrice,
        isTakeaway: data.isTakeaway,
        sentToKitchen: false,
        configSignature,
      };
      updatedCart = [newCartItem, ...currentCart];
    }

    const totalAmount = updatedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = updatedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    set({
      tableCarts: {
        ...tableCarts,
        [selectedTable.id]: updatedCart,
      },
      tables: tables.map((t: TableItem) =>
        t.id === selectedTable.id
          ? {
              ...t,
              status: 'co_khach',
              totalAmount,
              itemCount,
              guestCount: t.guestCount || 2,
              createdAt: t.createdAt || new Date().toISOString(),
            }
          : t
      ),
    });

    try {
      const discount = get().tableDiscounts[selectedTable.id];
      wsClient.broadcastCFDCartSync(updatedCart, discount, selectedTable.name);
      wsClient.broadcastTableCart(selectedTable.id, updatedCart, discount, selectedTable.guestCount);
    } catch (_) {}
  },

  addCustomItem: (name: string, price: number, qty = 1) => {
    const { addToCart } = get();
    const customItem: MenuItemWithModifiers = {
      id: 'custom_' + Date.now(),
      name: name.trim() || 'Món Ngoài Menu',
      price: price > 0 ? price : 0,
      category: 'Món Tùy Chỉnh',
      code: 'OPEN',
    };
    addToCart({
      item: customItem,
      qty,
      selectedToppings: [],
      note: 'Món phát sinh ngoài menu',
      unitPrice: customItem.price,
    });
  },

  updateCartItem: (cartItemId: string, data: SelectedModifierData) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const { selectedTable, tableCarts, tables } = get();
    const currentCart = tableCarts[selectedTable.id] || [];

    const updatedCart = currentCart.map((c: CartItem) => {
      if (c.cartItemId === cartItemId) {
        const configChanged =
          c.selectedSize !== data.selectedSize ||
          c.sugarLevel !== data.sugarLevel ||
          c.iceLevel !== data.iceLevel ||
          JSON.stringify(c.selectedToppings || []) !== JSON.stringify(data.selectedToppings || []) ||
          c.note !== data.note ||
          Boolean(c.isTakeaway) !== Boolean(data.isTakeaway);

        return {
          ...c,
          qty: data.qty,
          selectedSize: data.selectedSize,
          sugarLevel: data.sugarLevel,
          iceLevel: data.iceLevel,
          selectedToppings: data.selectedToppings,
          note: data.note,
          unitPrice: data.unitPrice,
          isTakeaway: data.isTakeaway,
          sentToKitchen: configChanged ? false : c.sentToKitchen,
        };
      }
      return c;
    });

    const totalAmount = updatedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = updatedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    set({
      tableCarts: {
        ...tableCarts,
        [selectedTable.id]: updatedCart,
      },
      tables: tables.map((t: TableItem) =>
        t.id === selectedTable.id ? { ...t, totalAmount, itemCount } : t
      ),
    });

    try {
      const discount = get().tableDiscounts[selectedTable.id];
      wsClient.broadcastCFDCartSync(updatedCart, discount, selectedTable.name);
      wsClient.broadcastTableCart(selectedTable.id, updatedCart, discount, selectedTable.guestCount);
    } catch (_) {}
  },

  toggleCartItemTakeaway: (cartItemId: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const { selectedTable, tableCarts } = get();
    const currentCart = tableCarts[selectedTable.id] || [];

    const updatedCart = currentCart.map((c: CartItem) => {
      if (c.cartItemId === cartItemId) {
        return {
          ...c,
          isTakeaway: !c.isTakeaway,
        };
      }
      return c;
    });

    set({
      tableCarts: {
        ...tableCarts,
        [selectedTable.id]: updatedCart,
      },
    });

    try {
      const discount = get().tableDiscounts[selectedTable.id];
      wsClient.broadcastCFDCartSync(updatedCart, discount, selectedTable.name);
      wsClient.broadcastTableCart(selectedTable.id, updatedCart, discount, selectedTable.guestCount);
    } catch (_) {}
  },

  updateCartQty: (cartItemId: string, delta: number) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const { selectedTable, tableCarts, tables } = get();
    const currentCart = tableCarts[selectedTable.id] || [];

    const updatedCart = currentCart
      .map((c: CartItem) => {
        if (c.cartItemId === cartItemId) {
          const nextQty = c.qty + delta;
          return nextQty > 0 ? { ...c, qty: nextQty } : null;
        }
        return c;
      })
      .filter(Boolean) as CartItem[];

    const totalAmount = updatedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = updatedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    set({
      tableCarts: {
        ...tableCarts,
        [selectedTable.id]: updatedCart,
      },
      tables: tables.map((t: TableItem) =>
        t.id === selectedTable.id
          ? { ...t, totalAmount, itemCount, status: updatedCart.length > 0 ? 'co_khach' : 'trong' }
          : t
      ),
    });

    try {
      wsClient.broadcastTableCart(selectedTable.id, updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.guestCount);
      wsClient.broadcastCFDCartSync(updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.name);
    } catch (_) {}
  },

  removeCartItem: (cartItemId: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }
    const { selectedTable, tableCarts, tables } = get();
    const currentCart = tableCarts[selectedTable.id] || [];
    const updatedCart = currentCart.filter((c: CartItem) => c.cartItemId !== cartItemId);
    const totalAmount = updatedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = updatedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    set({
      tableCarts: {
        ...tableCarts,
        [selectedTable.id]: updatedCart,
      },
      tables: tables.map((t: TableItem) =>
        t.id === selectedTable.id
          ? { ...t, totalAmount, itemCount, status: updatedCart.length > 0 ? 'co_khach' : 'trong' }
          : t
      ),
    });

    try {
      wsClient.broadcastTableCart(selectedTable.id, updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.guestCount);
      wsClient.broadcastCFDCartSync(updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.name);
    } catch (_) {}
  },

  voidItem: (cartItemId: string, reason: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }
    const { selectedTable, tableCarts, tables, kdsOrders, tableVoidLogs = {}, storeSettings } = get();
    const currentCart = tableCarts[selectedTable.id] || [];
    const itemToVoid = currentCart.find((c: CartItem) => c.cartItemId === cartItemId);
    const updatedCart = currentCart.filter((c: CartItem) => c.cartItemId !== cartItemId);
    const totalAmount = updatedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = updatedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    const updatedVoidLogs = { ...tableVoidLogs };
    if (itemToVoid && itemToVoid.sentToKitchen) {
      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const currentLogs = updatedVoidLogs[selectedTable.id] || [];
      updatedVoidLogs[selectedTable.id] = [
        ...currentLogs,
        {
          itemName: itemToVoid.item.name,
          qty: itemToVoid.qty,
          reason,
          time: nowStr,
        },
      ];

      if (storeSettings.enableTelegramAlerts) {
        console.warn(
          'BÁO ĐỘNG GIAN LẬN: Hủy món ' + itemToVoid.item.name + ' (x' + itemToVoid.qty + ') tại ' + selectedTable.name + ' sau khi gửi bếp! Lý do: ' + reason
        );
      }
    }

    const updatedKDSOrders = kdsOrders
      .map((order: KDSOrder) => {
        if (order.tableId === selectedTable.id) {
          const filteredItems = order.items.filter((it: any) => it.cartItemId !== cartItemId);
          return filteredItems.length > 0 ? { ...order, items: filteredItems } : null;
        }
        return order;
      })
      .filter(Boolean) as KDSOrder[];

    set({
      tableCarts: {
        ...tableCarts,
        [selectedTable.id]: updatedCart,
      },
      tableVoidLogs: updatedVoidLogs,
      kdsOrders: updatedKDSOrders,
      tables: tables.map((t: TableItem) =>
        t.id === selectedTable.id
          ? { ...t, totalAmount, itemCount, status: updatedCart.length > 0 ? 'co_khach' : 'trong' }
          : t
      ),
    });

    try {
      wsClient.broadcastTableCart(selectedTable.id, updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.guestCount);
      wsClient.broadcastCFDCartSync(updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.name);
    } catch (_) {}
  },

  sendToKitchen: () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    const { selectedTable, tableCarts, kdsOrders } = get();
    const currentCart = tableCarts[selectedTable.id] || [];
    const now = new Date();
    const nowTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    let newCount = 0;
    const unsentItems: CartItem[] = [];

    const existingRounds = currentCart
      .filter((c: CartItem) => c.sentToKitchen && c.roundIndex)
      .map((c: CartItem) => c.roundIndex as number);
    const maxRound = existingRounds.length > 0 ? Math.max(...existingRounds) : (currentCart.some((c: CartItem) => c.sentToKitchen) ? 1 : 0);
    const nextRoundIndex = maxRound + 1;

    const updatedCart = currentCart.map((c: CartItem) => {
      if (!c.sentToKitchen) {
        newCount += c.qty;
        unsentItems.push(c);
        return { ...c, sentToKitchen: true, sentAt: nowTime, roundIndex: nextRoundIndex, status: 'pending' as const };
      }
      return c;
    });

    let updatedKDS = [...kdsOrders];
    if (unsentItems.length > 0) {
      const kdsItems: KDSItem[] = unsentItems.map((item, idx) => {
        const cat = item.item?.category || (item as any).category || '';
        let station: 'bar' | 'kitchen' | 'snack' = 'kitchen';
        if (cat.includes('Trà') || cat.includes('Cà Phê') || cat.includes('Ép') || cat.includes('Đá Xay')) {
          station = 'bar';
        } else if (cat.includes('Ăn Vặt') || cat.includes('Bánh')) {
          station = 'snack';
        }
        const resolvedName =
          item.item?.name ||
          (item as any).name ||
          (item as any).product_name ||
          (item as any).productName ||
          'Món';
        return {
          id: 'kds_i_' + Date.now() + '_' + idx,
          cartItemId: item.cartItemId,
          name: resolvedName,
          qty: item.qty,
          selectedSize: item.selectedSize,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          selectedToppings: item.selectedToppings || [],
          note: item.note,
          station,
          status: 'pending',
        };
      });

      const newKDSOrder: KDSOrder = {
        id: 'kds_' + Date.now(),
        orderCode: 'OD-' + nowTime.replace(':', ''),
        tableId: selectedTable.id,
        tableName: selectedTable.name,
        guestCount: selectedTable.guestCount || 2,
        createdAt: now.toISOString(),
        orderTime: nowTime,
        elapsedMinutes: 0,
        status: 'pending',
        items: kdsItems,
      };

      updatedKDS = [newKDSOrder, ...updatedKDS];

      set({
        tableCarts: {
          ...tableCarts,
          [selectedTable.id]: updatedCart,
        },
        kdsOrders: updatedKDS,
      });

      try {
        wsClient.broadcastOrderCreated(newKDSOrder);
        wsClient.broadcastTableCart(selectedTable.id, updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.guestCount);
      } catch (_) {}
    } else {
      set({
        tableCarts: {
          ...tableCarts,
          [selectedTable.id]: updatedCart,
        },
        kdsOrders: updatedKDS,
      });
      try {
        wsClient.broadcastTableCart(selectedTable.id, updatedCart, get().tableDiscounts[selectedTable.id], selectedTable.guestCount);
      } catch (_) {}
    }

    return { newCount, allSent: updatedCart.length > 0 };
  },

  updateCartItemStatus: (tableId: string, cartItemId: string, status: KitchenCookingStatus) => {
    const { tableCarts } = get();
    const cart = tableCarts[tableId] || [];
    set({
      tableCarts: {
        ...tableCarts,
        [tableId]: cart.map((ci: CartItem) =>
          ci.cartItemId === cartItemId ? { ...ci, status } : ci
        ),
      },
    });
  },

  moveTable: (targetTableId: string) => {
    const { selectedTable, tableCarts, tables } = get();
    if (selectedTable.id === targetTableId) return false;

    const sourceCart = tableCarts[selectedTable.id] || [];
    const targetTable = tables.find((t: TableItem) => t.id === targetTableId);
    if (!targetTable) return false;

    const updatedTables = tables.map((t: TableItem) => {
      if (t.id === selectedTable.id) {
        return { ...t, status: 'trong' as const, totalAmount: 0, itemCount: 0, guestCount: 0, createdAt: undefined };
      }
      if (t.id === targetTableId) {
        return {
          ...t,
          status: 'co_khach' as const,
          totalAmount: selectedTable.totalAmount,
          itemCount: selectedTable.itemCount,
          guestCount: selectedTable.guestCount || 2,
          createdAt: selectedTable.createdAt || new Date().toISOString(),
        };
      }
      return t;
    });

    const updatedCarts = { ...tableCarts };
    updatedCarts[targetTableId] = sourceCart;
    delete updatedCarts[selectedTable.id];

    const { tableDiscounts, kdsOrders, tableVoidLogs = {} } = get();
    const updatedDiscounts = { ...tableDiscounts };
    if (tableDiscounts[selectedTable.id]) {
      updatedDiscounts[targetTableId] = tableDiscounts[selectedTable.id];
      delete updatedDiscounts[selectedTable.id];
    }
    const updatedVoidLogsMove = { ...tableVoidLogs };
    if (tableVoidLogs[selectedTable.id]) {
      updatedVoidLogsMove[targetTableId] = [
        ...(updatedVoidLogsMove[targetTableId] || []),
        ...(tableVoidLogs[selectedTable.id] || []),
      ];
      delete updatedVoidLogsMove[selectedTable.id];
    }

    const updatedKDSOrders = kdsOrders.map((o: KDSOrder) =>
      o.tableId === selectedTable.id
        ? { ...o, tableId: targetTable.id, tableName: targetTable.name }
        : o
    );

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    set({
      tables: updatedTables,
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tableVoidLogs: updatedVoidLogsMove,
      kdsOrders: updatedKDSOrders,
      selectedTable: targetTable,
    });
    return true;
  },

  mergeTable: (targetTableId: string) => {
    const { selectedTable, tableCarts, tables, tableDiscounts, kdsOrders, tableVoidLogs = {} } = get();
    if (selectedTable.id === targetTableId) return false;

    const sourceCart = tableCarts[selectedTable.id] || [];
    const targetCart = tableCarts[targetTableId] || [];
    const targetTable = tables.find((t: TableItem) => t.id === targetTableId);
    if (!targetTable) return false;

    const mergedCart = [...targetCart, ...sourceCart];
    const totalAmount = mergedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = mergedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);
    const combinedGuests = (selectedTable.guestCount || 0) + (targetTable.guestCount || 0);

    const updatedTables = tables.map((t: TableItem) => {
      if (t.id === selectedTable.id) {
        return { ...t, status: 'trong' as const, totalAmount: 0, itemCount: 0, guestCount: 0, createdAt: undefined };
      }
      if (t.id === targetTableId) {
        return {
          ...t,
          status: 'co_khach' as const,
          totalAmount,
          itemCount,
          guestCount: combinedGuests,
          createdAt: targetTable.createdAt || selectedTable.createdAt || new Date().toISOString(),
        };
      }
      return t;
    });

    const updatedCarts = { ...tableCarts };
    updatedCarts[targetTableId] = mergedCart;
    delete updatedCarts[selectedTable.id];

    const updatedDiscounts = { ...tableDiscounts };
    if (!updatedDiscounts[targetTableId] && updatedDiscounts[selectedTable.id]) {
      updatedDiscounts[targetTableId] = updatedDiscounts[selectedTable.id];
    }
    delete updatedDiscounts[selectedTable.id];

    const updatedVoidLogsMerge = { ...tableVoidLogs };
    if (tableVoidLogs[selectedTable.id]) {
      updatedVoidLogsMerge[targetTableId] = [
        ...(updatedVoidLogsMerge[targetTableId] || []),
        ...(tableVoidLogs[selectedTable.id] || []),
      ];
      delete updatedVoidLogsMerge[selectedTable.id];
    }

    const updatedKDSOrders = kdsOrders.map((o: KDSOrder) =>
      o.tableId === selectedTable.id
        ? { ...o, tableId: targetTable.id, tableName: targetTable.name }
        : o
    );

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    set({
      tables: updatedTables,
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tableVoidLogs: updatedVoidLogsMerge,
      kdsOrders: updatedKDSOrders,
      selectedTable: { ...targetTable, totalAmount, itemCount, guestCount: combinedGuests },
    });
    return true;
  },

  splitTable: (targetTableId: string, itemIdsToSplit: string[]) => {
    const { selectedTable, tableCarts, tables, kdsOrders } = get();
    if (selectedTable.id === targetTableId || itemIdsToSplit.length === 0) return false;

    const sourceCart = tableCarts[selectedTable.id] || [];
    const targetCart = tableCarts[targetTableId] || [];
    const targetTable = tables.find((t: TableItem) => t.id === targetTableId);
    if (!targetTable) return false;

    const itemsToMove = sourceCart.filter((c: CartItem) => itemIdsToSplit.includes(c.cartItemId));
    const remainingItems = sourceCart.filter((c: CartItem) => !itemIdsToSplit.includes(c.cartItemId));

    if (itemsToMove.length === 0) return false;

    const newTargetCart = [...targetCart, ...itemsToMove];

    const sourceTotal = remainingItems.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const sourceCount = remainingItems.reduce((s: number, c: CartItem) => s + c.qty, 0);

    const targetTotal = newTargetCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const targetCount = newTargetCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    const updatedTables = tables.map((t: TableItem) => {
      if (t.id === selectedTable.id) {
        return {
          ...t,
          status: remainingItems.length > 0 ? ('co_khach' as const) : ('trong' as const),
          totalAmount: sourceTotal,
          itemCount: sourceCount,
          guestCount: remainingItems.length > 0 ? Math.max(1, (t.guestCount || 2) - 1) : 0,
          createdAt: remainingItems.length > 0 ? t.createdAt : undefined,
        };
      }
      if (t.id === targetTableId) {
        return {
          ...t,
          status: 'co_khach' as const,
          totalAmount: targetTotal,
          itemCount: targetCount,
          guestCount: (t.guestCount || 0) + 1,
          createdAt: t.createdAt || new Date().toISOString(),
        };
      }
      return t;
    });

    const updatedCarts = { ...tableCarts };
    if (remainingItems.length > 0) {
      updatedCarts[selectedTable.id] = remainingItems;
    } else {
      delete updatedCarts[selectedTable.id];
    }
    updatedCarts[targetTableId] = newTargetCart;

    const movedCartItemIds = new Set(itemIdsToSplit);
    const updatedKDSOrders: KDSOrder[] = [];
    const splitKdsItems: KDSItem[] = [];

    for (const order of kdsOrders) {
      if (order.tableId === selectedTable.id) {
        const remainingKdsItems = order.items.filter((it: any) => !movedCartItemIds.has(it.cartItemId));
        const movingKdsItems = order.items.filter((it: any) => movedCartItemIds.has(it.cartItemId));
        if (movingKdsItems.length > 0) {
          splitKdsItems.push(...movingKdsItems);
        }
        if (remainingKdsItems.length > 0) {
          updatedKDSOrders.push({ ...order, items: remainingKdsItems });
        }
      } else {
        updatedKDSOrders.push(order);
      }
    }

    if (splitKdsItems.length > 0) {
      updatedKDSOrders.push({
        id: 'kds_split_' + Date.now(),
        orderCode: 'TÁCH-' + targetTable.name,
        tableId: targetTable.id,
        tableName: targetTable.name,
        createdAt: new Date().toISOString(),
        orderTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        elapsedMinutes: 0,
        status: 'pending',
        items: splitKdsItems,
      });
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    set({
      tables: updatedTables,
      tableCarts: updatedCarts,
      kdsOrders: updatedKDSOrders,
    });
    return true;
  },

  updateTableInfo: (guestCount: number, note?: string) => {
    const { selectedTable, tables } = get();
    const cleanGuestCount = Math.max(0, guestCount);
    const updated = tables.map((t: TableItem) =>
      t.id === selectedTable.id ? { ...t, guestCount: cleanGuestCount } : t
    );
    set({
      tables: updated,
      selectedTable: { ...selectedTable, guestCount: cleanGuestCount },
    });
  },

  applyDiscount: (type: 'percent' | 'fixed', value: number, note: string) => {
    const { selectedTable, tableDiscounts, tableCarts } = get();
    const newDiscount = { type, value, note };
    set({
      tableDiscounts: {
        ...tableDiscounts,
        [selectedTable.id]: newDiscount,
      },
    });
    try {
      wsClient.broadcastTableCart(selectedTable.id, tableCarts[selectedTable.id] || [], newDiscount, selectedTable.guestCount);
    } catch (_) {}
  },

  clearDiscount: () => {
    const { selectedTable, tableDiscounts, tableCarts } = get();
    const updated = { ...tableDiscounts };
    delete updated[selectedTable.id];
    set({ tableDiscounts: updated });
    try {
      wsClient.broadcastTableCart(selectedTable.id, tableCarts[selectedTable.id] || [], undefined, selectedTable.guestCount);
    } catch (_) {}
  },

  clearCart: () => {
    const { selectedTable, tableCarts, tables, tableDiscounts, tableVoidLogs = {} } = get();
    const updatedCarts = { ...tableCarts };
    delete updatedCarts[selectedTable.id];
    const updatedDiscounts = { ...tableDiscounts };
    delete updatedDiscounts[selectedTable.id];
    const updatedVoidLogs = { ...tableVoidLogs };
    delete updatedVoidLogs[selectedTable.id];
    set({
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tableVoidLogs: updatedVoidLogs,
      tables: tables.map((t: TableItem) =>
        t.id === selectedTable.id ? { ...t, status: 'trong', totalAmount: 0, itemCount: 0 } : t
      ),
    });
    try {
      wsClient.broadcastTableCart(selectedTable.id, [], undefined, selectedTable.guestCount);
      wsClient.broadcastCFDCartSync([], undefined, selectedTable.name);
    } catch (_) {}
  },

  assignCartToTable: (targetTable: TableItem) => {
    const { selectedTable, tableCarts, tables, tableDiscounts, tableVoidLogs = {} } = get();
    const sourceTableId = selectedTable?.id || 'unassigned';
    if (sourceTableId === targetTable.id) return;

    const sourceCart = tableCarts[sourceTableId] || [];
    const targetCart = tableCarts[targetTable.id] || [];

    const mergedCart = [...targetCart, ...sourceCart];
    const totalAmount = mergedCart.reduce((s: number, c: CartItem) => s + c.unitPrice * c.qty, 0);
    const itemCount = mergedCart.reduce((s: number, c: CartItem) => s + c.qty, 0);

    const updatedCarts = { ...tableCarts };
    updatedCarts[targetTable.id] = mergedCart;
    if (sourceTableId === 'unassigned') {
      delete updatedCarts['unassigned'];
    }

    const updatedDiscounts = { ...tableDiscounts };
    if (tableDiscounts[sourceTableId] && !tableDiscounts[targetTable.id]) {
      updatedDiscounts[targetTable.id] = tableDiscounts[sourceTableId];
      if (sourceTableId === 'unassigned') {
        delete updatedDiscounts['unassigned'];
      }
    }

    const updatedVoidLogs = { ...tableVoidLogs };
    if (tableVoidLogs[sourceTableId]) {
      updatedVoidLogs[targetTable.id] = [
        ...(updatedVoidLogs[targetTable.id] || []),
        ...(tableVoidLogs[sourceTableId] || []),
      ];
      if (sourceTableId === 'unassigned') {
        delete updatedVoidLogs['unassigned'];
      }
    }

    const updatedTables = tables.map((t: TableItem) => {
      if (t.id === targetTable.id) {
        return {
          ...t,
          status: 'co_khach' as const,
          totalAmount,
          itemCount,
          guestCount: t.guestCount || 2,
          createdAt: t.createdAt || new Date().toISOString(),
        };
      }
      return t;
    });

    const activeTarget = updatedTables.find((t: TableItem) => t.id === targetTable.id) || targetTable;

    set({
      selectedTable: activeTarget,
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tableVoidLogs: updatedVoidLogs,
      tables: updatedTables,
    });
  },

  startNewOrder: () => {
    set({
      selectedTable: UNASSIGNED_TABLE,
      viewMode: 'pos',
      orderChannel: 'dine_in',
    });
  },
});
