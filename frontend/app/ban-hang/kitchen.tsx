import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { colors, palette, COLORS, font, formatPrice, shape } from '../../lib/theme';
import { useAuth } from '../../lib/context/AuthContext';
import { useSidebar } from '../../lib/context/SidebarContext';
import TicketCard from '../../lib/components/kitchen/TicketCard';
import KanbanColumn from '../../lib/components/kitchen/KanbanColumn';
import type { TicketOrder, KanbanStatus } from '../../lib/components/kitchen/TicketCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string; product_name: string; quantity: number; unit_price: number;
  note?: string; options?: Record<string, string>;
}

const COLUMNS: Array<{
  id: KanbanStatus; label: string; icon: string;
  headerBg: string; headerText: string; dotColor: string; emptyIcon: string;
}> = [
  { id: 'cho_xu_ly',  label: 'Chờ xử lý',  icon: 'clock-outline',   headerBg: colors.surface.disabled, headerText: colors.text.primary, dotColor: colors.status.warning, emptyIcon: 'timer-sand' },
  { id: 'dang_lam',   label: 'Đang làm',    icon: 'chef-hat', headerBg: colors.brand.primary + '10', headerText: colors.brand.primary, dotColor: colors.brand.primary, emptyIcon: 'silverware-fork-knife' },
  { id: 'hoan_thanh', label: 'Hoàn thành',  icon: 'check-all',          headerBg: colors.status.success + '10', headerText: colors.status.available, dotColor: colors.status.available, emptyIcon: 'check-circle-outline' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function KitchenScreen() {
  const { openSidebar } = useSidebar();
  const { userRole, isInitialized } = useAuth();
  const router = useRouter();

  const [allOrders, setAllOrders]   = useState<TicketOrder[]>([]);
  const [colMap, setColMap]         = useState<Record<string, KanbanStatus>>({});
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [wsStatus, setWsStatus]     = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auth Guard logic ──
  useEffect(() => {
    if (isInitialized) {
      if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'kitchen') {
        if (userRole === 'cashier') {
          router.replace('/ban-hang');
        } else if (userRole === 'accountant') {
          router.replace('/ke-toan');
        } else {
          router.replace('/login');
        }
      }
    }
  }, [isInitialized, userRole]);

  const playSound = () => {
    if (typeof Audio !== 'undefined') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
      audio.volume = 0.8;
      audio.play().catch(() => {});
    }
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.getOrders();
      const active = data.filter((o: any) => o.status !== 'da_thanh_toan' && o.status !== 'da_huy');
      
      setAllOrders(prev => {
        const prevIds = new Set(prev.map(o => o.id));
        const hasNew = active.some((o: any) => !prevIds.has(o.id));
        if (hasNew && prev.length > 0) {
          playSound();
        }
        return active.map((o: any): TicketOrder => ({
          id: o.id,
          table_name: o.table_name || `Bàn ${(o.table_id || '').slice(0, 4)}`,
          table_id: o.table_id, created_at: o.created_at, note: o.note,
          items: (o.items || []).map((i: any) => ({
            id: i.id, product_name: i.product_name || 'Món',
            quantity: i.quantity, unit_price: i.unit_price,
            note: i.note, options: i.options,
          })),
          status: o.status,
        }));
      });
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  }, []);

  // ── Auto-refresh + WebSocket ──────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchOrders();

    const pollId = setInterval(fetchOrders, 30000);

    const connectWs = () => {
      if (!isMounted.current) return;
      setWsStatus('connecting');
      try {
        const socket = new WebSocket('ws://localhost:8000/ws/kitchen');
        socket.onopen = () => {
          if (isMounted.current) setWsStatus('connected');
        };
        socket.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === 'new_order' || msg.event === 'order_updated') fetchOrders();
          } catch {}
        };
        socket.onerror = () => {
          if (isMounted.current) setWsStatus('disconnected');
        };
        socket.onclose = () => {
          if (isMounted.current) {
            setWsStatus('disconnected');
            if (wsRef.current === socket) {
              reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
            }
          }
        };
        wsRef.current = socket;
      } catch {
        if (isMounted.current) {
          setWsStatus('disconnected');
          reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
        }
      }
    };
    connectWs();

    return () => {
      isMounted.current = false;
      clearInterval(pollId);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, [fetchOrders]);

  // ── Column helpers ────────────────────────────────────────────────────────
  const getColStatus = (order: TicketOrder): KanbanStatus => {
    const status = (colMap[order.id] || order.status) as string;
    if (status === 'dang_lam') return 'dang_lam';
    if (status === 'hoan_thanh' || status === 'completed') return 'hoan_thanh';
    return 'cho_xu_ly';
  };

  const ordersForCol = (colId: KanbanStatus) =>
    allOrders.filter(o => getColStatus(o) === colId);

  const moveForward = async (orderId: string) => {
    try {
      await api.put(`/ban-hang/orders/${orderId}/status`, { status: 'dang_lam' });
      setColMap(prev => ({ ...prev, [orderId]: 'dang_lam' }));
      fetchOrders();
    } catch (e: any) {
      console.error("Failed to update status:", e);
    }
  };

  const markDone = async (orderId: string) => {
    try {
      await api.put(`/ban-hang/orders/${orderId}/status`, { status: 'hoan_thanh' });
      setColMap(prev => ({ ...prev, [orderId]: 'hoan_thanh' }));
      fetchOrders();
    } catch (e: any) {
      console.error("Failed to update status:", e);
    }
  };

  // Check auth display
  if (!isInitialized || (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'kitchen')) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.disabled }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface.card,
        borderBottomWidth: 1, borderBottomColor: colors.border.default,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: palette.slate[900], shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar}
            style={{ width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="menu" size={18} color={colors.icon.default} />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ ...font.h3, color: colors.text.primary }}>Bếp 🍳</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
                backgroundColor: wsStatus === 'connected' ? colors.status.successBg : wsStatus === 'connecting' ? colors.brand.primaryBg : colors.surface.danger,
                borderWidth: 1,
                borderColor: wsStatus === 'connected' ? colors.border.success : wsStatus === 'connecting' ? colors.border.brand : palette.red[300],
              }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: wsStatus === 'connected' ? colors.status.success : wsStatus === 'connecting' ? colors.brand.primary : colors.status.danger,
                }} />
                <Text style={{
                  ...font.micro, fontWeight: '700',
                  color: wsStatus === 'connected' ? palette.green[800] : wsStatus === 'connecting' ? colors.text.brandDark : palette.red[800],
                }}>
                  {wsStatus === 'connected' ? 'WS ONLINE' : wsStatus === 'connecting' ? 'WS CONNECTING...' : 'WS OFFLINE'}
                </Text>
              </View>
            </View>
            <Text style={{ ...font.caption, color: colors.text.muted }}>
              Cập nhật lúc {formatTime(lastUpdate)} · tự động 30s
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.brand.primaryBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: shape.radius.md, borderWidth: 1, borderColor: colors.border.brand }}>
            <Text style={{ ...font.tab, color: colors.brand.primary }}>
              {allOrders.length} đơn
            </Text>
          </View>
          <TouchableOpacity onPress={fetchOrders}
            style={{ width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="refresh" size={18} color={colors.icon.default} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 8, paddingTop: 12, gap: 8 }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            orders={ordersForCol(col.id)}
            onMarkDone={markDone}
            onMoveForward={moveForward}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
