import { Tabs } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { View } from 'react-native';
import KeToanSidebar from './_sidebar';
import Sidebar from '../../lib/components/Sidebar';

const TAB_ICONS: Record<string, string> = {
  index: 'chart-box-outline',
  'thu-chi': 'swap-vertical',
  invoices: 'receipt',
  thue: 'file-document-multiple',
  'thue/deadlines': 'calendar-alert',
};

export default function KeToanLayout() {
  const { isWide } = useResponsive();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Sidebar persist on iPad landscape — Phase 2 */}
      {isWide && <KeToanSidebar isWide={isWide} />}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.brand.primary,
            tabBarInactiveTintColor: colors.text.muted,
            tabBarStyle: {
              backgroundColor: colors.surface.card,
              borderTopColor: colors.border.default,
              borderTopWidth: 1,
              display: isWide ? 'none' : 'flex',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            tabBarLabelStyle: { ...font.badge, fontWeight: '600' },
            tabBarIcon: ({ color, size }) => (
              <Icon name={(TAB_ICONS[route.name] || 'help-circle') as any} size={size} color={color} />
            ),
          })}
        >
          <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
          <Tabs.Screen name="thu-chi" options={{ title: 'Thu Chi' }} />
          <Tabs.Screen name="invoices" options={{ title: 'Hóa đơn' }} />
          <Tabs.Screen name="thue" options={{ title: 'Thuế' }} />
          <Tabs.Screen name="thue/deadlines" options={{ title: 'Hạn nộp' }} />
        </Tabs>
      </View>
      {!isWide && <Sidebar isWide={isWide} />}
    </View>
  );
}
