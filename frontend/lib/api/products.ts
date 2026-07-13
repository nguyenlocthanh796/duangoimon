import { request } from './client';

export async function getProducts() {
  const res = await request<any>('/ban-hang/products');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export async function getQuanLyProducts() {
  const res = await request<any>('/quan-ly/products');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function createProduct(
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
  return request<any>('/quan-ly/products', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProduct(
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
  return request<any>(`/quan-ly/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteProduct(id: string) {
  return request<{ status: string }>(`/quan-ly/products/${id}`, { method: 'DELETE' });
}
