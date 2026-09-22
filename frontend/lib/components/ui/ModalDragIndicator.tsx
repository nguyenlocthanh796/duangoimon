import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface ModalDragIndicatorProps {
  style?: StyleProp<ViewStyle>;
  barStyle?: StyleProp<ViewStyle>;
  color?: string;
}

/**
 * Standard Apple HIG iOS Sheet Drag Indicator
 * Dimensions: width 36, height 5, borderRadius 2.5
 */
export const ModalDragIndicator: React.FC<ModalDragIndicatorProps> = ({
  style,
  barStyle,
  color,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]} accessible={false} importantForAccessibility="no">
      <View
        style={[
          styles.bar,
          { backgroundColor: color || theme.border.default },
          barStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.5,
  },
});
