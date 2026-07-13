import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';

export interface RowCardProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  leftIconColor?: string;
  right?: React.ReactNode;
  actions?: React.ReactNode;
  onPress?: () => void;
}

const RowCard = React.memo(
  ({ title, subtitle, leftIcon, leftIconColor, right, actions, onPress }: RowCardProps) => {
    const Wrapper: any = onPress ? TouchableOpacity : View;
    return (
      <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {leftIcon && (
          <View
            style={[styles.iconWrap, leftIconColor && { backgroundColor: leftIconColor + '1A' }]}
          >
            <Icon name={leftIcon as any} size={20} color={leftIconColor || colors.icon.muted} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: leftIcon ? 10 : 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {actions}
        </View>
        {right}
      </Wrapper>
    );
  }
);

export default RowCard;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 52,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...font.body, fontWeight: '400', color: colors.text.primary },
  subtitle: { ...font.caption, color: colors.text.muted, marginTop: 2 },
});
