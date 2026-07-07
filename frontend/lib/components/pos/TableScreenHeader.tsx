import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
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
  return (
    <View style={{
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.surface.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={onOpenSidebar}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="menu" size={18} color={colors.icon.default} />
        </TouchableOpacity>
        <View>
          <Text style={{ ...(isWide ? font.h3 : font.h1), color: colors.text.primary, letterSpacing: -0.5 }}>Sơ đồ bàn</Text>
          {!isWide && (
            <Text style={{ ...font.caption, color: colors.text.muted }}>
              {tablesCount} bàn · {lastRefreshTime || ''}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="refresh" size={18} color={colors.icon.default} />
        </TouchableOpacity>

        {onTakeaway ? (
          <TouchableOpacity
            onPress={onTakeaway}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, height: 36, borderRadius: 12,
              backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand,
            }}
          >
            <Icon name="bag-personal" size={16} color={colors.icon.brand} />
            <Text style={{ ...font.tab, color: colors.text.brand }}>Mang Về</Text>
          </TouchableOpacity>
        ) : !isWide ? (
          <TouchableOpacity
            onPress={() => router.push(`/ban-hang/pos?tableId=TAKEAWAY&tableName=Mang%20V%E1%BB%81`)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, height: 36, borderRadius: 12,
              backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand,
            }}
          >
            <Icon name="bag-personal" size={16} color={colors.icon.brand} />
            <Text style={{ ...font.tab, color: colors.text.brand }}>Mang Về</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
