import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';

interface MixedPaymentPaneProps {
  mixedCashGivenStr: string;
  onSetMixedCashGivenStr: (val: string) => void;
  mixedVietQRDue: number;
  mixedQrImageUrl: string;
  onCopyText: (text: string, label: string) => void;
}

export const MixedPaymentPane: React.FC<MixedPaymentPaneProps> = ({
  mixedCashGivenStr,
  onSetMixedCashGivenStr,
  mixedVietQRDue,
  mixedQrImageUrl,
  onCopyText,
}) => {
  const { theme, isDark } = useTheme();
  const currentCash = parseInt(mixedCashGivenStr || '0', 10);

  return (
    <View style={{ gap: 12 }}>
      <View style={[s.mixedCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
        {/* Cột 1: Tiền Mặt Đã Nhận (100% 1-Chạm, Không Bàn Phím Ảo) */}
        <View style={[s.mixedCol, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="cash" size={16} color={theme.brand.success} />
              <AppText variant="xs" color={theme.text.muted}>
                Tiền mặt nhận:
              </AppText>
            </View>
            <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
              {currentCash.toLocaleString('vi-VN')} đ
            </AppText>
          </View>

          {/* Dải chip mệnh giá 1-chạm */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {[10000, 20000, 50000, 100000, 200000].map((val) => (
              <TouchableOpacity
                key={val}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Chọn tiền mặt ${(val / 1000)} nghìn`}
                onPress={() => onSetMixedCashGivenStr(val.toString())}
                style={[
                  s.mixedChip,
                  {
                    backgroundColor: currentCash === val ? theme.brand.primaryBg : theme.surface.card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: currentCash === val ? theme.brand.primary : theme.border.default,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={currentCash === val ? 'medium' : 'normal'}
                  color={currentCash === val ? theme.brand.primary : theme.text.primary}
                  tabularNums
                >
                  {(val / 1000).toLocaleString('vi-VN')}k
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cột 2: VietQR Còn Lại */}
        <View style={[s.mixedCol, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="qrcode-scan" size={15} color={theme.brand.primary} />
              <AppText variant="xs" color={theme.text.primary}>
                Mã QR:
              </AppText>
            </View>
            <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
              {mixedVietQRDue.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <ExpoImage
              source={{ uri: mixedQrImageUrl }}
              style={{ width: 80, height: 80, borderRadius: 10 }}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="xs" color={theme.text.muted}>
                Quét mã chuyển tiền
              </AppText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sao chép số tiền cần chuyển"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => onCopyText(`${mixedVietQRDue}`, 'Đã sao chép')}
                style={[s.mixedCopyBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
              >
                <Icon name="content-copy" size={12} color={theme.brand.primary} />
                <AppText variant="xs" color={theme.brand.primary}>
                  Sao chép tiền
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  mixedCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  mixedCol: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  mixedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
});

export default MixedPaymentPane;
