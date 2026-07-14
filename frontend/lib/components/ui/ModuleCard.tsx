import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

interface ModuleCardProps {
  icon: string;
  title: string;
  description?: string;
  badge?: { text: string; color: string; bg: string };
  onPress: () => void;
}

/** Tappable module card for the Kế toán & Thuế hub grid (1 col iPhone / 2 col iPad). */
export default function ModuleCard({ icon, title, description, badge, onPress }: ModuleCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.card, hovered && styles.cardHover]}
      onPress={onPress}
      activeOpacity={0.85}
      {...(Platform.OS === 'web'
        ? { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) }
        : {})}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, hovered && styles.iconWrapHover]}>
          <Icon name={icon as any} size={24} color={colors.brand.primary} />
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {description && (
        <Text style={styles.desc} numberOfLines={2}>
          {description}
        </Text>
      )}
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Mở</Text>
        <Icon name="chevron-right" size={16} color={colors.brand.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 10,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)",
    elevation: 3,
    minHeight: 132,
  },
  cardHover: {
    borderColor: colors.brand.primary,
    boxShadow: '0 0 14px rgba(249,115,22,0.18)',
    elevation: 8,
    transform: [{ translateY: -2 }] as any,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapHover: { backgroundColor: colors.brand.primary + '1A' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: shape.radius.full },
  badgeText: { ...font.micro, fontWeight: '600' },
  title: { ...font.bodyBold, color: colors.text.primary, fontWeight: '600' },
  desc: { ...font.caption, color: colors.text.muted, marginTop: -4 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 'auto' },
  ctaText: { ...font.caption, color: colors.brand.primary, fontWeight: '600' },
});
