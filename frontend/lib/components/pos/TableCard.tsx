import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, shape } from '../../theme';
import { scale } from '../../theme/typography';

export type TableStatus = 'trong' | 'co_khach' | 'da_dat';

export interface Table {
  id: string; name: string; status: TableStatus;
  capacity: number; area?: string; guestCount?: number; orderTotal?: number;
  orderItemCount?: number;
  orderTime?: string;
}

interface TableCardProps {
  table: Table;
  onPress: () => void;
  selected?: boolean;
  isWide: boolean;
  cardWidth: number;
}

export default function TableCard({ table, onPress, selected, isWide, cardWidth }: TableCardProps) {
  const isOccupied = table.status === 'co_khach';
  const f = Math.min(1.15, Math.max(0.52, cardWidth / 210));

  // Sizes auto-scale with card width
  const topPad = 8 * f;
  const sidePad = Math.max(6, 12 * f);
  const nameSize = 24 * f;
  const metaSize = 16 * f;
  const amountSize = 38 * f;
  const iconSize = 15 * f;

  const cardRadius = 16; // Standard 2xl radius (16px)

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        borderRadius: cardRadius,
        aspectRatio: isOccupied ? 0.9 : 1,
        paddingTop: topPad,
        paddingBottom: topPad,
        paddingHorizontal: sidePad,
        position: 'relative',

        ...(selected
          ? {
              borderWidth: 3,
              borderColor: palette.amber[600],
              backgroundColor: isOccupied ? colors.brand.primary : colors.surface.app,
            }
          : { borderWidth: 0 }),

        ...(isOccupied && !selected && {
          backgroundColor: colors.brand.primary,
        }),

        ...(!isOccupied && !selected && {
          backgroundColor: colors.surface.app,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colors.border.default,
        }),
      }}
    >
      {/* Gradient overlay */}
      {isOccupied && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: cardRadius, backgroundColor: colors.brand.primaryHover, opacity: 0.15,
        }} />
      )}

      {isOccupied ? (
        /* ── Occupied: Top Name, Center Amount, Bottom Meta ── */
        <View style={{ flex: 1, zIndex: 1, justifyContent: 'space-between' }}>
          {/* Top: Name */}
          <Text style={{
            fontSize: nameSize, fontWeight: '800', color: colors.text.inverse,
            letterSpacing: -0.5, textAlign: 'center',
          }} numberOfLines={1}>
            {table.name}
          </Text>

          {/* Center: Amount */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text numberOfLines={1} style={{
              fontSize: amountSize, fontWeight: '900', color: colors.text.inverse,
              letterSpacing: -1, textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
            }}>
              {table.orderTotal ? table.orderTotal.toLocaleString('vi-VN') + '₫' : '0₫'}
            </Text>
          </View>

          {/* Bottom: Meta (left = items, right = time) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left bottom: Items count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="silverware-fork-knife" size={iconSize} color={colors.text.brandLight} />
              <Text style={{ fontSize: metaSize, fontWeight: '600', color: colors.text.brandLight }}>
                {table.orderItemCount || 0} món
              </Text>
            </View>

            {/* Right bottom: Time */}
            {table.orderTime ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="clock-outline" size={iconSize} color={colors.text.brandLight} />
                <Text style={{ fontSize: metaSize, fontWeight: '600', color: colors.text.brandLight }}>
                  {table.orderTime}
                </Text>
              </View>
            ) : (
              <View />
            )}
          </View>
        </View>
      ) : (
        /* ── Empty ── */
        <View style={{ flex: 1, zIndex: 1, justifyContent: 'center', alignItems: 'center', gap: isWide ? 6 : 4 }}>
          <Icon name="coffee" size={isWide ? scale(32) : scale(24)} color={colors.icon.muted} />
          <Text style={{
            fontSize: isWide ? scale(16) : scale(13), fontWeight: '700', color: colors.text.secondary,
            textAlign: 'center',
          }} numberOfLines={1}>
            {table.name}
          </Text>
          <Text style={{
            fontSize: isWide ? scale(12) : scale(9), fontWeight: '700', color: colors.text.muted,
            letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center',
          }}>
            Trống
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
