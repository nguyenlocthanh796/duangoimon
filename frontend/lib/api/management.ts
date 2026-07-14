import { request } from './client';
import type { Dashboard, User, SalesReport } from './client';
import { cachedGet, invalidateCache } from './cache';

export function getDashboard() {
  return request<Dashboard>('/quan-ly/dashboard');
}

export async function getUsers() {
  return cachedGet('management_users', async () => {
    const res = await request<any>('/quan-ly/users');
    if (res && typeof res === 'object') {
      if (Array.isArray(res.items)) return res.items;
      if (Array.isArray(res)) return res;
    }
    return [];
  });
}

export async function createUser(data: Partial<User>) {
  const res = await request<any>('/quan-ly/users', { method: 'POST', body: JSON.stringify(data) });
  invalidateCache('management_users');
  return res;
}

export async function updateUser(id: string, data: Partial<User>) {
  const res = await request<any>(`/quan-ly/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  invalidateCache('management_users');
  return res;
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
  return cachedGet('management_branches', async () => {
    const res = await request<any>('/quan-ly/branches/flat');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    return [];
  }, 300_000, 600_000); // cache branches for 5 minutes (stale), 10 mins (expire)
}
