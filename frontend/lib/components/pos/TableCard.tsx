import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, COLORS, scale } from '../../theme';

export type TableStatus = 'trong' | 'co_khach' | 'da_dat';

export interface Table {
  id: string; name: string; status: TableStatus;
  capacity: number; area?: string; guestCount?: number; orderTotal?: number;
  orderItemCount?: number;
  orderTime?: string;
}

const STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string; border: string }> = {
  trong: { label: 'Trống', color: '#10B981', bg: '#F0FDF4', border: '#DCFCE7' },
  co_khach: { label: 'Có khách', color: '#F97316', bg: '#FFF7ED', border: '#FFEDD5' },
  da_dat: { label: 'Đã đặt', color: '#3B82F6', bg: '#EFF6FF', border: '#DBEAFE' },
};

interface TableCardProps {
  table: Table;
  onPress: () => void;
  selected?: boolean;
  isWide: boolean;
}

export default function TableCard({ table, onPress, selected, isWide }: TableCardProps) {
  const cfg = STATUS_CONFIG[table.status];
  const cardPadding = scale(14);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        borderRadius: 12,
        backgroundColor: selected
          ? (table.status === 'co_khach' ? '#FFF7ED' : '#F8FAFC')
          : (table.status === 'co_khach' ? '#FFFDFA' : '#FFFFFF'),
        borderWidth: selected ? 2.5 : 1.5,
        borderColor: selected ? '#F97316' : (table.status === 'co_khach' ? '#FFE8CC' : 'rgba(0, 0, 0, 0.06)'),
        aspectRatio: 1,
        padding: cardPadding,
        justifyContent: 'space-between',
        boxShadow: selected
          ? '0 6px 12px -2px rgba(249,115,22,0.15), 0 3px 6px -3px rgba(249,115,22,0.15)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
        elevation: selected ? 4 : 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Accent left bar */}
      <View style={{
        position: 'absolute', left: 0, top: cardPadding, bottom: cardPadding, width: scale(3),
        borderRadius: 2, backgroundColor: cfg.color, opacity: selected ? 1 : 0.5,
      }} />

      {/* Top Selection Highlight Bar */}
      {selected && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: scale(4), backgroundColor: '#F97316' }} />
      )}

      {/* Top Row: Table Name & Status Pill */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 6, paddingLeft: 6 }}>
          <Text style={{ fontSize: scale(17), fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
            {table.name}
          </Text>
        </View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cfg.bg,
          paddingHorizontal: scale(8),
          paddingVertical: scale(4),
          borderRadius: 20,
          borderWidth: 1,
          borderColor: cfg.border,
        }}>
          <View style={{ width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: cfg.color, marginRight: 5 }} />
          <Text style={{ fontSize: scale(10), fontWeight: '700', color: cfg.color }}>
            {cfg.label}
          </Text>
        </View>
      </View>

      {/* Occupied State vs Empty State */}
      {table.status === 'co_khach' && table.orderTotal ? (
        <>
          <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 6, marginVertical: 4 }}>
            <Text style={{ fontSize: scale(22), fontWeight: '900', color: '#EA580C', letterSpacing: -0.3 }}>
              {table.orderTotal.toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(249,115,22,0.12)',
            paddingTop: scale(8),
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 6,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="silverware-fork-knife" size={scale(12)} color="#64748B" />
              <Text style={{ fontSize: scale(11), color: '#475569', fontWeight: '700' }}>
                {table.orderItemCount || 0} món
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="clock-outline" size={scale(12)} color="#64748B" />
              <Text style={{ fontSize: scale(11), color: '#475569', fontWeight: '600' }}>
                {table.orderTime || ''}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 6 }}>
            <Text style={{ fontSize: scale(13), color: '#94A3B8', fontWeight: '600', marginBottom: 4 }}>
              {table.status === 'da_dat' ? '📋 Chờ khách' : '✅ Sẵn sàng'}
            </Text>
            {table.status === 'da_dat' && (
              <Text style={{ fontSize: scale(11), color: '#64748B', fontWeight: '500' }}>
                {table.capacity} khách
              </Text>
            )}
          </View>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: 'rgba(0, 0, 0, 0.05)',
            paddingTop: scale(8),
            paddingLeft: 6,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 4 }}>
              <Icon name="map-marker-outline" size={scale(12)} color="#94A3B8" />
              <Text style={{ fontSize: scale(11), color: '#64748B', fontWeight: '600' }} numberOfLines={1}>
                {table.area || 'Chưa có'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="account-outline" size={scale(12)} color="#94A3B8" />
              <Text style={{ fontSize: scale(11), color: '#64748B', fontWeight: '600' }}>
                {table.capacity}
              </Text>
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}
