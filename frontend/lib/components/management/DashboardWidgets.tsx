import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import SkeletonBox from '../ui/SkeletonBox';
import type { Dashboard } from '../../api';

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#C2875A', '#CBD5E1', '#CBD5E1'];

interface Props {
  data?: Dashboard['top_products'];
  loading: boolean;
}

export default function TopProductsWidget({ data, loading }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🏆 Top 5 sản phẩm bán chạy</Text>
        <Text style={styles.sectionSub}>Hôm nay</Text>
      </View>
      {loading ? (
        [1, 2, 3].map(i => (
          <View key={i} style={[styles.productRow, { gap: 10 }]}>
            <SkeletonBox w={28} h={28} borderRadius={14} />
            <SkeletonBox w="55%" h={16} />
            <SkeletonBox w={40} h={16} />
          </View>
        ))
      ) : (data?.length ?? 0) === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="inbox" size={32} color="#CBD5E1" />
          <Text style={styles.emptyText}>Chưa có dữ liệu hôm nay</Text>
        </View>
      ) : (
        data!.map((p, i) => (
          <View key={i} style={styles.productRow}>
            <View style={[styles.rankBadge, { backgroundColor: i < 3 ? MEDAL_COLORS[i] + '22' : '#F1F5F9' }]}>
              <Text style={[styles.rankText, { color: i < 3 ? MEDAL_COLORS[i] : '#94A3B8' }]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </Text>
            </View>
            <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>{p.quantity} suất</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export function NavigationGrid() {
  const router = useRouter();
  const navItems = [
    { title: 'Menu', icon: 'silverware', route: '/quan-ly/menu', color: '#F97316', bg: '#FFF7ED' },
    { title: 'Nhân viên', icon: 'account-group', route: '/quan-ly/users', color: '#8B5CF6', bg: '#F5F3FF' },
    { title: 'Báo cáo', icon: 'chart-box-outline', route: '/quan-ly/reports', color: '#10B981', bg: '#ECFDF5' },
    { title: 'Thiết lập', icon: 'cog-outline', route: '/quan-ly/settings', color: '#64748B', bg: '#F1F5F9' },
  ];
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📋 Phân hệ quản lý</Text>
      <View style={styles.navGrid}>
        {navItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.navCard}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.navIconWrap, { backgroundColor: item.bg }]}>
              <Icon name={item.icon as any} size={26} color={item.color} />
            </View>
            <Text style={styles.navLabel}>{item.title}</Text>
            <Icon name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const SHADOW = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 };

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface.card, borderRadius: 4, marginHorizontal: 12, padding: 14, ...SHADOW },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { ...font.h3, color: colors.text.primary },
  sectionSub: { ...font.caption, color: colors.text.secondary },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '800' },
  productName: { flex: 1, ...font.bodySmall, fontWeight: '600', color: colors.text.primary },
  qtyBadge: { backgroundColor: colors.brand.primaryBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  qtyText: { ...font.badge, fontWeight: '700', color: colors.brand.primary },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { ...font.bodySmall, color: colors.text.secondary },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  navCard: {
    flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface.input, borderRadius: 4, padding: 12, gap: 10,
  },
  navIconWrap: { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, ...font.label, color: colors.text.primary },
});
