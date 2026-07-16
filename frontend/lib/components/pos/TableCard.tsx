import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, formatPrice } from '../../theme';
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
}

export default function TableCard({ table, onPress, selected, isWide }: TableCardProps) {
  const isOccupied = table.status === 'co_khach';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        width: '100%',
        aspectRatio: isWide ? 1.1 : 1,
        backgroundColor: colors.surface.card,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: selected
          ? colors.brand.primary
          : isOccupied
            ? palette.blue[100]
            : colors.border.default,
        overflow: 'hidden',
        /* boxShadow removed */
      }}
    >
      {isOccupied ? (
        /* 🟧 Occupied 🟧 */
        <View style={{ flex: 1, padding: isWide ? 12 : 8, zIndex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <AppText variant="small" color={palette.blue[600]} weight="bold">
              {table.orderTime || '10:00'}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="account" size={14} color={colors.text.muted} />
              <AppText variant="small" color={colors.text.muted}>{table.guestCount || 0}</AppText>
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <AppText variant={isWide ? 'large' : 'medium'} weight="bold" color={palette.slate[800]} numberOfLines={1}>
              {table.name}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <AppText variant="small" color={colors.text.muted}>
              {table.orderItemCount || 0} món
            </AppText>
            <AppText variant="small" weight="bold" color={colors.brand.primary}>
              {table.orderTotal ? formatPrice(table.orderTotal) : '0đ'}
            </AppText>
          </View>
        </View>
      ) : (
        /* 🟦 Empty 🟦 */
        <View
          style={{
            flex: 1,
            zIndex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: isWide ? 6 : 4,
          }}
        >
          <Icon name="coffee" size={isWide ? 28 : 20} color={colors.icon.muted} />
          <AppText variant={isWide ? 'medium' : 'base'} color={colors.text.secondary} numberOfLines={1}>
            {table.name}
          </AppText>
          <AppText variant="small" weight="bold" color={colors.text.muted} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            Trống
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
}
