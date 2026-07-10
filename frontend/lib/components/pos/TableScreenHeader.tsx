import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, palette } from '../../theme';
import { shape } from '../../theme/shape';
import { router } from 'expo-router';

interface TableScreenHeaderProps {
  tablesCount: number;
  isWide: boolean;
  onOpenSidebar: () => void;
  onRefresh: () => void;
  lastRefreshTime?: string;
  onTakeaway?: () => void;
}

export default function TableScreenHeader({ tablesCount, isWide, onOpenSidebar, onRefresh, lastRefreshTime, onTakeaway }: TableScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const btnSize = isWide ? 40 : 36;
  const iconSize = isWide ? 20 : 18;
  const paddingV = isWide ? 10 : 8;

  return (
    <View style={{
      paddingTop: insets.top + paddingV,
      paddingBottom: paddingV,
      paddingHorizontal: isWide ? 16 : 12,
      backgroundColor: colors.surface.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      zIndex: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWide ? 10 : 8 }}>
        <TouchableOpacity
          onPress={onOpenSidebar}
          style={{ width: btnSize, height: btnSize, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="menu" size={iconSize} color={colors.icon.default} />
        </TouchableOpacity>
        <View>
          <Text style={{ ...(isWide ? font.h3 : font.h4), color: colors.text.primary }}>Sơ đồ bàn</Text>
          {!isWide && (
            <Text style={{ ...font.badge, color: colors.text.muted, marginTop: 1 }}>
              {tablesCount} bàn · {lastRefreshTime || ''}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: isWide ? 12 : 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ width: btnSize, height: btnSize, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="refresh" size={iconSize} color={colors.icon.default} />
        </TouchableOpacity>

        {onTakeaway ? (
          <TouchableOpacity
            onPress={onTakeaway}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: isWide ? 14 : 10, height: btnSize, borderRadius: shape.radius.md,
              backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand,
            }}
          >
            <Icon name="bag-personal" size={iconSize} color={colors.icon.brand} />
            <Text style={{ ...(isWide ? font.tab : font.buttonSmall), color: colors.text.brand }}>Mang Về</Text>
          </TouchableOpacity>
        ) : !isWide ? (
          <TouchableOpacity
            onPress={() => router.push(`/ban-hang/pos?tableId=TAKEAWAY&tableName=Mang%20V%E1%BB%81`)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 10, height: btnSize, borderRadius: shape.radius.md,
              backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand,
            }}
          >
            <Icon name="bag-personal" size={iconSize} color={colors.icon.brand} />
            <Text style={{ ...font.buttonSmall, color: colors.text.brand }}>Mang Về</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
