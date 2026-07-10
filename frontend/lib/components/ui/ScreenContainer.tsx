import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, shape } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  maxWidth?: number;          // centered container cap (default 1100)
  padding?: number;           // horizontal padding override
  useSafeArea?: boolean;      // wrap in SafeAreaView (default true)
  contentContainerStyle?: any;
}

/**
 * Standard screen wrapper used across the Kế toán & Thuế module.
 * - Wraps SafeArea (left/right/bottom)
 * - Centers content with a responsive max-width on iPad/desktop
 * - Applies consistent horizontal padding from useResponsive
 */
export default function ScreenContainer({
  children,
  maxWidth = 1100,
  padding,
  useSafeArea = true,
  contentContainerStyle,
}: ScreenContainerProps) {
  const { isWide, hPad } = useResponsive();
  const horizontal = padding ?? (isWide ? 16 : 12);

  const inner = (
    <View
      style={[
        styles.inner,
        { paddingHorizontal: horizontal, maxWidth: isWide ? maxWidth : undefined, alignSelf: isWide ? 'center' : 'stretch', width: '100%' },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {inner}
      </SafeAreaView>
    );
  }
  return <View style={[styles.container, { backgroundColor: colors.surface.app }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  inner: { flex: 1, backgroundColor: colors.surface.app },
});
