import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import UnifiedHeader from '../ui/UnifiedHeader';
import { useSidebar } from '../../context/SidebarContext';
import { useResponsive } from '../../hooks/useResponsive';

interface ScreenLayoutProps {
  children: React.ReactNode;
  /** Tiêu đề của Header. Nếu có, sẽ tự render UnifiedHeader */
  title?: string;
  subtitle?: string;
  icon?: string;
  /** Nếu không truyền, mặc định gọi openSidebar() */
  onMenuPress?: () => void;
  /** Bật/tắt cuộn (Mặc định: true) */
  scrollable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentContainerStyle?: any;
  /** Right action element for Header */
  headerRight?: React.ReactNode;
  onBackPress?: () => void;
  backLabel?: string;
  compactHeader?: boolean;
}

export default function ScreenLayout({
  children,
  title,
  subtitle,
  icon = 'apps',
  onMenuPress,
  scrollable = true,
  onRefresh,
  refreshing = false,
  contentContainerStyle,
  headerRight,
  onBackPress,
  backLabel,
  compactHeader = false,
}: ScreenLayoutProps) {
  const { openSidebar } = useSidebar();
  const { pad } = useResponsive();

  const handleMenuPress = onMenuPress || openSidebar;

  const content = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: pad.screen, paddingBottom: 40, gap: pad.gap }, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: pad.screen, paddingBottom: 40, gap: pad.gap }, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {title && (
        <UnifiedHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          onMenuPress={handleMenuPress}
          right={headerRight}
          onBackPress={onBackPress}
          backLabel={backLabel}
          compact={compactHeader}
        />
      )}
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
});
