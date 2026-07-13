import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, font } from '../../theme';

function getSmartCashSuggestions(total: number): number[] {
  const s = new Set<number>();
  s.add(total);

  const notes = [10000, 20000, 50000, 100000, 200000, 500000];
  notes.filter((n) => n > total).forEach((n) => s.add(n));

  const r10 = total % 10000;
  if (r10 > 0) s.add(total + (10000 - r10));

  const r50 = total % 50000;
  if (r50 > 0) {
    s.add(total + (50000 - r50));
    s.add(total + 50000);
    s.add(total + 100000);
  }

  return Array.from(s)
    .filter((v) => v >= total)
    .sort((a, b) => a - b)
    .slice(0, 6);
}

interface CashSuggestionsProps {
  total: number;
  onSelect: (amount: number) => void;
  selectedAmount: number;
}

export default function CashSuggestions({ total, onSelect, selectedAmount }: CashSuggestionsProps) {
  const suggestions = React.useMemo(() => getSmartCashSuggestions(total), [total]);

  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {suggestions.map((amt) => (
        <TouchableOpacity
          key={amt}
          onPress={() => onSelect(amt)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: selectedAmount === amt ? '#22c55e' : '#f3f4f6',
            borderWidth: 1,
            borderColor: selectedAmount === amt ? '#16a34a' : '#e5e7eb',
          }}
        >
          <Text
            style={{
              ...font.buttonSmall,
              color: selectedAmount === amt ? '#fff' : '#374151',
            }}
          >
            {amt.toLocaleString('vi-VN')}đ
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
