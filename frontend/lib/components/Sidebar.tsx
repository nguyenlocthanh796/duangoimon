import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  useWindowDimensions,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSETS } from '../assets';
import { menuByRole } from './SidebarMenu';

// ─── Types ────────────────────────────────────────────────
export interface SidebarItem {
  path: string;
  icon: string;
  label: string;
  description?: string;
  isActive: (segments: string[]) => boolean;
}

export interface SidebarGroup {
  label?: string;
  items: (SidebarItem | SidebarSubGroup)[];
}

export interface SidebarSubGroup {
  label: string;
  items: SidebarItem[];
}

interface SidebarProps {
  isWide?: boolean;
  persistent?: boolean;
  sections?: SidebarGroup[];
}

const EXPANDED_W = 280;
const COLLAPSED_W = 72;

// ─── Logo header ──────────────────────────────────────────
function LogoHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      disabled={!onToggle}
      style={{
        paddingHorizontal: collapsed ? 12 : 20,
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        alignItems: collapsed ? 'center' : 'flex-start',
      }}
    >
      {collapsed ? (
        <View style={{ width: 40, height: 40, borderRadius: shape.radius.sm, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="storefront-outline" size={24} color={colors.brand.primary} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: shape.radius.sm, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="storefront-outline" size={22} color={colors.brand.primary} />
          </View>
          <View>
            <Text style={{ ...font.lg, color: colors.text.primary }}>OngChu POS</Text>
            <Text style={{ ...font.sm, color: colors.text.muted, marginTop: 1 }}>Hệ thống quản lý F&B</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Nav items ────────────────────────────────────────────
function NavItems({
  sections,
  segments,
  collapsed,
  onNavigate,
}: {
  sections: SidebarGroup[];
  segments: string[];
  collapsed: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: collapsed ? 8 : 12, paddingTop: 12, paddingBottom: 8 }}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((group, gi) => (
        <View key={gi} style={{ marginBottom: 8 }}>
          {group.label && !collapsed && (
            <Text
              style={{
                ...font.smBold,
                color: colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                paddingHorizontal: 8,
                marginBottom: 6,
                marginTop: gi > 0 ? 8 : 0,
              }}
            >
              {group.label}
            </Text>
          )}

          {group.items.map((item, idx) => {
            if ('items' in item && 'label' in item) {
              const sub = item as SidebarSubGroup;
              return (
                <View key={idx} style={{ marginBottom: 4 }}>
                  {!collapsed && (
                    <Text
                      style={{
                        ...font.smBold,
                        color: colors.text.muted,
                        paddingHorizontal: 14,
                        paddingVertical: 4,
                        marginTop: idx > 0 ? 4 : 0,
                      }}
                    >
                      {sub.label}
                    </Text>
                  )}
                  {sub.items.map((si, siIdx) => (
                    <NavItemRow
                      key={siIdx}
                      item={si}
                      active={si.isActive(segments)}
                      collapsed={collapsed}
                      onPress={() => onNavigate(si.path)}
                    />
                  ))}
                </View>
              );
            }

            const ri = item as SidebarItem;
            return (
              <NavItemRow
                key={idx}
                item={ri}
                active={ri.isActive(segments)}
                collapsed={collapsed}
                onPress={() => onNavigate(ri.path)}
              />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

function NavItemRow({
  item,
  active,
  collapsed,
  onPress,
}: {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
}) {
  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          borderRadius: shape.radius.md,
          marginBottom: 2,
          backgroundColor: active ? colors.brand.primaryBg : 'transparent',
          borderWidth: 1,
          borderColor: active ? colors.border.brand : 'transparent',
        }}
        accessibilityLabel={item.label}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: shape.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
          }}
        >
          <Icon
            name={item.icon as any}
            size={20}
            color={active ? colors.text.inverse : colors.icon.muted}
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      delayPressIn={0}
      activeOpacity={0.6}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: shape.radius.md,
        marginBottom: 2,
        backgroundColor: active ? colors.brand.primaryBg : 'transparent',
        borderWidth: 1,
        borderColor: active ? colors.border.brand : 'transparent',
        minHeight: 50,
      }}
      accessibilityLabel={item.label}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: shape.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
        }}
      >
        <Icon
          name={item.icon as any}
          size={20}
          color={active ? colors.text.inverse : colors.icon.muted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...font.md,
            color: active ? colors.brand.primary : colors.text.primary,
          }}
        >
          {item.label}
        </Text>
        {item.description && (
          <Text
            style={{
              ...font.sm,
              color: active ? colors.brand.primary : colors.text.muted,
              marginTop: 1,
            }}
          >
            {item.description}
          </Text>
        )}
      </View>
      {active && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.brand.primary,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Logout button ─────────────────────────────────────────
function LogoutButton({ collapsed, onClose }: { collapsed: boolean; onClose: (() => void) | null }) {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: collapsed ? 8 : 16,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 16),
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          onClose?.();
          logout();
        }}
        activeOpacity={0.7}
        style={{
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 6 : 12,
          paddingHorizontal: collapsed ? 0 : 14,
          paddingVertical: 13,
          borderRadius: shape.radius.md,
          backgroundColor: colors.surface.danger,
          borderWidth: 1,
          borderColor: colors.border.danger,
        }}
        accessibilityLabel="Đăng xuất"
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: shape.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FEE2E2',
          }}
        >
          <Icon name="logout" size={18} color={colors.text.danger} />
        </View>
        {!collapsed && (
          <Text style={{ ...font.mdBold, color: colors.text.danger }}>Đăng xuất</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── SidebarBody (inner) ──────────────────────────────────
function SidebarBody({
  width,
  collapsed,
  sections,
  onNavigate,
  onClose,
  onToggleCollapse,
}: {
  width: number;
  collapsed: boolean;
  sections: SidebarGroup[];
  onNavigate: (p: string) => void;
  onClose: (() => void) | null;
  onToggleCollapse?: () => void;
}) {
  const segments = useSegments();
  return (
    <View
      style={{
        width,
        height: '100%',
        backgroundColor: colors.surface.card,
        flexDirection: 'column',
        borderRightWidth: 1,
        borderRightColor: colors.border.default,
      }}
    >
      <View>
        <LogoHeader collapsed={collapsed} onToggle={onToggleCollapse} />
      </View>
      <NavItems sections={sections} segments={segments as string[]} collapsed={collapsed} onNavigate={onNavigate} />
      <LogoutButton collapsed={collapsed} onClose={onClose} />
    </View>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────
export default function Sidebar({ isWide = false, persistent = false, sections }: SidebarProps) {
  const { isOpen, closeSidebar, isCollapsed, toggleCollapse, openSidebar, setCollapsed } = useSidebar();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Default sections = based on user role
  const { userRole } = useAuth();
  const resolvedSections = sections ?? (menuByRole[userRole] ?? menuByRole.admin);

  // ── Docked-collapsed mode (non-POS modules on wide screens) ─────
  // Sidebar is always visible at 72px. Click logo to expand as overlay.
  // Only when persistent=true AND isWide, use this docked pattern.
  if (persistent && isWide) {
    const overlayOpen = isOpen;

    return (
      <>
        {/* Docked collapsed bar — always visible */}
        <View style={{ width: COLLAPSED_W, zIndex: 400 }}>
          <SidebarBody
            width={COLLAPSED_W}
            collapsed
            sections={resolvedSections}
            onNavigate={(p) => {
              router.push(p as any);
            }}
            onClose={null}
            onToggleCollapse={() => {
              openSidebar();
              setCollapsed(false);
            }}
          />
        </View>

        {/* Overlay expanded panel — slides over content */}
        {overlayOpen && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 500 }}>
            {/* Backdrop */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
              activeOpacity={1}
              onPress={closeSidebar}
            />
            {/* Expanded sidebar */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: EXPANDED_W,
                borderWidth: 1,
                borderColor: colors.border.default,
                boxShadow: '4px 0 16px rgba(15,23,42,0.1)',
              }}
            >
              <SidebarBody
                width={EXPANDED_W}
                collapsed={false}
                sections={resolvedSections}
                onNavigate={(p) => {
                  router.push(p as any);
                  closeSidebar();
                }}
                onClose={closeSidebar}
                onToggleCollapse={closeSidebar}
              />
            </View>
          </View>
        )}
      </>
    );
  }

  // ── Overlay mode (iPhone) ─────────────────────────────
  const collapsed = false;
  const sidebarWidth = EXPANDED_W;
  const translateX = useRef(new Animated.Value(-sidebarWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (isOpen) setRendered(true);
  }, [isOpen]);

  useEffect(() => {
    if (!rendered) return;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -sidebarWidth,
        duration: 280,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 280,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      if (!isOpen) setRendered(false);
    });
  }, [isOpen, rendered, sidebarWidth]);

  useEffect(() => {
    if (!isOpen) translateX.setValue(-sidebarWidth);
  }, [sidebarWidth, isOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        isOpen && gs.dx < -10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        const clamped = Math.max(-sidebarWidth, Math.min(0, gs.dx));
        translateX.setValue(clamped);
        overlayOpacity.setValue(Math.max(0, Math.min(1, 1 - Math.abs(gs.dx) / sidebarWidth)));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          closeSidebar();
        } else {
          Animated.parallel([
            Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
          ]).start();
        }
      },
    })
  ).current;

  const navigate = (path: string) => {
    router.push(path as any);
    closeSidebar();
  };

  if (!rendered) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 400 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          opacity: overlayOpacity,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarWidth,
          borderWidth: 1,
          borderColor: colors.border.default,
          boxShadow: '8px 0 24px rgba(15,23,42,0.12)',
          transform: [{ translateX }],
          flexDirection: 'column',
          zIndex: 500,
        }}
      >
        <SidebarBody
          width={sidebarWidth}
          collapsed={false}
          sections={resolvedSections}
          onNavigate={navigate}
          onClose={closeSidebar}
        />
      </Animated.View>
    </View>
  );
}
