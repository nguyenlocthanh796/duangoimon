import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';

const MEDAL = ['🥇', '🥈', '🥉'];

function formatVND(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k';
  return v + 'đ';
}
function formatFullVND(v: number): string { return v.toLocaleString('vi-VN') + 'đ'; }
function formatDate(dateStr: string): string {
  try { const d = new Date(dateStr); return `${d.getDate()}/${d.getMonth() + 1}`; } catch { return dateStr; }
}
function formatDayLabel(dateStr: string): string {
  try { return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(dateStr).getDay()]; } catch { return ''; }
}

interface DayData { date: string; orders: number; revenue: number; }
export function DailyReportTable({ data }: { data: DayData[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>📋 Chi tiết theo ngày</Text>
      <View style={s.tableHeader}>
        <Text style={[s.thCell, { flex: 1.5 }]}>Ngày</Text>
        <Text style={[s.thCell, { flex: 1, textAlign: 'center' }]}>Đơn</Text>
        <Text style={[s.thCell, { flex: 2, textAlign: 'right' }]}>Doanh thu</Text>
      </View>
      {data.map((d, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: '#FAFAFA' }]}>
          <Text style={[s.tdCell, { flex: 1.5 }]}>{formatDayLabel(d.date)} {formatDate(d.date)}</Text>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={s.ordersBadge}><Text style={s.ordersCount}>{d.orders}</Text></View>
          </View>
          <Text style={[s.revCell, { flex: 2 }]}>{formatFullVND(d.revenue)}</Text>
        </View>
      ))}
    </View>
  );
}

interface TopProduct { name: string; quantity: number; total: number; }
export function TopProductsTable({ data }: { data: TopProduct[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>🏆 Top sản phẩm bán chạy</Text>
      {data.length === 0 ? (
        <View style={s.emptyBox}>
          <Icon name="inbox" size={40} color="#CBD5E1" />
          <Text style={s.emptyText}>Không có dữ liệu</Text>
        </View>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={[s.thCell, { width: 36 }]}>#</Text>
            <Text style={[s.thCell, { flex: 1 }]}>Sản phẩm</Text>
            <Text style={[s.thCell, { width: 60, textAlign: 'center' }]}>SL</Text>
            <Text style={[s.thCell, { width: 90, textAlign: 'right' }]}>Doanh thu</Text>
          </View>
          {data.map((p, i) => (
            <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: '#FAFAFA' }]}>
              <Text style={[s.rankCell, { width: 36 }]}>{i < 3 ? MEDAL[i] : `${i + 1}`}</Text>
              <Text style={[s.tdCell, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
              <View style={{ width: 60, alignItems: 'center' }}>
                <View style={s.qtyBadge}><Text style={s.qtyText}>{p.quantity}</Text></View>
              </View>
              <Text style={[s.revCell, { width: 90 }]}>{formatVND(p.total)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const CARD_SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 };

const s = StyleSheet.create({
  section: { backgroundColor: colors.surface.card, borderRadius: 4, marginHorizontal: 12, marginTop: 14, padding: 16, ...CARD_SHADOW },
  sectionTitle: { ...font.h3, color: colors.text.primary, marginBottom: 14 },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { ...font.bodySmall, color: colors.text.secondary },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1.5, borderBottomColor: colors.border.light, marginBottom: 4 },
  thCell: { ...font.caption, color: colors.text.secondary, fontWeight: '700' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 4 },
  tdCell: { ...font.bodySmall, color: colors.text.primary },
  revCell: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary, textAlign: 'right' },
  rankCell: { ...font.body, fontWeight: '700', color: colors.brand.primary },
  ordersBadge: { backgroundColor: colors.brand.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  ordersCount: { ...font.bodySmall, fontWeight: '700', color: colors.status.info },
  qtyBadge: { backgroundColor: colors.brand.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  qtyText: { ...font.bodySmall, fontWeight: '700', color: colors.brand.primary },
});
