import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import SkeletonBox from '../ui/SkeletonBox';
import { useResponsive } from '../../hooks/useResponsive';
import type { Dashboard } from '../../api';

// ── Reusable DataTable (clean professional style matching Kế Toán) ──

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
    borderRadius: shape.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primaryBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerCell: { flex: 1 },
  headerText: { ...font.tableHeader, color: colors.text.tableHeader },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  dataRowAlt: { backgroundColor: '#FAFAFA' },
  dataCell: { flex: 1, justifyContent: 'center' },
  cellRight: { alignItems: 'flex-end' },
  cellCenter: { alignItems: 'center' },
  dataText: { ...font.tableCell, color: colors.text.primary },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { ...font.bodySmall, color: colors.text.muted },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});

// ── Top Products ──

interface TopProductsProps {
  data?: Dashboard['top_products'];
  loading: boolean;
}

export function TopProductsList({ data, loading }: TopProductsProps) {
  const { isWide } = useResponsive();
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
              <Text style={{ ...font.tableCell, fontWeight: '600', textAlign: 'center', color: (v <= 3) ? colors.brand.primary : colors.text.muted }}>
                {v}
              </Text>
            ) },
            { key: 'name', label: 'Tên món', flex: 2 },
            { key: 'quantity', label: 'SL', flex: 0.8, align: 'right', render: (v) => (
              <Text style={{ ...font.tableCell, fontWeight: '600', color: colors.text.primary, textAlign: 'right' }}>{v}</Text>
            ) },
          ]}
          data={(data ?? []).map((p, i) => ({ ...p, id: i, rank: i + 1 }))}
          maxRows={6}
        />
      )}
    </View>
  );
}

// ── Navigation (Expanded) ──

const NAV_ITEMS = [
  { title: 'Thực đơn', icon: 'silverware', route: '/quan-ly/menu' },
  { title: 'Menu Tiếng Anh', icon: 'translate', route: '/quan-ly/menu-eng' },
  { title: 'Công thức', icon: 'book-open-variant', route: '/quan-ly/recipes' },
  { title: 'Nhân viên', icon: 'account-group', route: '/quan-ly/users' },
  { title: 'Ca làm việc', icon: 'clock-outline', route: '/quan-ly/shifts' },
  { title: 'Báo cáo', icon: 'chart-box-outline', route: '/quan-ly/reports' },
  { title: 'BI Reports', icon: 'chart-timeline-variant', route: '/quan-ly/bi-reports' },
  { title: 'Dự báo', icon: 'trending-up', route: '/quan-ly/forecast' },
  { title: 'Kho hàng', icon: 'package-variant', route: '/quan-ly/stock' },
  { title: 'Nhà cung cấp', icon: 'truck-delivery', route: '/quan-ly/suppliers' },
  { title: 'Đơn đặt hàng', icon: 'clipboard-list', route: '/quan-ly/purchase-orders' },
  { title: 'Bàn', icon: 'table-furniture', route: '/quan-ly/tables' },
  { title: 'Khu vực', icon: 'map-marker', route: '/quan-ly/stations' },
  { title: 'Đặt bàn', icon: 'calendar-check', route: '/quan-ly/booking' },
  { title: 'Khách hàng', icon: 'account-star', route: '/quan-ly/customers' },
  { title: 'Thẻ thành viên', icon: 'card-account-details', route: '/quan-ly/membership' },
  { title: 'Khuyến mãi', icon: 'gift-outline', route: '/quan-ly/promo' },
  { title: 'Marketing', icon: 'bullhorn', route: '/quan-ly/marketing' },
  { title: 'Chi nhánh', icon: 'store-outline', route: '/quan-ly/branches' },
  { title: 'Kiểm toán', icon: 'shield-check', route: '/quan-ly/audit' },
  { title: 'Bảng điều khiển', icon: 'view-dashboard-outline', route: '/quan-ly/exec-dashboard' },
];

interface NavGridProps {
  compact?: boolean;
}

