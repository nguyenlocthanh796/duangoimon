import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, Platform } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { playTapSound } from '../../utils/sound';

export interface EmptyStateProps {
  icon?: string;
  iconComponent?: React.ReactNode;
  title?: string;
  message?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 👑 EmptyState - Trạng thái danh sách rỗng chuẩn Indochine & Typography 7 cấp
 */
function EmptyStateComponent({
  icon = 'inbox-outline',
  iconComponent,
  title,
  message,
  description,
  actionText,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const heading = message || title || '';

  return (
    <View testID={testID} style={[styles.container, style]}>
      {iconComponent ? (
        iconComponent
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: theme.surface.header }]}>
          <Icon name={icon as any} size={36} color={theme.text.muted} />
        </View>
      )}

      {heading ? (
        <AppText
          variant="md"
          weight="bold"
          color={theme.text.primary}
          style={[styles.title, styles.centerText]}
        >
          {heading}
        </AppText>
      ) : null}

      {description ? (
        <AppText
          variant="sm"
          color={theme.text.muted}
          style={[styles.description, styles.centerText]}
        >
          {description}
        </AppText>
      ) : null}

      {actionText && onAction ? (
        <TouchableOpacity
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          onPress={() => {
            playTapSound();
            if (Platform.OS !== 'web') {
              try {
                Haptics.selectionAsync();
              } catch {}
            }
            onAction();
          }}
          style={[styles.actionBtn, { backgroundColor: theme.brand.accent }]}
        >
          <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
            {actionText}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const EmptyState = memo(EmptyStateComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 6,
  },
  centerText: {
    textAlign: 'center',
  },
  description: {
    maxWidth: 320,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
