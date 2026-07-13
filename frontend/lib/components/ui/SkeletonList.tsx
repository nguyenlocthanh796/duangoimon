import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBox from './SkeletonBox';
import { colors, shape } from '../../theme';

interface SkeletonListProps {
  count?: number;
  /** Use card layout (mobile) or row layout (wide). */
  variant?: 'card' | 'row';
}

/**
 * Reusable skeleton placeholder for list/dashboard screens.
 * Keeps the first paint consistent with the real content layout so
 * users perceive a fast, premium load (no layout shift).
 */
export default function SkeletonList({ count = 4, variant = 'card' }: SkeletonListProps) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.item, variant === 'row' && styles.itemRow]}>
          <SkeletonBox w={46} h={46} borderRadius={shape.radius.md} />
          <View style={styles.lines}>
            <SkeletonBox w="70%" h={14} borderRadius={6} />
            <SkeletonBox w="45%" h={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
          <SkeletonBox w={64} h={28} borderRadius={shape.radius.full} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 12, gap: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 12,
  },
  itemRow: { borderRadius: shape.radius.md },
  lines: { flex: 1, gap: 0 },
});
