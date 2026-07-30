import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import SkeletonBox from '../ui/SkeletonBox';
import AppText from '../ui/AppText';
import { useResponsive } from '../../hooks/useResponsive';
import type { Dashboard } from '../../api';

// ── Reusable Borderless DataTable ──────────────────────────

interface DataTableColumn {
  key: string;
  label: string;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  render?: (val: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: any[];
  maxRows?: number;
}

function DataTable({ columns, data, maxRows = 5 }: DataTableProps) {
  const rows = data.slice(0, maxRows);
  return (
    <View style={dtStyles.wrap}>
      {/* Header */}
      <View style={dtStyles.headerRow}>
        {columns.map((col) => (
          <View key={col.key} style={[dtStyles.headerCell, col.flex != null ? { flex: col.flex } : undefined]}>
            <Text
              style={[
                dtStyles.headerText,
                col.align === 'right' && { textAlign: 'right' as const },
                col.align === 'center' && { textAlign: 'center' as const },
              ]}
              numberOfLines={1}
            >
              {col.label}
            </Text>
          </View>
        ))}
      </View>
      {/* Body */}
      {rows.map((row, i) => (
        <View key={row.id ?? i} style={[dtStyles.dataRow, i % 2 === 1 && dtStyles.dataRowAlt]}>
          {columns.map((col) => {
            const val = row[col.key];
            return (
              <View
                key={col.key}
                style={[
                  dtStyles.dataCell,
                  col.flex != null ? { flex: col.flex } : undefined,
                  col.align === 'right' && dtStyles.cellRight,
                  col.align === 'center' && dtStyles.cellCenter,
                ]}
              >
                {col.render ? (
                  col.render(val, row)
                ) : (
                  <Text
                    style={[
                      dtStyles.dataText,
                      col.align === 'right' && { textAlign: 'right' as const },
                    ]}
                    numberOfLines={1}
                  >
                    {val ?? '—'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
      {rows.length === 0 && (
        <View style={dtStyles.empty}>
          <Text style={dtStyles.emptyText}>Chưa có dữ liệu</Text>
        </View>
      )}
    </View>
  );
}

const dtStyles = StyleSheet.create({
  wrap: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#E5E9F0',
  },
  headerCell: { flex: 1 },
  headerText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dataRowAlt: { backgroundColor: '#F8FAFC' },
  dataCell: { flex: 1, justifyContent: 'center' },
  cellRight: { alignItems: 'flex-end' },
  cellCenter: { alignItems: 'center' },
  dataText: { fontSize: 16, fontWeight: '400', color: '#0F172A' },
  empty: { alignItems: 'center', paddingVertical: 18 },
  emptyText: { fontSize: 14, fontWeight: '400', color: '#64748B' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});

// ── Top Products ──

interface TopProductsProps {
  data?: Dashboard['top_products'];
  loading: boolean;
}

export function TopProductsList({ data, loading }: TopProductsProps) {
  return (
    <View style={styles.section}>
      <SectionHeader icon="chart-bar" title="Sản phẩm bán chạy" subtitle="Hôm nay" />
      <View style={styles.sectionBody}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <SkeletonBox w={24} h={24} borderRadius={4} />
              <SkeletonBox w="55%" h={16} />
              <SkeletonBox w={40} h={16} />
            </View>
          ))
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyBox icon="inbox" text="Chưa có dữ liệu" />
        ) : (
          <DataTable
            columns={[
              {
                key: 'rank',
                label: '#',
                flex: 0.4,
                align: 'center',
                render: (v) => {
                  const rank = Number(v);
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  if (rank <= 3) {
                    return (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          backgroundColor: isTop1 ? '#FFF7ED' : isTop2 ? '#FEF3C7' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: isTop1 ? '#FFEDD5' : isTop2 ? '#FDE68A' : '#E2E8F0',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isTop1 ? '#F97316' : isTop2 ? '#D97706' : '#475569',
                          }}
                        >
                          {rank}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <Text style={{ fontSize: 14, fontWeight: '400', color: '#64748B', textAlign: 'center' }}>
                      {rank}
                    </Text>
                  );
                },
              },
              {
                key: 'name',
                label: 'Tên món',
                flex: 2,
                render: (v) => (
                  <Text style={{ fontSize: 16, fontWeight: '400', color: '#0F172A' }} numberOfLines={1}>
                    {v}
                  </Text>
                ),
              },
              {
                key: 'quantity',
                label: 'SL',
                flex: 0.8,
                align: 'right',
                render: (v) => (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                    {v}
                  </Text>
                ),
              },
            ]}
            data={(data ?? []).map((p, i) => ({ ...p, id: i, rank: i + 1 }))}
            maxRows={5}
          />
        )}
      </View>
    </View>
  );
}

// ── Navigation Grid ──

const NAV_ITEMS = [
  { title: 'Thực đơn & Kho', icon: 'package-variant-closed', route: '/quan-ly/products', color: '#4F46E5', bg: '#EEF2FF' },
  { title: 'Khách hàng', icon: 'account-group', route: '/quan-ly/crm', color: '#059669', bg: '#ECFDF5' },
  { title: 'Báo cáo', icon: 'chart-bar', route: '/quan-ly/analytics', color: '#7C3AED', bg: '#F5F3FF' },
  { title: 'Hệ thống', icon: 'cog-outline', route: '/quan-ly/system', color: '#F97316', bg: '#FFF7ED' },
];

interface NavGridProps {
  compact?: boolean;
}

export function NavigationGrid({ compact }: NavGridProps) {
  const router = useRouter();
  const { width } = useResponsive();

  return (
    <View style={styles.section}>
      <SectionHeader
        icon="view-grid-outline"
        title="Phân hệ quản lý chính"
        subtitle={`${NAV_ITEMS.length} mục`}
        compact={compact}
      />
      <View style={styles.sectionBody}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {NAV_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={{
                width: width > 768 ? '23.8%' : '48.5%',
                backgroundColor: '#F8FAFC',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 52,
              }}
              onPress={() => router.push(item.route as any)}
              delayPressIn={0}
              activeOpacity={0.7}
            >
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '400', color: '#0F172A', flex: 1 }} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Low Stock Widget ──

interface LowStockItem {
  name: string;
  unit: string;
  current: number;
  min: number;
}

interface LowStockWidgetProps {
  items?: LowStockItem[];
  loading?: boolean;
}

export function LowStockList({ items, loading }: LowStockWidgetProps) {
  const stockItems = items ?? [];

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader icon="alert-circle-outline" title="Tồn kho thấp" />
        <View style={styles.sectionBody}>
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} w="100%" h={20} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader icon="alert-circle-outline" title="Tồn kho thấp" subtitle={`${stockItems.length} mặt hàng`} />
      <View style={styles.sectionBody}>
        {stockItems.length === 0 ? (
          <EmptyBox icon="check-circle-outline" text="Tồn kho ổn định" iconColor="#059669" />
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Nguyên liệu',
                flex: 2,
                render: (v, row) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        dtStyles.statusDot,
                        { backgroundColor: (row as any)._critical ? '#DC2626' : '#D97706' },
                      ]}
                    />
                    <Text style={{ fontSize: 16, fontWeight: '400', color: '#0F172A' }} numberOfLines={1}>
                      {v}
                    </Text>
                  </View>
                ),
              },
              {
                key: '_stock',
                label: 'Tồn / Tối thiểu',
                flex: 1.2,
                align: 'right',
                render: (_, row) => {
                  const r = row as any;
                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 2 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: r._critical ? '#DC2626' : '#D97706' }}>
                        {r.current}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '400', color: '#64748B' }}>
                        / {r.min} {r.unit}
                      </Text>
                    </View>
                  );
                },
              },
            ]}
            data={stockItems.slice(0, 4).map((item) => {
              const pct = item.min > 0 ? Math.round((item.current / item.min) * 100) : 0;
              return { ...item, _critical: pct < 30, _stock: `${item.current}/${item.min}` };
            })}
          />
        )}
      </View>
    </View>
  );
}

