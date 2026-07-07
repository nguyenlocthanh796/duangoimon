import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../../theme';

function formatVND(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k';
  return v + 'đ';
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[d.getDay()];
  } catch { return ''; }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch { return dateStr; }
}

type Daily = { date: string; orders: number; revenue: number };

export default function BarChart({ data }: { data: Daily[] }) {
  if (!data || data.length === 0) return null;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((d, i) => {
          const pct = d.revenue / maxRevenue;
          const isToday = i === data.length - 1;
          return (
            <View key={i} style={chartStyles.barCol}>
              <Text style={chartStyles.barValue}>
                {d.revenue > 0 ? formatVND(d.revenue) : ''}
              </Text>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.barFill,
                    {
                      height: `${Math.max(pct * 100, 4)}%` as any,
                      backgroundColor: isToday ? '#F97316' : '#93C5FD',
                    },
                  ]}
                />
              </View>
              <Text style={[chartStyles.barLabel, isToday && { color: '#F97316', fontWeight: '700' }]}>
                {formatDayLabel(d.date)}
              </Text>
              <Text style={chartStyles.barDate}>{formatDate(d.date)}</Text>
            </View>
          );
        })}
      </View>
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: '#F97316' }]} />
          <Text style={chartStyles.legendText}>Hôm nay</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: '#93C5FD' }]} />
          <Text style={chartStyles.legendText}>Các ngày trước</Text>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { paddingTop: 8 },
  barsRow: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    ...font.micro,
    color: colors.text.secondary,
    marginBottom: 3,
    textAlign: 'center',
  },
  barTrack: {
    width: '60%',
    height: '75%',
    justifyContent: 'flex-end',
    borderRadius: 2,
    backgroundColor: colors.surface.disabled,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    ...font.caption,
    color: colors.text.primary,
    marginTop: 6,
    fontWeight: '600',
  },
  barDate: {
    ...font.micro,
    color: colors.text.secondary,
    marginTop: 1,
  },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...font.caption, color: colors.text.primary },
});
