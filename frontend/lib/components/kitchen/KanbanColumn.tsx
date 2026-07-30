import { View, Text, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';
import { shape } from '../../theme/shape';
import TicketCard from './TicketCard';
import type { TicketOrder, KanbanStatus } from './TicketCard';
import { ASSETS } from '../../assets';

interface ColumnDef {
  id: KanbanStatus;
  label: string;
  icon: string;
  headerBg: string;
  headerText: string;
  dotColor: string;
  emptyIcon: string;
}

interface KanbanColumnProps {
  col: ColumnDef;
  orders: TicketOrder[];
  onMarkDone: (orderId: string) => void;
  onMoveForward: (orderId: string) => void;
}

const EMPTY_LABELS: Record<string, string> = {
  cho_xu_ly: 'Chưa có món chờ xử lý',
  dang_lam: 'Chưa có món đang làm',
  hoan_thanh: 'Chưa có món hoàn thành',
};

export default function KanbanColumn({
  col,
  orders,
  onMarkDone,
  onMoveForward,
}: KanbanColumnProps) {
  return (
    <View style={{ flex: 1, minHeight: '100%' }}>
      {/* Column header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: col.headerBg,
          borderRadius: shape.radius.md,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 10,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name={col.icon as any} size={18} color={col.headerText} />
          <Text
            style={{
              ...font.smBold,
              color: col.headerText,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {col.label}
          </Text>
        </View>
        <View
          style={{
            width: 24, height: 24, borderRadius: shape.radius.full,
            backgroundColor: col.dotColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...font.sm, fontWeight: '600', color: colors.text.inverse }}>
            {orders.length}
          </Text>
        </View>
      </View>

      {/* Cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
      >
        {orders.map((order) => (
          <TicketCard
            key={order.id}
            order={order}
            colStatus={col.id}
            onMarkDone={onMarkDone}
            onMoveForward={onMoveForward}
          />
        ))}

        {orders.length === 0 && (
          <View
            style={{
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: '#D1D5DB',
              borderRadius: 12,
              minHeight: 120,
              backgroundColor: '#F9FAFB',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8,
              padding: 16,
            }}
          >
            <Icon name={col.emptyIcon as any} size={28} color="#9CA3AF" />
            <Text style={{ ...font.sm, color: '#9CA3AF', textAlign: 'center' }}>
              {EMPTY_LABELS[col.id] || 'Không có đơn'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
