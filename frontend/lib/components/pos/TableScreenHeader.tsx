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
  onOpenSettings?: () => void;
}

export default function TableScreenHeader({
  tablesCount,
  isWide,
  onOpenSidebar,
  onRefresh,
  lastRefreshTime,
  onTakeaway,
  onOpenSettings,
}: TableScreenHeaderProps) {
  const btnSize = 44;
  const iconSize = isWide ? 20 : 18;

  const rightActions = (
    <View style={{ flexDirection: 'row', gap: isWide ? 12 : 8, alignItems: 'center' }}>
      <TouchableOpacity
        onPress={onRefresh}
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: shape.radius.md,
          backgroundColor: colors.brand.primaryBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="refresh" size={iconSize} color={colors.brand.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenSettings || (() => router.push('/ban-hang/settings'))}
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: shape.radius.md,
          backgroundColor: colors.surface.app,
          borderWidth: 1,
          borderColor: colors.border.default,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cog-outline" size={iconSize} color={colors.text.secondary} />
      </TouchableOpacity>

      {onTakeaway ? (
        <TouchableOpacity
          onPress={onTakeaway}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: isWide ? 14 : 10,
            height: btnSize,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
          }}
        >
          <Icon name="bag-personal" size={iconSize} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse}>Mang Về</AppText>
        </TouchableOpacity>
      ) : !isWide ? (
        <TouchableOpacity
          onPress={() => router.push(`/ban-hang/pos?tableId=TAKEAWAY&tableName=Mang%20V%E1%BB%81`)}
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            height: btnSize,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
          }}
        >
          <Icon name="bag-personal" size={iconSize} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse}>Mang Về</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <UnifiedHeader
      animated={true}
      title="Sơ đồ bàn"
      subtitle={!isWide ? `${tablesCount} bàn · ${lastRefreshTime || ''}` : undefined}
      onMenuPress={onOpenSidebar}
      right={rightActions}
    />
  );
}
