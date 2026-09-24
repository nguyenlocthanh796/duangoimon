import type { KitchenCookingStatus } from '../store/usePOSStore';
import { getBaseUrl } from './apiClient';

export interface WSEvent<T = any> {
  type: string;
  payload?: T;
  [key: string]: any;
}

type EventListener = (event: WSEvent) => void;

class POSWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private listeners: Set<EventListener> = new Set();
  private isExplicitlyClosed = false;
  private clientId: string;
  private currentTenantId: string = '';
  private processedEventIds = new Set<string>();

  constructor() {
    this.clientId = `pos_client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.setupLifecycleListeners();
  }

  private setupLifecycleListeners(): void {
    // 🍏 Safari iOS & WebKit: Tự động khôi phục kết nối ngay khi mở lại tab hoặc mở khóa màn hình
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.reconnectIfDisconnected();
        }
      });
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('focus', () => {
        this.reconnectIfDisconnected();
      });
      window.addEventListener('online', () => {
        this.reconnectIfDisconnected();
      });
    }

    // 📱 React Native AppState (iOS / Android)
    try {
      const { AppState } = require('react-native');
      AppState.addEventListener('change', (nextState: string) => {
        if (nextState === 'active') {
          this.reconnectIfDisconnected();
        }
      });
    } catch {}
  }

  public reconnectIfDisconnected(): void {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // Gửi ping mỗi 15 giây giữ ấm kết nối, chống Safari/iOS tự ngắt WebSocket
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (_) {}
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public connect(urlOverride?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const baseHttp = getBaseUrl();

    let activeTenantId = '';
    let activeBranchId = 'branch_01';
    let authToken = '';
    let isAuthenticated = false;
    try {
      const { useAuthStore } = require('../store/useAuthStore');
      const authState = useAuthStore?.getState?.() || {};
      const { usePOSStore } = require('../store/usePOSStore');
      const posState = usePOSStore?.getState?.() || {};

      activeTenantId = authState.tenant?.id || authState.deviceBinding?.tenantId || posState.tenantId || '';
      if (authState.activeBranchId) activeBranchId = authState.activeBranchId;
      authToken = authState.token || '';
      isAuthenticated = Boolean(authState.isAuthenticated && authToken && !authToken.startsWith('offline_token_'));
    } catch {}

    this.currentTenantId = activeTenantId;

    // Không kết nối WebSocket khi chưa đăng nhập (tránh lỗi 401 connection refused trên production)
    if (!urlOverride && !isAuthenticated && !baseHttp.includes('localhost') && !baseHttp.includes('127.0.0.1')) {
      return;
    }

    const tokenQuery = authToken ? `&token=${encodeURIComponent(authToken)}` : '';
    const wsUrl =
      urlOverride ||
      baseHttp.replace(/^http/, 'ws') +
        `/ws/pos?client_id=${this.clientId}&tenant_id=${encodeURIComponent(activeTenantId)}&branch_id=${encodeURIComponent(activeBranchId)}${tokenQuery}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.broadcastToListeners({ type: 'connection_status', status: 'connected' });

        // 🔄 Tự động đẩy ngay đơn ngoại tuyến lên máy chủ khi có mạng trở lại
        try {
          const { useOfflineSyncStore } = require('../store/useOfflineSyncStore');
          useOfflineSyncStore.getState().setOnline(true);
          useOfflineSyncStore.getState().syncOrders().catch(() => {});
        } catch {}
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : '';
          const lines = raw.split('\n').filter((l) => l.trim().length > 0);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'pong' || parsed.type === 'ping') continue;

              // 🛡️ Deduplication: Đánh dấu mốc thời gian & ID sự kiện để loại bỏ bản tin trùng lặp
              const eventId = parsed.id || parsed.event_id || (parsed.timestamp_ms ? `${parsed.type}_${parsed.timestamp_ms}_${parsed.branch_id || ''}` : null);
              if (eventId) {
                if (this.processedEventIds.has(eventId)) continue;
                this.processedEventIds.add(eventId);
                if (this.processedEventIds.size > 200) {
                  const firstKey = this.processedEventIds.values().next().value;
                  if (firstKey) this.processedEventIds.delete(firstKey);
                }
              }

              this.handleIncomingEvent(parsed);
              this.broadcastToListeners(parsed);
            } catch {}
          }
        } catch {}
      };

      this.ws.onerror = () => {
        this.broadcastToListeners({ type: 'connection_status', status: 'error' });
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.broadcastToListeners({ type: 'connection_status', status: 'disconnected', code: event.code });
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleIncomingEvent(event: WSEvent): void {
    const eventType = event.type || event.event;
    let usePOSStore: any;
    try {
      usePOSStore = require('../store/usePOSStore').usePOSStore;
    } catch {}
    if (!usePOSStore) return;
    const store = usePOSStore.getState();

    switch (eventType) {
      case 'kds_item_updated':
      case 'kds_status_updated': {
        const orderId = event.order_id || event.orderId;
        const itemId = event.item_id || event.itemId;
        const rawStatus = event.status;
        const mappedKdsStatus =
          rawStatus === 'da_xong' || rawStatus === 'ready' || rawStatus === 'done'
            ? 'done'
            : rawStatus === 'dang_che_bien' || rawStatus === 'cooking'
            ? 'cooking'
            : 'pending';

        if (orderId && itemId) {
          store.updateKDSItemStatus(orderId, itemId, mappedKdsStatus);
        }
        break;
      }

      case 'kds_order_updated': {
        const orderId = event.order_id || event.orderId;
        const rawStatus = event.status;
        const mappedStatus: KitchenCookingStatus =
          rawStatus === 'da_phuc_vu' || rawStatus === 'served'
            ? 'served'
            : rawStatus === 'da_xong' || rawStatus === 'ready'
            ? 'ready'
            : rawStatus === 'dang_che_bien' || rawStatus === 'cooking'
            ? 'cooking'
            : 'pending';

        if (orderId) {
          store.updateKDSOrderStatus(orderId, mappedStatus);
        }
        break;
      }

      case 'product_86_toggled': {
        const productId = event.product_id || event.productId;
        if (productId) {
          store.toggleOutOfStock(productId);
        }
        break;
      }

      case 'product_price_updated': {
        const productId = event.product_id || event.productId;
        const newPrice = event.new_price || event.price;
        if (productId && typeof newPrice === 'number') {
          store.updateProductPrice(productId, newPrice);
        }
        break;
      }

      case 'orders_synced':
      case 'order_synced': {
        // 🔄 Có thiết bị vừa đẩy đơn ngoại tuyến lên máy chủ -> Kéo ngay dữ liệu mới nhất
        store.fetchMasterCatalog().catch(() => {});
        break;
      }

      case 'settings_updated': {
        const payload = event.data || event.settings;
        if (payload && typeof payload === 'object') {
          try {
            const { mapBackendToStoreSettings } = require('../store/settingsMapper');
            const fresh = mapBackendToStoreSettings(payload, store.storeSettings);
            usePOSStore.setState({ storeSettings: fresh });
          } catch (_) {
            store.updateStoreSettings(payload);
          }
        }
        break;
      }

      // 🍽️ MENU PRODUCTS REALTIME SYNC
      case 'product_created': {
        const product = event.data || event.product;
        if (product && product.id) {
          const currentMenu = store.menuItems || [];
          if (!currentMenu.some((m: any) => m.id === product.id)) {
            usePOSStore.setState({ menuItems: [product, ...currentMenu] });
          }
        }
        break;
      }

      case 'product_updated': {
        const product = event.data || event.product;
        const id = product?.id || event.id;
        if (id) {
          const currentMenu = store.menuItems || [];
          const updated = currentMenu.map((m: any) =>
            m.id === id ? { ...m, ...product } : m
          );
          usePOSStore.setState({ menuItems: updated });
        }
        break;
      }

      case 'product_deleted': {
        const id = event.id || event.product_id || event.productId;
        if (id) {
          const currentMenu = store.menuItems || [];
          usePOSStore.setState({
            menuItems: currentMenu.filter((m: any) => m.id !== id),
            pinnedItemIds: (store.pinnedItemIds || []).filter((p: string) => p !== id),
            outOfStockProductIds: (store.outOfStockProductIds || []).filter((o: string) => o !== id),
          });
        }
        break;
      }

      case 'products_reordered': {
        const ids = event.ids || event.product_ids || event.data;
        if (Array.isArray(ids)) {
          const currentMenu = store.menuItems || [];
          const sorted = [...currentMenu].sort((a: any, b: any) => {
            const idxA = ids.indexOf(a.id);
            const idxB = ids.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          usePOSStore.setState({ menuItems: sorted });
        }
        break;
      }

      case 'product_pin_toggled': {
        const productId = event.product_id || event.productId || event.id;
        if (productId) {
          const currentPinned = store.pinnedItemIds || [];
          const exists = currentPinned.includes(productId);
          usePOSStore.setState({
            pinnedItemIds: exists
              ? currentPinned.filter((p: string) => p !== productId)
              : [...currentPinned, productId],
          });
        }
        break;
      }

      // 📂 MENU CATEGORIES REALTIME SYNC
      case 'category_created': {
        const category = event.data || event.category;
        if (category && category.id) {
          const currentCats = store.categories || [];
          if (!currentCats.some((c: any) => c.id === category.id)) {
            usePOSStore.setState({ categories: [...currentCats, category] });
          }
        }
        break;
      }

      case 'category_updated': {
        const category = event.data || event.category;
        const id = category?.id || event.id;
        if (id) {
          const currentCats = store.categories || [];
          usePOSStore.setState({
            categories: currentCats.map((c: any) => (c.id === id ? { ...c, ...category } : c)),
          });
        }
        break;
      }

      case 'category_deleted': {
        const id = event.id || event.category_id || event.categoryId;
        if (id) {
          const currentCats = store.categories || [];
          usePOSStore.setState({
            categories: currentCats.filter((c: any) => c.id !== id),
          });
        }
        break;
      }

      case 'categories_reordered': {
        const ids = event.ids || event.category_ids || event.data;
        if (Array.isArray(ids)) {
          const currentCats = store.categories || [];
          const sorted = [...currentCats].sort((a: any, b: any) => {
            const idxA = ids.indexOf(a.id);
            const idxB = ids.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          usePOSStore.setState({ categories: sorted });
        }
        break;
      }

      // 🧋 TOPPINGS REALTIME SYNC
      case 'topping_created': {
        const topping = event.data || event.topping;
        if (topping && topping.id) {
          const currentToppings = store.toppings || [];
          if (!currentToppings.some((t: any) => t.id === topping.id)) {
            usePOSStore.setState({ toppings: [...currentToppings, topping] });
          }
        }
        break;
      }

      case 'topping_updated': {
        const topping = event.data || event.topping;
        const id = topping?.id || event.id;
        if (id) {
          const currentToppings = store.toppings || [];
          usePOSStore.setState({
            toppings: currentToppings.map((t: any) => (t.id === id ? { ...t, ...topping } : t)),
          });
        }
        break;
      }

      case 'topping_deleted': {
        const id = event.id || event.topping_id || event.toppingId;
        if (id) {
          const currentToppings = store.toppings || [];
          usePOSStore.setState({
            toppings: currentToppings.filter((t: any) => t.id !== id),
          });
        }
        break;
      }

      // 🗺️ AREAS REALTIME SYNC
      case 'area_created': {
        const area = event.data || event.area;
        if (area && area.id) {
          const currentAreas = store.areas || [];
          if (!currentAreas.some((a: any) => a.id === area.id)) {
            usePOSStore.setState({ areas: [...currentAreas, area] });
          }
        }
        break;
      }

      case 'area_updated': {
        const area = event.data || event.area;
        const id = area?.id || event.id;
        if (id) {
          const currentAreas = store.areas || [];
          usePOSStore.setState({
            areas: currentAreas.map((a: any) => (a.id === id ? { ...a, ...area } : a)),
          });
        }
        break;
      }

      case 'area_deleted': {
        const id = event.id || event.area_id || event.areaId;
        if (id) {
          const currentAreas = store.areas || [];
          usePOSStore.setState({
            areas: currentAreas.filter((a: any) => a.id !== id),
          });
        }
        break;
      }

      case 'areas_reordered': {
        const ids = event.ids || event.area_ids || event.data;
        if (Array.isArray(ids)) {
          const currentAreas = store.areas || [];
          const sorted = [...currentAreas].sort((a: any, b: any) => {
            const idxA = ids.indexOf(a.id);
            const idxB = ids.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          usePOSStore.setState({ areas: sorted });
        }
        break;
      }

      // 🪑 TABLES REALTIME SYNC
      case 'table_created': {
        const table = event.data || event.table;
        if (table && table.id) {
          const currentTables = store.tables || [];
          if (!currentTables.some((t: any) => t.id === table.id)) {
            usePOSStore.setState({ tables: [...currentTables, table] });
          }
        }
        break;
      }

      case 'table_updated': {
        const table = event.data || event.table;
        const id = table?.id || event.id;
        if (id) {
          const currentTables = store.tables || [];
          usePOSStore.setState({
            tables: currentTables.map((t: any) => (t.id === id ? { ...t, ...table } : t)),
          });
        }
        break;
      }

      case 'table_deleted': {
        const id = event.id || event.table_id || event.tableId;
        if (id) {
          const currentTables = store.tables || [];
          usePOSStore.setState({
            tables: currentTables.filter((t: any) => t.id !== id),
          });
        }
        break;
      }

      case 'table_preprinted': {
        const tableId = event.table_id || event.tableId || event.id;
        if (tableId) {
          const currentTables = store.tables || [];
          usePOSStore.setState({
            tables: currentTables.map((t: any) =>
              t.id === tableId ? { ...t, status: 'da_in_tam_tinh' } : t
            ),
          });
        }
        break;
      }

      case 'tables_reordered': {
        const ids = event.ids || event.table_ids || event.data;
        if (Array.isArray(ids)) {
          const currentTables = store.tables || [];
          const sorted = [...currentTables].sort((a: any, b: any) => {
            const idxA = ids.indexOf(a.id);
            const idxB = ids.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          usePOSStore.setState({ tables: sorted });
        }
        break;
      }

      // 💰 CASH TRANSACTIONS & EXPENSES REALTIME SYNC
      case 'cash_transaction_created':
      case 'expense_created': {
        const tx = event.data || event.transaction || event.expense;
        if (tx && tx.id) {
          const currentTxs = store.cashTransactions || [];
          if (!currentTxs.some((t: any) => t.id === tx.id)) {
            usePOSStore.setState({ cashTransactions: [tx, ...currentTxs] });
          }
        }
        break;
      }

      case 'cash_transaction_voided': {
        const id = event.id || event.tx_id;
        const reason = event.reason || 'Chủ quán hủy phiếu';
        const voidedBy = event.voided_by || 'Chủ Quán';
        if (id) {
          const currentTxs = store.cashTransactions || [];
          usePOSStore.setState({
            cashTransactions: currentTxs.map((t: any) =>
              t.id === id
                ? { ...t, status: 'voided', voidReason: reason, voidedBy, voidedAt: new Date().toISOString() }
                : t
            ),
          });
        }
        break;
      }

      case 'cash_transaction_deleted':
      case 'expense_deleted': {
        const id = event.id || event.tx_id;
        if (id) {
          const currentTxs = store.cashTransactions || [];
          usePOSStore.setState({
            cashTransactions: currentTxs.filter((t: any) => t.id !== id),
          });
        }
        break;
      }

      // ⏱️ SHIFT REALTIME SYNC
      case 'shift_opened': {
        const shift = event.data || event.shift;
        if (shift) {
          usePOSStore.setState({ activeShift: shift });
        }
        break;
      }

      case 'shift_closed': {
        const record = event.data || event.record;
        if (record) {
          const currentHistory = store.shiftHistory || [];
          usePOSStore.setState({
            shiftHistory: [record, ...currentHistory.filter((r: any) => r.id !== record.id)],
            activeShift: {
              ...(store.activeShift || {}),
              status: 'closed',
              closedAt: record.closedAt,
              actualEndingCash: record.actualEndingCash,
              differenceAmount: record.differenceAmount,
            },
          });
        }
        break;
      }

      case 'order_created': {
        const ord = event.order;
        if (ord && Array.isArray(ord.items) && ord.items.length > 0) {
          const currentKDS = store.kdsOrders || [];
          const exists = currentKDS.some((k: any) => k.id === ord.id || (ord.order_code && k.orderCode === ord.order_code) || (ord.orderCode && k.orderCode === ord.orderCode));
          if (!exists) {
            const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const kdsItems = ord.items.map((it: any, idx: number) => {
              let tops: string[] = [];
              if (Array.isArray(it.selectedToppings)) tops = it.selectedToppings;
              else if (Array.isArray(it.selected_toppings)) tops = it.selected_toppings;
              else if (typeof it.toppings_json === 'string' && it.toppings_json) {
                try { tops = JSON.parse(it.toppings_json); } catch {}
              }
              return {
                id: it.id || `kds_i_${Date.now()}_${idx}`,
                cartItemId: it.cartItemId || it.id || `c_${Date.now()}_${idx}`,
                name: it.name || it.product_name || it.productName || (it.item && it.item.name) || (it.product && it.product.name) || 'Món',
                qty: Number(it.qty ?? it.quantity) || 1,
                selectedSize: it.selectedSize || it.selected_size,
                sugarLevel: it.sugarLevel || it.sugar_level,
                iceLevel: it.iceLevel || it.ice_level,
                selectedToppings: tops,
                note: it.note,
                station: it.station || 'kitchen',
                status: (it.status || 'pending') as any,
              };
            });
            const newKdsOrder = {
              id: ord.id || `kds_${Date.now()}`,
              orderCode: ord.orderCode || ord.order_code || `OD-${nowTime.replace(':', '')}`,
              tableId: ord.tableId || ord.table_id || 'takeaway',
              tableName: ord.tableName || (ord.table_id ? `Bàn ${ord.table_id}` : 'Mang về'),
              guestCount: ord.guestCount || ord.guest_count || 2,
              createdAt: ord.createdAt || ord.created_at || new Date().toISOString(),
              orderTime: ord.orderTime || nowTime,
              elapsedMinutes: ord.elapsedMinutes || 0,
              status: (ord.status || 'pending') as any,
              items: kdsItems,
            };
            usePOSStore.setState({ kdsOrders: [newKdsOrder, ...currentKDS] });
          }
        }
        break;
      }

      case 'table_cart_updated': {
        const tableId = event.table_id || event.tableId;
        const incomingCart = event.cart || [];
        const incomingDiscount = event.discount;
        const guestCount = event.guest_count;

        if (tableId) {
          const currentStore = usePOSStore.getState();
          const currentCart = currentStore.tableCarts[tableId] || [];
          const currentDiscount = currentStore.tableDiscounts[tableId];
          const currentTable = (currentStore.tables || []).find((t: any) => t.id === tableId);

          // Chống WebSocket echo loop gây giật nhấp nháy trên iPhone
          const cartUnchanged = JSON.stringify(currentCart) === JSON.stringify(incomingCart);
          const discountUnchanged = JSON.stringify(currentDiscount) === JSON.stringify(incomingDiscount);
          const guestCountUnchanged = guestCount === undefined || (currentTable && currentTable.guestCount === guestCount);

          if (cartUnchanged && discountUnchanged && guestCountUnchanged) {
            break;
          }

          const updatedCarts = {
            ...currentStore.tableCarts,
            [tableId]: incomingCart,
          };
          const updatedDiscounts = {
            ...currentStore.tableDiscounts,
            [tableId]: incomingDiscount,
          };

          const totalAmount = incomingCart.reduce((s: number, c: any) => s + (c.unitPrice || 0) * (c.qty || 1), 0);
          const itemCount = incomingCart.reduce((s: number, c: any) => s + (c.qty || 1), 0);
          const hasItems = incomingCart.length > 0;

          const updatedTables = (currentStore.tables || []).map((t: any) => {
            if (t.id === tableId) {
              return {
                ...t,
                totalAmount,
                itemCount,
                guestCount: guestCount !== undefined ? guestCount : t.guestCount,
                status: hasItems ? 'co_khach' : 'trong',
              };
            }
            return t;
          });

          usePOSStore.setState({
            tableCarts: updatedCarts,
            tableDiscounts: updatedDiscounts,
            tables: updatedTables,
            ...(currentStore.selectedTable?.id === tableId
              ? {
                  selectedTable: {
                    ...currentStore.selectedTable,
                    totalAmount,
                    itemCount,
                    status: hasItems ? 'co_khach' : 'trong',
                  },
                }
              : {}),
          });

          // 🔊 Phản hồi âm thanh nhẹ cho thiết bị nhận khi có món mới
          if (currentStore.selectedTable?.id === tableId && itemCount > (currentStore.selectedTable?.itemCount || 0)) {
            try {
              const { playTapSound } = require('../utils/sound');
              playTapSound();
            } catch (_) {}
          }
        }
        break;
      }

      case 'order_paid': {
        const orderId = event.order_id || event.orderId;
        const tableId = event.table_id || event.tableId;
        const rawInvoice = event.invoice || event.data;
        if (orderId) {
          store.updateKDSOrderStatus(orderId, 'served');
        }
        const currentStore = usePOSStore.getState();
        const updatedCarts = { ...currentStore.tableCarts };
        const updatedDiscounts = { ...currentStore.tableDiscounts };
        if (tableId) {
          delete updatedCarts[tableId];
          delete updatedDiscounts[tableId];
        }

        const updatedTables = tableId
          ? (currentStore.tables || []).map((t: any) =>
              t.id === tableId
                ? { ...t, status: 'trong', totalAmount: 0, itemCount: 0, guestCount: 0 }
                : t
            )
          : currentStore.tables;

        let normalizedInvoice: any = null;
        if (rawInvoice && typeof rawInvoice === 'object') {
          normalizedInvoice = {
            id: rawInvoice.id || orderId,
            orderCode: rawInvoice.order_code || rawInvoice.orderCode || event.order_code || (orderId ? `HD-${String(orderId).slice(-6)}` : 'HD-POS'),
            tableId: rawInvoice.table_id || tableId || 'takeaway',
            tableName: rawInvoice.table_name || (tableId ? `Bàn ${tableId}` : 'Mang về'),
            createdAt: rawInvoice.created_at || rawInvoice.createdAt || new Date().toISOString(),
            subtotal: rawInvoice.subtotal || rawInvoice.total_amount || event.total_amount || 0,
            finalTotal: rawInvoice.final_amount || rawInvoice.total_amount || event.final_amount || event.total_amount || 0,
            discountAmount: rawInvoice.discount_amount || event.discount_amount || 0,
            paidAmount: rawInvoice.paid_amount || event.paid_amount || rawInvoice.final_amount || rawInvoice.total_amount || 0,
            changeAmount: rawInvoice.change_amount || 0,
            guestCount: rawInvoice.guest_count || 1,
            cashierName: rawInvoice.cashier_name || event.cashier_name || 'Thu Ngân',
            paymentMethod: (rawInvoice.payment_method || event.payment_method || 'tien_mat') as any,
            status: 'paid' as const,
            branchId: rawInvoice.branch_id || event.branch_id || 'branch_01',
            items: Array.isArray(rawInvoice.items)
              ? rawInvoice.items.map((it: any) => ({
                  cartItemId: it.id || `ci_${Date.now()}`,
                  item: {
                    id: it.product_id || it.productId || it.id,
                    name: it.product_name || it.productName || it.name || 'Món',
                    price: it.unit_price || it.unitPrice || 0,
                    costPrice: it.cost_price || it.costPrice || 0,
                    unit: it.unit || 'Phần',
                    category: it.category || 'Món',
                    station: it.station || 'bar',
                  },
                  qty: it.quantity || it.qty || 1,
                  unitPrice: it.unit_price || it.unitPrice || 0,
                  sentToKitchen: true,
                }))
              : [],
          };
        }

        usePOSStore.setState({
          tableCarts: updatedCarts,
          tableDiscounts: updatedDiscounts,
          tables: updatedTables,
          ...(normalizedInvoice
            ? {
                orderHistory: [
                  normalizedInvoice,
                  ...(currentStore.orderHistory || []).filter(
                    (h: any) => h.id !== normalizedInvoice.id && h.orderCode !== normalizedInvoice.orderCode
                  ),
                ],
              }
            : {}),
          ...(tableId && currentStore.selectedTable?.id === tableId
            ? {
                selectedTable: {
                  ...currentStore.selectedTable,
                  status: 'trong',
                  totalAmount: 0,
                  itemCount: 0,
                  guestCount: 0,
                },
              }
            : {}),
        });
        break;
      }

      case 'BANK_TRANSFER_RECEIVED': {
        const transferData = event.data || event.payload || event;
        if (transferData) {
          store.handleBankTransferReceived(transferData);
        }
        break;
      }

      case 'settings_updated': {
        const rawSettings = event.data || event.settings || event.payload || event;
        if (rawSettings) {
          import('../store/settingsMapper').then(({ mapBackendToStoreSettings }) => {
            const currentStore = usePOSStore.getState();
            const updated = mapBackendToStoreSettings(rawSettings, currentStore.storeSettings);
            usePOSStore.setState({ storeSettings: updated });
          });
        }
        break;
      }

      case 'menu_updated':
      case 'product_created':
      case 'product_updated':
      case 'product_deleted':
      case 'product_86_toggled':
      case 'product_price_updated':
      case 'products_reordered':
      case 'category_created':
      case 'category_updated':
      case 'category_deleted':
      case 'categories_reordered':
      case 'table_created':
      case 'table_updated':
      case 'table_deleted':
      case 'tables_reordered':
      case 'area_created':
      case 'area_updated':
      case 'area_deleted':
      case 'areas_reordered':
      case 'topping_created':
      case 'topping_updated':
      case 'topping_deleted':
      case 'toppings_reordered':
      case 'inventory_updated':
      case 'catalog_refreshed': {
        // Tự động kéo lại danh mục / thực đơn / phòng bàn mới nhất
        usePOSStore.getState().fetchMasterCatalog();
        break;
      }

      case 'customer_created':
      case 'customer_updated': {
        const cust = event.data || event.customer || event;
        if (cust && (cust.id || cust.phone)) {
          const currentCusts = usePOSStore.getState().customers || [];
          const exists = currentCusts.some((c: any) => c.id === cust.id || (cust.phone && c.phone === cust.phone));
          if (!exists) {
            usePOSStore.setState({ customers: [cust, ...currentCusts] });
          } else {
            usePOSStore.setState({
              customers: currentCusts.map((c: any) => (c.id === cust.id || c.phone === cust.phone ? { ...c, ...cust } : c)),
            });
          }
        }
        break;
      }

      case 'expense_created':
      case 'expense_updated':
      case 'expense_deleted':
      case 'cash_transaction_created': {
        // Cập nhật Sổ Quỹ Thu Chi tức thì
        const newTx = event.data || event.payload || event;
        if (newTx && newTx.id) {
          const currentStore = usePOSStore.getState();
          const currentTxs = currentStore.cashTransactions || [];
          const exists = currentTxs.some((t: any) => t.id === newTx.id);
          if (!exists) {
            usePOSStore.setState({ cashTransactions: [newTx, ...currentTxs] });
          }
        }
        break;
      }

      case 'branch_created':
      case 'branch_updated': {
        const payload = event.data || event;
        const incomingBranches = payload.branches || (event as any).branches;
        const branchId = payload.branch_id || (event as any).branch_id;
        const updates = payload.updates || (event as any).updates;
        const branch = payload.branch || (event as any).branch;

        try {
          const { useAuthStore } = require('../store/useAuthStore');
          const auth = useAuthStore.getState();
          if (Array.isArray(incomingBranches) && incomingBranches.length > 0) {
            useAuthStore.setState({ branches: incomingBranches });
          } else if (branchId && updates) {
            const currentBranches = auth.branches || [];
            const nextBranches = currentBranches.map((b: any) =>
              b.id === branchId ? { ...b, ...updates } : b
            );
            useAuthStore.setState({ branches: nextBranches });
          } else if (branch && branch.id) {
            const currentBranches = auth.branches || [];
            const exists = currentBranches.some((b: any) => b.id === branch.id);
            if (!exists) {
              useAuthStore.setState({ branches: [...currentBranches, branch] });
            }
          }
        } catch (_) {}
        break;
      }

      case 'staff_updated':
      case 'staff_created':
      case 'staff_deleted': {
        try {
          const { useStaffStore } = require('../store/useStaffStore');
          useStaffStore.getState().fetchStaffList?.();
        } catch (_) {}
        break;
      }

      case 'order_voided': {
        const orderId = event.order_id || event.orderId || (event.data && (event.data.id || event.data.order_id));
        const reason = event.reason || event.void_reason || (event.data && event.data.reason) || 'Đã hủy từ xa';
        if (orderId) {
          const currentHistory = usePOSStore.getState().orderHistory || [];
          const updated = currentHistory.map((o: any) =>
            o.id === orderId || o.orderCode === orderId
              ? { ...o, status: 'voided' as const, voidReason: reason, voidedAt: new Date().toISOString() }
              : o
          );
          usePOSStore.setState({ orderHistory: updated });
        }
        break;
      }

      default:
        break;
    }
  }

  private broadcastToListeners(event: WSEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {}
    });
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 🌟 Đồng bộ giỏ hàng tới Màn hình Khách Hàng (CFD) qua WebSocket Hub
   */
  public broadcastCFDCartSync(cart: any[], discount?: any, tableName?: string): boolean {
    return this.send({
      type: 'cfd_cart_sync',
      data: {
        cart,
        discount,
        tableName,
      },
    });
  }

  /**
   * 🌟 Báo đơn mới xuống Bếp / Bar KDS qua WebSocket Hub
   */
  public broadcastOrderCreated(order: any): boolean {
    return this.send({
      type: 'order_created',
      order,
    });
  }

  /**
   * 🌟 Cập nhật trạng thái món KDS ngược về máy POS Thu Ngân
   */
  public broadcastKDSItemStatus(orderId: string, itemId: string, status: string): boolean {
    return this.send({
      type: 'kds_item_updated',
      order_id: orderId,
      item_id: itemId,
      status,
    });
  }

  /**
   * 🌟 Báo hoàn tất thanh toán để giải phóng bàn, cập nhật hóa đơn và CFD/KDS
   */
  public broadcastOrderPaid(tableId: string, orderId?: string, invoice?: any): boolean {
    return this.send({
      type: 'order_paid',
      table_id: tableId,
      order_id: orderId,
      invoice,
    });
  }

  /**
   * 🛒 Đồng bộ giỏ hàng và trạng thái bàn theo thời gian thực giữa các máy POS
   */
  public broadcastTableCart(tableId: string, cart: any[], discount?: any, guestCount?: number): boolean {
    return this.send({
      type: 'table_cart_updated',
      table_id: tableId,
      cart,
      discount,
      guest_count: guestCount,
    });
  }

  // 🍽️ MENU & PRODUCTS BROADCASTS
  public broadcastProductCreated(product: any): boolean {
    return this.send({ type: 'product_created', product, data: product });
  }

  public broadcastProductUpdated(product: any): boolean {
    return this.send({ type: 'product_updated', product, data: product });
  }

  public broadcastProductDeleted(id: string): boolean {
    return this.send({ type: 'product_deleted', id, product_id: id });
  }

  public broadcastProductsReordered(ids: string[]): boolean {
    return this.send({ type: 'products_reordered', ids, product_ids: ids });
  }

  public broadcastProductPin(productId: string): boolean {
    return this.send({ type: 'product_pin_toggled', product_id: productId });
  }

  public broadcastProduct86(productId: string): boolean {
    return this.send({ type: 'product_86_toggled', product_id: productId });
  }

  public broadcastProductPrice(productId: string, price: number): boolean {
    return this.send({ type: 'product_price_updated', product_id: productId, new_price: price });
  }

  // 📂 CATEGORIES BROADCASTS
  public broadcastCategoryCreated(category: any): boolean {
    return this.send({ type: 'category_created', category, data: category });
  }

  public broadcastCategoryUpdated(category: any): boolean {
    return this.send({ type: 'category_updated', category, data: category });
  }

  public broadcastCategoryDeleted(id: string): boolean {
    return this.send({ type: 'category_deleted', id, category_id: id });
  }

  public broadcastCategoriesReordered(ids: string[]): boolean {
    return this.send({ type: 'categories_reordered', ids, category_ids: ids });
  }

  // 🧋 TOPPINGS BROADCASTS
  public broadcastToppingCreated(topping: any): boolean {
    return this.send({ type: 'topping_created', topping, data: topping });
  }

  public broadcastToppingUpdated(topping: any): boolean {
    return this.send({ type: 'topping_updated', topping, data: topping });
  }

  public broadcastToppingDeleted(id: string): boolean {
    return this.send({ type: 'topping_deleted', id, topping_id: id });
  }

  // 🗺️ AREAS BROADCASTS
  public broadcastAreaCreated(area: any): boolean {
    return this.send({ type: 'area_created', area, data: area });
  }

  public broadcastAreaUpdated(area: any): boolean {
    return this.send({ type: 'area_updated', area, data: area });
  }

  public broadcastAreaDeleted(id: string): boolean {
    return this.send({ type: 'area_deleted', id, area_id: id });
  }

  // 🪑 TABLES BROADCASTS
  public broadcastTableCreated(table: any): boolean {
    return this.send({ type: 'table_created', table, data: table });
  }

  public broadcastTableUpdated(table: any): boolean {
    return this.send({ type: 'table_updated', table, data: table });
  }

  public broadcastTableDeleted(id: string): boolean {
    return this.send({ type: 'table_deleted', id, table_id: id });
  }

  public broadcastTablePrePrinted(tableId: string): boolean {
    return this.send({ type: 'table_preprinted', table_id: tableId, id: tableId });
  }

  // 💰 CASH TRANSACTIONS & SHIFT BROADCASTS
  public broadcastCashTxCreated(tx: any): boolean {
    return this.send({ type: 'cash_transaction_created', transaction: tx, data: tx });
  }

  public broadcastCashTxVoided(id: string, reason: string, voidedBy?: string): boolean {
    return this.send({ type: 'cash_transaction_voided', id, reason, voided_by: voidedBy });
  }

  public broadcastCashTxDeleted(id: string): boolean {
    return this.send({ type: 'cash_transaction_deleted', id });
  }

  public broadcastShiftOpened(shift: any): boolean {
    return this.send({ type: 'shift_opened', shift, data: shift });
  }

  public broadcastShiftClosed(record: any): boolean {
    return this.send({ type: 'shift_closed', record, data: record });
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public getStatus(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
      default:
        return 'closed';
    }
  }
}

export const wsClient = new POSWebSocketManager();
