import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
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
  const paddingV = isWide ? 10 : 8;

  return (
    <LinearGradient
      colors={colors.gradient.header as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + paddingV,
        paddingBottom: paddingV,
        paddingHorizontal: isWide ? 16 : 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: shape.radius.lg,
        borderBottomRightRadius: shape.radius.lg,
        boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
        zIndex: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWide ? 10 : 8 }}>
        <TouchableOpacity
          onPress={onOpenSidebar}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: shape.radius.md,
            backgroundColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="menu" size={iconSize} color={colors.icon.inverse} />
        </TouchableOpacity>
        <View>
          <Text style={{ ...(isWide ? font.sectionTitle : font.bodyBold), color: colors.text.inverse, fontWeight: '600' }}>
            Sơ đồ bàn
          </Text>
          {!isWide && (
            <Text style={{ ...font.badge, color: 'rgba(255,255,255,0.80)', marginTop: 1 }}>
              {tablesCount} bàn · {lastRefreshTime || ''}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: isWide ? 12 : 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onRefresh}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: shape.radius.md,
            backgroundColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="refresh" size={iconSize} color={colors.icon.inverse} />
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
              borderRadius: 99,
              backgroundColor: colors.surface.card,
              borderWidth: 1.5,
              borderColor: colors.surface.card,
            }}
          >
            <Icon name="bag-personal" size={iconSize} color={colors.brand.primary} />
            <Text style={{ ...(isWide ? font.button : font.button), color: colors.brand.primary }}>
              Mang Về
            </Text>
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
              borderRadius: 99,
              backgroundColor: colors.surface.card,
              borderWidth: 1.5,
              borderColor: colors.surface.card,
            }}
          >
            <Icon name="bag-personal" size={iconSize} color={colors.brand.primary} />
            <Text style={{ ...font.button, color: colors.brand.primary }}>Mang Về</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
}
