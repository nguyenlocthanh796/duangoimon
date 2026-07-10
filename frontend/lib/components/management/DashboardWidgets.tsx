import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import SkeletonBox from '../ui/SkeletonBox';
import type { Dashboard } from '../../api';

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
        [1, 2, 3].map(i => (
          <View key={i} style={[styles.listRow, { gap: 10 }]}>
            <SkeletonBox w={24} h={24} borderRadius={4} />
            <SkeletonBox w="55%" h={16} />
            <SkeletonBox w={40} h={16} />
          </View>
        ))
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyBox icon="inbox" text="Chưa có dữ liệu" />
      ) : (
        <View style={{ gap: 0 }}>
          {/* mini table header */}
          <View style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: colors.border.light, paddingBottom: 8, marginBottom: 4 }]}>
            <Text style={[styles.colHead, { flex: 0.5, textAlign: 'center' }]}>#</Text>
            <Text style={[styles.colHead, { flex: 2 }]}>Tên món</Text>
            <Text style={[styles.colHead, { flex: 1, textAlign: 'right' }]}>SL</Text>
          </View>
          {data!.map((p, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={[styles.colText, { flex: 0.5, textAlign: 'center', fontWeight: '700', color: i < 3 ? colors.brand.primary : colors.text.muted }]}>
                {i + 1}
              </Text>
              <Text style={[styles.colText, { flex: 2 }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.colText, { flex: 1, textAlign: 'right', fontWeight: '700', color: colors.text.primary }]}>
                {p.quantity}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Navigation ──

const NAV_ITEMS = [
  { title: 'Thực đơn', icon: 'silverware', route: '/quan-ly/menu' },
  { title: 'Nhân viên', icon: 'account-group', route: '/quan-ly/users' },
  { title: 'Báo cáo', icon: 'chart-box-outline', route: '/quan-ly/reports' },
  { title: 'Kho hàng', icon: 'package-variant', route: '/quan-ly/stock' },
  { title: 'Bàn', icon: 'table-furniture', route: '/quan-ly/tables' },
  { title: 'Khách hàng', icon: 'account-star', route: '/quan-ly/customers' },
  { title: 'Khuyến mãi', icon: 'gift-outline', route: '/quan-ly/promo' },
  { title: 'Chi nhánh', icon: 'store-outline', route: '/quan-ly/branches' },
];

interface NavGridProps { compact?: boolean }

export function NavigationGrid({ compact }: NavGridProps) {
  const router = useRouter();
  const s = compact ? navCompact : navNormal;
  return (
    <View style={styles.section}>
      <SectionHeader icon="view-grid-outline" title="Phân hệ quản lý" subtitle={`${NAV_ITEMS.length} mục`} compact={compact} />
      <View style={styles.navGrid}>
        {NAV_ITEMS.map((item, i) => (
          <TouchableOpacity key={i} style={[s.navCard]} onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
            <View style={s.navIconWrap}>
              <Icon name={item.icon as any} size={compact ? 22 : 28} color={colors.text.muted} />
            </View>
            <Text style={s.navLabel}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Low Stock ──

interface LowStockItem { name: string; unit: string; current: number; min: number }

interface LowStockWidgetProps { items?: LowStockItem[]; loading?: boolean }

export function LowStockList({ items, loading }: LowStockWidgetProps) {
  const stockItems = items ?? [
    { name: 'Cà phê hạt Robusta', unit: 'kg', current: 1.2, min: 3 },
    { name: 'Sữa tươi không đường', unit: 'hộp', current: 2, min: 5 },
    { name: 'Đường kính trắng', unit: 'kg', current: 0.5, min: 2 },
  ];
  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader icon="alert-circle-outline" title="Tồn kho thấp" />
        {[1, 2, 3].map(i => <SkeletonBox key={i} w="100%" h={20} style={{ marginBottom: 8 }} />)}
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <SectionHeader icon="alert-circle-outline" title="Tồn kho thấp" subtitle={`${stockItems.length} mặt hàng`} />
      <View style={{ gap: 0 }}>
        <View style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: colors.border.light, paddingBottom: 8, marginBottom: 4 }]}>
          <Text style={[styles.colHead, { flex: 2 }]}>Nguyên liệu</Text>
          <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Tồn / Tối thiểu</Text>
        </View>
        {stockItems.length === 0 ? (
          <EmptyBox icon="check-circle" text="Tồn kho ổn định" iconColor={colors.status.success} />
        ) : (
          stockItems.slice(0, 4).map((item, i) => {
            const pct = item.min > 0 ? Math.round((item.current / item.min) * 100) : 0;
            const isCritical = pct < 30;
            return (
              <View key={i} style={styles.listRow}>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: isCritical ? colors.status.danger : colors.status.warning }]} />
                  <Text style={styles.colText} numberOfLines={1}>{item.name}</Text>
                </View>
                <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
                  <Text style={[styles.colText, { fontWeight: '700', color: isCritical ? colors.status.danger : colors.status.warning }]}>
                    {item.current}
                  </Text>
                  <Text style={[styles.colText, { color: colors.text.muted }]}>/ {item.min} {item.unit}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

// ── Recent Activities ──

interface Activity { icon: string; text: string; time: string; color?: string }

interface ActivitiesProps { activities?: Activity[]; loading?: boolean }

export function RecentActivitiesList({ activities, loading }: ActivitiesProps) {
  const defaultActs: Activity[] = [
    { icon: 'receipt', text: 'Hóa đơn #INV-1029 vừa thanh toán', time: '5 phút trước', color: '#10B981' },
    { icon: 'clock-outline', text: 'Ca chiều bắt đầu - Trưởng ca: Minh Anh', time: '30 phút trước', color: '#F97316' },
    { icon: 'close-circle', text: 'Món cà phê sữa #1203 bị hủy', time: '1 giờ trước', color: '#EF4444' },
    { icon: 'account-plus', text: 'Khách mới: Nguyễn Văn B đăng ký thành viên', time: '2 giờ trước', color: '#8B5CF6' },
  ];
  const acts = activities ?? defaultActs;

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionHeader icon="history" title="Hoạt động" />
        {[1, 2, 3].map(i => <SkeletonBox key={i} w="100%" h={20} style={{ marginBottom: 8 }} />)}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader icon="history" title="Hoạt động gần đây" />
      <View style={{ gap: 0 }}>
        <View style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: colors.border.light, paddingBottom: 8, marginBottom: 4 }]}>
          <Text style={[styles.colHead, { flex: 2.5 }]}>Sự kiện</Text>
          <Text style={[styles.colHead, { flex: 1, textAlign: 'right' }]}>Thời gian</Text>
        </View>
        {acts.slice(0, 5).map((act, i) => (
          <View key={i} style={styles.listRow}>
            <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.actDot, { backgroundColor: (act.color ?? '#CBD5E1') + '20' }]}>
                <Icon name={act.icon as any} size={14} color={act.color ?? '#CBD5E1'} />
              </View>
              <Text style={styles.colText} numberOfLines={2}>{act.text}</Text>
            </View>
            <Text style={[styles.colText, { flex: 1, textAlign: 'right', color: colors.text.muted }]}>{act.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Revenue Bar Chart ──

export function RevenueChart() {
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);
  const VALUES = [10, 15, 22, 18, 30, 55, 70, 65, 85, 92, 80, 60];
  const max = Math.max(...VALUES, 1);
  return (
    <View style={styles.section}>
      <SectionHeader icon="chart-timeline-variant" title="Doanh thu theo giờ" subtitle="Hôm nay" />
      <View style={styles.chartContainer}>
        {VALUES.map((v, i) => {
          const h = Math.round((v / max) * 100);
          return (
            <View key={i} style={styles.chartCol}>
              <View style={styles.chartBarOuter}>
                <View style={[styles.chartBar, { height: `${h}%`, backgroundColor: i >= VALUES.length - 2 ? colors.brand.primary : '#FCD6B6' }]} />
              </View>
              <Text style={styles.chartLabel}>{HOURS[i]}h</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Shared helpers ──

function SectionHeader({ icon: iconName, title, subtitle, compact }: { icon: string; title: string; subtitle?: string; compact?: boolean }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Icon name={iconName as any} size={compact ? 16 : 20} color={colors.text.muted} />
        <Text style={[styles.sectionTitle, compact && { fontSize: 15, lineHeight: 20 }]}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

function EmptyBox({ icon: iconName, text, iconColor }: { icon: string; text: string; iconColor?: string }) {
  return (
    <View style={styles.emptyBox}>
      <Icon name={iconName as any} size={28} color={iconColor ?? '#CBD5E1'} />
      <Text style={[styles.emptyText, iconColor ? { color: iconColor } : undefined]}>{text}</Text>
    </View>
  colHead: { ...font.caption, color: colors.text.muted, fontWeight: '700' },
  colText: { ...font.bodySmall, color: colors.text.primary },

  statusDot: { width: 8, height: 8, borderRadius: 4 },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },

  actDot: { width: 30, height: 30, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },

  // Chart
  chartContainer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 120, paddingTop: 8,
  },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBarOuter: { flex: 1, width: '60%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 2 },
  chartLabel: { ...font.caption, color: colors.text.muted, marginTop: 4 },
});

const navNormal = {
  navCard: {
    width: '23%' as const, minWidth: 100,
    alignItems: 'center' as const, gap: 10,
    paddingVertical: 20, paddingHorizontal: 8,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    borderWidth: 1, borderColor: colors.border.light,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  navIconWrap: { width: 56, height: 56, borderRadius: shape.radius.md, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#F3F4F6' },
  navLabel: { ...font.body, fontWeight: '500' as const, color: colors.text.primary, textAlign: 'center' as const },
} as const;

const navCompact = {
  navCard: {
    width: '23%' as const, minWidth: 76,
    alignItems: 'center' as const, gap: 6,
    paddingVertical: 12, paddingHorizontal: 4,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    borderWidth: 1, borderColor: colors.border.light,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  navIconWrap: { width: 40, height: 40, borderRadius: shape.radius.md, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#F3F4F6' },
  navLabel: { ...font.label, fontWeight: '500' as const, color: colors.text.primary, textAlign: 'center' as const },
} as const;
