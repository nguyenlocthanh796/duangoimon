import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import AppText from '../ui/AppText';

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
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="chart-donut" size={18} color={colors.brand.primary} />
          <AppText style={{ ...font.sectionTitle, color: colors.text.primary }}>Mật độ bàn ăn</AppText>
        </View>
        <AppText style={{ ...font.captionItalic, color: colors.text.secondary }}>
          {coKhach}/{total} bàn đang dùng
        </AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.surface.app,
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        {pctTrong > 0 && (
          <View style={{ width: `${pctTrong}%`, height: '100%', backgroundColor: colors.status.success }} />
        )}
        {pctCoKhach > 0 && (
          <View style={{ width: `${pctCoKhach}%`, height: '100%', backgroundColor: colors.brand.primary }} />
        )}
        {pctDaDat > 0 && (
          <View style={{ width: `${pctDaDat}%`, height: '100%', backgroundColor: colors.text.muted }} />
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.success }} />
          <AppText variant="md" color={colors.text.secondary}>Trống: <AppText variant="md" weight="bold" color={colors.text.primary}>{trong}</AppText></AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.primary }} />
          <AppText variant="md" color={colors.text.secondary}>Có khách: <AppText variant="md" weight="bold" color={colors.brand.primary}>{coKhach}</AppText></AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.muted }} />
          <AppText variant="md" color={colors.text.secondary}>Đã đặt: <AppText variant="md" weight="bold" color={colors.text.primary}>{daDat}</AppText></AppText>
        </View>
      </View>
    </View>
  );
}
