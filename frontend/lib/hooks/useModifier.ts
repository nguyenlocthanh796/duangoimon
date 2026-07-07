"use client";
import { useState, useMemo } from 'react';
import { MenuItem, CartItem } from '../components/pos/types';

export function useModifier() {
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalSize, setModalSize] = useState<string | null>(null);
  const [modalToppings, setModalToppings] = useState<string[]>([]);
  const [modalNote, setModalNote] = useState('');

  const modalPrice = useMemo(() => {
    if (!modalItem) return 0;
    const sp = modalItem.sizes?.find(s => s.name === modalSize)?.price || modalItem.price;
    const tc = modalToppings.reduce((s, t) =>
      s + (modalItem.toppings?.find(tp => tp.name === t)?.price || 0), 0
    );
    return sp + tc;
  }, [modalItem, modalSize, modalToppings]);

  const openForNew = (item: MenuItem) => {
    setModalItem(item);
    setModalQty(1);
    setModalSize((item.sizes?.length ?? 0) > 0 ? 'M' : null);
    setModalToppings([]);
    setModalNote('');
  };

  const openForEdit = (item: CartItem) => {
    setModalItem(item);
    setModalQty(item.qty);
    setModalSize(item.selectedSize || null);
    setModalToppings(item.selectedToppings || []);
    setModalNote(item.note || '');
  };

  const close = () => {
    setModalItem(null);
    setModalQty(1);
    setModalNote('');
    setModalToppings([]);
  };

  return {
    modalItem, modalQty, setModalQty,
    modalSize, setModalSize,
    modalToppings, setModalToppings,
    modalNote, setModalNote, modalPrice,
    openForNew, openForEdit, close,
  };
}
