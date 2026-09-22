import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, AppModal, Button } from '../ui';
import { CartItem } from '../../store/usePOSStore';
import { playTapSound } from '../../utils/sound';
import { useAuthStore } from '../../store/useAuthStore';
import { ManagerPinModal } from './ManagerPinModal';

export interface VoidItemModalProps {
  visible: boolean;
  item: CartItem | null;
  onClose: () => void;
  onConfirmVoid: (cartItemId: string, reason: string) => void;
}

const voidReasons = [
  'Khách đổi ý',
  'Hết nguyên liệu',
  'Order nhầm',
  'Đợi quá lâu',
];

export const VoidItemModal: React.FC<VoidItemModalProps> = ({
  visible,
  item,
  onClose,
  onConfirmVoid,
}) => {
  const { theme } = useTheme();
  const [selectedReason, setSelectedReason] = useState(voidReasons[0]);
  const [showPinModal, setShowPinModal] = useState(false);
  const requiresApproval = useAuthStore((s) => s.requiresManagerApproval);

  if (!item) return null;

  const executeVoid = () => {
    onConfirmVoid(item.cartItemId, selectedReason);
    Alert.alert(
      'Đã Hủy Món',
      `Đã hủy [${item.item.name} x${item.qty}]\nLý do: ${selectedReason}\n\nĐã gửi phiếu hủy tới máy in Bếp/Bar.`
    );
    onClose();
  };

  const handleConfirm = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }

    if (item.sentToKitchen && requiresApproval('void_item')) {
      setShowPinModal(true);
      return;
    }

    executeVoid();
  };

  return (
    <>
      <AppModal
        visible={visible}
        onClose={onClose}
        title="Hủy Món Bếp"
        subtitle={`${item.item.name} (x${item.qty})`}
        icon={<Icon name="alert-octagon" size={22} color={theme.brand.danger} />}
        width={440}
        footer={
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <Button
              variant="outline"
              title="BỎ QUA"
              style={{ flex: 1, height: 48, borderRadius: 12 }}
              onPress={() => {
                playTapSound();
                onClose();
              }}
            />
            <Button
              variant="destructive"
              title="HỦY MÓN"
              style={{ flex: 1, height: 48, borderRadius: 12 }}
              leadingIcon={<Icon name="trash-can-outline" size={16} color={theme.text.onBrand} />}
              onPress={handleConfirm}
            />
          </View>
        }
      >
        <View style={{ padding: 14 }}>
          <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 8 }}>
            Chọn lý do hủy món:
          </AppText>

          <View
            style={{
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.default,
              overflow: 'hidden',
              backgroundColor: theme.surface.card,
            }}
          >
            {voidReasons.map((reason, idx) => {
              const active = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Lý do: ${reason}`}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    setSelectedReason(reason);
                  }}
                  style={[
                    s.reasonItem,
                    {
                      backgroundColor: active ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      borderBottomWidth: idx < voidReasons.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: theme.border.default,
                    },
                  ]}
                >
                  <Icon
                    name={active ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={active ? theme.brand.danger : theme.text.muted}
                  />
                  <AppText
                    variant="sm"
                    weight={active ? 'medium' : 'normal'}
                    color={active ? theme.brand.danger : theme.text.primary}
                    style={{ flex: 1 }}
                  >
                    {reason}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </AppModal>

      <ManagerPinModal
        visible={showPinModal}
        title="Xác Thực Hủy"
        subtitle={`Nhập mã PIN Quản lý để hủy món [${item.item.name}] đã gửi bếp`}
        action="void_item"
        onSuccess={executeVoid}
        onClose={() => setShowPinModal(false)}
      />
    </>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
});
