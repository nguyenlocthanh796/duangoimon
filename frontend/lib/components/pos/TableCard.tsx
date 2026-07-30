import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import { scale } from '../../theme/typography';
import { haptic } from '../../haptic';
import { abbreviateAreaName } from '../../utils/area';
import AppText from '../ui/AppText';

export type TableStatus = 'trong' | 'co_khach' | 'da_dat';

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number;
  area?: string;
  guestCount?: number;
  orderTotal?: number;
  orderItemCount?: number;
  orderTime?: string;
  createdAt?: string;
}

interface TableCardProps {
  table: Table;
  onPress: () => void;
  selected?: boolean;
  isWide?: boolean;
  cardWidth?: number;
  onLongPress?: () => void;
  currentTime?: number;
}

const MENU_ITEMS = [
  { key: 'order', label: 'Gọi món', icon: 'clipboard-plus-outline' },
  { key: 'print_temp', label: 'In tạm', icon: 'printer' },
  { key: 'move', label: 'Chuyển bàn', icon: 'table-arrow-right' },
  { key: 'payment', label: 'Thanh toán', icon: 'cash-register' },
  { key: 'close', label: 'Đóng bàn', icon: 'close-circle-outline' },
];

export default React.memo(function TableCard({ table, onPress, selected, isWide, cardWidth, onLongPress, currentTime }: TableCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isOccupied = table.status === 'co_khach';
  const [showMenu, setShowMenu] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);

  // Elapsed timer — recalc on each tick using currentTime from parent
  useEffect(() => {
    if (!isOccupied || !table.createdAt) {
      setElapsedMin(0);
      return;
    }
    const created = new Date(table.createdAt!).getTime();
    setElapsedMin(Math.floor(((currentTime || Date.now()) - created) / 60000));
  }, [isOccupied, table.createdAt, currentTime]);

  // Pulse animation for empty tables
  useEffect(() => {
    if (isOccupied || table.status === 'da_dat') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isOccupied, table.status]);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
      tension: 180,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 120,
    }).start();
  };

  const handlePress = () => {
    haptic.impact('light');
    onPress();
  };

  const handleLongPress = () => {
    haptic.impact('medium');
    if (isOccupied) {
      setShowMenu(true);
      onLongPress?.();
    }
  };

  const handleMenuAction = (key: string) => {
    setShowMenu(false);
    if (key === 'order') handlePress();
  };

  const isReserved = table.status === 'da_dat';

  const borderWidth = selected ? 2 : 1;
  const borderColor = selected
    ? '#F97316' // Cam thương hiệu khi chọn
    : isOccupied
      ? '#FDBA74' // Viền cam nổi bật cho bàn có khách
      : isReserved
        ? '#A5B4FC' // Viền Indigo rực rỡ cho đã đặt
        : '#A7F3D0'; // Viền xanh ngọc Emerald tươi cho bàn trống

  const cardBg = isOccupied
    ? '#FFF7ED' // Nền cam nhạt
    : isReserved
      ? '#EEF2FF' // Nền Indigo nhạt
      : '#FFFFFF'; // Nền trắng thuần cho bàn trống

  const pad = 10;

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onLongPress={handleLongPress}
          delayLongPress={400}
          delayPressIn={0}
          style={{
            width: '100%',
            ...(isWide ? { aspectRatio: 1.05 } : { minHeight: 104 }),
            backgroundColor: cardBg,
            borderRadius: 8, // Fixed 8px border radius (ss.sectionWrap style)
            borderWidth,
            borderColor,
            overflow: 'hidden',
            padding: pad,
            justifyContent: 'space-between',
            ...(isOccupied || selected ? {
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            } : {}),
          }}
        >
          {isOccupied ? (
            /* ── Occupied Card (Kỷ luật Orange) ─────────────────── */
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#FFEDD5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <AppText variant="xs" color="#C2410C">
                      {table.orderTime || 'Đang dùng'}
                    </AppText>
                  </View>
                  {elapsedMin > 0 && (
                    <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FED7AA' }}>
                      <AppText variant="xs" color="#C2410C">
                        ⏱️ {elapsedMin}p
                      </AppText>
                    </View>
                  )}
                </View>
                <View style={{ backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <AppText variant="xs" color="#FFFFFF">
                    {table.orderItemCount || 0} món
                  </AppText>
                </View>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 4 }}>
                <AppText variant="md" weight="normal" color="#0F172A" numberOfLines={1}>
                  {table.name}
                </AppText>
                <AppText variant="xs" color="#64748B" numberOfLines={1}>
                  {abbreviateAreaName(table.area, isWide) || 'Khu vực'}
                </AppText>
              </View>

              <View style={{ alignItems: 'center', backgroundColor: '#FFF7ED', paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#FED7AA' }}>
                <AppText variant="md" weight="bold" color="#EA580C" numberOfLines={1}>
                  {table.orderTotal ? formatPrice(table.orderTotal) : '0đ'}
                </AppText>
              </View>
            </View>
          ) : (
            /* ── Empty Card (Kỷ luật Green) ────────────────────── */
            <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <AppText variant="xs" color="#059669">
                    Trống
                  </AppText>
                </View>
                <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', opacity: pulseAnim }} />
              </View>

              <View style={{ alignItems: 'center' }}>
                <AppText variant="md" weight="normal" color="#0F172A" numberOfLines={1}>
                  {table.name}
                </AppText>
              </View>

              <AppText variant="xs" color="#64748B" numberOfLines={1}>
                {abbreviateAreaName(table.area, isWide) || 'Bàn trống'} · {table.capacity} ghế
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Context menu popover ───────────────────── */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surface.overlay }} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.surface.card, borderRadius: 8, paddingVertical: 8, minWidth: 220, borderWidth: 1, borderColor: '#E5E9F0' }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E9F0' }}>
                <AppText variant="md" weight="bold" color={colors.text.primary}>{table.name}</AppText>
                <AppText variant="sm" color={colors.text.muted}>
                  {table.orderItemCount || 0} món · {table.orderTotal ? formatPrice(table.orderTotal) : '0đ'}
                </AppText>
              </View>
              {MENU_ITEMS.filter(m => isOccupied || m.key === 'order').map((item) => (
                <TouchableOpacity key={item.key} onPress={() => handleMenuAction(item.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E9F0' }}>
                  <AppText variant="md" color={colors.text.secondary}>{item.label}</AppText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowMenu(false)}
                style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}>
                <AppText variant="md" color={colors.text.placeholder}>Đóng</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

