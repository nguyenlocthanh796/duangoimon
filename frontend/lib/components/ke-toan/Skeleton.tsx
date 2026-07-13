import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, shape } from '../../theme';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = shape.radius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={[styles.box, { width, height, borderRadius: radius, opacity }, style]} />
  );
}

export function SkeletonList({
  count = 4,
  rowHeight = 64,
  gap = 12,
}: {
  count?: number;
  rowHeight?: number;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={rowHeight} radius={shape.radius.md} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface.disabled },
});
