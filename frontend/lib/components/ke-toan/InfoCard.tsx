import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';

export interface InfoCardProps {
  icon?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  accent?: string; // optional left icon color override
}

export default function InfoCard({ icon, title, subtitle, right, onPress, accent }: InfoCardProps) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {icon && (
        <View style={[styles.iconWrap, accent && { backgroundColor: accent + '1A' }]}>
          <Icon name={icon as any} size={22} color={accent || colors.brand.primary} />
        </View>
      )}
      <View style={{ flex: 1, marginLeft: icon ? 12 : 0 }}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
    minHeight: 56,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...font.body, fontWeight: '700', color: colors.text.primary },
  subtitle: { ...font.caption, color: colors.text.muted, marginTop: 2 },
});
