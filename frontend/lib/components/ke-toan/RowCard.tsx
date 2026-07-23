import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';
import AppText from '../ui/AppText';

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
        <View style={{ flex: 1, marginLeft: leftIcon ? 6 : 0 }}>
          <AppText variant="md" style={styles.title} numberOfLines={1}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="sm" style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
          {actions}
        </View>
        <View style={styles.rightWrap}>{right}</View>
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
    borderRadius: 0,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    minHeight: 44,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text.primary },
  subtitle: { color: colors.text.muted, marginTop: 2 },
  rightWrap: {
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
