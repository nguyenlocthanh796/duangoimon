import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme';

export interface PillTabItem {
  id: string;
  label: string;
  count?: number;
}

interface PillTabsProps {
  items: PillTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  containerStyle?: ViewStyle;
}

export default function PillTabs({ items, activeId, onSelect, containerStyle }: PillTabsProps) {
  return (
    <View style={[styles.tabBarWrap, containerStyle]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {items.map((t) => {
          const active = activeId === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.pillBtn, active && styles.pillBtnActive]}
              onPress={() => onSelect(t.id)}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <AppText
                variant="sm"
                weight={active ? 'bold' : 'normal'}
                color={active ? colors.brand.primary : colors.text.primary}
              >
                {t.label}
              </AppText>
              {t.count !== undefined && (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <AppText
                    variant="sm"
                    weight="bold"
                    color={active ? colors.brand.primary : colors.text.secondary}
                    style={{ fontSize: 11 }}
                  >
                    {t.count}
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  pillBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  countBadgeActive: {
    backgroundColor: '#FFEDD5',
  },
});
