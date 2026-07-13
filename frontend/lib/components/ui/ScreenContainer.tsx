import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { colors } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  maxWidth?: number; // centered container cap (default 1100)
  padding?: number; // horizontal padding override
  useSafeArea?: boolean; // wrap in SafeAreaView (default true)
  contentContainerStyle?: any;
  accentBorder?: 'top' | 'left' | 'none'; // orange accent
}

/**
 * Standard screen wrapper - flat design, iPhone/iPad safe areas.
 * - iPhone: smaller padding, safe area insets for notch/Dynamic Island
 * - iPad: wider padding, centered max-width container
 * - Orange accent border option for section headers
 */
export default function ScreenContainer({
  children,
  maxWidth = 1100,
  padding,
  useSafeArea = true,
  contentContainerStyle,
  accentBorder = 'none',
}: ScreenContainerProps) {
  const { isWide, hPad } = useResponsive();
  const horizontal = padding ?? (!isWide ? 12 : isWide ? 24 : 16);

  // iPhone safe area offset
  const topInset = Platform.OS === 'web' ? 'var(--safe-top)' : 0;
  const bottomInset = Platform.OS === 'web' ? 'var(--safe-bottom)' : 0;

  const inner = (
    <View
      style={[
        styles.inner,
        {
          paddingHorizontal: horizontal,
          paddingTop: !isWide ? 8 : 16,
          paddingBottom: !isWide ? 8 : 16,
          maxWidth: isWide ? maxWidth : undefined,
          alignSelf: isWide ? 'center' : 'stretch',
          width: '100%',
        },
        accentBorder === 'top' && styles.accentTop,
        accentBorder === 'left' && styles.accentLeft,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['left', 'right', 'bottom']}
      >
        {inner}
      </SafeAreaView>
    );
  }
  return <View style={[styles.container, { backgroundColor: colors.surface.app }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  inner: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  accentTop: {
    borderTopWidth: 3,
    borderTopColor: colors.brand.primary,
  },
  accentLeft: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.primary,
    paddingLeft: 12,
  },
});
