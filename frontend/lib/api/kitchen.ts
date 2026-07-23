import { request } from './client';

export interface KitchenItem {
  id: string;
  tableName: string;
  productName: string;
  quantity: number;
  status: 'moi' | 'dang_lam' | 'hoan_thanh';
  note: string;
  orderCreatedAt: string;
  ageMinutes: number;
  isDelayed: boolean;
}

export interface KitchenFeedResponse {
  items: KitchenItem[];
  thresholdMinutes: number;
}

export async function getKitchenFeed(): Promise<KitchenFeedResponse> {
  const res = await request<KitchenFeedResponse>('/ban-hang/kitchen-feed');
  return res || { items: [], thresholdMinutes: 15 };
}
