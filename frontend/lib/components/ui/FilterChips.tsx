import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, font } from '../../theme';

export interface ChipOption {
  key: string;
  label: string;
}

interface FilterChipsProps {
  options: ChipOption[];
  selected: string;
  onSelect: (key: string) => void;
}

export default function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
            }}
          >
            <Text
              style={{
                ...font.sm,
                fontWeight: '600',
                color: active ? colors.text.inverse : colors.text.muted,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
