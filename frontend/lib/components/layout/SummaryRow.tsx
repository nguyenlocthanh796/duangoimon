import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import AppText from '../ui/AppText';

export interface SummaryItem {
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

interface SummaryRowProps {
  items: SummaryItem[];
  style?: ViewStyle;
}

export default function SummaryRow({ items, style }: SummaryRowProps) {
  return (
    <View style={[styles.summaryRow, style]}>
      {items.map((item, idx) => (
        <View key={idx} style={[styles.summaryBox, { backgroundColor: item.bg }]}>
          <AppText variant="sm" color="#64748B" numberOfLines={1}>
            {item.label}
          </AppText>
          <AppText variant="md" color={item.color} style={styles.valueText}>
            {item.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 6,
  },
  valueText: {
    marginTop: 2,
  },
});
