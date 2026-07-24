/**
 * Supabase Realtime WebSocket Listener for Multi-Device POS Sync.
 * Enables sub-100ms live order updates across all restaurant tablets.
 */

import { logger } from '../logger';
import { invalidateCache, mutateCacheSync } from '../api/cache';
import { getToken } from '../api/client';
import { CLOUDFLARE_TUNNEL_BASE } from '../api/serverConfig';

let _webSocket: WebSocket | null = null;
let _reconnectCount = 0;
const MAX_RECONNECT = 5;

function getWsBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WS_URL) {
    return process.env.EXPO_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `ws://${host}:8000/ws`;
    }
  }
  return 'wss://pos-quanan-backend.onrender.com/ws';
}

export function initRealtimeSync(onOrderUpdated?: (data: any) => void) {
  if (typeof window === 'undefined') return;

  try {
    if (_webSocket && (_webSocket.readyState === WebSocket.OPEN || _webSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = getToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const baseWsUrl = getWsBaseUrl();
    const fullWsUrl = baseWsUrl.endsWith('/pos') ? `${baseWsUrl}${tokenQuery}` : `${baseWsUrl}/pos${tokenQuery}`;

    _webSocket = new WebSocket(fullWsUrl);

    _webSocket.onopen = () => {
      _reconnectCount = 0;
      logger.info('realtimeSync', 'WebSocket connected for live multi-device sync');
    };

    _webSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message && (message.event === 'order_updated' || message.event === 'table_updated')) {
          if (message.table_id) {
            mutateCacheSync<any[]>('tables_ban_hang', (tables) => {
              if (!Array.isArray(tables)) return tables || [];
              return tables.map((t) =>
                t.id === message.table_id
                  ? {
                      ...t,
                      status: message.status || t.status,
                      orderTotal: message.order_total !== undefined ? message.order_total : t.orderTotal,
                    }
                  : t
              );
            });
          } else {
            invalidateCache('orders_ban_hang');
            invalidateCache('tables_ban_hang');
          }
          if (onOrderUpdated) onOrderUpdated(message.order || message);
        }
      } catch {
        /* ignore */
      }
    };

    _webSocket.onerror = (err) => {
      logger.warn('realtimeSync', 'WebSocket error:', err);
    };

    _webSocket.onclose = () => {
      _webSocket = null;
      if (_reconnectCount < MAX_RECONNECT) {
        _reconnectCount++;
        setTimeout(() => initRealtimeSync(onOrderUpdated), 5000);
      }
    };
  } catch (e) {
    logger.warn('realtimeSync', 'Failed to connect WebSocket:', e);
  }
}
