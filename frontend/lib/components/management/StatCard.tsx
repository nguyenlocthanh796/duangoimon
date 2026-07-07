import { View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import SkeletonBox from '../ui/SkeletonBox';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  bgColor: string;
  loading: boolean;
  cardStyle?: any;
}

export default function StatCard({ label, value, icon, color, bgColor, loading, cardStyle }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }, cardStyle]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={[styles.iconBg, { backgroundColor: bgColor }]}>
          <Icon name={icon as any} size={20} color={color} />
        </View>
        <Icon name="trending-neutral" size={16} color="#CBD5E1" />
      </View>
      <Text style={styles.label}>{label}</Text>
      {loading ? (
        <SkeletonBox w="80%" h={26} />
      ) : (
        <Text style={[styles.value, { color }]}>{value}</Text>
      )}
    </View>
  );
}

const styles = {
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 4,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBg: {
    width: 36, height: 36, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { ...font.caption, color: colors.text.secondary, marginBottom: 6 },
  value: { ...font.h2 },
} as const;
