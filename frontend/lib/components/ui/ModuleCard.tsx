import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import FlatCard from './FlatCard';
import AppText from './AppText';

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
      onPress={onPress}
      activeOpacity={0.85}
      {...(Platform.OS === 'web'
        ? { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) }
        : {})}
    >
      <FlatCard edgeToEdge={false} style={[styles.card, hovered && styles.cardHover]}>
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, hovered && styles.iconWrapHover]}>
            <Icon name={icon as any} size={24} color={colors.brand.primary} />
          </View>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <AppText variant="sm" weight="bold" color={badge.color}>{badge.text}</AppText>
            </View>
          )}
        </View>
        <AppText variant="md" weight="bold" numberOfLines={2}>
          {title}
        </AppText>
        {description && (
          <AppText variant="sm" color={colors.text.muted} numberOfLines={2} style={{ marginTop: -4 }}>
            {description}
          </AppText>
        )}
        <View style={styles.cta}>
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>MỞ</AppText>
          <Icon name="chevron-right" size={16} color={colors.brand.primary} />
        </View>
      </FlatCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    minHeight: 132,
    borderWidth: 1, // Add full border back since it's a grid item maybe? Wait, edgeToEdge removes side borders.
    // If it's a grid item, we might want to keep the edgeToEdge=false behavior, but let FlatCard handle standard flat style.
  },
  cardHover: {
    borderColor: colors.brand.primary,
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 'auto' },
});
