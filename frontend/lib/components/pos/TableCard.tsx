import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Modal, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import { scale } from '../../theme/typography';
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
}

interface TableCardProps {
  table: Table;
  onPress: () => void;
  selected?: boolean;
  isWide?: boolean;
  cardWidth?: number;
  onLongPress?: () => void;
}

const MENU_ITEMS = [
  { key: 'order', label: 'Gọi món', icon: 'clipboard-plus-outline' },
  { key: 'print_temp', label: 'In tạm', icon: 'printer' },
  { key: 'move', label: 'Chuyển bàn', icon: 'table-arrow-right' },
  { key: 'payment', label: 'Thanh toán', icon: 'cash-register' },
  { key: 'close', label: 'Đóng bàn', icon: 'close-circle-outline' },
];

export default React.memo(function TableCard({ table, onPress, selected, isWide, cardWidth, onLongPress }: TableCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isOccupied = table.status === 'co_khach';
  const [showMenu, setShowMenu] = useState(false);

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

  const handleLongPress = () => {
    if (isWide && isOccupied) {
      setShowMenu(true);
      onLongPress?.();
    }
  };

  const handleMenuAction = (key: string) => {
    setShowMenu(false);
    if (key === 'order') onPress();
  };

  const cardW = cardWidth || 150;
  
  // Title font size optimized for mobile POS card layout: 18px on iPad, 16px on iPhone
  const titleFontSize = isWide ? 18 : 16;
  // Price font size: strict 14px (md) bold across all card sizes
  const priceFontSize = 14;
  
  const titleToken = {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: titleFontSize,
    fontWeight: '700' as const,
    lineHeight: Math.round(titleFontSize * 1.25),
  };
  
  const priceToken = {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: priceFontSize,
    fontWeight: '700' as const,
    lineHeight: Math.round(priceFontSize * 1.25),
  };

  const pad = isWide ? 12 : 10;
  const sm = 'sm';

  const isReserved = table.status === 'da_dat';

  const borderColor = selected
    ? '#EA580C'
    : isOccupied
      ? '#F97316'
      : isReserved
        ? '#2563EB'
        : '#10B981';

  const cardBg = isOccupied
    ? '#FFF7ED'
    : isReserved
      ? '#EFF6FF'
      : '#F0FDF4';

  const abbreviateArea = (areaName?: string) => {
    if (!areaName) return '';
    if (isWide) return areaName;
    // Map of common area abbreviations
    const lower = areaName.toLowerCase();
    if (lower.includes('trong nhà') || lower.includes('trong nha')) return 'T.Nhà';
    if (lower.includes('ngoài trời') || lower.includes('ngoai troi')) return 'N.Trời';
    if (lower.includes('vip')) return 'VIP';
    return areaName;
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onLongPress={handleLongPress}
          delayLongPress={400}
          delayPressIn={0}
          style={{
            width: '100%',
            aspectRatio: isWide ? 1 : 0.95,
            backgroundColor: cardBg,
            borderRadius: shape.radius.lg,
            borderWidth: 1.5,
            borderColor,
            overflow: 'hidden',
            padding: pad,
            justifyContent: 'space-between',
            ...(isOccupied || selected ? shape.shadow.sm : {}),
          }}
        >
          {isOccupied ? (
            /* ── Occupied Card (Kỷ luật Orange) ─────────────────── */
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#FDBA74', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <AppText variant="sm" weight="bold" color="#9A3412">
                    {table.orderTime || 'Đang dùng'}
                  </AppText>
                </View>
                <View style={{ backgroundColor: '#EA580C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <AppText variant="sm" weight="bold" color="#FFFFFF">
                    {table.orderItemCount || 0} món
                  </AppText>
                </View>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 4 }}>
                <AppText style={titleToken} numberOfLines={1} color="#1C1917" adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {table.name}
                </AppText>
                <AppText variant="sm" color="#78350F" numberOfLines={1}>
                  {abbreviateArea(table.area) || 'Khu vực'}
                </AppText>
              </View>

              <View style={{ alignItems: 'center', backgroundColor: '#FFEDD5', paddingVertical: 4, borderRadius: 6 }}>
                <AppText style={priceToken} numberOfLines={1} color="#EA580C" adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {table.orderTotal ? formatPrice(table.orderTotal) : '0đ'}
                </AppText>
              </View>
            </View>
          ) : (
            /* ── Empty Card (Kỷ luật Green) ────────────────────── */
            <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <AppText variant="sm" weight="bold" color="#065F46">
                    Sẵn sàng
                  </AppText>
                </View>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
              </View>

              <View style={{ alignItems: 'center' }}>
                <Icon name="table-furniture" size={isWide ? 26 : 22} color="#059669" />
                <AppText style={titleToken} numberOfLines={1} color="#064E3B" adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {table.name}
                </AppText>
              </View>

              <AppText variant="sm" color="#047857" numberOfLines={1}>
                {abbreviateArea(table.area) || 'Bàn trống'} · {table.capacity}g
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Context menu popover ───────────────────── */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surface.overlay }} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.surface.card, borderRadius: shape.radius.xl, paddingVertical: 8, minWidth: 200, ...shape.shadow.lg }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light }}>
                <AppText variant="md" weight="bold" color={colors.text.primary}>{table.name}</AppText>
                <AppText variant="sm" color={colors.text.muted}>
                  {table.orderItemCount || 0} món · {table.orderTotal ? formatPrice(table.orderTotal) : '0đ'}
                </AppText>
              </View>
              {MENU_ITEMS.filter(m => isOccupied || m.key === 'order').map((item) => (
                <TouchableOpacity key={item.key} onPress={() => handleMenuAction(item.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
                  <Icon name={item.icon as any} size={20} color={colors.text.muted} />
                  <AppText variant="md" color={colors.text.secondary}>{item.label}</AppText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowMenu(false)}
                style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border.light }}>
                <AppText variant="md" color={colors.text.placeholder}>Đóng</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

