import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { usePreloadRoutes } from '../../lib/hooks/usePreloadRoutes';
import Sidebar from '../../lib/components/Sidebar';
import { getSections } from '../../lib/components/SidebarMenu';

const s = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});

export default function KeToanLayout() {
  const { isWide } = useResponsive();
  usePreloadRoutes('ke-toan');

  return (
    <View style={s.container}>
      {/* Sidebar persist on iPad landscape */}
      {isWide && <Sidebar isWide={isWide} persistent sections={getSections('ke-toan')} />}
      <View style={s.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {!isWide && <Sidebar isWide={isWide} sections={getSections('ke-toan')} />}
    </View>
  );
}
