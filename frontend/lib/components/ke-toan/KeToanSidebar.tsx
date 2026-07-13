import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';
import { useSegments, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ASSETS } from '../../assets';

const NAV_ITEMS = [
  { key: 'hub', path: '/ke-toan', icon: 'chart-box-outline', label: 'Tổng quan' },
  { key: 'thu-chi', path: '/ke-toan/thu-chi', icon: 'swap-vertical', label: 'Thu Chi' },
  { key: 'invoices', path: '/ke-toan/invoices', icon: 'receipt', label: 'Hóa đơn VAT' },
  { key: 'tier', path: '/ke-toan/thue/tier', icon: 'chart-bell-curve', label: 'Phân Tầng HKD' },
  {
    key: 'so-sach',
    path: '/ke-toan/thue/so-sach',
    icon: 'book-open-page-variant',
    label: 'Sổ Kế Toán',
  },
  {
    key: 'declaration',
    path: '/ke-toan/thue/declaration',
    icon: 'file-document-edit',
    label: 'Kê Khai Thuế',
  },
  { key: 'bank', path: '/ke-toan/thue/bank-accounts', icon: 'bank', label: 'TK Ngân Hàng' },
  { key: 'deadlines', path: '/ke-toan/thue/deadlines', icon: 'calendar-alert', label: 'Hạn Nộp' },
  {
    key: 'legacy',
    path: '/ke-toan/thue/legacy',
    icon: 'package-variant-closed',
    label: 'Chuyển Tiếp',
  },
];

const ROLE_INFO: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  admin: { label: 'Quản trị viên', color: '#7C3AED', bg: '#F5F3FF', emoji: '👑' },
  manager: { label: 'Quản lý', color: '#2563EB', bg: '#EFF6FF', emoji: '🏢' },
  accountant: { label: 'Kế toán', color: '#059669', bg: '#ECFDF5', emoji: '📊' },
  cashier: { label: 'Thu ngân', color: '#D97706', bg: '#FFFBEB', emoji: '💵' },
  kitchen: { label: 'Nhà bếp', color: '#DC2626', bg: '#FEF2F2', emoji: '🍳' },
};

function isPathActive(path: string, segments: string[]): boolean {
  const parts = path.replace('/ke-toan/', '').split('/').filter(Boolean);
  if (parts.length === 0) {
    return segments.length === 1 && segments[0] === 'ke-toan';
  }
  if (segments.length < parts.length + 1) return false;
  return parts.every((p, i) => segments[i + 1] === p);
}

export default function KeToanSidebar({ isWide }: { isWide: boolean }) {
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userRole, username, logout } = useAuth();
  const roleInfo = ROLE_INFO[userRole] ?? {
    label: userRole,
    color: '#64748B',
    bg: '#F1F5F9',
    emoji: '❓',
  };

  // System navigation items by role (mirrors menuByRole in Sidebar.tsx)
  const systemItems: { path: string; icon: string; label: string }[] = [];
  if (userRole === 'admin' || userRole === 'manager') {
    systemItems.push({ path: '/ban-hang', icon: 'cash-register', label: 'Bán hàng (POS)' });
  }
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'accountant') {
    systemItems.push({ path: '/quan-ly', icon: 'cog-outline', label: 'Quản lý' });
  }

  const navigate = (path: string) => router.push(path as any);

  return (
    <View style={[styles.container, { paddingTop: Math.max(12, insets.top) }]}>
      {/* Header brand + User card (matched Sidebar.tsx L108-137) */}
      <View style={styles.header}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image
              source={ASSETS.brand.logoMark}
              style={{ width: 40, height: 40, borderRadius: shape.radius.sm }}
              resizeMode="contain"
            />
            <View>
              <Text style={{ ...font.h3, color: colors.text.primary }}>POS Pro</Text>
              <Text style={{ ...font.caption, color: colors.text.muted }}>Kế toán & Thuế</Text>
            </View>
          </View>
        </View>
        {username ? (
          <View style={styles.userCard}>
            <View style={[styles.userAvatar, { backgroundColor: roleInfo.bg }]}>
              <Text style={{ fontSize: 18 }}>{roleInfo.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...font.bodyBold, color: colors.text.primary }} numberOfLines={1}>
                {username}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                <Text style={{ ...font.badge, color: roleInfo.color }}>
                  {roleInfo.label.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* Navigation — ScrollView */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Kế toán section */}
        <Text style={styles.groupLabel}>KẾ TOÁN & THUẾ</Text>
        {NAV_ITEMS.map((item) => {
          const active = isPathActive(item.path, segments as string[]);
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => navigate(item.path)}
              activeOpacity={0.7}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <View style={[styles.navIcon, active && styles.navIconActive]}>
                <Icon
                  name={item.icon as any}
                  size={20}
                  color={active ? '#fff' : colors.icon.muted}
                />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* System section (by role) */}
        {systemItems.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.groupLabel}>HỆ THỐNG</Text>
            {systemItems.map((item) => (
              <TouchableOpacity
                key={item.path}
                onPress={() => navigate(item.path)}
                activeOpacity={0.7}
                style={styles.navItem}
              >
                <View style={[styles.navIcon, { backgroundColor: colors.surface.disabled }]}>
                  <Icon name={item.icon as any} size={20} color={colors.icon.muted} />
                </View>
                <Text style={styles.navLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Logout (matched Sidebar.tsx L200-208) */}
      <View style={[styles.logoutWrap, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <TouchableOpacity
          onPress={() => logout()}
          activeOpacity={0.7}
          style={styles.logoutBtn}
          accessibilityLabel="Đăng xuất"
        >
          <View style={styles.logoutIcon}>
            <Icon name="logout" size={20} color={colors.text.danger} />
          </View>
          <Text style={{ ...font.button, color: colors.text.danger }}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    backgroundColor: colors.surface.card,
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
    boxShadow: '8px 0 24px rgba(15, 23, 42, 0.12)',
    elevation: 12,
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: shape.radius.full,
  },
  groupLabel: {
    ...font.badge,
    color: colors.text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    marginBottom: 6,
    marginTop: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 0,
    borderRadius: shape.radius.md,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: colors.brand.primaryBg,
    borderWidth: 1,
    borderColor: colors.border.brand,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: colors.brand.primary,
  },
  navLabel: {
    ...font.body,
    color: colors.text.primary,
    fontWeight: '400',
  },
  navLabelActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  logoutWrap: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.danger,
    borderWidth: 1,
    borderColor: colors.border.danger,
    minHeight: 52,
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
});