// ── Recent Activities ──

interface Activity {
  icon: string;
  text: string;
  time: string;
  color?: string;
}

interface ActivitiesProps {
  activities?: Activity[];
  loading?: boolean;
}

export function RecentActivitiesList({ activities, loading }: ActivitiesProps) {
  const acts = activities ?? [];

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader icon="history" title="Hoạt động" />
        <View style={styles.sectionBody}>
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} w="100%" h={20} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader icon="history" title="Hoạt động gần đây" />
      <View style={styles.sectionBody}>
        {acts.length === 0 ? (
          <EmptyBox icon="inbox" text="Chưa có hoạt động" />
        ) : (
          <DataTable
            columns={[
              {
                key: 'text',
                label: 'Sự kiện',
                flex: 5.5,
                render: (v, row) => {
                  const cleanText = String(v ?? '')
                    .replace('da_huy', 'Đã hủy')
                    .replace('da_thanh_toan', 'Đã thanh toán')
                    .replace('dang_nau', 'Đang chế biến')
                    .replace('da_gop', 'Đã gộp bàn');
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={[styles.actDot, { backgroundColor: ((row as any).color ?? '#CBD5E1') + '20' }]}>
                        <Icon name={(row as any).icon as any} size={13} color={(row as any).color ?? '#CBD5E1'} />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '400', color: '#0F172A', flex: 1 }} numberOfLines={2}>
                        {cleanText}
                      </Text>
                    </View>
                  );
                },
              },
              {
                key: 'time',
                label: 'Thời gian',
                flex: 0.35,
                align: 'right',
                render: (v) => (
                  <Text style={{ fontSize: 14, fontWeight: '400', color: '#64748B', textAlign: 'right' }}>
                    {v}
                  </Text>
                ),
              },
            ]}
            data={acts.slice(0, 5)}
          />
        )}
      </View>
    </View>
  );
}

