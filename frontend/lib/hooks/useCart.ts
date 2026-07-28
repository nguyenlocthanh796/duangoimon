'use client';
import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { api } from '../api';
import { logger } from '../logger';
import { MenuItem, CartItem } from '../components/pos/types';

let cartIdCounter = 0;
const genCartId = () => `cart_${Date.now()}_${cartIdCounter++}`;

const getRealItemId = (cartItemId: string): string | null => {
  const match = cartItemId.match(/^cart_loaded_(.+?)_/);
  return match ? match[1] : null;
};

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const getItemCartCount = useCallback((itemId: string) =>
    cart.filter((i) => i.id === itemId).reduce((s, i) => s + i.qty, 0),
  [cart]);

  const reset = useCallback(() => {
    setCart([]);
    setActiveOrderId(null);
  }, []);

  const loadOrderItems = useCallback((items: any[], loadedProducts: MenuItem[]) => {
    const mapped: CartItem[] = items.map((i: any) => {
      const prod = loadedProducts.find((p) => p.id === i.product_id);
      return {
        id: i.product_id,
        name: i.product_name,
        price: prod ? prod.price : Number(i.unit_price),
        category: prod ? prod.category : 'mon-chinh',
        image: prod?.image,
        sizes: prod?.sizes,
        toppings: prod?.toppings,
        cartItemId: `cart_loaded_${i.id}_${genCartId()}`,
        qty: i.quantity,
        unitPrice: Number(i.unit_price),
        note: i.note || undefined,
        selectedSize: i.options?.size || undefined,
        selectedToppings: i.options?.toppings || undefined,
        isSent: true,
        serviceType: i.service_type || 'dine_in',
        orderRound: i.order_round || 1,
        status: i.status || 'moi',
      };
    });
    setCart(mapped);
  }, []);

  const quickAdd = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const defaultSize = (item.sizes?.length ?? 0) > 0 ? 'M' : undefined;
      const existing = prev.find(
        (i) =>
          i.id === item.id &&
          !i.isSent &&
          i.selectedSize === defaultSize &&
          !i.selectedToppings?.length &&
          i.serviceType === 'dine_in'
      );
      if (existing)
        return prev.map((i) =>
          i.cartItemId === existing.cartItemId ? { ...i, qty: i.qty + 1 } : i
        );
      return [
        ...prev,
        {
          ...item,
          cartItemId: genCartId(),
          qty: 1,
          unitPrice: item.price,
          selectedSize: defaultSize,
          isSent: false,
          serviceType: 'dine_in' as const,
        },
      ];
    });
  }, []);

  const quickSubtract = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const defaultSize = (item.sizes?.length ?? 0) > 0 ? 'M' : undefined;
      const existing = prev.find(
        (i) =>
          i.id === item.id &&
          !i.isSent &&
          i.selectedSize === defaultSize &&
          !i.selectedToppings?.length &&
          i.serviceType === 'dine_in'
      );
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((i) => i.cartItemId !== existing.cartItemId);
      return prev.map((i) => (i.cartItemId === existing.cartItemId ? { ...i, qty: i.qty - 1 } : i));
    });
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => [...prev, item]);
  }, []);

  const updateQty = useCallback((cartItemId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.cartItemId === cartItemId);
      if (!item) return prev;
      const canEdit = !item.isSent || item.status === 'moi';
      if (!canEdit) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter((i) => i.cartItemId !== cartItemId);
      return prev.map((i) => (i.cartItemId === cartItemId ? { ...i, qty: newQty } : i));
    });
  }, []);

  const setQty = useCallback((cartItemId: string, qty: number) => {
    setCart((prev) => prev.map((i) => (i.cartItemId === cartItemId ? { ...i, qty } : i)));
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }, []);

  const editNote = useCallback((cartItemId: string, note: string) => {
    setCart((prev) => prev.map((i) => (i.cartItemId === cartItemId ? { ...i, note } : i)));
  }, []);

  const cancelItem = useCallback((cartItemId: string, reason: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.cartItemId === cartItemId ? { ...i, cancelReason: reason, isSent: true } : i
      )
    );
    const realId = getRealItemId(cartItemId);
    if (realId) api.cancelOrderItem({ item_id: realId, reason }).catch((e) => logger.error('cart', e));
  }, []);

  const toggleServiceType = useCallback((cartItemId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.cartItemId === cartItemId);
      if (idx === -1) return prev;
      const item = prev[idx];
      const targetType = item.serviceType === 'takeaway' ? 'dine_in' : 'takeaway';
      const targetLabel = targetType === 'takeaway' ? 'Mang về' : 'Tại bàn';

      // If quantity is 1, toggle it immediately
      if (item.qty === 1) {
        return prev.map((i) =>
          i.cartItemId === cartItemId ? { ...i, serviceType: targetType } : i
        );
      }

      // If quantity > 1, ask the user (cross-platform helper)
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        const confirmAll = window.confirm(
          `Bạn muốn chuyển tất cả ${item.qty} món sang [${targetLabel}]?\n\n- Chọn OK để chuyển tất cả.\n- Chọn Cancel để tách 1 món.`
        );
        const nextCart = [...prev];
        if (confirmAll) {
          nextCart[idx] = { ...item, serviceType: targetType as 'dine_in' | 'takeaway' };
        } else {
          // Reduce qty of existing item by 1
          nextCart[idx] = { ...item, qty: item.qty - 1 };
          // Append a new item with qty 1 and target service type
          const newItem = {
            ...item,
            cartItemId: `cart_split_${genCartId()}`,
            qty: 1,
            serviceType: targetType as 'dine_in' | 'takeaway',
            isSent: false, // New split row is unsent until saved/sent
          };
          nextCart.push(newItem);
        }
        return nextCart;
      } else {
        // Native platforms: alert triggers state updates asynchronously
        Alert.alert(
          'Chuyển hình thức phục vụ',
          `Bạn muốn chuyển ${item.qty}x ${item.name} sang [${targetLabel}] như thế nào?`,
          [
            { text: 'Huỷ', style: 'cancel' },
            {
              text: 'Tách 1 món',
              onPress: () => {
                setCart((current) => {
                  const currIdx = current.findIndex((i) => i.cartItemId === cartItemId);
                  if (currIdx === -1) return current;
                  const currItem = current[currIdx];
                  const nextCart = [...current];
                  nextCart[currIdx] = { ...currItem, qty: currItem.qty - 1 };
                  nextCart.push({
                    ...currItem,
                    cartItemId: `cart_split_${genCartId()}`,
                    qty: 1,
                    serviceType: targetType,
                    isSent: false,
                  });
                  return nextCart;
                });
              },
            },
            {
              text: 'Chuyển tất cả',
              onPress: () => {
                setCart((current) =>
                  current.map((i) =>
                    i.cartItemId === cartItemId ? { ...i, serviceType: targetType } : i
                  )
                );
              },
            },
          ]
        );
        return prev;
      }
    });
  }, [genCartId]);

  const updateItem = useCallback((cartItemId: string, updates: Partial<CartItem>) => {
    setCart((prev) => prev.map((i) => (i.cartItemId === cartItemId ? { ...i, ...updates } : i)));
  }, []);

  const filterOut = useCallback((ids: string[]) => {
    setCart((prev) => prev.filter((i) => !ids.includes(i.cartItemId)));
  }, []);

  const replaceAll = useCallback((items: CartItem[], orderId?: string) => {
    setCart(items);
    if (orderId) setActiveOrderId(orderId);
  }, []);

  const markSent = useCallback(() => {
    setCart((prev) => prev.map((i) => ({ ...i, isSent: true })));
  }, []);

  return {
    cart,
    total,
    itemCount,
    activeOrderId,
    setActiveOrderId,
    reset,
    loadOrderItems,
    quickAdd,
    quickSubtract,
    addItem,
    updateQty,
    setQty,
    removeItem,
    editNote,
    cancelItem,
    toggleServiceType,
    updateItem,
    filterOut,
    replaceAll,
    getItemCartCount,
    getRealItemId,
    genCartId,
    markSent,
  };
}
