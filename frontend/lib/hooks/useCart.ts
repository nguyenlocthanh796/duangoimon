"use client";
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { api } from '../api';
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

  const getItemCartCount = (itemId: string) =>
    cart.filter(i => i.id === itemId).reduce((s, i) => s + i.qty, 0);

  const reset = useCallback(() => {
    setCart([]);
    setActiveOrderId(null);
  }, []);

  const loadOrderItems = useCallback((items: any[], loadedProducts: MenuItem[]) => {
    const mapped: CartItem[] = items.map((i: any) => {
      const prod = loadedProducts.find(p => p.id === i.product_id);
      return {
        id: i.product_id, name: i.product_name,
        price: prod ? prod.price : Number(i.unit_price),
        category: prod ? prod.category : 'mon-chinh',
        image: prod?.image, sizes: prod?.sizes, toppings: prod?.toppings,
        cartItemId: `cart_loaded_${i.id}_${genCartId()}`,
        qty: i.quantity, unitPrice: Number(i.unit_price),
        note: i.note || undefined,
        selectedSize: i.options?.size || undefined,
        selectedToppings: i.options?.toppings || undefined,
        isSent: true, serviceType: i.service_type || 'dine_in',
        orderRound: i.order_round || 1, status: i.status || 'moi',
      };
    });
    setCart(mapped);
  }, []);

  const quickAdd = (item: MenuItem) => {
    setCart(prev => {
      const defaultSize = (item.sizes?.length ?? 0) > 0 ? 'M' : undefined;
      const existing = prev.find(i =>
        i.id === item.id && !i.isSent && i.selectedSize === defaultSize &&
        !i.selectedToppings?.length && i.serviceType === 'dine_in'
      );
      if (existing) return prev.map(i =>
        i.cartItemId === existing.cartItemId ? { ...i, qty: i.qty + 1 } : i
      );
      return [...prev, {
        ...item, cartItemId: genCartId(), qty: 1, unitPrice: item.price,
        selectedSize: defaultSize,
        isSent: false, serviceType: 'dine_in' as const,
      }];
    });
  };

  const quickSubtract = (item: MenuItem) => {
    setCart(prev => {
      const defaultSize = (item.sizes?.length ?? 0) > 0 ? 'M' : undefined;
      const existing = prev.find(i =>
        i.id === item.id && !i.isSent && i.selectedSize === defaultSize &&
        !i.selectedToppings?.length && i.serviceType === 'dine_in'
      );
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(i => i.cartItemId !== existing.cartItemId);
      return prev.map(i =>
        i.cartItemId === existing.cartItemId ? { ...i, qty: i.qty - 1 } : i
      );
    });
  };

  const addItem = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.cartItemId === cartItemId);
      if (!item) return prev;
      const canEdit = !item.isSent || item.status === 'moi';
      if (!canEdit) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter(i => i.cartItemId !== cartItemId);
      return prev.map(i => i.cartItemId === cartItemId ? { ...i, qty: newQty } : i);
    });
  };

  const setQty = (cartItemId: string, qty: number) => {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, qty } : i));
  };

  const removeItem = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const editNote = (cartItemId: string, note: string) => {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, note } : i));
  };

  const cancelItem = (cartItemId: string, reason: string) => {
    setCart(prev => prev.map(i =>
      i.cartItemId === cartItemId ? { ...i, cancelReason: reason, isSent: true } : i
    ));
    const realId = getRealItemId(cartItemId);
    if (realId) api.cancelOrderItem({ item_id: realId, reason }).catch(console.error);
  };

  const toggleServiceType = (cartItemId: string) => {
    setCart(prev => prev.map(i => {
      if (i.cartItemId === cartItemId && !i.isSent) {
        return { ...i, serviceType: i.serviceType === 'takeaway' ? 'dine_in' : 'takeaway' };
      }
      return i;
    }));
  };

  const updateItem = (cartItemId: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(i =>
      i.cartItemId === cartItemId ? { ...i, ...updates } : i
    ));
  };

  const filterOut = (ids: string[]) => {
    setCart(prev => prev.filter(i => !ids.includes(i.cartItemId)));
  };

  const replaceAll = (items: CartItem[], orderId?: string) => {
    setCart(items);
    if (orderId) setActiveOrderId(orderId);
  };

  return {
    cart, total, itemCount, activeOrderId,
    setActiveOrderId, reset, loadOrderItems,
    quickAdd, quickSubtract, addItem,
    updateQty, setQty, removeItem, editNote, cancelItem,
    toggleServiceType, updateItem, filterOut, replaceAll,
    getItemCartCount, getRealItemId, genCartId,
  };
}
