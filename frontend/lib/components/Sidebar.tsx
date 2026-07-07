import { View, Text, TouchableOpacity, Image, Animated, useWindowDimensions } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSETS } from '../assets';

interface MenuItemType {
  path: string; icon: string; label: string; description: string;
  isActive: (segments: string[]) => boolean;
}
interface MenuGroup { groupLabel?: string; items: MenuItemType[]; }

const allMenuItems: Record<string, MenuItemType> = {
  pos:      { path: '/ban-hang',          icon: 'cash-register',       label: 'Thu Ngân (POS)', description: 'Bàn & đặt món',        isActive: (segs) => segs[0] === 'ban-hang' && segs[1] !== 'kitchen' },
  kitchen:  { path: '/ban-hang/kitchen',   icon: 'chef-hat',           label: 'Nhà Bếp',        description: 'Quản lý order bếp',   isActive: (segs) => segs[0] === 'ban-hang' && segs[1] === 'kitchen' },
  keToan:   { path: '/ke-toan',            icon: 'wallet-outline',     label: 'Kế Toán',        description: 'Thu chi & giao dịch', isActive: (segs) => segs[0] === 'ke-toan' && !segs[1] },
  invoices: { path: '/ke-toan/invoices',   icon: 'receipt',            label: 'Hóa đơn VAT',    description: 'Xuất & quản lý HĐ',   isActive: (segs) => segs[0] === 'ke-toan' && segs[1] === 'invoices' },
  quanLy:   { path: '/quan-ly',            icon: 'cog-outline',        label: 'Quản Lý',        description: 'Menu & nhân sự',     isActive: (segs) => segs[0] === 'quan-ly' && !segs[1] },
  recipes:  { path: '/quan-ly/recipes',    icon: 'flask-outline',      label: 'Công Thức',      description: 'Recipe BOM & giá thành', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'recipes' },
  stock:    { path: '/quan-ly/stock',      icon: 'package-variant-closed', label: 'Tồn Kho',    description: 'Nguyên liệu & nhập hàng', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'stock' },
  suppliers: { path: '/quan-ly/suppliers',  icon: 'truck-delivery',     label: 'Nhà Cung Cấp', description: 'NCC & đơn đặt hàng',  isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'suppliers' },
  purchaseOrders: { path: '/quan-ly/purchase-orders', icon: 'file-document-outline', label: 'Đơn Đặt Hàng', description: 'PO & nhập kho', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'purchase-orders' },
  shifts: { path: '/quan-ly/shifts', icon: 'clock-outline', label: 'Ca Làm Việc', description: 'Mở/kết ca & doanh thu', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'shifts' },
  audit: { path: '/quan-ly/audit', icon: 'clipboard-text-outline', label: 'Audit Log', description: 'Lịch sử thao tác', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'audit' },
  booking: { path: '/quan-ly/booking', icon: 'calendar-text', label: 'Đặt Bàn', description: 'Quản lý đặt bàn trước', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'booking' },
  customers: { path: '/quan-ly/customers', icon: 'account-group', label: 'Khách Hàng', description: 'CRM & lịch sử KH', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'customers' },
  marketing: { path: '/quan-ly/marketing', icon: 'bullhorn', label: 'Marketing', description: 'Chiến dịch & gửi tin', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'marketing' },
  membership: { path: '/quan-ly/membership', icon: 'crown', label: 'Hội Viên', description: 'Hạng & tích điểm', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'membership' },
  promo: { path: '/quan-ly/promo', icon: 'ticket-percent', label: 'Khuyến Mãi', description: 'Voucher & quy tắc KM', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'promo' },
  menuEng: { path: '/quan-ly/menu-eng', icon: 'chart-pie', label: 'Menu Eng.', description: 'BCG matrix & top/bottom', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'menu-eng' },
  biReports: { path: '/quan-ly/bi-reports', icon: 'chart-box-outline', label: 'BI Reports', description: 'Báo cáo doanh thu & food cost', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'bi-reports' },
  execDashboard: { path: '/quan-ly/exec-dashboard', icon: 'view-dashboard', label: 'Exec Dashboard', description: 'Dashboard lãnh đạo', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'exec-dashboard' },
  stations: { path: '/quan-ly/stations', icon: 'stove', label: 'Trạm Bếp', description: 'Phân luồng món & máy in', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'stations' },
  branches: { path: '/quan-ly/branches', icon: 'domain', label: 'Chi Nhánh', description: 'Quản lý chi nhánh', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'branches' },
  forecast: { path: '/quan-ly/forecast', icon: 'chart-timeline-variant', label: 'Dự Báo', description: 'Dự báo nhu cầu', isActive: (segs) => segs[0] === 'quan-ly' && segs[1] === 'forecast' },
};

