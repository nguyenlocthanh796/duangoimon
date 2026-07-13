import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Sidebar from '../../lib/components/Sidebar';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors } from '../../lib/theme';
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

export default function BanHangLayout() {
  const { isWide } = useResponsive();

  return (
    <View style={s.container}>
      <View style={s.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {/* Overlay sidebar for all screen sizes — no persistent mode */}
      <Sidebar isWide={isWide} sections={getSections('ban-hang')} />
    </View>
  );
}
