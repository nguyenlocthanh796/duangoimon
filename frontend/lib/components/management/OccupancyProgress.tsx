import { View, Text } from 'react-native';
import { colors, font } from '../../theme';

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ ...font.h3, color: colors.text.primary }}>📊 Mật độ bàn ăn</Text>
        <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>{coKhach}/{total} bàn đang dùng</Text>
      </View>

      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, backgroundColor: colors.surface.disabled, overflow: 'hidden', marginBottom: 14 }}>
        {pctTrong > 0 && <View style={{ width: `${pctTrong}%`, height: '100%', backgroundColor: '#10B981' }} />}
        {pctCoKhach > 0 && <View style={{ width: `${pctCoKhach}%`, height: '100%', backgroundColor: '#F97316' }} />}
        {pctDaDat > 0 && <View style={{ width: `${pctDaDat}%`, height: '100%', backgroundColor: '#64748B' }} />}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>Trống: {trong}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316' }} />
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>Có khách: {coKhach}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#64748B' }} />
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>Đã đặt: {daDat}</Text>
        </View>
      </View>
    </View>
  );
}
