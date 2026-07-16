import { View } from 'react-native';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import AppText from '../ui/AppText';

const MEDAL = ['🥇', '🥈', '🥉'];

function formatVND(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k';
  return v + 'đ';
}
function formatFullVND(v: number): string {
  return v.toLocaleString('vi-VN') + 'đ';
}
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return dateStr;
  }
}
function formatDayLabel(dateStr: string): string {
  try {
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(dateStr).getDay()];
  } catch {
    return '';
  }
}

interface DayData {
  date: string;
  orders: number;
  revenue: number;
}
export function DailyReportTable({ data }: { data: DayData[] }) {
  return (
    <View style={s.section}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
        <AppText variant="large" style={{color: colors.text.primary}}>📋 Chi tiết theo ngày</AppText>
      </View>
      <View style={s.tableHeader}>
        <AppText variant="small" style={[s.thCell, { flex: 1.5 }]}>Ngày</AppText>
        <AppText variant="small" style={[s.thCell, { flex: 1, textAlign: 'center' }]}>Đơn</AppText>
        <AppText variant="small" style={[s.thCell, { flex: 2, textAlign: 'right' }]}>Doanh thu</AppText>
      </View>
      {data.map((d, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: colors.surface.app }]}>
          <AppText variant="base" style={[s.tdCell, { flex: 1.5 }]}>
            {formatDayLabel(d.date)} {formatDate(d.date)}
          </AppText>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={s.ordersBadge}>
              <AppText variant="small" style={s.ordersCount}>{d.orders}</AppText>
            </View>
          </View>
          <AppText variant="base" style={[s.revCell, { flex: 2 }]}>{formatFullVND(d.revenue)}</AppText>
        </View>
      ))}
    </View>
  );
}

interface TopProduct {
  name: string;
  quantity: number;
  total: number;
}
export function TopProductsTable({ data }: { data: TopProduct[] }) {
  return (
    <View style={s.section}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
        <AppText variant="large" style={{color: colors.text.primary}}>🏆 Top sản phẩm bán chạy</AppText>
      </View>
      {data.length === 0 ? (
        <View style={s.emptyBox}>
          <Icon name="inbox" size={40} color="#CBD5E1" />
          <AppText variant="base" style={s.emptyText}>Không có dữ liệu</AppText>
        </View>
      ) : (
        <>
          <View style={s.tableHeader}>
            <AppText variant="small" style={[s.thCell, { width: 36 }]}>#</AppText>
            <AppText variant="small" style={[s.thCell, { flex: 1 }]}>Sản phẩm</AppText>
            <AppText variant="small" style={[s.thCell, { width: 60, textAlign: 'center' }]}>SL</AppText>
            <AppText variant="small" style={[s.thCell, { width: 90, textAlign: 'right' }]}>Doanh thu</AppText>
          </View>
          {data.map((p, i) => (
            <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: colors.surface.app }]}>
              <AppText variant="base" style={[s.rankCell, { width: 36 }]}>{i < 3 ? MEDAL[i] : `${i + 1}`}</AppText>
              <AppText variant="base" style={[s.tdCell, { flex: 1 }]} numberOfLines={1}>
                {p.name}
              </AppText>
              <View style={{ width: 60, alignItems: 'center' }}>
                <View style={s.qtyBadge}>
                  <AppText variant="small" style={s.qtyText}>{p.quantity}</AppText>
                </View>
              </View>
              <AppText variant="base" style={[s.revCell, { width: 90 }]}>{formatVND(p.total)}</AppText>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    backgroundColor: colors.surface.card,
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 8,
    padding: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  emptyText: { color: colors.text.secondary },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    marginBottom: 4,
  },
  thCell: { color: colors.text.secondary, fontWeight: '600' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 0,
  },
  tdCell: { color: colors.text.primary },
  revCell: { fontWeight: '600', color: colors.text.primary, textAlign: 'right' },
  rankCell: { fontWeight: '600', color: colors.brand.primary },
  ordersBadge: {},
  ordersCount: { fontWeight: '600', color: colors.status.info },
  qtyBadge: {},
  qtyText: { fontWeight: '600', color: colors.brand.primary },
});
