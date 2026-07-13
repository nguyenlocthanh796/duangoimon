/** Offline sync manager for POS order queue.
 *
 * Queues orders when offline, syncs when online.
 * Minimal conflict resolution: last-write-wins with server validation.
 */
import { Platform } from 'react-native';
import { request } from '../api/client';

const QUEUE_KEY = 'offline_order_queue';

interface QueuedOrder {
  id: string; // local UUID
  tableId: string;
  items: any[];
  total: number;
  createdAt: string;
  synced: boolean;
}

let SecureStore: any = null;

async function getSecureStore() {
  if (!SecureStore) {
    try {
      SecureStore = await import('expo-secure-store');
    } catch {
      SecureStore = null;
    }
  }
  return SecureStore;
}

async function getQueue(): Promise<QueuedOrder[]> {
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const store = await getSecureStore();
      if (store) {
        const raw = await store.getItemAsync(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
      }
    }
    // Web fallback
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {
    // Storage unavailable
  }
  return [];
}

async function saveQueue(queue: QueuedOrder[]): Promise<void> {
  try {
    const data = JSON.stringify(queue);
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const store = await getSecureStore();
      if (store) {
        await store.setItemAsync(QUEUE_KEY, data);
        return;
      }
    }
    // Web fallback
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUEUE_KEY, data);
    }
  } catch {
    // Storage unavailable — silently fail
  }
}

/** Enqueue an order for later sync. */
export async function enqueueOrder(
  order: Omit<QueuedOrder, 'id' | 'createdAt' | 'synced'>
): Promise<string> {
  const queue = await getQueue();
  const id = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  queue.push({ ...order, id, createdAt: new Date().toISOString(), synced: false });
  await saveQueue(queue);
  return id;
}

/** Sync all pending orders to server. Returns { synced, failed } counts. */
export async function syncPendingOrders(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  const pending = queue.filter((o) => !o.synced);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0,
    failed = 0;
  for (const order of pending) {
    try {
      await request('/ban-hang/orders', {
        method: 'POST',
        body: JSON.stringify({
          table_id: order.tableId,
          items: order.items.map((i: any) => ({
            product_id: i.productId,
            quantity: i.quantity,
            total: i.total,
          })),
        }),
      });
      order.synced = true;
      synced++;
    } catch {
      failed++;
    }
  }
  await saveQueue(queue);
  return { synced, failed };
}

/** Get queue status. */
export async function getQueueStatus(): Promise<{ total: number; pending: number }> {
  const queue = await getQueue();
  return { total: queue.length, pending: queue.filter((o) => !o.synced).length };
}

/** Remove fully synced orders from the queue. */
export async function clearSyncedOrders(): Promise<void> {
  const queue = await getQueue();
  await saveQueue(queue.filter((o) => !o.synced));
}
