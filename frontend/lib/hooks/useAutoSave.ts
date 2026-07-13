'use client';
import { useRef, useEffect } from 'react';
import { CartItem } from '../components/pos/types';

interface AutoSaveOptions {
  tableId: string;
  cart: CartItem[];
  loading: boolean;
  submitting: boolean;
  activeOrderId: string | null;
  onSave: (
    cart: CartItem[],
    tableId: string,
    activeOrderId: string | null
  ) => Promise<{ id?: string } | void>;
  onOrderCreated?: (orderId: string) => void;
}

/**
 * Auto-save hook: debounce 1.5s, best-effort save on cart changes.
 */
export function useAutoSave({
  tableId,
  cart,
  loading,
  submitting,
  activeOrderId,
  onSave,
  onOrderCreated,
}: AutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!tableId || cart.length === 0 || loading || submitting) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        const res = await onSave(cart, tableId, activeOrderId);
        if (!activeOrderId && res && 'id' in res && res.id && onOrderCreated) {
          onOrderCreated(res.id);
        }
      } catch {
        // Silent — best-effort
      } finally {
        savingRef.current = false;
      }
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cart, tableId, loading, submitting, activeOrderId, onSave, onOrderCreated]);
}
