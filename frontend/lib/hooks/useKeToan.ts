import useSWR from 'swr';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { safeApi } from '../logger';

// Fallback data generator
export function generateFallbackKeToanData() {
  return {
    summary: {
      total_thu: 0,
      total_chi: 0,
      balance: 0,
      transaction_count: 0,
      invoice_count: 0,
      exported_count: 0,
      invoice_total: 0,
    },
    monthly_revenue: [],
    expense_by_category: [],
    recent_transactions: [],
    recent_invoices: [],
    this_month: { thu: 0, chi: 0, thu_growth: 0, chi_growth: 0 },
    deadlines: [],
  };
}

const fetcher = async () => {
  try {
    const data = await api.getKeToanDashboard();
    return data && data.summary?.total_thu !== undefined ? data : generateFallbackKeToanData();
  } catch (error) {
    return generateFallbackKeToanData();
  }
};

export function useKeToanDashboard() {
  const { branchId } = useAuth();

  // SWR automatically implements stale-while-revalidate pattern
  // Cache key includes branchId so it refetches if branch changes
  const { data, error, isLoading, mutate } = useSWR(
    branchId ? `/ke-toan/dashboard?branch_id=${branchId}` : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // refresh every 5 mins
      revalidateOnFocus: true,
      dedupingInterval: 10000, // dedupe requests in 10s
    }
  );

  return {
    data: data || generateFallbackKeToanData(),
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useTaxProfileStatus() {
  const { branchId } = useAuth();
  
  const taxFetcher = async () => {
    if (!branchId) return null;
    return safeApi(() => api.getTaxProfileStatus(branchId), null);
  };

  const { data, error, isLoading, mutate } = useSWR(
    branchId ? `/thue/profiles/${branchId}/status` : null,
    taxFetcher,
    {
      refreshInterval: 10 * 60 * 1000, // 10 mins cache
      revalidateOnFocus: true,
    }
  );

  return {
    taxStatus: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
