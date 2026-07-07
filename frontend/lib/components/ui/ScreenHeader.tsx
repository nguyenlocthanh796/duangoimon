import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onMenuPress: () => void;
  onBackPress?: () => void;
  onRefresh?: () => void;
  right?: React.ReactNode;
}

export default function ScreenHeader({
  title,
  subtitle,
  showBack,
  onMenuPress,
  onBackPress,
  right,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <Icon name="menu" size={24} color={colors.icon.default} />
        </TouchableOpacity>
        {showBack && (
          <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...font.h2,
    color: colors.text.primary,
  },
  subtitle: {
    ...font.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
