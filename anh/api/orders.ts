import { request } from './client';

export async function getOrders() {
  const res = await request<any>('/ban-hang/orders');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function getActiveOrderForTable(tableId: string) {
  return request<any>(`/ban-hang/orders/active-table/${tableId}`);
}

export function createOrder(data: {
  table_id: string;
  items: {
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    note?: string;
    options?: any;
  }[];
}) {
  return request<any>('/ban-hang/orders', { method: 'POST', body: JSON.stringify(data) });
}

export function updateOrder(orderId: string, data: any) {
  return request<any>(`/ban-hang/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateOrderStatus(orderId: string, status: string) {
  return request<any>(`/ban-hang/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function splitOrder(data: { order_id: string; item_ids: string[]; new_table_id?: string }) {
  return request<any>('/ban-hang/orders/split', { method: 'POST', body: JSON.stringify(data) });
}

export function splitTable(data: { order_id: string; item_ids: string[]; new_table_id: string }) {
  return request<any>('/ban-hang/orders/split-table', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function mergeOrders(data: { source_order_id: string; target_order_id?: string }) {
  return request<any>('/ban-hang/orders/merge', { method: 'POST', body: JSON.stringify(data) });
}

export function moveTable(orderId: string, data: { table_id: string }) {
  return request<any>(`/ban-hang/orders/${orderId}/move-table`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function cancelOrderItem(data: { item_id: string; reason: string }) {
  return request<any>('/ban-hang/orders/cancel-item', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getOrder(orderId: string) {
  return request<any>(`/ban-hang/orders/${orderId}`);
}
