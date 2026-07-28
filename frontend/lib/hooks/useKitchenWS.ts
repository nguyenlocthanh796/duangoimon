'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiBaseUrl } from '../api/serverConfig';

function getWsUrl(): string {
  const httpUrl = getApiBaseUrl();
  const wsProto = httpUrl.startsWith('https') ? 'wss' : 'ws';
  const hostAndPort = httpUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
  return `${wsProto}://${hostAndPort}/ws/kitchen`;
}

export type OrderEvent =
  | { event: 'new_order'; order: any }
  | { event: 'order_updated'; order: any }
  | { event: 'item_status_changed'; item: { id: string; status: string } }
  | {
      event: 'stock_alert';
      data: { raw_material: string; current_stock: number; min_stock: number };
    };

export function useKitchenWS() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<OrderEvent | null>(null);
  const listenersRef = useRef<Set<(ev: OrderEvent) => void>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        // Reconnect with delay
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data) as OrderEvent;
          setLastEvent(data);
          listenersRef.current.forEach((fn) => fn(data));
        } catch {
          /* ignore parse errors */
        }
      };
    } catch {
      // Failed to connect, try again later
      reconnectTimerRef.current = setTimeout(connect, 5000);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const subscribe = useCallback((fn: (ev: OrderEvent) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { connected, lastEvent, subscribe };
}