// ── Revenue Bar Chart ──

interface RevenueChartProps {
  data?: { hour: number; value: number }[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const values = data ?? [];
  const max = Math.max(...values.map((v) => v.value), 0);
  const totalRev = values.reduce((sum, v) => sum + v.value, 0);
  const [selectedBar, setSelectedBar] = React.useState<{ hour: number; value: number } | null>(null);

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader icon="chart-timeline-variant" title="Doanh thu theo giờ" subtitle="Hôm nay" />
        <View style={styles.sectionBody}>
          <SkeletonBox w="100%" h={120} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        icon="chart-timeline-variant"
        title="Doanh thu theo giờ"
        subtitle={
          selectedBar
            ? `${selectedBar.hour}h: ${new Intl.NumberFormat('vi-VN').format(selectedBar.value)}đ`
            : totalRev > 0
            ? `Tổng: ${new Intl.NumberFormat('vi-VN').format(totalRev)}đ`
            : "Trượt để xem 7h-23h"
        }
      />
      <View style={styles.sectionBody}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContainer}
        >
          {values.map((v, i) => {
            const h = max > 0 ? Math.round((v.value / max) * 100) : 0;
            const isPeak = v.value > 0 && v.value === max;
            const hasRevenue = v.value > 0;
            const isSelected = selectedBar?.hour === v.hour;

            return (
              <TouchableOpacity
                key={i}
                style={styles.chartCol}
                onPress={() => setSelectedBar(isSelected ? null : v)}
                activeOpacity={0.7}
              >
                <View style={styles.chartBarOuter}>
                  {hasRevenue && (
                    <Text style={styles.chartValueLabel} numberOfLines={1}>
                      {v.value >= 1000000
                        ? `${(v.value / 1000000).toFixed(1)}M`
                        : v.value >= 1000
                        ? `${Math.round(v.value / 1000)}k`
                        : v.value}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${Math.max(h, hasRevenue ? 8 : 2)}%`,
                        backgroundColor: isSelected
                          ? '#EA580C'
                          : isPeak
                          ? colors.brand.primary
                          : hasRevenue
                          ? '#FDBA74'
                          : '#F1F5F9',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.chartLabel,
                    (isPeak || isSelected) && { color: colors.brand.primary, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {v.hour}h
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Shared Helpers ──

function SectionHeader({
  icon: iconName,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Icon name={iconName as any} size={18} color={colors.brand.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {subtitle && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
      )}
    </View>
  );
}

function EmptyBox({
  icon: iconName,
  text,
  iconColor,
}: {
  icon: string;
  text: string;
  iconColor?: string;
}) {
  return (
    <View style={styles.emptyBox}>
      <Icon name={iconName as any} size={24} color={iconColor ?? '#CBD5E1'} />
      <Text style={[styles.emptyText, iconColor ? { color: iconColor } : undefined]}>{text}</Text>
    </View>
  );
}

// ── Styles (Flat Skills UI V2 Standards) ──

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E5E9F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
  },
  sectionBody: {
    padding: 10,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '400', color: '#64748B' },

  actDot: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chartScrollContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 16,
    gap: 4,
    minWidth: '100%',
  },
  chartCol: { minWidth: 28, flex: 1, alignItems: 'center', height: '100%' },
  chartBarOuter: { flex: 1, width: '70%', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 2 },
  chartValueLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#F97316',
    marginBottom: 2,
    textAlign: 'center',
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 4,
  },
});