const menuByRole: Record<string, MenuGroup[]> = {
  cashier:    [{ groupLabel: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen] }],
  kitchen:    [{ groupLabel: 'Nhà Bếp',  items: [allMenuItems.kitchen] }],
  accountant: [{ groupLabel: 'Kế Toán',  items: [allMenuItems.keToan, allMenuItems.invoices] }, { groupLabel: 'Quản Lý', items: [allMenuItems.quanLy] }],
  admin:      [{ groupLabel: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen] }, { groupLabel: 'Kế Toán', items: [allMenuItems.keToan, allMenuItems.invoices] }, { groupLabel: 'Quản Lý', items: [allMenuItems.quanLy, allMenuItems.recipes, allMenuItems.stock, allMenuItems.suppliers, allMenuItems.purchaseOrders, allMenuItems.shifts, allMenuItems.booking, allMenuItems.customers, allMenuItems.membership, allMenuItems.promo, allMenuItems.marketing, allMenuItems.menuEng, allMenuItems.biReports, allMenuItems.execDashboard, allMenuItems.forecast, allMenuItems.stations, allMenuItems.branches, allMenuItems.audit] }],
  manager:    [{ groupLabel: 'Bán Hàng', items: [allMenuItems.pos, allMenuItems.kitchen] }, { groupLabel: 'Kế Toán', items: [allMenuItems.keToan, allMenuItems.invoices] }, { groupLabel: 'Quản Lý', items: [allMenuItems.quanLy, allMenuItems.recipes, allMenuItems.stock, allMenuItems.suppliers, allMenuItems.purchaseOrders, allMenuItems.shifts, allMenuItems.booking, allMenuItems.customers, allMenuItems.membership, allMenuItems.promo, allMenuItems.marketing, allMenuItems.menuEng, allMenuItems.biReports, allMenuItems.execDashboard, allMenuItems.forecast, allMenuItems.stations, allMenuItems.branches, allMenuItems.audit] }],
};

const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  admin:       { label: 'Quản trị viên', color: '#7C3AED', bg: '#F5F3FF' },
  manager:     { label: 'Quản lý',       color: '#2563EB', bg: '#EFF6FF' },
  accountant:  { label: 'Kế toán',       color: '#059669', bg: '#ECFDF5' },
  cashier:     { label: 'Thu ngân',     color: '#D97706', bg: '#FFFBEB' },
  kitchen:     { label: 'Nhà bếp',      color: '#DC2626', bg: '#FEF2F2' },
};

export default function Sidebar() {
  const { userRole, username, logout } = useAuth();
  const { isOpen, closeSidebar } = useSidebar();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const sidebarWidth = Math.min(300, screenWidth * 0.8);

  const translateX = useRef(new Animated.Value(-sidebarWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(isOpen);

  useEffect(() => { if (isOpen) setRendered(true); }, [isOpen]);

  useEffect(() => {
    if (!rendered) return;
    Animated.parallel([
      Animated.timing(translateX, { toValue: isOpen ? 0 : -sidebarWidth, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: isOpen ? 1 : 0, duration: 280, useNativeDriver: true }),
    ]).start(() => { if (!isOpen) setRendered(false); });
  }, [isOpen, rendered, sidebarWidth]);

  useEffect(() => { if (!isOpen) translateX.setValue(-sidebarWidth); }, [sidebarWidth, isOpen]);

  if (!rendered) return null;

  const groups: MenuGroup[] = menuByRole[userRole] ?? [];
  const roleInfo = ROLE_DISPLAY[userRole] ?? { label: userRole, color: '#64748B', bg: '#F1F5F9' };
  const navigate = (path: string) => { router.push(path as any); closeSidebar(); };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 400 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', opacity: overlayOpacity }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: sidebarWidth, backgroundColor: colors.surface.card, shadowColor: '#0F172A', shadowOffset: { width: 8, height: 0 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12, transform: [{ translateX }], flexDirection: 'column' }}>
        
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: Math.max(24, insets.top), paddingBottom: 20, backgroundColor: colors.surface.app, borderBottomWidth: 1, borderBottomColor: colors.border.light }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={ASSETS.brand.logoMark} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="contain" />
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text.primary, letterSpacing: -0.5 }}>POS Pro</Text>
                <Text style={{ fontSize: 11, color: colors.text.muted, fontWeight: '500' }}>Hệ thống quản lý F&B</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeSidebar} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Đóng menu">
              <Icon name="close" size={18} color={colors.icon.muted} />
            </TouchableOpacity>
          </View>

          {username ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.light }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: roleInfo.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16 }}>{userRole === 'admin' ? '👑' : userRole === 'manager' ? '🏢' : userRole === 'accountant' ? '📊' : userRole === 'kitchen' ? '🍳' : '💵'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>{username}</Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: roleInfo.bg }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: roleInfo.color }}>{roleInfo.label.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Navigation */}
        <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}>
          {groups.map((group, gi) => (
            <View key={gi} style={{ marginBottom: 8 }}>
              {group.groupLabel && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 8, marginBottom: 6, marginTop: gi > 0 ? 8 : 0 }}>
                  {group.groupLabel}
                </Text>
              )}
              {group.items.map((item, idx) => {
                const active = item.isActive(segments as string[]);
                return (
                  <TouchableOpacity key={idx} onPress={() => navigate(item.path)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, marginBottom: 2, backgroundColor: active ? colors.brand.primaryBg : 'transparent', borderWidth: 1, borderColor: active ? colors.border.brand : 'transparent', minHeight: 52 }}
                    accessibilityLabel={item.label}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.brand.primary : colors.surface.disabled }}>
                      <Icon name={item.icon as any} size={20} color={active ? colors.text.inverse : colors.icon.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.brand.primary : colors.text.primary }}>{item.label}</Text>
                      <Text style={{ fontSize: 11, color: active ? colors.brand.primary : colors.text.muted, fontWeight: '500', marginTop: 1 }}>{item.description}</Text>
                    </View>
                    {active && <Icon name="chevron-right" size={18} color={colors.brand.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Logout */}
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border.light, paddingBottom: Math.max(16, insets.bottom) }}>
          <TouchableOpacity onPress={() => { closeSidebar(); logout(); }} activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.surface.danger, borderWidth: 1, borderColor: colors.border.danger, minHeight: 52 }}
            accessibilityLabel="Đăng xuất">
            <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2' }}>
              <Icon name="logout" size={20} color={colors.text.danger} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.danger }}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
