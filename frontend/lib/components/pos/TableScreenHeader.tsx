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

  return (
    <View style={{
      paddingTop: insets.top,
      backgroundColor: colors.surface.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      shadowColor: palette.slate[900],
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
      zIndex: 10,
    }}>
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          onPress={onOpenSidebar}
          style={{ width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="menu" size={20} color={colors.icon.default} />
        </TouchableOpacity>
        <View>
          <Text style={{ ...font.h3, color: colors.text.primary, letterSpacing: -0.5 }}>Sơ đồ bàn</Text>
          {!isWide && (
            <Text style={{ ...font.caption, color: colors.text.muted, marginTop: 2 }}>
              {tablesCount} bàn · {lastRefreshTime || ''}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="refresh" size={20} color={colors.icon.default} />
        </TouchableOpacity>

        {onTakeaway ? (
          <TouchableOpacity
            onPress={onTakeaway}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, height: 42, borderRadius: shape.radius.md,
              backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand,
            }}
          >
            <Icon name="bag-personal" size={18} color={colors.icon.brand} />
            <Text style={{ ...font.tab, color: colors.text.brand }}>Mang Về</Text>
          </TouchableOpacity>
        ) : !isWide ? (
          <TouchableOpacity
            onPress={() => router.push(`/ban-hang/pos?tableId=TAKEAWAY&tableName=Mang%20V%E1%BB%81`)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, height: 42, borderRadius: shape.radius.md,
              backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand,
            }}
          >
            <Icon name="bag-personal" size={18} color={colors.icon.brand} />
            <Text style={{ ...font.tab, color: colors.text.brand }}>Mang Về</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      </View>
    </View>
  );
}
