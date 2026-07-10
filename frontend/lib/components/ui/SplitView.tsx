import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, shape } from '../../theme';

interface SplitViewProps {
  master: React.ReactNode;
  detail?: React.ReactNode;
  masterRatio?: number;       // fraction of width for master pane (default 0.38)
  showDetail?: boolean;       // when false (e.g. mobile with no selection) only master renders
  gap?: number;
}

/**
 * Master–Detail layout for iPad/desktop.
 * - Wide (≥ tablet-landscape): row [master flexRatio | divider | detail flex 1]
 * - Narrow (iPhone / portrait): only master; detail is shown via modal/navigation by caller
 */
export default function SplitView({
  master,
  detail,
  masterRatio = 0.38,
  showDetail = true,
  gap = 12,
}: SplitViewProps) {
  const { isWide } = useResponsive();

  if (!isWide || !showDetail || !detail) {
    return <View style={styles.single}>{master}</View>;
  }

  return (
    <View style={styles.row}>
      <View style={[styles.master, { flex: masterRatio }]}>{master}</View>
      <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
      <View style={[styles.detail, { flex: 1 - masterRatio }]}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  single: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', padding: 12 },
  master: { overflow: 'hidden' },
  detail: { overflow: 'hidden' },
  divider: { width: 1, marginHorizontal: 6 },
});
