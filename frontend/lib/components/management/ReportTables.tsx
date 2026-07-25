import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, formatVND } from '../../theme';
import { shape } from '../../theme/shape';
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
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Icon name="calendar-month-outline" size={16} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color={colors.text.primary}>Chi tiết doanh thu theo ngày</AppText>
      </View>
      <View style={s.tableHeader}>
        <AppText variant="sm" color={colors.text.secondary} style={{ flex: 1.5 }}>Ngày</AppText>
        <AppText variant="sm" color={colors.text.secondary} style={{ flex: 1, textAlign: 'center' }}>Số đơn</AppText>
        <AppText variant="sm" color={colors.text.secondary} style={{ flex: 2, textAlign: 'right' }}>Doanh thu</AppText>
      </View>
      {data.map((d, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: colors.surface.app }]}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1.5 }}>
            {formatDayLabel(d.date)} {formatDate(d.date)}
          </AppText>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="sm" color={colors.text.primary}>{d.orders}</AppText>
          </View>
          <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ flex: 2, textAlign: 'right' }}>
            {formatFullVND(d.revenue)}
          </AppText>
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
      <View style={s.sectionHeader}>
        <Icon name="trophy-outline" size={16} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Top sản phẩm bán chạy nhất</AppText>
      </View>
      {data.length === 0 ? (
        <View style={s.emptyBox}>
          <Icon name="inbox" size={32} color={colors.icon.muted} />
          <AppText variant="sm" color={colors.text.muted}>Không có dữ liệu bán hàng</AppText>
        </View>
      ) : (
        <>
          <View style={s.tableHeader}>
            <AppText variant="sm" color={colors.text.secondary} style={{ width: 32 }}>#</AppText>
            <AppText variant="sm" color={colors.text.secondary} style={{ flex: 1 }}>Sản phẩm</AppText>
            <AppText variant="sm" color={colors.text.secondary} style={{ width: 55, textAlign: 'center' }}>SL</AppText>
            <AppText variant="sm" color={colors.text.secondary} style={{ width: 95, textAlign: 'right' }}>Doanh thu</AppText>
          </View>
          {data.map((p, i) => (
            <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: colors.surface.app }]}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ width: 32 }}>
                {i < 3 ? MEDAL[i] : `${i + 1}`}
              </AppText>
              <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }} numberOfLines={1}>
                {p.name}
              </AppText>
              <View style={{ width: 55, alignItems: 'center' }}>
                <AppText variant="sm" color={colors.text.primary}>{p.quantity}</AppText>
              </View>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ width: 95, textAlign: 'right' }}>
                {formatVND(p.total)}
              </AppText>
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
    borderRadius: shape.radius.lg,
    padding: 12,
    marginBottom: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primaryBg,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: shape.radius.sm,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: shape.radius.sm,
  },
});
