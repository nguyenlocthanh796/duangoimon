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
  
  // Title can be slightly larger
  const titleFontSize = cardW >= 160 ? scale(22) : cardW >= 130 ? scale(18) : scale(15);
  // Price needs to be smaller to fit long numbers like "1.500.000 đ"
  const priceFontSize = cardW >= 160 ? scale(18) : cardW >= 130 ? scale(15) : scale(13);
  
  const titleToken = {
    fontFamily: `${'BeVietnamPro'}_600SemiBold`,
    fontSize: titleFontSize,
    fontWeight: '600' as const,
    lineHeight: Math.round(titleFontSize * 1.25),
  };
  
  const priceToken = {
    fontFamily: `${'BeVietnamPro'}_600SemiBold`,
    fontSize: priceFontSize,
    fontWeight: '600' as const,
    lineHeight: Math.round(priceFontSize * 1.25),
  };

  const pad = isWide ? 12 : 10;
  const sm = 'sm';

  const borderColor = selected
    ? colors.brand.primary
    : isOccupied
      ? colors.border.brand
      : colors.border.default;

  const cardBg = isOccupied
    ? colors.brand.primaryBg
    : '#F2F4F8';

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
          style={{
            width: '100%',
            aspectRatio: isWide ? 1 : 0.95,
            backgroundColor: cardBg,
            borderRadius: shape.radius.lg,
            borderWidth: 1.5,
            borderColor,
            overflow: 'hidden',
            padding: pad,
            ...(isOccupied || selected ? shape.shadow.sm : {}),
          }}
        >
          {isOccupied ? (
            /* ── Occupied ─────────────────────────── */
            <View style={{ flex: 1 }}>
              {/* Top row: time (left) · items (right) · dot */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Time — left aligned */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {table.orderTime && (
                    <>
                      <Icon name="clock-outline" size={11} color={colors.text.muted} />
                      <AppText variant={sm} color={colors.text.muted} numberOfLines={1}>{table.orderTime}</AppText>
                    </>
                  )}
                </View>

                {/* Items + dot — right aligned */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant={sm} color={colors.text.secondary} numberOfLines={1}>
                    {table.orderItemCount || 0}{isWide ? ' món' : ''}
                  </AppText>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: colors.status.available,
                    borderWidth: 1.5, borderColor: colors.surface.card,
                  }} />
                </View>
              </View>

              {/* Center: table name — big & bold */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <AppText style={titleToken} numberOfLines={1} color={colors.text.primary} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {table.name}
                </AppText>
              </View>

              {/* Bottom: price — big & brand color */}
              <View style={{ alignItems: 'center' }}>
                <AppText style={priceToken} numberOfLines={1} color={colors.brand.primary} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                  {table.orderTotal ? formatPrice(table.orderTotal) : '0đ'}
                </AppText>
              </View>
            </View>
          ) : (
            /* ── Empty / Available ────────────────── */
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Icon name="table-furniture" size={isWide ? 24 : 20} color={colors.icon.muted} />
              <AppText style={titleToken} numberOfLines={1} color={colors.text.secondary} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                {table.name}
              </AppText>
              <AppText variant={sm} color={colors.text.placeholder} numberOfLines={1}>
                Trống
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

