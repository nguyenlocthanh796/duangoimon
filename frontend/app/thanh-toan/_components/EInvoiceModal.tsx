import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../../lib/components/ui/AppText';
import { AppModal } from '../../../lib/components/ui/AppModal';
import { useTheme } from '../../../lib/theme';
import { playTapSound } from '../../../lib/utils/sound';
import { validateTaxCode, BuyerTaxInfo } from '../../../lib/utils/eInvoice';

export interface EInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  buyerInfo?: BuyerTaxInfo;
  onSave: (info: BuyerTaxInfo | null) => void;
  sellerTaxCode?: string;
}

export const EInvoiceModal: React.FC<EInvoiceModalProps> = ({
  visible,
  onClose,
  buyerInfo,
  onSave,
  sellerTaxCode,
}) => {
  const { theme } = useTheme();

  const [taxCode, setTaxCode] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [isValidTax, setIsValidTax] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      if (buyerInfo) {
        setTaxCode(buyerInfo.taxCode || '');
        setBuyerName(buyerInfo.buyerName || '');
        setBuyerAddress(buyerInfo.buyerAddress || '');
        setBuyerEmail(buyerInfo.buyerEmail || '');
        setIsValidTax(buyerInfo.taxCode ? validateTaxCode(buyerInfo.taxCode) : null);
      } else {
        setTaxCode('');
        setBuyerName('');
        setBuyerAddress('');
        setBuyerEmail('');
        setIsValidTax(null);
      }
    }
  }, [visible, buyerInfo]);

  const handleTaxCodeChange = (text: string) => {
    const clean = text.replace(/[^0-9-]/g, '').trim();
    setTaxCode(clean);
    if (clean.length >= 10) {
      setIsValidTax(validateTaxCode(clean));
    } else {
      setIsValidTax(null);
    }
  };

  const handleApply = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    if (!taxCode.trim()) {
      onSave(null);
      onClose();
      return;
    }

    const valid = validateTaxCode(taxCode);
    if (!valid) {
      setIsValidTax(false);
      return;
    }

    onSave({
      taxCode: taxCode.trim(),
      buyerName: buyerName.trim() || 'Người Mua',
      buyerAddress: buyerAddress.trim() || undefined,
      buyerEmail: buyerEmail.trim() || undefined,
    });
    onClose();
  };

  const handleDisable = () => {
    playTapSound();
    onSave(null);
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Xuất HĐĐT Máy Tính Tiền"
      subtitle="Nghị định 123 / Thông tư 78 (Có mã CQT)"
      width={480}
      primaryAction={{
        label: 'Áp Dụng',
        onPress: handleApply,
      }}
      secondaryAction={{
        label: buyerInfo?.taxCode ? 'Tắt HĐĐT' : 'Bỏ Qua',
        onPress: buyerInfo?.taxCode ? handleDisable : onClose,
      }}
    >
      <View style={{ gap: 14, paddingVertical: 4 }}>
        {/* Mã Số Thuế */}
        <View style={s.fieldGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="xs" weight="medium" color={theme.text.primary}>
              Mã số thuế bên mua *
            </AppText>
            {isValidTax === true && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="check-circle" size={14} color={theme.brand.success} />
                <AppText variant="xs" color={theme.brand.success}>
                  MST chuẩn
                </AppText>
              </View>
            )}
            {isValidTax === false && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="alert-circle" size={14} color={theme.brand.danger} />
                <AppText variant="xs" color={theme.brand.danger}>
                  Sai định dạng MST
                </AppText>
              </View>
            )}
          </View>
          <TextInput
            value={taxCode}
            onChangeText={handleTaxCodeChange}
            placeholder="10 hoặc 13 số (Ví dụ: 0316892345)"
            placeholderTextColor={theme.text.subtle}
            keyboardType="numeric"
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor:
                  isValidTax === true
                    ? theme.brand.success
                    : isValidTax === false
                    ? theme.brand.danger
                    : theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>

        {/* Tên đơn vị / Người mua */}
        <View style={s.fieldGroup}>
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            Tên công ty / Người mua *
          </AppText>
          <TextInput
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="Công ty TNHH... hoặc Họ tên người mua"
            placeholderTextColor={theme.text.subtle}
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>

        {/* Địa chỉ công ty */}
        <View style={s.fieldGroup}>
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            Địa chỉ xuất hóa đơn
          </AppText>
          <TextInput
            value={buyerAddress}
            onChangeText={setBuyerAddress}
            placeholder="Số nhà, đường, phường, quận/huyện..."
            placeholderTextColor={theme.text.subtle}
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>

        {/* Email nhận hóa đơn */}
        <View style={s.fieldGroup}>
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            Email nhận HĐĐT (Tùy chọn)
          </AppText>
          <TextInput
            value={buyerEmail}
            onChangeText={setBuyerEmail}
            placeholder="ketoan@congty.vn"
            placeholderTextColor={theme.text.subtle}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
