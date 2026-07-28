import { request } from './client';
import { cachedGet, invalidateCache } from './cache';
import { DEFAULT_POS_PRODUCTS } from '../constants/defaultProducts';

export async function getProducts() {
  return cachedGet('products_pos', async () => {
    try {
      const res = await request<any>('/ban-hang/products?page_size=100');
      if (res && typeof res === 'object') {
        if (Array.isArray(res.items) && res.items.length > 0) return res.items;
        if (Array.isArray(res) && res.length > 0) return res;
      }
    } catch (e) {
      // Backend offline / network failed on native
    }
    return DEFAULT_POS_PRODUCTS;
  });
}

export async function getQuanLyProducts() {
  return cachedGet('products_quan_ly', async () => {
    const res = await request<any>('/quan-ly/products');
    if (res && typeof res === 'object') {
      if (Array.isArray(res.items)) return res.items;
      if (Array.isArray(res)) return res;
    }
    return [];
  });
}

export async function createProduct(
  data: Partial<{
    id: string;
    code: string;
    name: string;
    category: string | null;
    price: number;
    cost_price: number;
    unit: string;
    is_active: boolean;
    options: any[];
  }>
) {
  const res = await request<any>('/quan-ly/products', { method: 'POST', body: JSON.stringify(data) });
  invalidateCache('products_pos');
  invalidateCache('products_quan_ly');
  return res;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    code: string;
    name: string;
    category: string | null;
    price: number;
    cost_price: number;
    unit: string;
    is_active: boolean;
    options: any[];
  }>
) {
  const res = await request<any>(`/quan-ly/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  invalidateCache('products_pos');
  invalidateCache('products_quan_ly');
  return res;
}

export async function deleteProduct(id: string) {
  const res = await request<{ status: string }>(`/quan-ly/products/${id}`, { method: 'DELETE' });
  invalidateCache('products_pos');
  invalidateCache('products_quan_ly');
  return res;
}
