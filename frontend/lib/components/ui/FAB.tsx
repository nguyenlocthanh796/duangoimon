import { TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shape } from '../../theme';

interface FABProps {
  icon?: string;
  iconSize?: number;
  onPress: () => void;
  visibleOnWide?: boolean;
  /** Extra style overrides (e.g. raise above the tab bar on iPhone). */
  style?: ViewStyle;
}

export default function FAB({
  icon = 'plus',
  iconSize = 28,
  onPress,
  visibleOnWide = false,
  style,
}: FABProps) {
  const { bottom: safeBottom } = useSafeAreaInsets();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      style={[
        {
          position: 'absolute',
          bottom: 28 + safeBottom,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: shape.radius.full,
          backgroundColor: colors.brand.primary,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
          elevation: 8,
          display: visibleOnWide ? 'flex' : 'none',
        } as ViewStyle,
        style,
      ]}
    >
      <Icon name={icon as any} size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
}
