import { request } from './client';
import type { Transaction, Invoice } from './client';

export function processPayment(data: {
  order_id: string; payment_method?: string; amount_received?: number;
  splits?: { method: string; amount: number }[];
}) {
  return request<any>('/ban-hang/payments', { method: 'POST', body: JSON.stringify(data) });
}

export async function getTransactions(type?: string) {
  const res = await request<any>(`/ke-toan/transactions${type ? `?type=${type}` : ''}`);
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function createTransaction(data: { type: string; category: string; amount: number; note: string }) {
  return request<Transaction>('/ke-toan/transactions', { method: 'POST', body: JSON.stringify(data) });
}

export async function getInvoices() {
  const res = await request<any>('/ke-toan/invoices');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function createInvoice(data: { order_id: string; buyer_name: string; buyer_tax_code?: string; vat_rate: number }) {
  return request<Invoice>('/ke-toan/invoices', { method: 'POST', body: JSON.stringify(data) });
}

export function exportInvoice(id: string) {
  return request<Invoice>(`/ke-toan/invoices/${id}/export`, { method: 'POST' });
}
