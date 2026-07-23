import { View, TouchableOpacity } from 'react-native';

import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { router } from 'expo-router';
import AppText from '../ui/AppText';

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
  const insets = useSafeAreaInsets();
  const btnSize = isWide ? 40 : 36;
  const iconSize = isWide ? 20 : 18;

  return (
    <View
      style={{
        paddingTop: insets.top,
        height: insets.top + (isWide ? 56 : 52),
        paddingHorizontal: isWide ? 16 : 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface.header,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        
        zIndex: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWide ? 10 : 8 }}>
        <TouchableOpacity
          onPress={onOpenSidebar}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: 8,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="menu" size={iconSize} color={colors.brand.primary} />
        </TouchableOpacity>
        <View>
          <AppText variant={isWide ? "large" : "medium"} color={colors.text.primary} weight="bold">
            Sơ đồ bàn
          </AppText>
          {!isWide && (
            <AppText variant="small" color={colors.text.muted} style={{ marginTop: 1 }}>
              {tablesCount} bàn · {lastRefreshTime || ''}
            </AppText>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: isWide ? 12 : 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onRefresh}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: 8,
            backgroundColor: '#FFF7ED',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="refresh" size={iconSize} color={colors.brand.primary} />
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
              borderRadius: 8,
              backgroundColor: colors.brand.primary,
              borderWidth: 0,
            }}
          >
            <Icon name="bag-personal" size={iconSize} color={colors.text.inverse} />
            <AppText variant="medium" color={colors.text.inverse}>
              Mang Về
            </AppText>
          </TouchableOpacity>
        ) : !isWide ? (
          <TouchableOpacity
            onPress={() =>
              router.push(`/ban-hang/pos?tableId=TAKEAWAY&tableName=Mang%20V%E1%BB%81`)
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              height: btnSize,
              borderRadius: 8,
              backgroundColor: colors.brand.primary,
              borderWidth: 0,
            }}
          >
            <Icon name="bag-personal" size={iconSize} color={colors.text.inverse} />
            <AppText variant="medium" color={colors.text.inverse}>Mang Về</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
