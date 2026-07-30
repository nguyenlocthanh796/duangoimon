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
      <View style={styles.trackContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
          {items.map((t) => {
            const active = activeId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.pillBtn, active && styles.pillBtnActive]}
                onPress={() => onSelect(t.id)}
                activeOpacity={0.8}
                delayPressIn={0}
              >
                <AppText
                  variant="md"
                  weight={active ? 'bold' : 'normal'}
                  color={active ? colors.brand.primary : colors.text.secondary}
                >
                  {t.label}
                </AppText>
                {t.count !== undefined && (
                  <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                    <AppText
                      variant="xs"
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
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  trackContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  pillBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
