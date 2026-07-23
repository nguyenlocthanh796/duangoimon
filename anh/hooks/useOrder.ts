'use client';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../api';
import { CartItem } from '../components/pos/types';

export function useOrder() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async (cart: CartItem[], tableId: string, activeOrderId: string | null) => {
    const sentItems = cart.filter((i) => i.isSent);
    const maxRound = sentItems.reduce((max, i) => Math.max(max, i.orderRound || 1), 0);
    const nextRound = maxRound + 1;

    const items = cart.map((i) => ({
      product_id: i.id,
      product_name: i.name,
      quantity: i.qty,
      unit_price: i.unitPrice,
      note: i.note || undefined,
      options: { size: i.selectedSize || 'Regular', toppings: i.selectedToppings || [] },
      vat_rate: i.vatRate ?? 8,
      service_type: i.serviceType || 'dine_in',
      order_round: i.isSent ? i.orderRound || 1 : nextRound,
      status: i.status || 'moi',
    }));

    if (activeOrderId) {
      return await api.updateOrder(activeOrderId, { items });
    } else {
      const params: any = { items, table_id: tableId };
      const res = await api.createOrder(params);
      return res;
    }
  };

  const sendToKitchen = async (
    cart: CartItem[],
    tableId: string,
    activeOrderId: string | null
  ): Promise<string | null> => {
    if (cart.length === 0) return null;
    setSubmitting(true);
    try {
      const res = await submitOrder(cart, tableId, activeOrderId);
      const orderId = activeOrderId || res.id;
      await api.updateOrderStatus(orderId, 'da_gui_bep');
      Alert.alert('Đã gửi bếp', 'Món ăn đã được gửi đến bếp.');
      return res.id;
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi bếp.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const saveTable = async (
    cart: CartItem[],
    tableId: string,
    activeOrderId: string | null
  ): Promise<boolean> => {
    if (cart.length === 0) return false;
    setSubmitting(true);
    try {
      await submitOrder(cart, tableId, activeOrderId);
      return true;
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu hóa đơn.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const goToPayment = (
    cart: CartItem[],
    tableId: string,
    tableName: string,
    activeOrderId: string | null,
    total: number
  ) => {
    if (cart.length === 0) return;
    setSubmitting(true);
    submitOrder(cart, tableId, activeOrderId)
      .then((res) => {
        router.push(
          `/ban-hang/payment?tableId=${tableId}&tableName=${encodeURIComponent(tableName)}` +
            `&total=${res.total_amount || total}&orderId=${res.id}`
        );
      })
      .catch(() => Alert.alert('Lỗi', 'Không thể tạo đơn hàng.'))
      .finally(() => setSubmitting(false));
  };

  return { submitting, submitOrder, sendToKitchen, saveTable, goToPayment };
}
