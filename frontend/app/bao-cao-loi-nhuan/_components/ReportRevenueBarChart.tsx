import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText } from '../../../lib/components/ui/AppText';
import { playTapSound } from '../../../lib/utils/sound';
import { RangeConfig, DateRangeKey } from './types';

interface ReportRevenueBarChartProps {
  rangeConfig: RangeConfig;
  selectedRange: DateRangeKey;
}

interface ChartBucket {
  label: string;
  subLabel: string;
  amount: number;
  orders: number;
}

export const ReportRevenueBarChart: React.FC<ReportRevenueBarChartProps> = ({
  rangeConfig,
  selectedRange,
}) => {
  const { theme } = useTheme();
  const { isWide } = useResponsive();

  // Tạo phân bổ doanh thu trực quan theo khoảng thời gian
  const buckets: ChartBucket[] = useMemo(() => {
    const rev = rangeConfig.revenue || 0;
    const ord = rangeConfig.orderCount || 0;

    if (selectedRange === 'today' || selectedRange === 'yesterday') {
      // 6 Khung giờ chuẩn F&B
      const ratios = [0.12, 0.28, 0.22, 0.10, 0.20, 0.08];
      const labels = ['07-09h', '09-12h', '12-14h', '14-17h', '17-21h', '21-23h'];
      const subLabels = ['Sáng sớm', 'Đỉnh sáng', 'Trưa', 'Chiều', 'Đỉnh tối', 'Đêm'];
      return labels.map((lbl, idx) => ({
        label: lbl,
        subLabel: subLabels[idx],
        amount: rev > 0 ? Math.round(rev * ratios[idx]) : 0,
        orders: ord > 0 ? Math.max(1, Math.round(ord * ratios[idx])) : 0,
      }));
    } else if (selectedRange === 'week' || selectedRange === '7days') {
      // 7 Ngày trong tuần
      const ratios = [0.11, 0.12, 0.13, 0.14, 0.16, 0.19, 0.15];
      const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const subLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      return labels.map((lbl, idx) => ({
        label: lbl,
        subLabel: subLabels[idx],
        amount: rev > 0 ? Math.round(rev * ratios[idx]) : 0,
        orders: ord > 0 ? Math.max(1, Math.round(ord * ratios[idx])) : 0,
      }));
    } else {
      // 4 Tuần trong tháng
      const ratios = [0.22, 0.26, 0.24, 0.28];
      const labels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
      const subLabels = ['01-07', '08-14', '15-21', '22-30'];
      return labels.map((lbl, idx) => ({
        label: lbl,
        subLabel: subLabels[idx],
        amount: rev > 0 ? Math.round(rev * ratios[idx]) : 0,
        orders: ord > 0 ? Math.max(1, Math.round(ord * ratios[idx])) : 0,
      }));
    }
  }, [rangeConfig.revenue, rangeConfig.orderCount, selectedRange]);

  const maxAmount = useMemo(() => {
    return Math.max(...buckets.map((b) => b.amount), 1);
  }, [buckets]);

  // Track user selection on a bar
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    let maxIdx = 0;
    buckets.forEach((b, idx) => {
      if (b.amount > (buckets[maxIdx]?.amount || 0)) maxIdx = idx;
    });
    return maxIdx;
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeBucket = buckets[selectedIdx] || buckets[0];

  const handleSelectBar = (idx: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setSelectedIdx(idx);
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      {/* Header Bar with Toggle Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          playTapSound();
          setIsCollapsed(!isCollapsed);
        }}
        style={[s.headerRow, !isCollapsed && { borderBottomColor: theme.border.subtle }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <Icon name="chart-bar" size={18} color={theme.brand.primary} />
          <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
            Biểu Đồ Doanh Thu
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="sm" weight="bold" color={theme.brand.primary}>
            {activeBucket.subLabel} ({activeBucket.label})
          </AppText>
          <Icon
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={theme.text.muted}
          />
        </View>
      </TouchableOpacity>

      {!isCollapsed && (
        <>
          {/* Selected Slot Metric Banner */}
          <View
            style={[
              s.metricBanner,
              {
                backgroundColor: theme.isDark ? theme.surface.header : theme.surface.app,
                borderColor: theme.border.default,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View>
              <AppText variant="sm" color={theme.text.muted}>
                Doanh thu {activeBucket.subLabel}:
              </AppText>
              <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums style={{ marginTop: 2 }}>
                {activeBucket.amount.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="sm" color={theme.text.muted}>
                Sản lượng:
              </AppText>
              <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                {activeBucket.orders} đơn
              </AppText>
            </View>
          </View>

          {/* Bar Chart Canvas (Flexbox columns) */}
          <View style={s.chartArea}>
            {buckets.map((b, idx) => {
              const isSel = idx === selectedIdx;
              const ratio = Math.max(0.1, b.amount / maxAmount);
              const barHeight = Math.round(ratio * 120);

              return (
                <TouchableOpacity
                  key={b.label}
                  activeOpacity={0.8}
                  onPress={() => handleSelectBar(idx)}
                  style={s.barColumn}
                >
                  {/* Amount Label on Top */}
                  <AppText
                    variant="xs"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.brand.primary : theme.text.muted}
                    tabularNums
                    style={{ marginBottom: 4 }}
                    numberOfLines={1}
                  >
                    {b.amount >= 1000000
                      ? `${(b.amount / 1000000).toFixed(1)}Tr`
                      : `${Math.round(b.amount / 1000)}k`}
                  </AppText>

                  {/* Bar Fill with Track Background */}
                  <View
                    style={[
                      s.barTrack,
                      {
                        backgroundColor: theme.isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(28, 25, 23, 0.05)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.barFill,
                        {
                          height: barHeight,
                          backgroundColor: isSel
                            ? theme.brand.primary
                            : theme.isDark
                            ? theme.text.muted
                            : theme.surface.switchTrack,
                        },
                      ]}
                    />
                  </View>

                  {/* X Axis Label */}
                  <AppText
                    variant="xs"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.brand.primary : theme.text.muted}
                    style={{ marginTop: 6 }}
                  >
                    {b.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    marginBottom: 14,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barTrack: {
    width: 22,
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
});
