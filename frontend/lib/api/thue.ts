// ─── HKD Tax (chuẩn 2026) API ───────────────────────────────────────────────
import { request } from './client';

export interface HKDProfile {
  id: string;
  branch_id: string | null;
  tax_code: string;
  legal_name: string;
  registration_status: string;
  tax_method: string;
  revenue_ytd: number;
  fiscal_year: number;
  opened_in_first_half: boolean;
  threshold_alert_sent: boolean;
}

export interface ProfileStatus {
  id: string;
  tax_code: string;
  legal_name: string;
  tier: 'N1' | 'N2' | 'N3' | 'N4';
  tier_label: string;
  revenue_ytd: number;
  pct_of_1ty: number;
  threshold_alert_sent: boolean;
  registration_status: string;
  tax_method: string;
}

export interface BankAccount {
  id: string;
  branch_id: string | null;
  tax_code: string;
  bank_name: string;
  account_number: string;
  wallet_type: string;
  form_status: string;
}

export interface DeclarationDeadline {
  id: string;
  branch_id: string | null;
  form: string;
  period_type: string;
  due_date: string;
  reminded_14: boolean;
  reminded_7: boolean;
  reminded_3: boolean;
  reminded_1: boolean;
  submitted: boolean;
}

export interface SoSachRow {
  period_month: string;
  revenue: number;
  vat: number;
  tncn: number;
  total: number;
  group: number;
}

export interface TaxReport {
  hkd_name: string;
  tax_code: string;
  rows: SoSachRow[];
  totals: { revenue: string; cost: string; vat: string; pit: string; total: string };
}

export interface LegacyChecklist {
  branch_id: string;
  generated_at: string;
  items: { product: string; opening_qty: number; avg_cost: number; value: number }[];
}

const BASE = '/thue';

export async function getProfiles(branchId: string): Promise<HKDProfile[]> {
  return request<HKDProfile[]>(`${BASE}/profiles/${branchId}`);
}

export async function patchProfile(id: string, body: Partial<HKDProfile>): Promise<HKDProfile> {
  return request<HKDProfile>(`${BASE}/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function getProfileStatus(id: string): Promise<ProfileStatus> {
  return request<ProfileStatus>(`${BASE}/profiles/${id}/status`);
}

export async function createProfile(body: Partial<HKDProfile>): Promise<HKDProfile> {
  return request<HKDProfile>(`${BASE}/profiles`, { method: 'POST', body: JSON.stringify(body) });
}

export async function getBankAccounts(branchId: string): Promise<BankAccount[]> {
  return request<BankAccount[]>(`${BASE}/bank-accounts/${branchId}`);
}

export async function createBankAccount(body: Partial<BankAccount>): Promise<BankAccount> {
  return request<BankAccount>(`${BASE}/bank-accounts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getDeadlines(branchId: string): Promise<DeclarationDeadline[]> {
  return request<DeclarationDeadline[]>(`${BASE}/deadlines/${branchId}`);
}

export function bulkSubmitDeadlines(ids: string[], note?: string) {
  return request<{ submitted: number; status: string }>(`${BASE}/deadlines/bulk-submit`, {
    method: 'POST',
    body: JSON.stringify({ ids, note: note ?? null }),
  });
}

/** P4.1 — download the 12-month tax report as CSV or PDF (blob). */
export async function exportTaxReport(
  branchId: string,
  year: number,
  format: 'csv' | 'pdf'
): Promise<void> {
  const token = await (await import('../secure-storage')).getToken();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/api/v1${BASE}/report/${branchId}/export?year=${year}&fmt=${format}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Xuất báo cáo thất bại');
  const blob = await res.blob();
  const disp = res.headers.get('content-disposition') || '';
  const m = disp.match(/filename="?([^"]+)"?/);
  const filename = m ? m[1] : `BaoCaoThue_${branchId.slice(0, 8)}_${year}.${format}`;
  if (typeof window !== 'undefined' && 'document' in window) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }
}

export async function getDeclarationXml(
  form: string,
  branchId: string,
  period: string
): Promise<string> {
  return request<string>(
    `${BASE}/declarations/declaration/${form}/${branchId}?period=${encodeURIComponent(period)}`
  );
}

export async function getTaxReport(branchId: string, year: number): Promise<TaxReport> {
  return request<TaxReport>(`${BASE}/report/${branchId}?year=${year}`);
}

export async function getLegacyChecklist(branchId: string): Promise<LegacyChecklist> {
  return request<LegacyChecklist>(`${BASE}/legacy-inventory/checklist/${branchId}`, {
    method: 'POST',
    body: '{}',
  });
}
