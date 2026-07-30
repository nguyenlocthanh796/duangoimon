import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';

interface OccupancyProgressProps {
  trong: number;
  coKhach: number;
  daDat: number;
}

export default function OccupancyProgress({ trong, coKhach, daDat }: OccupancyProgressProps) {
  const total = trong + coKhach + daDat;
  if (total === 0) return null;
  const pctTrong = (trong / total) * 100;
  const pctCoKhach = (coKhach / total) * 100;
  const pctDaDat = (daDat / total) * 100;

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon name="chart-donut" size={18} color={colors.brand.primary} />
          <Text style={styles.sectionTitle}>Mật độ bàn ăn</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionSub}>{coKhach}/{total} bàn đang dùng</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.sectionBody}>
        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          {pctTrong > 0 && (
            <View style={{ width: `${pctTrong}%`, height: '100%', backgroundColor: '#10B981' }} />
          )}
          {pctCoKhach > 0 && (
            <View style={{ width: `${pctCoKhach}%`, height: '100%', backgroundColor: '#F97316' }} />
          )}
          {pctDaDat > 0 && (
            <View style={{ width: `${pctDaDat}%`, height: '100%', backgroundColor: '#64748B' }} />
          )}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>
              Trống: <Text style={styles.legendValue}>{trong}</Text>
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendText}>
              Có khách: <Text style={[styles.legendValue, { color: '#F97316' }]}>{coKhach}</Text>
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#64748B' }]} />
            <Text style={styles.legendText}>
              Đã đặt: <Text style={styles.legendValue}>{daDat}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E5E9F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
  },
  sectionBody: {
    padding: 10,
  },
  progressBarBg: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
