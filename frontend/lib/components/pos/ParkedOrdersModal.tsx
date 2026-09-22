import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, AppModal, Button } from '../ui';
import { useParkedOrders, usePOSActions, ParkedOrder } from '../../store/usePOSStore';
import { playTapSound } from '../../utils/sound';

interface ParkedOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  onOrderRestored?: (order: ParkedOrder) => void;
}

export const ParkedOrdersModal: React.FC<ParkedOrdersModalProps> = ({
  visible,
  onClose,
  onOrderRestored,
}) => {
  const { theme } = useTheme();
  const parkedOrders = useParkedOrders();
  const { restoreParkedOrder, deleteParkedOrder } = usePOSActions();

  const handleRestore = (order: ParkedOrder) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const success = restoreParkedOrder(order.id);
    if (success) {
      onOrderRestored?.(order);
      onClose();
    }
  };

  const handleDelete = (orderId: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    deleteParkedOrder(orderId);
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Hóa Đơn Chờ"
      subtitle={`${parkedOrders.length} đơn tạm giữ`}
      icon={<Icon name="clock-outline" size={22} color={theme.brand.accent} />}
      width={520}
      footer={
        <Button
          variant="outline"
          size="md"
          title="Đóng"
          onPress={() => {
            playTapSound();
            onClose();
          }}
          style={{ width: '100%' }}
        />
      }
    >
      <View style={s.scrollContent}>
        {parkedOrders.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name="receipt-text-clock-outline" size={56} color={theme.text.muted} />
            <AppText variant="sm" weight="medium" color={theme.text.primary} style={{ marginTop: 12 }}>
              Không có đơn hàng chờ nào
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4, textAlign: 'center' }}>
              Bấm "Lưu Chờ" trong giỏ hàng để tạm giữ đơn khi khách cần suy nghĩ thêm.
            </AppText>
          </View>
        ) : (
          parkedOrders.map((order) => (
            <View
              key={order.id}
              style={[
                s.orderCard,
                {
                  backgroundColor: theme.surface.app,
                  borderColor: theme.border.default,
                },
              ]}
            >
              {/* Hàng 1: Mã đơn & Thời gian */}
              <View style={s.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      s.codeBadge,
                      {
                        backgroundColor: theme.status.pendingBg,
                        borderColor: theme.brand.accent,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                      {order.code}
                    </AppText>
                  </View>
                  <AppText variant="sm" weight="medium" color={theme.text.primary}>
                    {order.tableName}
                  </AppText>
                </View>

                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  {order.parkedAt}
                </AppText>
              </View>

              {/* Hàng 2: Tên khách / Ghi chú nếu có */}
              {(order.customerName || order.note) && (
                <View style={s.metaRow}>
                  {order.customerName ? (
                    <AppText variant="xs" color={theme.brand.primary}>
                      Khách: {order.customerName}
                    </AppText>
                  ) : null}
                  {order.note ? (
                    <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                      · {order.note}
                    </AppText>
                  ) : null}
                </View>
              )}

              {/* Hàng 3: Danh sách món vắn tắt */}
              <View style={s.itemsPreview}>
                <AppText variant="xs" color={theme.text.muted} numberOfLines={2}>
                  {order.items.map((it) => `${it.qty}x ${it.item.name}`).join(', ')}
                </AppText>
              </View>

              {/* Hàng 4: Tổng tiền & Cụm nút hành động */}
              <View style={s.cardFooter}>
                <View>
                  <AppText variant="xs" color={theme.text.muted}>
                    {order.itemCount} món
                  </AppText>
                  <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                    {order.totalAmount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Xóa"
                    onPress={() => handleDelete(order.id)}
                    style={{ borderColor: theme.brand.danger, paddingHorizontal: 12 }}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    title="Mở Lại"
                    leadingIcon={<Icon name="restore" size={16} color={theme.text.onBrand} />}
                    onPress={() => handleRestore(order)}
                    style={{ paddingHorizontal: 16 }}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  orderCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemsPreview: {
    paddingVertical: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
