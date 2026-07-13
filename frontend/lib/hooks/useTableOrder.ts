'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { logger } from '../logger';
import { api } from '../api';
import { MenuItem, CartItem } from '../components/pos/types';
import { useCart } from './useCart';
import { useModifier } from './useModifier';
import { useOrder } from './useOrder';
import { useAutoSave } from './useAutoSave';

export function useTableOrder(tableId: string, tableName: string, onClose?: () => void) {
  const router = useRouter();
  const cart = useCart();
  const mod = useModifier();
  const order = useOrder();

  const cachedRef = useRef<MenuItem[] | null>(null);

  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartSheet, setCartSheet] = useState(false);

  // Reset + load when tableId changes
  useEffect(() => {
    if (!tableId) {
      cart.reset();
      return;
    }
    let cancelled = false;
    (async () => {
      cart.reset();
      setActiveCategory('all');

      try {
        let currentProducts = cachedRef.current;
        if (!currentProducts) {
          const data = await api.getProducts();
          if (cancelled) return;
          const CAT_MAP: Record<string, string> = {
            'SỮA CHUA': 'sua-chua',
            'TRÀ CHANH': 'tra-chanh',
            'ĐỒ ĂN VẶT': 'do-an-vat',
            CHÈ: 'che',
            'TRÀ SỮA': 'tra-sua',
            SODA: 'soda',
            KEM: 'kem',
          };
          currentProducts = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            category: CAT_MAP[p.category] || p.category || 'sua-chua',
            image: p.image_url,
            sizes: p.options?.filter((o: any) => o.type === 'size') || undefined,
            toppings: p.options?.filter((o: any) => o.type === 'topping') || undefined,
            vatRate: p.vat_rate ?? 8,
          }));
          cachedRef.current = currentProducts;
          if (!cancelled) setProducts(currentProducts ?? []);
        }

        if (tableId !== 'TAKEAWAY') {
          try {
            const activeOrder = await api.getActiveOrderForTable(tableId);
            if (!cancelled && activeOrder) {
              cart.setActiveOrderId(activeOrder.id);
              cart.loadOrderItems(activeOrder.items, cachedRef.current ?? []);
            }
          } catch (err: any) {
            logger.warn('table-order', 'No active order for table', tableId, err?.message);
          }
        }
      } catch (err) {
        logger.warn('table-order', 'Failed to load data in useTableOrder:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  // Auto-save: debounce 1.5s via reusable hook
  useAutoSave({
    tableId,
    cart: cart.cart,
    loading,
    submitting: order.submitting,
    activeOrderId: cart.activeOrderId,
    onSave: useCallback(
      (saveCart: CartItem[], saveTableId: string, saveActiveOrderId: string | null) =>
        order.submitOrder(saveCart, saveTableId, saveActiveOrderId),
      [order]
    ),
    onOrderCreated: useCallback((orderId: string) => cart.setActiveOrderId(orderId), [cart]),
  });

  const filteredItems = useMemo(
    () =>
      activeCategory === 'all' ? products : products.filter((i) => i.category === activeCategory),
    [activeCategory, products]
  );

  const handleProductPress = useCallback(
    (item: MenuItem) => {
      const hasModifiers = (item.sizes?.length ?? 0) > 0 || (item.toppings?.length ?? 0) > 0;
      if (hasModifiers) mod.openForNew(item);
      else cart.quickAdd(item);
    },
    [mod, cart]
  );

  const addToCartFromModal = useCallback(() => {
    if (!mod.modalItem) return;
    const newItem: CartItem = {
      ...mod.modalItem,
      cartItemId: cart.genCartId(),
      qty: mod.modalQty,
      unitPrice: mod.modalPrice,
      selectedSize: mod.modalSize || undefined,
      selectedToppings: mod.modalToppings.length > 0 ? mod.modalToppings : undefined,
      note: mod.modalNote || undefined,
      isSent: false,
      serviceType: 'dine_in',
    };
    cart.addItem(newItem);
    mod.close();
  }, [mod, cart]);

  const saveEditFromModal = useCallback(() => {
    if (!mod.modalItem || !('cartItemId' in mod.modalItem)) return;
    const id = (mod.modalItem as CartItem).cartItemId;
    cart.updateItem(id, {
      qty: mod.modalQty,
      unitPrice: mod.modalPrice,
      selectedSize: mod.modalSize || undefined,
      selectedToppings: mod.modalToppings.length > 0 ? mod.modalToppings : undefined,
      note: mod.modalNote || undefined,
    });
    mod.close();
  }, [mod, cart]);

  const handleSendToKitchen = useCallback(async () => {
    const id = await order.sendToKitchen(cart.cart, tableId, cart.activeOrderId);
    if (id) {
      cart.setActiveOrderId(id);
      setCartSheet(false);
    }
  }, [cart, order, tableId]);

  const handleSaveTable = useCallback(async () => {
    const ok = await order.saveTable(cart.cart, tableId, cart.activeOrderId);
    if (ok) {
      cart.reset();
      setCartSheet(false);
      onClose?.();
    }
  }, [cart, order, tableId, onClose]);

  const handlePrintTemporary = useCallback(() => {
    if (cart.cart.length === 0) return;
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Vui lòng cho phép popup để hiển thị hóa đơn in.');
        return;
      }
      const { generateReceiptHTML } = require('../components/payment/receipt');
      const html = generateReceiptHTML({
        tableName,
        orderId: cart.activeOrderId || 'TAM_TINH',
        total: cart.total,
        items: cart.cart.map((i) => ({
          product_name: i.name,
          quantity: i.qty,
          unit_price: i.unitPrice,
          note: i.note,
          options: i.selectedSize ? { size: i.selectedSize } : undefined,
        })),
        isTemporary: true,
      });
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      alert('In tạm chỉ hỗ trợ trên nền tảng Web / Trình duyệt.');
    }
  }, [cart, tableName]);

  const handlePay = useCallback(() => {
    setCartSheet(false);
    order.goToPayment(cart.cart, tableId, tableName, cart.activeOrderId, cart.total);
    cart.reset();
  }, [cart, order, tableId, tableName]);

  // Biz operations (split/merge/move)
  const splitBill = useCallback(
    async (selectedIds: string[]) => {
      if (!cart.activeOrderId) {
        return;
      }
      const realIds = selectedIds.map(cart.getRealItemId).filter(Boolean) as string[];
      if (realIds.length === 0) {
        cart.filterOut(selectedIds);
        return;
      }
      try {
        await api.splitOrder({ order_id: cart.activeOrderId, item_ids: realIds });
        cart.filterOut(selectedIds);
      } catch {
        /* ignore */
      }
    },
    [cart]
  );

  const moveItemToTable = useCallback(
    async (cartItemId: string, targetTableId: string) => {
      if (!cart.activeOrderId) return;
      const realId = cart.getRealItemId(cartItemId);
      if (!realId) return;
      try {
        await api.splitTable({
          order_id: cart.activeOrderId,
          item_ids: [realId],
          new_table_id: targetTableId,
        });
        cart.filterOut([cartItemId]);
      } catch {
        /* ignore */
      }
    },
    [cart]
  );

  const mergeBill = useCallback(
    async (sourceTableId?: string) => {
      if (!sourceTableId || !cart.activeOrderId) return;
      try {
        const activeOrder = await api.getActiveOrderForTable(sourceTableId);
        if (!activeOrder) return;
        const result = await api.mergeOrders({
          source_order_id: activeOrder.id,
          target_order_id: cart.activeOrderId,
        });
        const mapped = (result.items || []).map((i: any) => ({
          id: i.product_id,
          name: i.product_name,
          price: Number(i.unit_price),
          category: 'sua-chua',
          cartItemId: `cart_loaded_${i.id}_${cart.genCartId()}`,
          qty: i.quantity,
          unitPrice: Number(i.unit_price),
          note: i.note || undefined,
          selectedSize: i.options?.size || undefined,
          selectedToppings: i.options?.toppings || undefined,
          isSent: true,
          serviceType: i.service_type || 'dine_in',
          orderRound: i.order_round || 1,
          status: i.status || 'moi',
        }));
        cart.replaceAll(mapped, result.id);
      } catch {
        /* ignore */
      }
    },
    [cart]
  );

  const moveTable = useCallback(
    async (targetTableId: string) => {
      if (!cart.activeOrderId) return;
      try {
        await api.moveTable(cart.activeOrderId, { table_id: targetTableId });
        onClose?.();
      } catch {
        /* ignore */
      }
    },
    [cart.activeOrderId, onClose]
  );

  return {
    products,
    loading,
    activeCategory,
    setActiveCategory,
    filteredItems: filteredItems,
    cart: cart.cart,
    total: cart.total,
    itemCount: cart.itemCount,
    submitting: order.submitting,
    cartSheet,
    setCartSheet,
    modalItem: mod.modalItem,
    modalQty: mod.modalQty,
    setModalQty: mod.setModalQty,
    modalSize: mod.modalSize,
    setModalSize: mod.setModalSize,
    modalToppings: mod.modalToppings,
    setModalToppings: mod.setModalToppings,
    modalNote: mod.modalNote,
    setModalNote: mod.setModalNote,
    modalPrice: mod.modalPrice,
    getItemCartCount: cart.getItemCartCount,
    handleProductPress,
    quickAdd: cart.quickAdd,
    quickSubtract: cart.quickSubtract,
    updateQty: cart.updateQty,
    removeItem: cart.removeItem,
    handleEditNote: cart.editNote,
    setQty: cart.setQty,
    cancelItem: cart.cancelItem,
    moveItemToTable,
    splitBill,
    mergeBill,
    moveTable,
    handleSendToKitchen,
    handleSaveTable,
    handlePay,
    handlePrintTemporary,
    openModifierForEdit: mod.openForEdit,
    saveEditFromModal,
    addToCartFromModal,
    closeModifierSheet: mod.close,
    toggleServiceType: cart.toggleServiceType,
    splitTable: moveItemToTable,
    mergeTable: mergeBill,
    moveItem: () => {},
  };
}
