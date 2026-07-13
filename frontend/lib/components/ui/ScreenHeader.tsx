import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, palette } from '../../theme';
import { shape } from '../../theme/shape';
import UnifiedHeader from './UnifiedHeader';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onMenuPress: () => void;
  onBackPress?: () => void;
  onRefresh?: () => void;
  right?: React.ReactNode;
  /** Hide menu button (e.g. when sidebar is persistent/docked on wide screens) */
  hideMenu?: boolean;
}

/**
 * ScreenHeader now delegates to UnifiedHeader for visual consistency
 * across all modules. All quan-ly pages automatically get the
 * same header design as ke-toan pages.
 */
export default function ScreenHeader({
  title,
  subtitle,
  showBack,
  onMenuPress,
  onBackPress,
  right,
  hideMenu = false,
}: ScreenHeaderProps) {
  return (
    <UnifiedHeader
      title={title}
      subtitle={subtitle}
      onMenuPress={showBack ? undefined : onMenuPress}
      onBackPress={showBack ? onBackPress : undefined}
      right={right}
      hideMenu={hideMenu}
    />
  );
}
