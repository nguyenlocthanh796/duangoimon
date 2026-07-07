import { request } from './client';

export async function getTables() {
  const res = await request<any>('/ban-hang/tables');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export async function getQuanLyTables() {
  const res = await request<any>('/quan-ly/tables');
  if (res && typeof res === 'object') {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res)) return res;
  }
  return [];
}

export function createTable(data: Partial<{ name: string; area: string | null; capacity: number; status: string }>) {
  return request<any>('/quan-ly/tables', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTable(id: string, data: Partial<{ name: string; area: string | null; capacity: number; status: string }>) {
  return request<any>(`/quan-ly/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteTable(id: string) {
  return request<{ status: string }>(`/quan-ly/tables/${id}`, { method: 'DELETE' });
}
