import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, formatPriceFull } from '../../theme/colors';
import { font } from '../../theme/typography';
import { PAY_METHODS } from '../../hooks/usePayment';
import { ASSETS } from '../../assets';

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

export default function PaymentSuccessScreen({ tableName, total, method, cash, change, countdown, onPrint, onGoBack }: PaymentSuccessScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 32, gap: 16 }}>
        <View style={{
          width: 120, height: 120,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Image
            source={ASSETS.illustrations.success}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
        </View>
        <Text style={{ ...font.h2, color: colors.text.primary, textAlign: 'center', marginTop: 8 }}>
          Thanh toán thành công!
        </Text>
        <Text style={{ ...font.bodySmall, color: colors.text.muted, textAlign: 'center', marginTop: -4 }}>
          Tự động quay lại sau <Text style={{ fontWeight: '600', color: colors.brand.primary }}>{countdown} giây</Text>...
        </Text>
        <View style={{ backgroundColor: colors.surface.card, borderRadius: 4, padding: 20, width: '100%', borderWidth: 1, borderColor: colors.border.default, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...font.body, color: colors.text.muted }}>Bàn</Text>
            <Text style={{ ...font.body, fontWeight: '600', color: colors.text.primary }}>{tableName}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...font.body, color: colors.text.muted }}>Tổng</Text>
            <Text style={{ ...font.h2, color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
          </View>
          {method === 'tien_mat' && cash > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...font.body, color: colors.text.muted }}>Tiền thối</Text>
              <Text style={{ ...font.bodyBold, color: colors.status.success }}>{formatPriceFull(Math.max(0, change))}</Text>
            </View>
          )}
          <View style={{ height: 1, backgroundColor: colors.surface.disabled, marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...font.body, color: colors.text.muted }}>Phương thức</Text>
            <Text style={{ ...font.bodySmall, color: colors.text.primary }}>{PAY_METHODS.find(m => m.id === method)?.label}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
          <TouchableOpacity onPress={onPrint} style={{
            flex: 1, backgroundColor: colors.status.info, paddingVertical: 16,
            borderRadius: 4, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
            boxShadow: '0 6px 16px rgba(59,130,246,0.35)', elevation: 6,
          }}>
            <Icon name="printer-pos" size={20} color={colors.text.inverse} />
            <Text style={{ ...font.h4, color: colors.text.inverse }}>In hóa đơn</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onGoBack} style={{
            flex: 1.2, backgroundColor: colors.brand.primary, paddingVertical: 16,
            borderRadius: 4, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
            boxShadow: '0 6px 16px rgba(249,115,22,0.35)', elevation: 6,
          }}>
            <Icon name="table-furniture" size={20} color={colors.text.inverse} />
            <Text style={{ ...font.h4, color: colors.text.inverse }}>Về sơ đồ bàn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
