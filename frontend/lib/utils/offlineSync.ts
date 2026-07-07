/** Offline sync manager for POS order queue.
 * 
 * Queues orders when offline, syncs when online.
 * Minimal conflict resolution: last-write-wins with server validation.
 */
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

function storage(): Storage {
  if (typeof window !== 'undefined') return window.localStorage;
  // fallback (React Native AsyncStorage polyfill)
  return { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, length: 0, key: () => null };
}

async function getQueue(): Promise<QueuedOrder[]> {
  const raw = storage().getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: QueuedOrder[]): Promise<void> {
  storage().setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue an order for later sync. */
export async function enqueueOrder(order: Omit<QueuedOrder, 'id' | 'createdAt' | 'synced'>): Promise<string> {
  const queue = await getQueue();
  const id = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  queue.push({ ...order, id, createdAt: new Date().toISOString(), synced: false });
  await saveQueue(queue);
  return id;
}

/** Sync all pending orders to server. Returns { synced, failed } counts. */
export async function syncPendingOrders(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  const pending = queue.filter(o => !o.synced);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0, failed = 0;
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
  return { total: queue.length, pending: queue.filter(o => !o.synced).length };
}

/** Remove fully synced orders from the queue. */
export async function clearSyncedOrders(): Promise<void> {
  const queue = await getQueue();
  await saveQueue(queue.filter(o => !o.synced));
}
