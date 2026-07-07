import { colors } from '../theme/colors';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '../api';

export const PAY_METHODS = [
  { id: 'tien_mat',    label: 'Tiền mặt',       icon: 'cash-register',       bg: '#FFF7ED',  color: colors.brand.primary },
  { id: 'card',        label: 'Quẹt thẻ',        icon: 'credit-card-outline',  bg: '#EFF6FF',  color: '#3B82F6' },
  { id: 'qr',          label: 'QR Code',          icon: 'qrcode-scan',          bg: '#F3E8FF',  color: '#9333EA' },
  { id: 'chuyen_khoan',label: 'Chuyển khoản',    icon: 'bank-transfer',        bg: '#FFF1F2',  color: '#E11D48' },
];

export const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export const NUMPAD_KEYS: Array<{ label: string; value: string; type: 'num' | 'clear' | 'back' | 'triple' }> = [
  { label: '1', value: '1', type: 'num' },   { label: '2', value: '2', type: 'num' },   { label: '3', value: '3', type: 'num' },
  { label: '4', value: '4', type: 'num' },   { label: '5', value: '5', type: 'num' },   { label: '6', value: '6', type: 'num' },
  { label: '7', value: '7', type: 'num' },   { label: '8', value: '8', type: 'num' },   { label: '9', value: '9', type: 'num' },
  { label: 'C', value: '', type: 'clear' },  { label: '0', value: '0', type: 'num' },   { label: '⌫', value: '', type: 'back' },
  { label: '000', value: '000', type: 'triple' },
];

export function getSmartCashSuggestions(total: number): number[] {
  const s = new Set<number>();
  s.add(total);
  const notes = [10000, 20000, 50000, 100000, 200000, 500000];
  notes.filter(n => n > total).forEach(n => s.add(n));
  const r10 = total % 10000;
  if (r10 > 0) s.add(total + (10000 - r10));
  const r50 = total % 50000;
  if (r50 > 0) {
    s.add(total + (50000 - r50));
    s.add(total + 50000);
    s.add(total + 100000);
  }
  return Array.from(s).filter(v => v >= total).sort((a, b) => a - b).slice(0, 6);
}

export interface UsePaymentOptions {
  tableId: string;
  tableName: string;
  total: number;
  orderId: string;
}

export function usePayment({ tableId, tableName, total, orderId }: UsePaymentOptions) {
  const [method, setMethod] = useState('tien_mat');
  const [cashInput, setCashInput] = useState('');
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (orderId) {
      api.get<any>(`/ban-hang/orders/${orderId}`)
        .then(data => { if (data && data.items) setOrderItems(data.items); })
        .catch(err => console.warn('Could not load order items:', err));
    }
  }, [orderId]);

  useEffect(() => {
    if (paid) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); router.replace('/ban-hang'); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paid]);

  useEffect(() => {
    if (method !== 'tien_mat') setCashInput(String(total));
    else setCashInput('');
  }, [method, total]);

  const cashInputVal = cashInput === '' ? String(total) : cashInput;
  const cash = Number(cashInputVal);
  const change = cash - total;
  const smartSuggestions = getSmartCashSuggestions(total);

  const handleKey = (key: typeof NUMPAD_KEYS[number]) => {
    if (method !== 'tien_mat') return;
    if (key.type === 'clear') { setCashInput(''); return; }
    if (key.type === 'back') { setCashInput(prev => prev.slice(0, -1)); return; }
    setCashInput(prev => {
      if ((prev === '' || prev === '0') && (key.value === '0' || key.value === '000')) return '0';
      const next = prev === '0' ? key.value : prev + key.value;
      if (next.length > 12) return prev;
      return next;
    });
  };

  const handlePay = async (paySplits?: { method: string; amount: number }[]) => {
    if (!orderId || paying) return;
    setPaying(true);
    try {
      await api.processPayment({
        order_id: orderId,
        payment_method: paySplits ? paySplits.map(s => s.method).join('+') : method,
        amount_received: method === 'tien_mat' && !paySplits ? cash : undefined,
        splits: paySplits,
      });
      if (tableId && tableId !== 'TAKEAWAY') {
        try { await api.put(`/quan-ly/tables/${tableId}`, { status: 'trong' }); }
        catch (tableErr) { console.warn('Could not reset table status:', tableErr); }
      }
      setPaid(true);
    } catch (e: any) {
      Alert.alert('Lỗi thanh toán', e?.message || 'Không thể thực hiện thanh toán. Vui lòng thử lại.');
    } finally { setPaying(false); }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) { Alert.alert('Không thể in', 'Vui lòng cho phép popup để hiển thị hóa đơn in.'); return; }
      const { generateReceiptHTML } = require('../components/payment/receipt');
      const html = generateReceiptHTML({
        tableName, orderId, total, method, cash, change,
        items: orderItems,
      });
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      Alert.alert('Không hỗ trợ', 'In hóa đơn chỉ hỗ trợ trên nền tảng Web / Trình duyệt.');
    }
  };

  const canPay = !!orderId && (method !== 'tien_mat' || cash >= total);

  return {
    method, setMethod, cashInput, setCashInput, paid, paying,
    orderItems, countdown, cash, change, smartSuggestions, canPay,
    handleKey, handlePay, handlePrint,
  };
}

export type PaymentHook = ReturnType<typeof usePayment>;
