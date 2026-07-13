import { request } from './client';
import type { Dashboard, User, SalesReport } from './client';

export function getDashboard() {
  return request<Dashboard>('/quan-ly/dashboard');
}

export async function getUsers() {
  const res = await request<any>('/quan-ly/users');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function createUser(data: Partial<User>) {
  return request<any>('/quan-ly/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, data: Partial<User>) {
  return request<any>(`/quan-ly/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function getSalesReport(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const qs = params.toString();
  return request<SalesReport>(`/quan-ly/reports/sales${qs ? `?${qs}` : ''}`);
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  tax_code?: string;
}

export async function getBranches(): Promise<Branch[]> {
  const res = await request<any>('/quan-ly/branches/flat');
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}
