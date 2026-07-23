import { request } from './client';
import type { Transaction, Invoice } from './client';

export function processPayment(data: {
  order_id: string;
  payment_method?: string;
  amount_received?: number;
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

export function createTransaction(data: {
  type: string;
  category: string;
  amount: number;
  note: string;
}) {
  return request<Transaction>('/ke-toan/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInvoices(branch_id?: string) {
  const qs = branch_id ? `?branch_id=${branch_id}` : '';
  const res = await request<any>(`/ke-toan/invoices${qs}`);
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function createInvoice(data: {
  branch_id?: string;
  order_id: string;
  buyer_name: string;
  buyer_tax_code?: string;
  vat_rate: number;
}) {
  return request<Invoice>('/ke-toan/invoices', { method: 'POST', body: JSON.stringify(data) });
}

export function exportInvoice(id: string) {
  return request<Invoice>(`/ke-toan/invoices/${id}/export`, { method: 'POST' });
}

export function bulkDeleteTransactions(ids: string[]) {
  return request<{ deleted: number; status: string }>('/ke-toan/transactions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkExportInvoices(ids: string[]) {
  return request<{ exported: number; status: string }>('/ke-toan/invoices/bulk-export', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

/** Delete a single invoice by ID. */
export function deleteInvoice(id: string) {
  return request<{ status: string }>(`/ke-toan/invoices/${id}`, { method: 'DELETE' });
}

/** Get paid orders available for invoice creation. */
export async function getPaidOrders() {
  const res = await request<any>('/ban-hang/orders?status=da_thanh_toan');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

/** Export invoices as CSV (returns blob/URL). */
export function exportInvoicesCsv() {
  return request<Blob>('/ke-toan/invoices/export-csv', { method: 'GET' });
}

/** Fetch combined dashboard data (single endpoint). */
export function getKeToanDashboard() {
  return request<any>('/ke-toan/dashboard', { method: 'GET' });
}

/** Fetch tax profile status for a branch. */
export function getTaxProfileStatus(branchId: string) {
  return request<any>(`/thue/profiles/${branchId}/status`, { method: 'GET' });
}

