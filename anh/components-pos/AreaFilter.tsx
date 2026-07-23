import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { colors, font } from '../../theme';
import AppText from '../ui/AppText';

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
      }}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
      }}
    >
      {areas.map((areaName, index) => {
        const isSelected = selectedArea === areaName;
        const isLast = index === areas.length - 1;
        return (
          <TouchableOpacity
            key={areaName}
            onPress={() => onSelectArea(areaName)}
            style={{
              paddingHorizontal: 16,
              height: 36,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
              marginRight: isLast ? 0 : 8,
              backgroundColor: isSelected ? colors.brand.primary : colors.surface.disabled,
              borderWidth: 1,
              borderColor: isSelected ? colors.brand.primary : colors.border.default,
            }}
          >
            <AppText
              variant="medium"
              color={isSelected ? colors.text.inverse : colors.text.primary}
            >
              {areaName}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
