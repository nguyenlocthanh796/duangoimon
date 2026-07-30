import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { shape } from '../../theme/shape';
import { router } from 'expo-router';
import AppText from '../ui/AppText';
import UnifiedHeader from '../ui/UnifiedHeader';

interface TableScreenHeaderProps {
  tablesCount: number;
  isWide: boolean;
  onOpenSidebar: () => void;
  onRefresh: () => void;
  lastRefreshTime?: string;
  onTakeaway?: () => void;
}

export default function TableScreenHeader({
  tablesCount,
  isWide,
  onOpenSidebar,
  onRefresh,
  lastRefreshTime,
  onTakeaway,
}: TableScreenHeaderProps) {
  const btnSize = 44;
  const iconSize = isWide ? 20 : 18;

  const rightActions = (
    <View style={{ flexDirection: 'row', gap: isWide ? 10 : 6, alignItems: 'center' }}>
      <TouchableOpacity
        onPress={onRefresh}
        delayPressIn={0}
        activeOpacity={0.7}
        style={{
          width: isWide ? btnSize : 36,
          height: isWide ? btnSize : 36,
          borderRadius: shape.radius.md,
          backgroundColor: colors.brand.primaryBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="refresh" size={isWide ? 20 : 18} color={colors.brand.primary} />
      </TouchableOpacity>

      {onTakeaway ? (
        <TouchableOpacity
          onPress={onTakeaway}
          delayPressIn={0}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: isWide ? 14 : 10,
            height: isWide ? btnSize : 36,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
          }}
        >
          <Icon name="bag-personal" size={isWide ? 20 : 16} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse}>Mang về</AppText>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => router.push(`/ban-hang/pos?tableId=TAKEAWAY&tableName=Mang%20V%E1%BB%81`)}
          delayPressIn={0}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            gap: 4,
            paddingHorizontal: isWide ? 14 : 10,
            height: isWide ? btnSize : 36,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
          }}
        >
          <Icon name="bag-personal" size={isWide ? 20 : 16} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse}>Mang về</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <UnifiedHeader
      animated={true}
      title="Sơ đồ bàn"
      subtitle={`${tablesCount} bàn · ${lastRefreshTime || ''}`}
      onMenuPress={onOpenSidebar}
      right={rightActions}
    />
  );
}
