import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors, font } from '../../theme';

interface AreaFilterProps {
  areas: string[];
  selectedArea: string;
  onSelectArea: (area: string) => void;
}

export default function AreaFilter({ areas, selectedArea, onSelectArea }: AreaFilterProps) {
  if (areas.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        backgroundColor: colors.surface.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        flexGrow: 0,
        flexShrink: 0,
        height: 44,
      }}
      contentContainerStyle={{
        paddingVertical: 6,
        gap: 8,
        alignItems: 'center',
      }}
    >
      {areas.map(areaName => {
        const isSelected = selectedArea === areaName;
        return (
          <TouchableOpacity
            key={areaName}
            onPress={() => onSelectArea(areaName)}
            style={{
              paddingHorizontal: 12,
              height: 32,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 4,
              backgroundColor: isSelected ? colors.brand.primary : colors.surface.disabled,
            }}
          >
            <Text style={{ ...font.tab, color: isSelected ? colors.text.inverse : colors.text.body }}>
              {areaName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
