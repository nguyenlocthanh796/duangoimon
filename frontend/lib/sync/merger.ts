/**
 * Delta-Merger & Conflict-Free Resolution for Multi-Device POS operations.
 * Merges concurrent order items using (timestamp, device_id, sequence_no) vector.
 */

import { CartItem } from '../components/pos/types';

export interface VersionedOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options?: any;
  vat_rate?: number;
  service_type?: string;
  order_round?: number;
  status?: string;
  device_id?: string;
  timestamp?: string;
}

/**
 * Merge items added concurrently by Device A and Device B on the same table.
 */
export function mergeOrderItems(
  existingItems: VersionedOrderItem[],
  incomingItems: VersionedOrderItem[]
): VersionedOrderItem[] {
  const map = new Map<string, VersionedOrderItem>();

  // Helper key for unique product variant
  const getKey = (item: VersionedOrderItem) => {
    const size = item.options?.size || 'Regular';
    const toppings = (item.options?.toppings || []).sort().join(',');
    const note = item.note || '';
    return `${item.product_id}_${size}_${toppings}_${note}`;
  };

  // Populate existing
  existingItems.forEach((item) => {
    map.set(getKey(item), { ...item });
  });

  // Merge incoming
  incomingItems.forEach((item) => {
    const key = getKey(item);
    const curr = map.get(key);
    if (!curr) {
      map.set(key, { ...item });
    } else {
      // Delta merge quantity
      curr.quantity = Math.max(curr.quantity, item.quantity);
      if (item.timestamp && curr.timestamp && item.timestamp > curr.timestamp) {
        curr.status = item.status || curr.status;
        curr.note = item.note || curr.note;
      }
    }
  });

  return Array.from(map.values());
}
