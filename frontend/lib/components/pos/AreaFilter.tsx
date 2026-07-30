import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { shape } from '../../theme/shape';
import { haptic } from '../../haptic';
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
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => { haptic.impact('light'); onPress(); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          height: 38,
          borderRadius: 6,
          backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
          borderWidth: isSelected ? 1 : 0,
          borderColor: isSelected ? '#E2E8F0' : 'transparent',
          shadowColor: isSelected ? '#000000' : 'transparent',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isSelected ? 0.05 : 0,
          shadowRadius: 1.5,
          elevation: isSelected ? 1 : 0,
        }}
      >
        <AppText
          variant="md"
          weight={isSelected ? 'bold' : 'normal'}
          color={isSelected ? '#F97316' : '#475569'}
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
    <View
      style={{
        backgroundColor: colors.surface.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          backgroundColor: '#F1F5F9',
          borderRadius: 8,
          padding: 3,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            gap: 4,
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
      </View>
    </View>
  );
}
