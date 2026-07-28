import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import AppText from '../ui/AppText';

export interface ModuleTab {
  id: string;
  name: string;
  icon?: string;
  count?: number;
}

interface ModuleTabsProps {
  tabs: ModuleTab[];
  activeTab: string;
  onSelectTab: (id: string) => void;
}

export default function ModuleTabs({ tabs, activeTab, onSelectTab }: ModuleTabsProps) {
  return (
    <View style={styles.tabNavWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              delayPressIn={0}
              activeOpacity={0.7}
              style={[styles.pillBtn, active && styles.pillBtnActive]}
            >
              {tab.icon && (
                <Icon
                  name={tab.icon as any}
                  size={16}
                  color={active ? colors.brand.primary : colors.text.secondary}
                />
              )}
              <AppText
                variant="sm"
                weight={active ? 'bold' : 'normal'}
                color={active ? colors.brand.primary : colors.text.primary}
              >
                {tab.name}
              </AppText>
              {tab.count !== undefined && (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <AppText
                    variant="sm"
                    weight="bold"
                    color={active ? colors.brand.primary : colors.text.secondary}
                    style={{ fontSize: 11 }}
                  >
                    {tab.count}
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
  tabNavWrap: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  scrollContent: {
    gap: 6,
    alignItems: 'center',
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
