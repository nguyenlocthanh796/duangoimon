import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { shape } from '../../theme/shape';

interface FlatCardProps extends ViewProps {
  children: React.ReactNode;
  edgeToEdge?: boolean;
}

export default function FlatCard({ children, edgeToEdge = true, style, ...props }: FlatCardProps) {
  return (
    <View
      style={[
        styles.card,
        edgeToEdge && styles.edgeToEdge,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    padding: shape.spacing.sm,
    // Strictly no radius and no shadow for Flat Design
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  edgeToEdge: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    marginHorizontal: 0,
  },
});
