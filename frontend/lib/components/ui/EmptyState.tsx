import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';

interface EmptyStateProps {
  icon?: string;
  image?: ImageSourcePropType;
  title: string;
  subtitle?: string;
  message?: string;
  iconSize?: number;
}

export default function EmptyState({
  icon,
  image,
  title,
  subtitle,
  message,
  iconSize = 56,
}: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 12 }}>
      {image ? (
        <Image source={image} style={{ width: 160, height: 160 }} resizeMode="contain" />
      ) : icon ? (
        <Icon name={icon as any} size={iconSize} color={colors.border.strong} />
      ) : null}
      <Text style={{ ...font.lg, color: colors.text.body, marginTop: 4 }}>{title}</Text>
      {subtitle && (
        <Text
          style={{
            ...font.sm,
            color: colors.text.secondary,
            textAlign: 'center',
            paddingHorizontal: 40,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
