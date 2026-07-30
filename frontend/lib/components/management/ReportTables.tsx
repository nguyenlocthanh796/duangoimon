import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, formatVND, ss } from '../../theme';
import AppText from '../ui/AppText';

const MEDAL = ['🥇', '🥈', '🥉'];

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
    <View style={ss.sectionWrap}>
      <View style={ss.sectionHeader}>
        <AppText variant="md" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
          CHI TIẾT DOANH THU THEO NGÀY ({data.length})
        </AppText>
      </View>
      <View style={s.tableHeader}>
        <AppText variant="md" color="#64748B" style={{ flex: 1.5 }}>Ngày</AppText>
        <AppText variant="md" color="#64748B" style={{ flex: 1, textAlign: 'center' }}>Số đơn / AOV</AppText>
        <AppText variant="md" color="#64748B" style={{ flex: 1.5, textAlign: 'right' }}>Doanh thu</AppText>
      </View>
      {data.map((d, i) => {
        const dayLabel = formatDayLabel(d.date);
        const aov = d.orders && d.revenue ? Math.round(d.revenue / d.orders) : 0;
        return (
          <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: '#F8FAFC' }]}>
            <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 28, height: 20, borderRadius: 4, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="md" color="#475569" style={{ fontSize: 12 }}>{dayLabel || 'NG'}</AppText>
              </View>
              <AppText variant="md" color="#0F172A">{formatDate(d.date)}</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="md" color="#334155">{d.orders} đơn</AppText>
              {aov > 0 && (
                <AppText variant="md" color="#64748B" style={{ fontSize: 12 }}>AOV {formatVND(aov)}</AppText>
              )}
            </View>
            <AppText variant="md" weight="bold" color={colors.brand.primary} style={{ flex: 1.5, textAlign: 'right' }}>
              {formatFullVND(d.revenue)}
            </AppText>
          </View>
        );
      })}
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
    <View style={ss.sectionWrap}>
      <View style={ss.sectionHeader}>
        <AppText variant="md" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
          TOP SẢN PHẨM BÁN CHẠY NHẤT ({data.length})
        </AppText>
      </View>
      {data.length === 0 ? (
        <View style={s.emptyBox}>
          <AppText variant="md" color={colors.text.muted}>Không có dữ liệu bán hàng</AppText>
        </View>
      ) : (
        <>
          <View style={s.tableHeader}>
            <AppText variant="md" color="#64748B" style={{ width: 36 }}>Hạng</AppText>
            <AppText variant="md" color="#64748B" style={{ flex: 1 }}>Sản phẩm</AppText>
            <AppText variant="md" color="#64748B" style={{ width: 65, textAlign: 'center' }}>Đã bán</AppText>
            <AppText variant="md" color="#64748B" style={{ width: 95, textAlign: 'right' }}>Doanh thu</AppText>
          </View>
          {data.map((p, i) => {
            const rankBg = i === 0 ? '#FEF3C7' : i === 1 ? '#F1F5F9' : i === 2 ? '#FFF7ED' : '#F8FAFC';
            const rankColor = i === 0 ? '#D97706' : i === 1 ? '#475569' : i === 2 ? '#C2410C' : '#64748B';
            return (
              <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: '#F8FAFC' }]}>
                <View style={{ width: 36, alignItems: 'center' }}>
                  <View style={{ width: 22, height: 20, borderRadius: 4, backgroundColor: rankBg, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText variant="md" color={rankColor} style={{ fontSize: 12 }}>#{i + 1}</AppText>
                  </View>
                </View>
                <AppText variant="md" color="#0F172A" style={{ flex: 1, paddingLeft: 4 }} numberOfLines={1}>
                  {p.name}
                </AppText>
                <View style={{ width: 65, alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <AppText variant="md" color="#334155" style={{ fontSize: 12 }}>{p.quantity}</AppText>
                  </View>
                </View>
                <AppText variant="md" weight="bold" color={colors.brand.primary} style={{ width: 95, textAlign: 'right' }}>
                  {formatVND(p.total)}
                </AppText>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  emptyBox: { alignItems: 'center', paddingVertical: 18, gap: 6 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
