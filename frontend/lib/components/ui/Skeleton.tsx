import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { shape } from '../../theme/shape';

// ─── Shimmer animated bar ─────────────────────────────────
function ShimmerBar({ width, height = 14, style }: { width: number | string; height?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: 4, backgroundColor: '#E5E5E5' }, { opacity }, style]}
    />
  );
}

// ─── Table Skeleton (5 rows) ──────────────────────────────
export function TableSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <View style={styles.tableContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <ShimmerBar width="45%" height={12} />
        <ShimmerBar width="15%" height={12} />
        <ShimmerBar width="18%" height={12} />
      </View>
      {/* Rows */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <View key={i} style={styles.dataRow}>
          <View style={{ flex: 1 }}>
            <ShimmerBar width="70%" height={13} />
            <ShimmerBar width="40%" height={10} style={{ marginTop: 6 }} />
          </View>
          <ShimmerBar width={30} height={13} />
          <ShimmerBar width={60} height={22} />
        </View>
      ))}
    </View>
  );
}

// ─── Stats Bar Skeleton ───────────────────────────────────
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.statsBar}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <ShimmerBar width={30} height={16} />
            <ShimmerBar width={40} height={10} style={{ marginTop: 4 }} />
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Card Skeleton (for panelBox) ─────────────────────────
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ShimmerBar width={24} height={24} />
        <ShimmerBar width="50%" height={16} />
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <ShimmerBar width={60} height={32} />
        <ShimmerBar width={80} height={10} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

// ─── Filter Row Skeleton ──────────────────────────────────
export function FilterSkeleton({ chipCount = 5 }: { chipCount?: number }) {
  return (
    <View style={styles.filterRow}>
      {Array.from({ length: chipCount }).map((_, i) => (
        <ShimmerBar key={i} width={i === 0 ? 50 : i % 2 === 0 ? 65 : 55} height={28} style={{ borderRadius: 14 }} />
      ))}
    </View>
  );
}

// ─── Screen Loader (full page skeleton) ───────────────────
export function ScreenSkeleton({ showStats = true, showFilters = false }: { showStats?: boolean; showFilters?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {showStats && <StatsSkeleton />}
      {showFilters && <FilterSkeleton />}
      <TableSkeleton />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  tableContainer: {
    paddingHorizontal: shape.spacing.xs,
    paddingTop: shape.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5E5',
    gap: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: shape.spacing.sm,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  divider: {
    width: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: shape.spacing.xs,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
});
