import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { shape } from '../../theme/shape';
import AppText from '../ui/AppText';

interface AreaFilterProps {
  areas: string[];
  selectedArea: string;
  onSelectArea: (area: string) => void;
}

const AREA_ICONS: Record<string, string> = {
  'Tất cả': 'view-grid',
  'Trong nhà': 'home',
  'VIP': 'star',
  'Ngoài trời': 'weather-sunny',
  'Tầng 1': 'stairs',
  'Tầng 2': 'stairs',
};

interface AreaChipProps {
  areaName: string;
  isSelected: boolean;
  onPress: () => void;
}

function AreaChip({ areaName, isSelected, onPress }: AreaChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 8,
      tension: 150,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 16,
          height: 44,
          borderRadius: shape.radius.md,
          backgroundColor: isSelected ? colors.brand.primary : colors.surface.disabled,
          borderWidth: 1,
          borderColor: isSelected ? colors.brand.primary : colors.border.default,
          ...(isSelected ? shape.shadow.md : {}),
        }}
      >
        {AREA_ICONS[areaName] && (
          <Icon
            name={AREA_ICONS[areaName] as any}
            size={16}
            color={isSelected ? colors.text.inverse : colors.icon.default}
          />
        )}
        <AppText
          variant="md"
          color={isSelected ? colors.text.inverse : colors.text.primary}
        >
          {areaName}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
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
        paddingVertical: 10,
        alignItems: 'center',
        gap: 8,
      }}
    >
      {areas.map((areaName) => (
        <AreaChip
          key={areaName}
          areaName={areaName}
          isSelected={selectedArea === areaName}
          onPress={() => onSelectArea(areaName)}
        />
      ))}
    </ScrollView>
  );
}
