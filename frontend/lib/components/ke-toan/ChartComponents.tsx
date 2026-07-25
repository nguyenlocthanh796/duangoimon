import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../ui/AppText';
import Svg, { Circle, Path, G, Text as SvgText, Rect, Line } from 'react-native-svg';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartData {
  label: string;
  value: number;
}

export interface DonutChartData {
  category: string;
  value: number;
  color: string;
  pct: number;
}

// ─── Mini Bar Chart (Horizontal) — Thu / Chi so sánh ─────────────────────────
interface MiniHorizontalBarProps {
  data: BarChartData[];
  maxWidth?: number;
  height?: number;
}

export function MiniHorizontalBar({
  data,
  maxWidth = 200,
  height = 8,
}: MiniHorizontalBarProps) {
  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const barW = height;

  return (
    <View style={mhbStyles.wrap}>
      {data.map((d, i) => {
        const pct = Math.abs(d.value) / maxVal;
        return (
          <View key={i} style={mhbStyles.row}>
            <View style={[mhbStyles.barBg, { width: maxWidth, height: barW }]}>
              <View
                style={[
                  mhbStyles.barFill,
                  {
                    width: maxWidth * pct,
                    height: barW,
                    backgroundColor: d.color || colors.brand.primary,
                    borderRadius: barW / 2,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const mhbStyles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  barBg: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {},
});

// ─── Vertical Bar Chart (SVG) — Doanh thu theo ngày ──────────────────────────
interface VerticalBarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
  barRadius?: number;
}

export function VerticalBarChart({
  data,
  width = 300,
  height = 160,
  barRadius = 4,
}: VerticalBarChartProps) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const padL = 32;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const barGap = 4;
  const barW = Math.max(4, (chartW - barGap * (data.length - 1)) / data.length);

  return (
    <Svg width={width} height={height}>
      {/* Y axis label */}
      <SvgText
        x={padL - 4}
        y={padT + 8}
        fontSize={13}
        fill={colors.text.muted}
        textAnchor="end"
      >
        {Intl.NumberFormat('vi-VN').format(maxVal)}
      </SvgText>
      {/* Baseline */}
      <Line
        x1={padL}
        y1={padT + chartH}
        x2={padL + chartW}
        y2={padT + chartH}
        stroke={colors.border.light}
        strokeWidth={1}
      />
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = padL + i * (barW + barGap);
        const y = padT + chartH - barH;
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={barRadius}
              ry={barRadius}
              fill={d.color || colors.brand.primary}
              opacity={0.85}
            />
            <SvgText
              x={x + barW / 2}
              y={padT + chartH + 14}
              fontSize={13}
              fill={colors.text.muted}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Mini Line Chart (SVG) — Xu hướng ───────────────────────────────────────
interface MiniLineChartProps {
  data: LineChartData[];
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
}

export function MiniLineChart({
  data,
  width = 280,
  height = 80,
  lineColor = colors.brand.primary,
  fillColor = colors.brand.primary + '20',
}: MiniLineChartProps) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;
  const padL = 0;
  const padR = 0;
  const padT = 4;
  const padB = 4;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const points = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padT + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath =
    `${linePath} L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`;

  return (
    <Svg width={width} height={height}>
      <Path d={areaPath} fill={fillColor} />
      <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
      ))}
    </Svg>
  );
}

// ─── Donut Chart (SVG) — Chi phí theo nhóm ────────────────────────────
interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  innerRadius?: number;
}

export function DonutChart({ data, size = 150, innerRadius = 0.6 }: DonutChartProps) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const ir = r * innerRadius;

  let cumAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const a = pct * Math.PI * 2;
    const startAngle = cumAngle;
    const endAngle = cumAngle + a;
    cumAngle = endAngle;
    return { ...d, pct, startAngle, endAngle };
  });

  function polarPath(sa: number, ea: number, outer: boolean): string {
    const rr = outer ? r : ir;
    const x1 = cx + rr * Math.cos(sa);
    const y1 = cy + rr * Math.sin(sa);
    const x2 = cx + rr * Math.cos(ea);
    const y2 = cy + rr * Math.sin(ea);
    return `${outer ? 'M' : 'L'}${x1.toFixed(1)},${y1.toFixed(1)} A${rr},${rr} 0 ${ea - sa > Math.PI ? 1 : 0} 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => {
        if (s.pct <= 0) return null;
        const outerPath = polarPath(s.startAngle, s.endAngle, true);
        const innerPath = polarPath(s.endAngle, s.startAngle, false);
        const d = `${outerPath} ${innerPath} Z`;
        return <Path key={i} d={d} fill={s.color || '#94A3B8'} />;
      })}
      {/* Center hole */}
      <Circle cx={cx} cy={cy} r={ir} fill="#FFFFFF" />
      {/* Center text */}
      <SvgText x={cx} y={cy - 3} textAnchor="middle" fontSize={16} fontWeight="700" fill="#0F172A" fontFamily="BeVietnamPro_700Bold">
        {Intl.NumberFormat('vi-VN').format(total)}
      </SvgText>
      <SvgText x={cx} y={cy + 12} textAnchor="middle" fontSize={13} fill="#94A3B8" fontFamily="BeVietnamPro_400Regular">
        VND
      </SvgText>
    </Svg>
  );
}

// ─── Stat Card — Minimalist ────────────────────────────────────────────────
interface StatChartCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  chartData?: LineChartData[];
  color?: string;
}

export function StatChartCard({
  title,
  value,
  subtitle,
  trend,
  chartData,
  color = colors.brand.primary,
}: StatChartCardProps) {
  const isUp = trend !== undefined && trend >= 0;
  return (
    <View style={sccStyles.card}>
      <View style={sccStyles.top}>
        <View style={{ flex: 1 }}>
          <AppText variant="sm" style={sccStyles.title}>{title}</AppText>
          <AppText variant="lg" weight="bold" style={[sccStyles.value, { color }]} numberOfLines={1}>
            {value}
          </AppText>
          {trend !== undefined && (
            <AppText variant="sm"
              style={[
                sccStyles.trend,
                { color: isUp ? colors.status.success : colors.status.danger },
              ]}
            >
              {isUp ? '\u2191' : '\u2193'} {Math.abs(trend)}%{' '}
              <AppText variant="sm" style={sccStyles.trendLabel}>so v\u1edbi k\u1ef3 tr\u01b0\u1edbc</AppText>
            </AppText>
          )}
        </View>
        {chartData && chartData.length > 0 && (
          <View style={sccStyles.chartWrap}>
            <MiniLineChart
              data={chartData}
              width={100}
              height={50}
              lineColor={color}
              fillColor={color + '10'}
            />
          </View>
        )}
      </View>
      {subtitle && <AppText variant="sm" style={sccStyles.subtitle}>{subtitle}</AppText>}
    </View>
  );
}

const sccStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 0,
    borderBottomWidth: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { ...font.sm, color: colors.text.muted, fontWeight: '500' },
  value: { ...font.lg, fontWeight: '600', marginTop: 2 },
  trend: { ...font.sm, fontWeight: '600', marginTop: 4 },
  trendLabel: { ...font.sm, color: colors.text.muted, fontWeight: '400' },
  chartWrap: { marginTop: 2 },
  subtitle: { ...font.sm, color: colors.text.muted, marginTop: 4 },
});

// ─── Quick Data Table ──────────────────────────────────────────────────────
interface QuickTableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (val: any, row: any) => React.ReactNode;
}

interface QuickTableProps {
  columns: QuickTableColumn[];
  data: any[];
  maxRows?: number;
}

export function QuickTable({ columns, data, maxRows = 5 }: QuickTableProps) {
  const rows = data.slice(0, maxRows);
  return (
    <View style={qtStyles.wrap}>
      {/* Header */}
      <View style={qtStyles.headerRow}>
        {columns.map((col) => (
          <View key={col.key} style={[qtStyles.headerCell, col.width != null ? { width: col.width } : undefined]}>
            <AppText variant="sm" weight="bold" style={qtStyles.headerText} numberOfLines={1}>
              {col.label}
            </AppText>
          </View>
        ))}
      </View>
      {/* Body */}
      {rows.map((row, i) => (
        <View
          key={row.id || i}
          style={[qtStyles.dataRow, i % 2 === 0 && qtStyles.dataRowAlt]}
        >
          {columns.map((col) => {
            const val = row[col.key];
            return (
              <View
                key={col.key}
                style={[
                  qtStyles.dataCell,
                  col.width != null ? { width: col.width } : undefined,
                  col.align === 'right' && qtStyles.dataCellRight,
                  col.align === 'center' && qtStyles.dataCellCenter,
                ]}
              >
                {col.render ? (
                  col.render(val, row)
                ) : (
                  <AppText variant="md" style={qtStyles.dataText} numberOfLines={1}>
                    {val ?? '—'}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      ))}
      {rows.length === 0 && (
        <View style={qtStyles.empty}>
          <AppText variant="sm" style={qtStyles.emptyText}>Chưa có dữ liệu</AppText>
        </View>
      )}
    </View>
  );
}

const qtStyles = StyleSheet.create({
  wrap: {
    borderRadius: 0,
    borderBottomWidth: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primaryBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerCell: { flex: 1 },
  headerText: { ...font.smBold, color: colors.text.tableHeader },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  dataRowAlt: { backgroundColor: '#FAFAFA' },
  dataCell: { flex: 1, justifyContent: 'center' },
  dataCellRight: { alignItems: 'flex-end' },
  dataCellCenter: { alignItems: 'center' },
  dataText: { ...font.sm, color: colors.text.primary },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { ...font.sm, color: colors.text.muted },
});

// ─── Summary Row (for table footer) ─────────────────────────────────────────
export function QuickTableSummary({
  columns,
  data,
  sumKeys,
}: {
  columns: QuickTableColumn[];
  data: any[];
  sumKeys: string[];
}) {
  return (
    <View style={qtsStyles.row}>
      {columns.map((col) => {
        if (sumKeys.includes(col.key)) {
          const total = data.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
          return (
            <View key={col.key} style={[qtsStyles.cell, col.width != null ? { width: col.width } : undefined]}>
              <AppText variant="md" weight="bold" style={qtsStyles.value} numberOfLines={1}>
                {Intl.NumberFormat('vi-VN').format(total)}
              </AppText>
            </View>
          );
        }
        return (
          <View key={col.key} style={[qtsStyles.cell, col.width != null ? { width: col.width } : undefined]}>
            <AppText variant="sm" weight="bold" style={qtsStyles.label}>{col.key === 'label' ? 'Tổng' : ''}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const qtsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: colors.border.strong,
  },
  cell: { flex: 1, justifyContent: 'center' },
  label: { ...font.sm, color: colors.text.primary, fontWeight: '600' },
  value: { ...font.smBold, color: colors.text.primary, textAlign: 'right' },
});
