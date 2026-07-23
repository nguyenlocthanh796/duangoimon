import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';
import { shape } from '../../theme/shape';

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
  tableName,
  total,
  method,
  cash,
  change,
  countdown,
  onPrint,
  onGoBack,
}: PaymentSuccessScreenProps) {
  const methodLabels: Record<string, string> = {
    tien_mat: 'Tiền mặt',
    card: 'Quẹt thẻ',
    qr: 'QR Code',
    chuyen_khoan: 'Chuyển khoản',
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
      }}
    >
      {/* Overlay dismiss */}
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={onGoBack}
      />

      {/* Bottom sheet */}
      <View
        style={{
          backgroundColor: colors.surface.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 24,
          paddingVertical: 24,
          gap: 16,
        }}
      >
        {/* Success icon + title */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#DCFCE7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check-circle" size={32} color="#16A34A" />
          </View>
          <Text
            style={{
              ...font.lg,
              color: colors.text.primary,
              textAlign: 'center',
            }}
          >
            ✅ Thanh toán thành công
          </Text>
          <Text
            style={{
              ...font.sm,
              color: colors.text.muted,
              textAlign: 'center',
            }}
          >
            {tableName} · {total.toLocaleString('vi-VN')}đ · {methodLabels[method] || method}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={onPrint}
            style={{
              flex: 1,
              height: 48,
              borderRadius: shape.radius.md,
              borderWidth: 1.5,
              borderColor: colors.brand.primary,
              backgroundColor: colors.surface.card,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Icon name="printer" size={20} color={colors.brand.primary} />
            <Text
              style={{
                ...font.mdBold,
                color: colors.brand.primary,
                fontWeight: '600',
              }}
            >
              In hóa đơn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGoBack}
            style={{
              flex: 1,
              height: 48,
              borderRadius: shape.radius.md,
              backgroundColor: colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Text
              style={{
                ...font.mdBold,
                color: colors.text.inverse,
                fontWeight: '600',
              }}
            >
              Đóng
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            ...font.sm,
            color: colors.text.placeholder,
            textAlign: 'center',
          }}
        >
          Tự đóng sau {countdown}s
        </Text>
      </View>
    </SafeAreaView>
  );
}
