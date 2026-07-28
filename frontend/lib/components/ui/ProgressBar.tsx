import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0 to 100
  barColor?: string;
  height?: number;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  barColor = colors.brand.primary,
  height = 8,
  style,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
