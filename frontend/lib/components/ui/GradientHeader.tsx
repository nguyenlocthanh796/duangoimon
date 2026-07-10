import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

import NavBack from '../../../app/ke-toan/_nav';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  backLabel?: string;
  compact?: boolean;
  right?: React.ReactNode;
}

/** Premium gradient header used by all Kế toán & Thuế screens (iPhone/iPad). */
export default function GradientHeader({ title, subtitle, icon = 'wallet', onMenuPress, onBackPress, backLabel, compact = false, right }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.brand.primary, colors.brand.primaryHover]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, compact ? styles.headerCompact : styles.headerDefault, { paddingTop: compact ? 10 + insets.top : insets.top + 14, paddingBottom: compact ? 12 : 18 }]}
    >
      <View style={styles.row}>
        {compact ? null : onBackPress ? (
          <NavBack to="/ke-toan" label={backLabel} onPress={onBackPress} />
        ) : onMenuPress ? (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn} accessibilityLabel="Mở menu">
            <Icon name="menu" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <View style={styles.iconWrap}>
          <Icon name={icon as any} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, borderBottomLeftRadius: shape.radius.lg, borderBottomRightRadius: shape.radius.lg, boxShadow: '0 4px 12px rgba(249,115,22,0.4)' },
  headerDefault: {},
  headerCompact: { boxShadow: '0 2px 8px rgba(249,115,22,0.2)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { ...font.h2, color: '#fff', fontWeight: '700' },
  subtitle: { ...font.caption, color: 'rgba(255,255,255,0.80)', marginTop: 2 },
});
