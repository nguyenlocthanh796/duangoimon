import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';

interface PaymentSuccessScreenProps {
  tableName: string;
  total: number;
  method: string;
  cash: number;
  change: number;
  countdown: number;
  onPrint: () => void;
  onGoBack: () => void;
}

export default function PaymentSuccessScreen({
  countdown,
  onGoBack,
}: PaymentSuccessScreenProps) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.surface.app,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ alignItems: 'center', paddingHorizontal: 32, gap: 12 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#DCFCE7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check-circle" size={40} color="#16A34A" />
        </View>
        <Text
          style={{
            ...font.sectionTitle,
            color: colors.text.primary,
            textAlign: 'center',
          }}
        >
          Thanh toán thành công!
        </Text>
        <Text
          style={{
            ...font.bodySmall,
            color: colors.text.muted,
            textAlign: 'center',
          }}
        >
          Tự động quay về sau{' '}
          <Text style={{ fontWeight: '600', color: colors.brand.primary }}>
            {countdown} giây
          </Text>
        </Text>
        <TouchableOpacity
          onPress={onGoBack}
          style={{
            marginTop: 16,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.border.default,
          }}
        >
          <Text style={{ ...font.caption, color: colors.text.secondary }}>
            Về sơ đồ bàn
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
