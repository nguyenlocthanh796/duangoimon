import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
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
}

export default function TableCard({ table, onPress, selected, isWide }: TableCardProps) {
  const isOccupied = table.status === 'co_khach';
  const p = isWide ? scale(14) : scale(10);
  const nameSize = isWide ? scale(20) : scale(15);
  const badgeSize = isWide ? scale(11) : scale(9);
  const infoSize = isWide ? scale(13) : scale(10);
  const amountSize = isWide ? scale(24) : scale(18);
  const iconSize = isWide ? scale(13) : scale(10);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        borderRadius: 20,
        aspectRatio: 1,
        padding: p,
        justifyContent: isOccupied ? 'space-between' : 'center',
        position: 'relative',

        // Selected ring
        ...(selected
          ? {
              // boxShadow not well supported on RN web, use border
              borderWidth: 3,
              borderColor: '#F59E0B',
              backgroundColor: isOccupied ? undefined : '#F8FAFC',
            }
          : { borderWidth: 0 }),

        // Occupied
        ...(isOccupied && !selected && {
          backgroundColor: '#EA580C',
          // subtle inner shadow via border
        }),

        // Empty
        ...(!isOccupied && !selected && {
          backgroundColor: '#F8FAFC',
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: '#CBD5E1',
        }),
      }}
    >
      {/* Gradient overlay for occupied */}
      {isOccupied && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 20,
            backgroundColor: '#F97316',
            opacity: 0.35,
          }}
        />
      )}

      {isOccupied ? (
        <>
          {/* Top: Name centered */}
          <View style={{ alignItems: 'center', zIndex: 1 }}>
            <Text style={{ fontSize: nameSize, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }} numberOfLines={1}>
              {table.name}
            </Text>
          </View>

          {/* Info rows */}
          <View style={{ gap: isWide ? 6 : 4, zIndex: 1, marginTop: isWide ? 4 : 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWide ? 8 : 5 }}>
              <Icon name="silverware-fork-knife" size={iconSize} color="rgba(255,255,255,0.8)" />
              <Text style={{ fontSize: infoSize, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
                {table.orderItemCount || 0} món
              </Text>
            </View>
            {table.orderTime && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWide ? 8 : 5 }}>
                <Icon name="clock-outline" size={iconSize} color="rgba(255,255,255,0.8)" />
                <Text style={{ fontSize: infoSize, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
                  {table.orderTime}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWide ? 8 : 5 }}>
              <Icon name="account-tie" size={iconSize} color="rgba(255,255,255,0.8)" />
              <Text style={{ fontSize: infoSize, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
                NV. Phục vụ
              </Text>
            </View>
          </View>

          {/* Amount bottom-right */}
          {table.orderTotal ? (
            <View style={{ alignItems: 'center', zIndex: 1 }}>
              <Text style={{
                fontSize: amountSize, fontWeight: '800', color: '#FFFFFF',
                letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
              }}>
                {table.orderTotal.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <>
          {/* Top: name centered */}
          <View style={{
            position: 'absolute', top: p, left: p, right: p,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: isWide ? scale(16) : scale(12), fontWeight: '700', color: '#64748B' }} numberOfLines={1}>
              {table.name}
            </Text>
          </View>

          {/* Center empty state */}
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: isWide ? 4 : 2 }}>
            <Icon name="coffee" size={isWide ? scale(30) : scale(22)} color="#CBD5E1" />
            <Text style={{ fontSize: isWide ? scale(14) : scale(10), fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' }}>
              Trống
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}
