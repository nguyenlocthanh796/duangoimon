'use client';
import { useState, useEffect } from 'react';
import { api } from '../api';
import { logger } from '../logger';
import { MenuItem } from '../components/pos/types';

const CAT_MAP: Record<string, string> = {
  'SỮA CHUA': 'sua-chua',
  'TRÀ CHANH': 'tra-chanh',
  'ĐỒ ĂN VẶT': 'do-an-vat',
  CHÈ: 'che',
  'TRÀ SỮA': 'tra-sua',
  SODA: 'soda',
  KEM: 'kem',
};

export function useMenu() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: CAT_MAP[p.category] || p.category || 'mon-chinh',
        image: p.image_url,
        sizes: p.options?.filter((o: any) => o.type === 'size') || undefined,
        toppings: p.options?.filter((o: any) => o.type === 'topping') || undefined,
      }));
      setProducts(mapped);
    } catch (err) {
      logger.error('menu', 'Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { products, loading, reload: load };
}
