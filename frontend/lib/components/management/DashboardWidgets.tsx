import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        <View key={row.id ?? i} style={[dtStyles.dataRow, i % 2 === 0 && dtStyles.dataRowAlt]}>
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
    borderRadius: shape.radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface.app,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primaryBg,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerCell: { flex: 1 },
  headerText: { ...font.captionItalic, color: colors.text.secondary },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dataRowAlt: { backgroundColor: colors.surface.card },
  dataCell: { flex: 1, justifyContent: 'center' },
  cellRight: { alignItems: 'flex-end' },
  cellCenter: { alignItems: 'center' },
  dataText: { ...font.md, color: colors.text.primary },
  empty: { alignItems: 'center', paddingVertical: 18 },
  emptyText: { ...font.captionItalic, color: colors.text.muted },
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
            { key: 'rank', label: '#', flex: 0.4, align: 'center', render: (v) => (
              <Text style={{ ...font.sm, fontWeight: 'bold', textAlign: 'center', color: (v <= 3) ? colors.brand.primary : colors.text.muted }}>
                {v}
              </Text>
            ) },
            { key: 'name', label: 'Tên món', flex: 2 },
            { key: 'quantity', label: 'SL', flex: 0.8, align: 'right', render: (v) => (
              <Text style={{ ...font.sm, fontWeight: 'bold', color: colors.text.primary, textAlign: 'right' }}>{v}</Text>
            ) },
          ]}
          data={(data ?? []).map((p, i) => ({ ...p, id: i, rank: i + 1 }))}
          maxRows={5}
        />
      )}
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
        {NAV_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={{
              width: width > 768 ? '23.8%' : '48.5%',
              backgroundColor: colors.surface.app,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: colors.border.light,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              minHeight: 52,
            }}
            onPress={() => router.push(item.route as any)}
            delayPressIn={0}
            activeOpacity={0.7}
          >
            <View style={{ width: 38, height: 38, borderRadius: shape.radius.md, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={item.icon as any} size={20} color={item.color} />
            </View>
            <AppText variant="md" color={colors.text.primary} numberOfLines={1} style={{ flex: 1 }}>
              {item.title}
            </AppText>
          </TouchableOpacity>
        ))}
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
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} w="100%" h={20} style={{ marginBottom: 8 }} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <SectionHeader icon="alert-circle-outline" title="Tồn kho thấp" subtitle={`${stockItems.length} mặt hàng`} />
      {stockItems.length === 0 ? (
        <EmptyBox icon="check-circle" text="Tồn kho ổn định" iconColor={colors.status.success} />
      ) : (
        <DataTable
          columns={[
            {
              key: 'name', label: 'Nguyên liệu', flex: 2,
              render: (v, row) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      dtStyles.statusDot,
                      { backgroundColor: (row as any)._critical ? colors.status.danger : colors.status.warning },
                    ]}
                  />
                  <Text style={dtStyles.dataText} numberOfLines={1}>{v}</Text>
                </View>
              ),
            },
            {
              key: '_stock', label: 'Tồn / Tối thiểu', flex: 1.2, align: 'right',
              render: (_, row) => {
                const r = row as any;
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
                    <Text style={{ ...font.sm, fontWeight: 'bold', color: r._critical ? colors.status.danger : colors.status.warning }}>
                      {r.current}
                    </Text>
                    <Text style={{ ...font.sm, color: colors.text.muted }}>
                      / {r.min} {r.unit}
                    </Text>
                  </View>
                );
              },
            },
          ]}
          data={(stockItems.slice(0, 4)).map((item) => {
            const pct = item.min > 0 ? Math.round((item.current / item.min) * 100) : 0;
            return { ...item, _critical: pct < 30, _stock: `${item.current}/${item.min}` };
          })}
        />
      )}
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
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} w="100%" h={20} style={{ marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader icon="history" title="Hoạt động gần đây" />
      {acts.length === 0 ? (
        <EmptyBox icon="inbox" text="Chưa có hoạt động" />
      ) : (
        <DataTable
          columns={[
            {
              key: 'text', label: 'Sự kiện', flex: 2.5,
              render: (v, row) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.actDot, { backgroundColor: ((row as any).color ?? '#CBD5E1') + '20' }]}>
                    <Icon name={(row as any).icon as any} size={13} color={(row as any).color ?? '#CBD5E1'} />
                  </View>
                  <Text style={dtStyles.dataText} numberOfLines={2}>{v}</Text>
                </View>
              ),
            },
            { key: 'time', label: 'Thời gian', flex: 1, align: 'right', render: (v) => (
              <Text style={{ ...font.captionItalic, color: colors.text.muted, textAlign: 'right' }}>{v}</Text>
            ) },
          ]}
          data={acts.slice(0, 5)}
        />
      )}
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
  const max = Math.max(...values.map((v) => v.value), 1);

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader icon="chart-timeline-variant" title="Doanh thu theo giờ" subtitle="Hôm nay" />
        <SkeletonBox w="100%" h={120} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader icon="chart-timeline-variant" title="Doanh thu theo giờ" subtitle="Hôm nay" />
      <View style={styles.chartContainer}>
        {values.map((v, i) => {
          const h = max > 0 ? Math.round((v.value / max) * 100) : 0;
          const isPeak = i >= values.length - 2;
          return (
            <View key={i} style={styles.chartCol}>
              <View style={styles.chartBarOuter}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${h}%`, backgroundColor: isPeak ? colors.brand.primary : '#FED7AA' },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{v.hour}h</Text>
            </View>
          );
        })}
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
        <Icon name={iconName as any} size={16} color={colors.brand.primary} />
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
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

// ── Styles ──

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...font.sectionTitle, color: colors.text.primary },
  sectionSub: { ...font.captionItalic, color: colors.text.secondary },
  emptyBox: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  emptyText: { ...font.captionItalic, color: colors.text.secondary },

  actDot: {
    width: 24,
    height: 24,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingTop: 6,
  },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarOuter: { flex: 1, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 4 },
  chartLabel: { ...font.sm, color: colors.text.muted, marginTop: 4 },
});
