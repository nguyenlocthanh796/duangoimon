import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Circle, Path, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useTheme } from '../../theme';

export interface TableSvgBackdropProps {
  status: 'trong' | 'co_khach' | 'da_dat' | 'dang_su_dung' | 'da_in_tam_tinh';
  isDark?: boolean;
  capacity?: number;
  tableName?: string;
  shape?: 'round' | 'square' | 'long' | 'takeaway';
}

export const TableSvgBackdrop: React.FC<TableSvgBackdropProps> = React.memo(({
  status,
  isDark: propIsDark,
  capacity = 4,
  tableName = '',
  shape,
}) => {
  const { theme, isDark: themeIsDark } = useTheme();
  const isDark = propIsDark ?? themeIsDark;

  const isPrePrinted = status === 'da_in_tam_tinh';
  const isOccupied = status === 'co_khach' || status === 'dang_su_dung';
  const isReserved = status === 'da_dat';

  const resolvedShape: 'round' | 'square' | 'long' | 'takeaway' = React.useMemo(() => {
    if (shape) return shape;
    const nameLower = tableName.toLowerCase();
    if (nameLower.includes('mang về') || nameLower.includes('takeaway') || nameLower.includes('kiosk')) {
      return 'takeaway';
    }
    if (nameLower.includes('tròn') || nameLower.includes('round') || nameLower.includes('sân vườn')) {
      return 'round';
    }
    if (capacity >= 8 || nameLower.includes('vip dài') || nameLower.includes('bàn dài') || nameLower.includes('tiệc lớn')) {
      return 'long';
    }
    return 'square';
  }, [shape, tableName, capacity]);

  const primaryTint = isPrePrinted
    ? theme.brand.warning
    : isOccupied
    ? theme.brand.accent
    : isReserved
    ? theme.brand.warning
    : theme.brand.success;

  const shadowFill = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.08)';
  const surfaceFill = isPrePrinted
    ? (isDark ? 'rgba(234, 179, 8, 0.12)' : 'rgba(234, 179, 8, 0.08)')
    : isOccupied
    ? (isDark ? 'rgba(234, 88, 12, 0.12)' : 'rgba(234, 88, 12, 0.06)')
    : isReserved
    ? (isDark ? 'rgba(245, 158, 11, 0.09)' : 'rgba(217, 119, 6, 0.06)')
    : (isDark ? 'rgba(16, 185, 129, 0.07)' : 'rgba(16, 185, 129, 0.035)');

  const chairFill = isPrePrinted
    ? (isDark ? 'rgba(234, 179, 8, 0.32)' : 'rgba(234, 179, 8, 0.22)')
    : isOccupied
    ? (isDark ? 'rgba(234, 88, 12, 0.28)' : 'rgba(234, 88, 12, 0.18)')
    : isReserved
    ? (isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(217, 119, 6, 0.14)')
    : (isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.09)');

  const chairBorder = isPrePrinted
    ? (isDark ? 'rgba(234, 179, 8, 0.55)' : 'rgba(234, 179, 8, 0.35)')
    : isOccupied
    ? (isDark ? 'rgba(234, 88, 12, 0.50)' : 'rgba(234, 88, 12, 0.32)')
    : isReserved
    ? (isDark ? 'rgba(245, 158, 11, 0.40)' : 'rgba(217, 119, 6, 0.28)')
    : (isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.20)');

  const highlightStroke = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.90)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 140 140" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="tableGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={primaryTint} stopOpacity={isDark ? 0.15 : 0.09} />
            <Stop offset="100%" stopColor={primaryTint} stopOpacity={0.01} />
          </LinearGradient>
          <LinearGradient id="tableSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.text.primary} stopOpacity={isDark ? 0.07 : 0.04} />
            <Stop offset="100%" stopColor={theme.text.primary} stopOpacity={isDark ? 0.02 : 0.01} />
          </LinearGradient>
        </Defs>

        <Circle cx="70" cy="70" r="58" fill="url(#tableGlow)" />

        {resolvedShape === 'takeaway' ? (
          <G opacity={isDark ? 0.50 : 0.40}>
            <Rect x="42" y="44" width="56" height="58" rx="8" fill={surfaceFill} stroke={primaryTint} strokeWidth="1.2" />
            <Path d="M54 44 C54 28, 86 28, 86 44" fill="none" stroke={primaryTint} strokeWidth="1.6" strokeLinecap="round" />
            <Path d="M 44,52 L 96,52" stroke={highlightStroke} strokeWidth="1" strokeLinecap="round" />
            <Circle cx="70" cy="73" r="10" fill="none" stroke={primaryTint} strokeWidth="1" strokeDasharray="2 2" />
          </G>
        ) : resolvedShape === 'round' ? (
          <>
            <Path d="M 23,61 C 19,66 19,74 23,79" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <Rect x="24" y="63" width="6" height="14" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 117,61 C 121,66 121,74 117,79" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <Rect x="110" y="63" width="6" height="14" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 61,23 C 66,19 74,19 79,23" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <Rect x="63" y="24" width="14" height="6" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 61,117 C 66,121 74,121 79,117" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <Rect x="63" y="110" width="14" height="6" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Circle cx="70" cy="72" r="39" fill={shadowFill} />
            <Circle cx="70" cy="70" r="39" fill={surfaceFill} stroke={primaryTint} strokeWidth="1.2" strokeOpacity={0.4} />
            <Circle cx="70" cy="70" r="33" fill="url(#tableSurface)" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'} strokeWidth="1" />
            <Path d="M 48,44 C 58,37 82,37 92,44" fill="none" stroke={highlightStroke} strokeWidth="1.2" strokeLinecap="round" />
            <Circle cx="70" cy="70" r="14" fill="none" stroke={primaryTint} strokeWidth="0.8" strokeDasharray="2.5 2.5" opacity={0.3} />
          </>
        ) : resolvedShape === 'long' ? (
          <>
            <Path d="M 15,39 C 11,43 11,51 15,55" stroke={chairBorder} strokeWidth="2" strokeLinecap="round" fill="none" />
            <Rect x="16" y="41" width="5.5" height="12" rx="2.5" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 15,64 C 11,68 11,76 15,80" stroke={chairBorder} strokeWidth="2" strokeLinecap="round" fill="none" />
            <Rect x="16" y="66" width="5.5" height="12" rx="2.5" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 15,89 C 11,93 11,101 15,105" stroke={chairBorder} strokeWidth="2" strokeLinecap="round" fill="none" />
            <Rect x="16" y="91" width="5.5" height="12" rx="2.5" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 125,39 C 129,43 129,51 125,55" stroke={chairBorder} strokeWidth="2" strokeLinecap="round" fill="none" />
            <Rect x="118.5" y="41" width="5.5" height="12" rx="2.5" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 125,64 C 129,68 129,76 125,80" stroke={chairBorder} strokeWidth="2" strokeLinecap="round" fill="none" />
            <Rect x="118.5" y="66" width="5.5" height="12" rx="2.5" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Path d="M 125,89 C 129,93 129,101 125,105" stroke={chairBorder} strokeWidth="2" strokeLinecap="round" fill="none" />
            <Rect x="118.5" y="91" width="5.5" height="12" rx="2.5" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
            <Rect x="25" y="33" width="90" height="78" rx="14" fill={shadowFill} />
            <Rect x="24" y="31" width="92" height="78" rx="14" fill={surfaceFill} stroke={primaryTint} strokeWidth="1.2" strokeOpacity={0.4} />
            <Rect x="28" y="35" width="84" height="70" rx="11" fill="url(#tableSurface)" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'} strokeWidth="1" />
            <Path d="M 38,32 L 102,32" stroke={highlightStroke} strokeWidth="1.2" strokeLinecap="round" />
            <Rect x="36" y="44" width="68" height="52" rx="6" fill="none" stroke={primaryTint} strokeWidth="0.8" strokeDasharray="3 3" opacity={0.25} />
          </>
        ) : (
          <>
            {capacity > 2 ? (
              <>
                <Path d="M 16,43 C 12,48 12,58 16,63" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <Rect x="17" y="45" width="6.5" height="16" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
                <Path d="M 16,77 C 12,82 12,92 16,97" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <Rect x="17" y="79" width="6.5" height="16" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
                <Path d="M 124,43 C 128,48 128,58 124,63" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <Rect x="116.5" y="45" width="6.5" height="16" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
                <Path d="M 124,77 C 128,82 128,92 124,97" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <Rect x="116.5" y="79" width="6.5" height="16" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
              </>
            ) : (
              <>
                <Path d="M 16,52 C 12,58 12,82 16,88" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <Rect x="17" y="55" width="6.5" height="30" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
                <Path d="M 124,52 C 128,58 128,82 124,88" stroke={chairBorder} strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <Rect x="116.5" y="55" width="6.5" height="30" rx="3" fill={chairFill} stroke={chairBorder} strokeWidth="0.8" />
              </>
            )}
            <Rect x="29" y="32" width="82" height="80" rx="16" fill={shadowFill} />
            <Rect x="28" y="30" width="84" height="80" rx="16" fill={surfaceFill} stroke={primaryTint} strokeWidth="1.2" strokeOpacity={0.4} />
            <Rect x="32" y="34" width="76" height="72" rx="13" fill="url(#tableSurface)" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'} strokeWidth="1" />
            <Path d="M 40,31 L 100,31" stroke={highlightStroke} strokeWidth="1.2" strokeLinecap="round" />
            <Circle cx="70" cy="70" r="15" fill="none" stroke={primaryTint} strokeWidth="0.8" strokeDasharray="3 3" opacity={0.28} />
            {isOccupied ? (
              <>
                <Circle cx="44" cy="70" r="4.5" fill="none" stroke={primaryTint} strokeWidth="0.7" opacity={0.35} />
                <Circle cx="96" cy="70" r="4.5" fill="none" stroke={primaryTint} strokeWidth="0.7" opacity={0.35} />
              </>
            ) : null}
          </>
        )}
      </Svg>
    </View>
  );
});
