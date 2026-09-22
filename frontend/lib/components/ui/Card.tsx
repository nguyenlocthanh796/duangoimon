import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from './AppText';

export interface CardProps extends ViewProps {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ glass = false, style, children, ...rest }) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: glass ? theme.surface.glassCard : theme.surface.card,
          borderRadius: theme.shapes.large,
          borderWidth: 1,
          borderColor: glass ? theme.border.glassBorder : theme.border.default,
          overflow: 'hidden',
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: isDark
                  ? (glass ? '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)' : '0 4px 16px rgba(0,0,0,0.3)')
                  : (glass ? '0 8px 24px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)' : '0 1px 3px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.03)'),
              } as any)
            : { elevation: glass ? 3 : 2 }),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export const CardHeader: React.FC<ViewProps & { title: string; subtitle?: string; rightAction?: React.ReactNode }> = ({
  title,
  subtitle,
  rightAction,
  style,
  children,
  ...rest
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border.default,
          backgroundColor: theme.surface.header,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
      {...rest}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="md" weight="medium" color={theme.text.primary}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        )}
      </View>
      {rightAction}
      {children}
    </View>
  );
};

export const CardContent: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  return (
    <View style={[{ padding: 16 }, style]} {...rest}>
      {children}
    </View>
  );
};
