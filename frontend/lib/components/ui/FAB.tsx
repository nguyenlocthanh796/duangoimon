import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';

interface FABProps {
  icon?: string;
  iconSize?: number;
  onPress: () => void;
}

export default function FAB({ icon = 'plus', iconSize = 28, onPress }: FABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        position: 'absolute',
        bottom: 28,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 4,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <Icon name={icon as any} size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
}
