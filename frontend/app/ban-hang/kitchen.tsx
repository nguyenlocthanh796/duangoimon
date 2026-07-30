import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { logger } from '../../lib/logger';
import { colors, palette, font, formatPrice } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useAuth } from '../../lib/context/AuthContext';
import { useSidebar } from '../../lib/context/SidebarContext';
import TicketCard from '../../lib/components/kitchen/TicketCard';
import KanbanColumn from '../../lib/components/kitchen/KanbanColumn';
import { useResponsive } from '../../lib/hooks/useResponsive';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import AppText from '../../lib/components/ui/AppText';
import type { TicketOrder, KanbanStatus } from '../../lib/components/kitchen/TicketCard';
import { subscribeRealtimeSync } from '../../lib/sync/realtimeSync';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (d: Date) =>
  d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options?: Record<string, string>;
}

const COLUMNS: Array<{
  id: KanbanStatus;
  label: string;
  icon: string;
  headerBg: string;
  headerText: string;
  dotColor: string;
  emptyIcon: string;
}> = [
  {
    id: 'cho_xu_ly',
    label: 'Chờ xử lý',
    icon: 'clock-outline',
    headerBg: colors.surface.disabled,
    headerText: colors.text.primary,
    dotColor: colors.status.warning,
    emptyIcon: 'timer-sand',
  },
  {
    id: 'dang_lam',
    label: 'Đang làm',
    icon: 'chef-hat',
    headerBg: colors.brand.primaryBg,
    headerText: colors.brand.primary,
    dotColor: colors.brand.primary,
    emptyIcon: 'silverware-fork-knife',
  },
  {
    id: 'hoan_thanh',
    label: 'Hoàn thành',
    icon: 'check-all',
    headerBg: colors.status.successBg,
    headerText: colors.status.available,
    dotColor: colors.status.available,
    emptyIcon: 'check-circle-outline',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function KitchenScreen() {
  const { openSidebar } = useSidebar();
  const { userRole, isInitialized, token } = useAuth();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [allOrders, setAllOrders] = useState<TicketOrder[]>([]);
  const [colMap, setColMap] = useState<Record<string, KanbanStatus>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<KanbanStatus>('cho_xu_ly');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const isMounted = useRef(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

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
    if (!soundEnabledRef.current) return;
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

      setAllOrders((prev) => {
        const prevIds = new Set(prev.map((o) => o.id));
        const hasNew = active.some((o: any) => !prevIds.has(o.id));
        if (hasNew && prev.length > 0) {
          playSound();
        }
        return active.map((o: any): TicketOrder => ({
          id: o.id,
          table_name: o.table_name || `Bàn ${(o.table_id || '').slice(0, 4)}`,
          table_id: o.table_id,
          created_at: o.created_at,
          note: o.note,
          items: (o.items || []).map((i: any) => ({
            id: i.id,
            product_name: i.product_name || 'Món',
            quantity: i.quantity,
            unit_price: i.unit_price,
            note: i.note,
            options: i.options,
            status: i.status,
          })),
          status: o.status,
        }));
      });
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  }, []);

  // ── WebSocket auto-refresh ──────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchOrders();

    const unsub = subscribeRealtimeSync(() => {
      if (isMounted.current) fetchOrders();
    });

    return () => {
      isMounted.current = false;
      unsub();
    };
  }, [fetchOrders]);

  // ── Column helpers ────────────────────────────────────────────────────────
  const getColStatus = (order: TicketOrder): KanbanStatus => {
    const s = (colMap[order.id] || order.status || '').toLowerCase();
    if (s === 'dang_lam') return 'dang_lam';
    if (s === 'hoan_thanh' || s === 'completed' || s === 'da_thanh_toan') return 'hoan_thanh';
    return 'cho_xu_ly'; // moi, cho_xu_ly, unknown → cho_xu_ly
  };

  const ordersForCol = (colId: KanbanStatus) => allOrders.filter((o) => getColStatus(o) === colId);

  const moveForward = async (orderId: string) => {
    try {
      await api.put(`/ban-hang/orders/${orderId}/status`, { status: 'dang_lam' });
      setColMap((prev) => ({ ...prev, [orderId]: 'dang_lam' }));
      fetchOrders();
    } catch (e: any) {
      logger.error('kitchen', 'Failed to update status:', e);
    }
  };

  const markDone = async (orderId: string) => {
    try {
      await api.put(`/ban-hang/orders/${orderId}/status`, { status: 'hoan_thanh' });
      setColMap((prev) => ({ ...prev, [orderId]: 'hoan_thanh' }));
      fetchOrders();
    } catch (e: any) {
      logger.error('kitchen', 'Failed to update status:', e);
    }
  };

  // Check auth display
  if (
    !isInitialized ||
    (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'kitchen')
  ) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.disabled,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={isWide ? ['top', 'left', 'right', 'bottom'] : []} style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <UnifiedHeader
        icon="fridge-industrial-outline"
        title="Bếp"
        subtitle={isWide ? `Cập nhật lúc ${formatTime(lastUpdate)} · tự động 30s` : undefined}
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: isWide ? 12 : 6, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setSoundEnabled((prev) => !prev)}
              delayPressIn={0}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: soundEnabled ? colors.brand.primary : colors.surface.disabled,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={soundEnabled ? 'bell-ring' : 'bell-off'}
                size={18}
                color={soundEnabled ? colors.text.inverse : colors.text.muted}
              />
            </TouchableOpacity>
            <View
              style={{
                backgroundColor: colors.surface.disabled,
                paddingHorizontal: isWide ? 12 : 8,
                height: isWide ? 44 : 36,
                justifyContent: 'center',
                borderRadius: 8,
              }}
            >
              <AppText variant="sm" weight="normal" color={colors.text.secondary}>
                {allOrders.length} đơn
              </AppText>
            </View>
            <TouchableOpacity
              onPress={fetchOrders}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: colors.surface.disabled,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="refresh" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Mobile Segmented Tab Bar for KDS status */}
      {!isWide && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E9F0',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              borderRadius: 8,
              padding: 3,
            }}
          >
            {COLUMNS.map((col) => {
              const sel = activeTab === col.id;
              const count = ordersForCol(col.id).length;
              return (
                <TouchableOpacity
                  key={col.id}
                  onPress={() => setActiveTab(col.id)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 6,
                    backgroundColor: sel ? '#FFFFFF' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 4,
                    ...(sel ? {
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 1.5,
                      elevation: 1,
                    } : {}),
                  }}
                >
                  <AppText
                    variant="md"
                    weight={sel ? 'bold' : 'normal'}
                    color={sel ? '#0F172A' : '#64748B'}
                  >
                    {col.label}
                  </AppText>
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: sel ? '#F97316' : '#E2E8F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      marginLeft: 4,
                    }}
                  >
                    <AppText
                      variant="xs"
                      weight={sel ? 'bold' : 'normal'}
                      color={sel ? '#FFFFFF' : '#64748B'}
                    >
                      {count}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {isWide ? (
          /* iPad: 3 kanban columns side by side */
          <View
            style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 16}}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                orders={ordersForCol(col.id)}
                onMarkDone={markDone}
                onMoveForward={moveForward}
              />
            ))}
          </View>
        ) : (
          /* Mobile: single column based on activeTab */
          <View style={{ flex: 1, paddingHorizontal: 4, paddingTop: 4, paddingBottom: Math.max(8, insets.bottom) }}>
            {COLUMNS.filter((col) => col.id === activeTab).map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                orders={ordersForCol(col.id)}
                onMarkDone={markDone}
                onMoveForward={moveForward}
              />
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
