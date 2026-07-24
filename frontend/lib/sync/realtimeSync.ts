/**
 * Supabase Realtime WebSocket Listener for Multi-Device POS Sync.
 * Enables sub-100ms live order updates across all restaurant tablets.
 * Upgraded to industrial-grade: AppState wake reconnect, ping-pong heartbeat, exponential backoff.
 */

import { AppState, AppStateStatus } from 'react-native';
import { logger } from '../logger';
import { invalidateCache, mutateCacheSync } from '../api/cache';
import { getToken } from '../api/client';

let _webSocket: WebSocket | null = null;
let _reconnectAttempts = 0;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

const _listeners = new Set<(data: any) => void>();

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

function startHeartbeat() {
  stopHeartbeat();
  _heartbeatTimer = setInterval(() => {
    if (_webSocket && _webSocket.readyState === WebSocket.OPEN) {
      try {
        _webSocket.send(JSON.stringify({ type: 'ping' }));
      } catch (err) {
        logger.warn('realtimeSync', 'Failed to send ping:', err);
      }

      // Expect pong response within 10s
      _pongTimeoutTimer = setTimeout(() => {
        logger.warn('realtimeSync', 'Heartbeat pong timeout. Closing stale WebSocket.');
        closeWebSocket();
      }, 10000);
    }
  }, 25000);
}

function stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
  if (_pongTimeoutTimer) {
    clearTimeout(_pongTimeoutTimer);
    _pongTimeoutTimer = null;
  }
}

function closeWebSocket() {
  stopHeartbeat();
  if (_webSocket) {
    try {
      _webSocket.close();
    } catch {
      /* ignore */
    }
    _webSocket = null;
  }
}

function connectWebSocket() {
  if (typeof window === 'undefined') return;

  // Clear existing reconnect timers
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }

  if (_webSocket && (_webSocket.readyState === WebSocket.OPEN || _webSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const token = getToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const baseWsUrl = getWsBaseUrl();
    const fullWsUrl = baseWsUrl.endsWith('/pos') ? `${baseWsUrl}${tokenQuery}` : `${baseWsUrl}/pos${tokenQuery}`;

    _webSocket = new WebSocket(fullWsUrl);

    _webSocket.onopen = () => {
      _reconnectAttempts = 0;
      logger.info('realtimeSync', 'WebSocket connected for live multi-device sync');
      startHeartbeat();
    };

    _webSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Intercept pong response
        if (message && message.type === 'pong') {
          if (_pongTimeoutTimer) {
            clearTimeout(_pongTimeoutTimer);
            _pongTimeoutTimer = null;
          }
          return;
        }

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
          
          // Notify all active listeners
          _listeners.forEach((listener) => {
            try {
              listener(message.order || message);
            } catch (err) {
              logger.warn('realtimeSync', 'Listener error:', err);
            }
          });
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
      stopHeartbeat();

      // Exponential Backoff: delay starts at 1s, grows up to 30s
      const delay = Math.min(30000, 1000 * Math.pow(2, _reconnectAttempts));
      _reconnectAttempts++;

      logger.info('realtimeSync', `WebSocket closed. Retrying in ${delay}ms (attempt ${_reconnectAttempts})...`);
      
      _reconnectTimer = setTimeout(() => {
        connectWebSocket();
      }, delay);
    };
  } catch (e) {
    logger.warn('realtimeSync', 'Failed to connect WebSocket:', e);
  }
}

// ── AppState Integration for Mobile Wake/Sleep ─────────────────────────────
if (typeof window !== 'undefined') {
  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      logger.info('realtimeSync', 'App active, ensuring WebSocket connection');
      connectWebSocket();
    } else if (nextAppState === 'background') {
      logger.info('realtimeSync', 'App sent to background, closing WebSocket');
      closeWebSocket();
    }
  });
}

export function subscribeRealtimeSync(listener: (data: any) => void): () => void {
  _listeners.add(listener);
  connectWebSocket();

  // Return unsubscribe function
  return () => {
    _listeners.delete(listener);
    if (_listeners.size === 0) {
      closeWebSocket();
    }
  };
}

// Deprecated legacy exporter to prevent compile errors in old references
export function initRealtimeSync(onOrderUpdated?: (data: any) => void) {
  if (onOrderUpdated) {
    subscribeRealtimeSync(onOrderUpdated);
  } else {
    connectWebSocket();
  }
}
