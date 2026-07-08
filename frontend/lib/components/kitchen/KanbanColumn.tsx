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

export default function KanbanColumn({ col, orders, onMarkDone, onMoveForward }: KanbanColumnProps) {
  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      {/* Column header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: col.headerBg, borderRadius: shape.radius.md,
        paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name={col.icon as any} size={18} color={col.headerText} />
          <Text style={{ ...font.label, fontWeight: '800', color: col.headerText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {col.label}
          </Text>
        </View>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: col.dotColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.inverse }}>{orders.length}</Text>
        </View>
      </View>

      {/* Cards */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {orders.map(order => (
          <TicketCard
            key={order.id}
            order={order}
            colStatus={col.id}
            onMarkDone={onMarkDone}
            onMoveForward={onMoveForward}
          />
        ))}

        {orders.length === 0 && col.id === 'cho_xu_ly' && (
          <View style={{
            borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border.strong,
            borderRadius: shape.radius.md, padding: 24, alignItems: 'center', gap: 8, marginTop: 8,
          }}>
            <Image source={ASSETS.images.emptyStateOrders} style={{ width: 120, height: 120 }} resizeMode="contain" />
            <Text style={{ ...font.bodySmall, color: colors.text.muted, textAlign: 'center' }}>
              Không có đơn chờ
            </Text>
          </View>
        )}
        {orders.length === 0 && col.id !== 'cho_xu_ly' && (
          <View style={{
            borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border.strong,
            borderRadius: shape.radius.md, padding: 24, alignItems: 'center', gap: 8, marginTop: 8,
          }}>
            <Icon name={col.emptyIcon as any} size={36} color={colors.border.strong} />
            <Text style={{ ...font.bodySmall, color: colors.text.muted, textAlign: 'center' }}>
              {col.id === 'dang_lam'  ? 'Chưa có món đang làm' : 'Chưa có món hoàn thành'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
