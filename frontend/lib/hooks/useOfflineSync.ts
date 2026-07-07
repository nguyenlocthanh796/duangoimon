/** useOfflineSync — hook for order queue + sync status (browser-based). */
import { useEffect, useState, useCallback } from 'react';
import { syncPendingOrders, getQueueStatus, clearSyncedOrders } from '../utils/offlineSync';

interface SyncStatus {
  isOnline: boolean;
  pendingOrders: number;
  syncing: boolean;
  lastSyncResult: string | null;
}

function getOnlineStatus(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function useOfflineSync(): SyncStatus & { forceSync: () => Promise<void> } {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: getOnlineStatus(),
    pendingOrders: 0,
    syncing: false,
    lastSyncResult: null,
  });

  const updateQueueStatus = useCallback(async () => {
    const qs = await getQueueStatus();
    setStatus(s => ({ ...s, pendingOrders: qs.pending }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(s => ({ ...s, isOnline: true }));
      syncPendingOrders().then(r => {
        setStatus(s => ({ ...s, lastSyncResult: `Synced ${r.synced}, failed ${r.failed}` }));
        clearSyncedOrders();
        updateQueueStatus();
      });
    };
    const handleOffline = () => setStatus(s => ({ ...s, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateQueueStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateQueueStatus]);

  const forceSync = useCallback(async () => {
    setStatus(s => ({ ...s, syncing: true }));
    const r = await syncPendingOrders();
    setStatus(s => ({ ...s, syncing: false, lastSyncResult: `Synced ${r.synced}, failed ${r.failed}` }));
    await clearSyncedOrders();
    await updateQueueStatus();
  }, [updateQueueStatus]);

  return { ...status, forceSync };
}
