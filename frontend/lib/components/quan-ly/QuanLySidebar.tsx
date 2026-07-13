import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { useSegments, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { ASSETS } from '../../assets';

interface NavItem {
  key: string;
  path: string;
  icon: string;
  label: string;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'TỔNG QUAN',
    items: [
      { key: 'index', path: '/quan-ly', icon: 'view-dashboard-outline', label: 'Dashboard' },
      { key: 'reports', path: '/quan-ly/reports', icon: 'chart-bar', label: 'Báo cáo' },
      { key: 'bi-reports', path: '/quan-ly/bi-reports', icon: 'chart-box-outline', label: 'BI Reports' },
    ],
  },
  {
    label: 'VẬN HÀNH',
    items: [
      { key: 'booking', path: '/quan-ly/booking', icon: 'calendar-check', label: 'Sảnh/Sự kiện' },
      { key: 'tables', path: '/quan-ly/tables', icon: 'table-furniture', label: 'Bàn' },
      { key: 'shifts', path: '/quan-ly/shifts', icon: 'clock-outline', label: 'Ca làm việc' },
      { key: 'stations', path: '/quan-ly/stations', icon: 'counter', label: 'Khu vực' },
    ],
  },
  {
    label: 'THỰC ĐƠN & KHO',
    items: [
      { key: 'menu', path: '/quan-ly/menu', icon: 'food', label: 'Thực đơn' },
      { key: 'menu-eng', path: '/quan-ly/menu-eng', icon: 'food-variant', label: 'Menu (EN)' },
      { key: 'recipes', path: '/quan-ly/recipes', icon: 'book-open-variant', label: 'Công thức' },
      { key: 'stock', path: '/quan-ly/stock', icon: 'warehouse', label: 'Kho' },
      { key: 'suppliers', path: '/quan-ly/suppliers', icon: 'truck', label: 'Nhà cung cấp' },
      { key: 'purchase-orders', path: '/quan-ly/purchase-orders', icon: 'clipboard-list', label: 'Đặt hàng' },
    ],
  },
  {
    label: 'KHÁCH HÀNG',
    items: [
      { key: 'customers', path: '/quan-ly/customers', icon: 'account-group', label: 'Khách hàng' },
      { key: 'membership', path: '/quan-ly/membership', icon: 'card-account-details', label: 'Thành viên' },
    ],
  },
  {
    label: 'NHÂN SỰ',
    items: [
      { key: 'users', path: '/quan-ly/users', icon: 'account-cog', label: 'Người dùng' },
      { key: 'branches', path: '/quan-ly/branches', icon: 'store', label: 'Chi nhánh' },
    ],
  },
  {
    label: 'TIẾP THỊ & KIỂM TOÁN',
    items: [
      { key: 'promo', path: '/quan-ly/promo', icon: 'tag', label: 'Khuyến mãi' },
      { key: 'marketing', path: '/quan-ly/marketing', icon: 'bullhorn', label: 'Marketing' },
      { key: 'audit', path: '/quan-ly/audit', icon: 'file-document', label: 'Kiểm toán' },
      { key: 'forecast', path: '/quan-ly/forecast', icon: 'trending-up', label: 'Dự báo' },
    ],
  },
];

interface QuanLySidebarProps {
  isWide: boolean;
}

// ─── Icon-Only Item (iPad portrait) ─────────────────────────
function IconItem({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[iconStyles.item, active && iconStyles.itemActive]}
      accessibilityLabel={item.label}
      accessibilityHint={`Điều hướng đến ${item.label}`}
    >
      <View style={[iconStyles.iconWrap, active && iconStyles.iconWrapActive]}>
        <Icon
          name={item.icon as any}
          size={20}
          color={active ? '#fff' : colors.icon.muted}
        />
      </View>
      {active && <View style={iconStyles.activeDot} />}
    </TouchableOpacity>
  );
}

// ─── Full Item (iPad landscape) ─────────────────────────────
function FullItem({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[fullStyles.item, active && fullStyles.itemActive]}
      accessibilityLabel={item.label}
    >
      <View style={[fullStyles.iconWrap, active && fullStyles.iconWrapActive]}>
        <Icon
          name={item.icon as any}
          size={18}
          color={active ? '#fff' : colors.icon.muted}
        />
      </View>
      <Text
        style={[fullStyles.label, active && { color: colors.brand.primary, fontWeight: '700' }]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {active && <View style={fullStyles.activeDot} />}
    </TouchableOpacity>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────
export default function QuanLySidebar({ isWide }: QuanLySidebarProps) {
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userRole } = useAuth();
  const { isTabletPortrait, sidebarWidth } = useResponsive();

  if (!isWide) return null;

  const currentPath = '/' + segments.join('/');
  const collapsed = isTabletPortrait; // 64px icon-only on iPad portrait

  function isActive(path: string) {
    if (path === '/quan-ly') return currentPath === '/quan-ly';
    return currentPath.startsWith(path);
  }

  function navigate(path: string) {
    router.push(path as any);
  }

  return (
    <View style={[styles.container, { width: sidebarWidth, paddingTop: insets.top }]}>
      {/* Orange accent bar */}
      <View style={styles.accentBar} />

      {/* Brand / Logo */}
      <View style={[styles.brandRow, collapsed && styles.brandRowCollapsed]}>
        <Image source={ASSETS.brand.logoMark} style={styles.logo} resizeMode="contain" />
        {!collapsed && (
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName} numberOfLines={1}>POS F&B</Text>
            <Text style={styles.brandRole} numberOfLines={1}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Navigation */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          collapsed && styles.scrollCollapsed,
        ]}
      >
        {NAV_SECTIONS.map((section) => (
          <View key={section.label} style={styles.section}>
            {/* Section label — hidden on collapsed */}
            {!collapsed && (
              <Text style={styles.sectionLabel}>{section.label}</Text>
            )}
            {/* Divider on collapsed */}
            {collapsed && <View style={styles.collapsedDivider} />}

            {section.items.map((item) => {
              const active = isActive(item.path);
              return collapsed ? (
                <IconItem
                  key={item.key}
                  item={item}
                  active={active}
                  onPress={() => navigate(item.path)}
                />
              ) : (
                <FullItem
                  key={item.key}
                  item={item}
                  active={active}
                  onPress={() => navigate(item.path)}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Shared Styles ───────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
    flexDirection: 'column',
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.brand.primary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  brandRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logo: {
    width: 34,
    height: 34,
  },
  brandName: {
    ...font.h4,
    color: colors.text.primary,
    fontWeight: '700',
  },
  brandRole: {
    ...font.badge,
    color: colors.text.muted,
    marginTop: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  scrollCollapsed: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  section: {
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: colors.text.muted,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 14,
    marginBottom: 2,
    marginTop: 4,
  },
  collapsedDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: 12,
    marginVertical: 4,
  },
});

// ─── Icon-only styles ────────────────────────────────────────
const iconStyles = StyleSheet.create({
  item: {
    width: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemActive: {
    backgroundColor: colors.brand.primaryBg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.disabled,
  },
  iconWrapActive: {
    backgroundColor: colors.brand.primary,
  },
  activeDot: {
    position: 'absolute',
    right: 6,
    top: '50%',
    width: 4,
    height: 4,
    backgroundColor: colors.brand.primary,
  },
});

// ─── Full label styles ───────────────────────────────────────
const fullStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginHorizontal: 6,
    minHeight: 40,
  },
  itemActive: {
    backgroundColor: colors.brand.primaryBg,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.disabled,
  },
  iconWrapActive: {
    backgroundColor: colors.brand.primary,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.brand.primary,
  },
});
