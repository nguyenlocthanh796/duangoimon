import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import AppText from '../ui/AppText';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, palette } from '../../theme';
import { shape } from '../../theme/shape';

export interface TicketOrder {
  id: string;
  table_name: string;
  table_id: string;
  created_at: string;
  note?: string;
  items: TicketItem[];
  status: string;
}

export interface TicketItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options?: Record<string, string>;
  status?: string;
}

export type KanbanStatus = 'cho_xu_ly' | 'dang_lam' | 'hoan_thanh';

interface TicketCardProps {
  order: TicketOrder;
  colStatus: KanbanStatus;
  onMarkDone: (orderId: string) => void;
  onMoveForward: (orderId: string) => void;
}

const getElapsed = (createdAt: string) => {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
};

export default function TicketCard({
  order,
  colStatus,
  onMarkDone,
  onMoveForward,
}: TicketCardProps) {
  const swipeRef = React.useRef<Swipeable>(null);
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isDone = colStatus === 'hoan_thanh';

  const borderColor = isDone
    ? colors.status.success
    : elapsed > 5
      ? colors.status.danger
      : elapsed >= 3
        ? colors.status.warning
        : colors.status.success;

  const timeColor = isDone
    ? colors.status.success
    : elapsed > 5
      ? colors.status.danger
      : elapsed >= 3
        ? colors.status.warning
        : colors.status.success;

  // Pulse animation for >5 min (spec 5.2)
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (elapsed > 5 && !isDone) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [elapsed, isDone]);

  // Swipe gesture renderLeftActions (swipe RIGHT reveals green panel)
  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (isDone) return null;
    const nextLabel = colStatus === 'cho_xu_ly' ? 'Bắt đầu' : 'Xong';
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.status.success,
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingLeft: 20,
          borderRadius: shape.radius.md,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={colStatus === 'cho_xu_ly' ? 'play' : 'check'} size={20} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse}>
            {nextLabel}
          </AppText>
        </View>
      </View>
    );
  };

  const cardContent = (
    <View
      style={{
        backgroundColor: colors.surface.card,
        borderRadius: 8, // Fixed 8px border radius
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDone ? colors.border.success : '#E5E9F0', // Thin border
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        overflow: 'hidden',
        opacity: isDone ? 0.75 : 1,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: isDone ? colors.status.successBg : '#F8FAFC', // Sleek header background
          borderBottomWidth: 1,
          borderBottomColor: '#E5E9F0',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              backgroundColor: isDone ? colors.status.success : colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="table-furniture" size={18} color={colors.text.inverse} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <AppText variant="md" weight="normal" color={colors.text.primary}>{order.table_name}</AppText>
            <AppText variant="sm" color={colors.text.muted}>
              #{order.id.slice(-6).toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Animated.View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 4,
              backgroundColor: isDone
                ? colors.border.success
                : elapsed > 5
                  ? colors.status.dangerBg
                  : elapsed >= 3
                    ? colors.status.warningBg
                    : colors.brand.primaryBg,
              opacity: elapsed > 5 && !isDone ? pulseAnim : 1,
            }}
          >
            <AppText variant="sm" color={timeColor}>
              {getElapsed(order.created_at)}
            </AppText>
          </Animated.View>
          {elapsed > 5 && !isDone && (
            <Animated.View style={{ opacity: pulseAnim }}>
              <AppText variant="xs" color={colors.status.danger} style={{ marginTop: 2, letterSpacing: 0.5 }}>
                QUÁ HẠN
              </AppText>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Items list */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        {order.items
          .filter((i) => i.quantity > 0)
          .map((item) => {
            const itemSt = item.status || '';
            const itemDot = itemSt === 'dang_lam' ? '#1D4ED8' : itemSt === 'hoan_thanh' ? '#16A34A' : itemSt === 'gui_bep' ? '#EA580C' : 'transparent';
            return (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 32,
                      height: 26,
                      borderRadius: 4,
                      backgroundColor: '#F1F5F9', // Minimalist neutral gray badge
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    <AppText variant="sm" color="#0F172A">
                      {item.quantity}x
                    </AppText>
                  </View>
                  {itemDot !== 'transparent' && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: itemDot }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="md" color={colors.text.primary}>{item.product_name}</AppText>
                  {item.note && (
                    <AppText variant="sm" color="#D97706" style={{ marginTop: 2 }}>
                      📝 {item.note}
                    </AppText>
                  )}
                  {item.options && Object.keys(item.options).length > 0 && (
                    <AppText variant="sm" color={colors.text.muted} style={{ marginTop: 1 }}>
                      {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </AppText>
                  )}
                </View>
              </View>
            );
          })}
      </View>

      {order.note && (
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.status.warningBg, borderTopWidth: 1, borderTopColor: palette.amber[200] }}>
          <AppText variant="sm" color={palette.amber[800]}>📋 {order.note}</AppText>
        </View>
      )}

      {/* Action buttons — 52pt (spec 5.1) */}
      {!isDone && (
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.surface.disabled }}>
          {colStatus === 'cho_xu_ly' && (
            <TouchableOpacity
              onPress={() => onMoveForward(order.id)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: 8, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.brand.primary }}
            >
              <Icon name="play" size={18} color={colors.brand.primary} />
              <AppText variant="md" weight="normal" color={colors.brand.primary}>Bắt đầu làm</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onMarkDone(order.id)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: 8, backgroundColor: colors.status.success, borderWidth: 1, borderColor: colors.status.available }}
          >
            <Icon name="check" size={18} color={colors.text.inverse} />
            <AppText variant="md" weight="normal" color={colors.text.inverse}>Xong</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Wrap with Swipeable for gesture (skip for hoan_thanh)
  if (!isDone) {
    const handleSwipe = () => {
      swipeRef.current?.close();
      if (colStatus === 'cho_xu_ly') {
        onMoveForward(order.id);
      } else if (colStatus === 'dang_lam') {
        onMarkDone(order.id);
      }
    };

    return (
      <Swipeable
        ref={swipeRef}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={handleSwipe}
        overshootLeft={false}
        friction={2}
        leftThreshold={60}
      >
        {cardContent}
      </Swipeable>
    );
  }

  return cardContent;
}
