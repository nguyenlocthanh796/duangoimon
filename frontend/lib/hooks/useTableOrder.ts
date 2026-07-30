'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { logger } from '../logger';
import { api } from '../api';
import { CAT_MAP } from '../constants/categories';
import { DEFAULT_POS_PRODUCTS } from '../constants/defaultProducts';
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
        if (!currentProducts || currentProducts.length === 0) {
          let data = [];
          try {
            data = await api.getProducts();
          } catch {
            data = [];
          }
          if (cancelled) return;
          const sourceData = (Array.isArray(data) && data.length > 0) ? data : DEFAULT_POS_PRODUCTS;
          currentProducts = sourceData.map((p: any) => ({
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

  // Explicit Action Mode: API requests and WebSocket broadcasts fire strictly when cashier taps 'Lưu bàn', 'Báo bếp', or 'Thanh toán'.

  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    let list = activeCategory === 'all' ? products : products.filter((i) => i.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  const handleProductPress = useCallback(
    (item: MenuItem) => {
      if ((item.sizes && item.sizes.length > 0) || (item.toppings && item.toppings.length > 0)) {
        mod.openForNew(item);
      } else {
        cart.quickAdd(item);
      }
    },
    [mod, cart]
  );

  const addToCartFromModal = useCallback(() => {
    if (!mod.modalItem) return;
    const newItem: CartItem = {
      id: mod.modalItem.id,
      name: mod.modalItem.name,
      price: mod.modalItem.price,
      category: mod.modalItem.category,
      image: mod.modalItem.image,
      sizes: mod.modalItem.sizes,
      toppings: mod.modalItem.toppings,
      cartItemId: `cart_${Date.now()}_${cart.genCartId()}`,
      qty: mod.modalQty,
      unitPrice: mod.modalPrice,
      note: mod.modalNote || undefined,
      selectedSize: mod.modalSize || undefined,
      selectedToppings: mod.modalToppings,
      isSent: false,
      serviceType: 'dine_in',
    };
    cart.addItem(newItem);
    mod.close();
  }, [mod, cart]);

  const saveEditFromModal = useCallback(() => {
    if (!mod.modalItem) return;
    const newItem: CartItem = {
      id: mod.modalItem.id,
      name: mod.modalItem.name,
      price: mod.modalItem.price,
      category: mod.modalItem.category,
      image: mod.modalItem.image,
      sizes: mod.modalItem.sizes,
      toppings: mod.modalItem.toppings,
      cartItemId: `cart_${Date.now()}_${cart.genCartId()}`,
      qty: mod.modalQty,
      unitPrice: mod.modalPrice,
      note: mod.modalNote || undefined,
      selectedSize: mod.modalSize || undefined,
      selectedToppings: mod.modalToppings,
      isSent: false,
      serviceType: 'dine_in',
    };
    cart.addItem(newItem);
    mod.close();
  }, [mod, cart]);

  const handleSendToKitchen = useCallback(async () => {
    try {
      const activeId = cart.activeOrderId;
      const orderIdToUse = await order.sendToKitchen(cart.cart, tableId, activeId);
      if (orderIdToUse && orderIdToUse !== activeId) {
        cart.setActiveOrderId(orderIdToUse);
      }
      cart.markSent();
    } catch {
      /* ignore */
    }
  }, [cart, order, tableId]);

  const handleSaveTable = useCallback(async () => {
    try {
      const activeId = cart.activeOrderId;
      const success = await order.saveTable(cart.cart, tableId, activeId);
      if (success) {
        onClose?.();
      }
    } catch {
      /* ignore */
    }
  }, [cart, order, tableId, onClose]);

  const handlePay = useCallback(async () => {
    try {
      let activeId = cart.activeOrderId;
      const payCart = [...cart.cart];
      const payTotal = cart.total;
      cart.reset();
      order.goToPayment(payCart, tableId, tableName, activeId, payTotal);
    } catch {
      /* ignore */
    }
  }, [cart, order, tableId, tableName]);

  const handlePrintTemporary = useCallback(async () => {
    try {
      if (cart.activeOrderId) {
        await api.getOrder(cart.activeOrderId);
      }
    } catch {
      /* ignore */
    }
  }, [cart.activeOrderId]);

  const moveItemToTable = useCallback(
    async (cartItemId: string) => {
      cart.removeItem(cartItemId);
    },
    [cart]
  );

  const splitBill = useCallback(
    async (selectedIds: string[]) => {
      selectedIds.forEach((id) => cart.removeItem(id));
    },
    [cart]
  );

  const mergeBill = useCallback(
    async (sourceTableId?: string) => {
      if (!cart.activeOrderId) return;
      try {
        await api.mergeOrders({
          source_order_id: cart.activeOrderId,
        });
      } catch {
        /* ignore */
      }
    },
    [cart.activeOrderId]
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
    filteredItems,
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
    moveItem: moveItemToTable,
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
    searchQuery,
    setSearchQuery,
    splitTable: moveItemToTable,
    mergeTable: mergeBill,
  };
}
