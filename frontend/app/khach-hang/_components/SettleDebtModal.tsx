import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../../lib/theme';
import { AppText, AppModal } from '../../../lib/components/ui';
import { CustomerLoyalty, OrderHistoryItem } from '../../../lib/store/usePOSStore';
import { formatCurrency } from '../../../lib/utils/format';
import { playTapSound } from '../../../lib/utils/sound';

interface SettleDebtModalProps {
  visible: boolean;
  onClose: () => void;
  customer: CustomerLoyalty | null;
  targetOrder: OrderHistoryItem | null;
  storeSettings: {
    accountNumber?: string;
    bankCode?: string;
    accountHolder?: string;
  };
  onConfirm: (
    amount: number,
    method: 'tien_mat' | 'vietqr',
    note?: string,
    orderId?: string
  ) => void;
}

export const SettleDebtModal: React.FC<SettleDebtModalProps> = ({
  visible,
  onClose,
  customer,
  targetOrder,
  storeSettings,
  onConfirm,
}) => {
  const { theme } = useTheme();

  const [settleAmount, setSettleAmount] = useState('0');
  const [settleMethod, setSettleMethod] = useState<'tien_mat' | 'vietqr'>('tien_mat');
  const [settleNote, setSettleNote] = useState('');

  useEffect(() => {
    if (customer && visible) {
      const targetDebt = targetOrder
        ? targetOrder.debtAmount || targetOrder.finalTotal
        : customer.debtBalance;
      setSettleAmount(targetDebt.toString());
      setSettleMethod('tien_mat');
      setSettleNote(targetOrder ? `Thu nợ đơn ${targetOrder.orderCode}` : `Thu nợ ${customer.name}`);
    }
  }, [customer, targetOrder, visible]);

  const settleQrUrl = useMemo(() => {
    if (!storeSettings.accountNumber || !storeSettings.bankCode || !customer) return '';
    const amountNum = parseInt(settleAmount.replace(/[^0-9]/g, ''), 10) || 0;
    const desc = encodeURIComponent(`TN ${customer.phone}`);
    return `https://img.vietqr.io/image/${storeSettings.bankCode}-${storeSettings.accountNumber}-compact2.png?amount=${amountNum}&addInfo=${desc}&accountName=${encodeURIComponent(storeSettings.accountHolder || '')}`;
  }, [storeSettings, customer, settleAmount]);

  const handleConfirm = useCallback(() => {
    const amountNum = parseInt(settleAmount.replace(/[^0-9]/g, ''), 10) || 0;
    onConfirm(amountNum, settleMethod, settleNote || undefined, targetOrder?.id);
  }, [settleAmount, settleMethod, settleNote, targetOrder, onConfirm]);

  if (!visible || !customer) return null;

  return (
    <AppModal
      visible={visible}
      title="Thu Nợ Khách Hàng"
      subtitle={`${customer.name} (${customer.phone})`}
      icon="cash-refund"
      iconColor={theme.brand.accent}
      onClose={onClose}
      presentation="dialog"
      maxWidth={460}
      primaryAction={{
        label: 'Thu Nợ',
        variant: 'accent',
        onPress: handleConfirm,
      }}
      secondaryAction={{
        label: 'Hủy',
        onPress: onClose,
      }}
    >
      <View style={{ gap: 12 }}>
        {/* Đang thu nợ hóa đơn cụ thể */}
        {targetOrder && (
          <View style={[s.targetBanner, { backgroundColor: theme.surface.header, marginTop: 0 }]}>
            <AppText variant="xs" color={theme.text.muted}>
              Đang thu nợ bill: <AppText variant="xs" weight="medium" color={theme.brand.primary}>{targetOrder.orderCode}</AppText>
            </AppText>
          </View>
        )}

        {/* Phương thức: Tiền mặt vs VietQR */}
        <View style={[s.methodTabs, { marginTop: 0 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setSettleMethod('tien_mat');
            }}
            style={[
              s.methodBtn,
              settleMethod === 'tien_mat'
                ? { borderColor: theme.brand.accent, backgroundColor: `${theme.brand.accent}15`, borderWidth: 1.5 }
                : { borderColor: theme.border.subtle, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="cash" size={18} color={settleMethod === 'tien_mat' ? theme.brand.accent : theme.text.muted} />
            <AppText
              variant="sm"
              weight={settleMethod === 'tien_mat' ? 'medium' : 'normal'}
              color={settleMethod === 'tien_mat' ? theme.brand.accent : theme.text.primary}
            >
              Tiền Mặt (Sổ Quỹ)
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setSettleMethod('vietqr');
            }}
            style={[
              s.methodBtn,
              settleMethod === 'vietqr'
                ? { borderColor: theme.brand.accent, backgroundColor: `${theme.brand.accent}15`, borderWidth: 1.5 }
                : { borderColor: theme.border.subtle, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="qrcode-scan" size={18} color={settleMethod === 'vietqr' ? theme.brand.accent : theme.text.muted} />
            <AppText
              variant="sm"
              weight={settleMethod === 'vietqr' ? 'medium' : 'normal'}
              color={settleMethod === 'vietqr' ? theme.brand.accent : theme.text.primary}
            >
              Chuyển Khoản VietQR
            </AppText>
          </TouchableOpacity>
        </View>

        {/* VietQR dynamic display */}
        {settleMethod === 'vietqr' && settleQrUrl ? (
          <View style={[s.qrBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth }]}>
            <ExpoImage source={{ uri: settleQrUrl }} style={{ width: 140, height: 140, borderRadius: 8 }} contentFit="contain" />
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 6 }}>
              Quét mã Napas247 để chuyển khoản gạch nợ
            </AppText>
          </View>
        ) : null}

        {/* Số tiền thu & Presets */}
        <View style={{ gap: 6 }}>
          <AppText variant="sm" weight="medium" color={theme.text.primary}>Số tiền thu (VND):</AppText>
          <TextInput
            value={settleAmount}
            onChangeText={setSettleAmount}
            keyboardType="numeric"
            style={[s.inputAmount, { color: theme.brand.danger, borderColor: theme.border.subtle, backgroundColor: theme.surface.header }]}
          />

          {/* Quick Presets */}
          <View style={s.presetRow}>
            {[
              { label: 'Thu Đủ', val: targetOrder ? (targetOrder.debtAmount || targetOrder.finalTotal) : customer.debtBalance },
              { label: '50k', val: 50000 },
              { label: '100k', val: 100000 },
              { label: '200k', val: 200000 },
              { label: '500k', val: 500000 },
            ].map((p, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setSettleAmount(p.val.toString());
                }}
                style={[s.presetChip, { borderColor: theme.border.subtle, backgroundColor: theme.surface.header }]}
              >
                <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
                  {p.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ghi chú */}
        <View style={{ gap: 6 }}>
          <AppText variant="sm" weight="medium" color={theme.text.primary}>Ghi chú thu nợ:</AppText>
          <TextInput
            value={settleNote}
            onChangeText={setSettleNote}
            placeholder="Ghi chú (tùy chọn)..."
            placeholderTextColor={theme.text.muted}
            style={[s.inputNote, { color: theme.text.primary, borderColor: theme.border.subtle, backgroundColor: theme.surface.header }]}
          />
        </View>
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  targetBanner: {
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  methodTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  inputAmount: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginTop: 6,
    fontSize: 18,
    fontWeight: 'bold',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputNote: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginTop: 6,
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    height: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    height: 44,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
});
