import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import AppText from '../ui/AppText';
import { useResponsive } from '../../hooks/useResponsive';

interface ToolbarBoxProps {
  codeTag?: string;
  codeColor?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  style?: ViewStyle;
}

export default function ToolbarBox({
  codeTag,
  codeColor = '#F97316',
  title,
  subtitle,
  actions,
  style,
}: ToolbarBoxProps) {
  const { isWide } = useResponsive();

  return (
    <View style={[styles.toolbarBox, style]}>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          {codeTag && (
            <View style={[styles.codeTag, { backgroundColor: `${codeColor}15` }]}>
              <AppText variant="sm" weight="bold" color={codeColor}>
                {codeTag}
              </AppText>
            </View>
          )}
          <AppText variant="md" weight="bold" color="#0F172A" numberOfLines={1}>
            {title}
          </AppText>
        </View>
        {subtitle && (
          <AppText
            variant="sm"
            color="#64748B"
            style={{ marginTop: 2 }}
            numberOfLines={isWide ? 1 : 2}
          >
            {subtitle}
          </AppText>
        )}
      </View>

      {actions && (
        <View style={[styles.actionGroup, !isWide && styles.actionGroupMobile]}>
          {actions}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  codeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionGroupMobile: {
    width: '100%',
    marginTop: 8,
  },
});
