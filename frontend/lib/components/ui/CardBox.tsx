import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardBoxProps {
  children: React.ReactNode;
  active?: boolean;
  borderColor?: string;
  activeBgColor?: string;
  style?: ViewStyle;
}

export default function CardBox({
  children,
  active = false,
  borderColor,
  activeBgColor = '#FFF7ED',
  style,
}: CardBoxProps) {
  return (
    <View
      style={[
        styles.cardBox,
        borderColor ? { borderColor } : undefined,
        active && [styles.activeCard, { backgroundColor: activeBgColor }],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 6,
  },
  activeCard: {
    borderWidth: 1.5,
  },
});
