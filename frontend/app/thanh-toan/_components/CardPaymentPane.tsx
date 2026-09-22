import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';

export const CardPaymentPane: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[s.cardPayBox, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
      <View style={[s.iconBoxRound, { backgroundColor: theme.brand.primaryBg }]}>
        <Icon name="contactless-payment" size={38} color={theme.brand.primary} />
      </View>
      <AppText variant="md" weight="medium" color={theme.text.primary}>
        Thẻ & Ví Điện Tử
      </AppText>
      <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', maxWidth: 280 }}>
        Hỗ trợ máy POS quẹt thẻ Visa, MasterCard, NAPAS, MoMo, ZaloPay, ViettelMoney, Apple Pay.
      </AppText>
    </View>
  );
};

const s = StyleSheet.create({
  cardPayBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  iconBoxRound: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CardPaymentPane;