export function NavigationGrid({ compact }: NavGridProps) {
  const router = useRouter();
  const { width, isTabletLandscape, isWide } = useResponsive();

  const numCols = isTabletLandscape ? 5 : compact ? (width < 360 ? 2 : 3) : 5;
  const cardWidth = width < 360 && compact ? '46%' : `${Math.floor(100 / numCols) - 1.5}%` as const;

  return (
    <View style={styles.section}>
      <SectionHeader
        icon="view-grid-outline"
        title="Phân hệ quản lý"
        subtitle={`${NAV_ITEMS.length} mục`}
        compact={compact}
      />
      <View style={styles.navGrid}>
        {NAV_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[compact ? navCompact.navCard : navNormal.navCard, { width: cardWidth }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={compact ? navCompact.navIconWrap : navNormal.navIconWrap}>
              <Icon name={item.icon as any} size={compact ? 22 : 28} color={colors.text.muted} />
            </View>
            <Text style={compact ? navCompact.navLabel : navNormal.navLabel} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Low Stock ──

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
  const { isWide } = useResponsive();

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                    <Text style={{ ...font.tableCell, fontWeight: '600', color: r._critical ? colors.status.danger : colors.status.warning }}>
                      {r.current}
                    </Text>
                    <Text style={{ ...font.tableCell, color: colors.text.muted }}>
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
  const { isWide } = useResponsive();

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.actDot, { backgroundColor: ((row as any).color ?? '#CBD5E1') + '20' }]}>
                    <Icon name={(row as any).icon as any} size={14} color={(row as any).color ?? '#CBD5E1'} />
                  </View>
                  <Text style={dtStyles.dataText} numberOfLines={2}>{v}</Text>
                </View>
              ),
            },
            { key: 'time', label: 'Thời gian', flex: 1, align: 'right', render: (v) => (
              <Text style={{ ...font.tableCell, color: colors.text.muted, textAlign: 'right' }}>{v}</Text>
            ) },
          ]}
          data={acts.slice(0, 5)}
        />
      )}
    </View>
  );
}

// ── Revenue Bar Chart (accepts real data) ──

interface RevenueChartProps {
  data?: { hour: number; value: number }[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const values = data ?? [];
  const max = Math.max(...values.map((v) => v.value), 1);
  const { isWide } = useResponsive();

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
          return (
            <View key={i} style={styles.chartCol}>
              <View style={styles.chartBarOuter}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${h}%`, backgroundColor: i >= values.length - 2 ? colors.brand.primary : '#FCD6B6' },
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

// ── Shared helpers ──

function SectionHeader({
  icon: iconName,
  title,
  subtitle,
  compact,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Icon name={iconName as any} size={compact ? 16 : 20} color={colors.text.muted} />
        <Text style={[styles.sectionTitle, compact && font.bodyBold]}>
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
      <Icon name={iconName as any} size={28} color={iconColor ?? '#CBD5E1'} />
      <Text style={[styles.emptyText, iconColor ? { color: iconColor } : undefined]}>{text}</Text>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface.card,
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    padding: 6,
    boxShadow: 'none',
    elevation: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...font.body, fontWeight: '600', color: colors.text.primary },
  sectionSub: { ...font.caption, color: colors.text.secondary },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { ...font.bodySmall, color: colors.text.secondary },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  actDot: {
    width: 30,
    height: 30,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 8,
  },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarOuter: { flex: 1, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 2 },
  chartLabel: { ...font.caption, color: colors.text.muted, marginTop: 4 },
});

const navNormal = {
  navCard: {
    width: '23%' as const,
    minWidth: 100,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  navIconWrap: {
    width: 56,
    height: 56,
    borderRadius: shape.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F3F4F6',
  },
  navLabel: {
    ...font.body,
    fontWeight: '500' as const,
    color: colors.text.primary,
    textAlign: 'center' as const,
  },
} as const;

const navCompact = {
  navCard: {
    width: '23%' as const,
    minWidth: 76,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  navIconWrap: {
    width: 40,
    height: 40,
    borderRadius: shape.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F3F4F6',
  },
  navLabel: {
    ...font.label,
    fontWeight: '500' as const,
    color: colors.text.primary,
    textAlign: 'center' as const,
  },
} as const;
