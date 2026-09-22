import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, useAppToast, AppModal } from '../../../lib/components/ui';
import {
  useToppings,
  usePOSActions,
  ModifierOption,
} from '../../../lib/store/usePOSStore';
import { playTapSound } from '../../../lib/utils/sound';
import { formatCurrency } from '../../../lib/utils/format';

interface ToppingManagementTabProps {
  isWide?: boolean;
  isReorderMode?: boolean;
  isAddOpen?: boolean;
  onAddClose?: () => void;
}

export const ToppingManagementTab: React.FC<ToppingManagementTabProps> = ({
  isWide = false,
  isReorderMode = false,
  isAddOpen = false,
  onAddClose,
}) => {
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();
  const toppings = useToppings();
  const { addTopping, updateTopping, deleteTopping, reorderToppings } = usePOSActions();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTopping, setEditingTopping] = useState<ModifierOption | null>(null);
  const [toppingName, setToppingName] = useState('');
  const [toppingPriceStr, setToppingPriceStr] = useState('');

  React.useEffect(() => {
    if (isAddOpen) {
      setEditingTopping(null);
      setToppingName('');
      setToppingPriceStr('');
      setModalVisible(true);
    }
  }, [isAddOpen]);

  const handleOpenAdd = () => {
    playTapSound();
    setEditingTopping(null);
    setToppingName('');
    setToppingPriceStr('');
    setModalVisible(true);
  };

  const handleOpenEdit = (top: ModifierOption) => {
    playTapSound();
    setEditingTopping(top);
    setToppingName(top.name);
    setToppingPriceStr(top.priceDelta > 0 ? String(top.priceDelta) : '0');
    setModalVisible(true);
  };

  const handleSave = () => {
    playTapSound();
    const trimmed = toppingName.trim();
    if (!trimmed) {
      showToast({ title: 'Thiếu tên', message: 'Nhập tên topping!', type: 'danger' });
      return;
    }

    const priceDelta = parseInt(toppingPriceStr.replace(/\D/g, ''), 10) || 0;

    if (editingTopping) {
      updateTopping(editingTopping.id, { name: trimmed, priceDelta });
      showToast({ title: 'Đã cập nhật', message: `Đã lưu "${trimmed}"`, type: 'success' });
    } else {
      addTopping({ name: trimmed, priceDelta });
      showToast({ title: 'Đã thêm', message: `Đã tạo "${trimmed}"`, type: 'success' });
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    setModalVisible(false);
    onAddClose?.();
  };

  const handleDelete = (top: ModifierOption) => {
    playTapSound();
    const result = deleteTopping(top.id);
    if (result.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
      showToast({ title: 'Đã xóa', message: `Đã xóa "${top.name}"`, type: 'info' });
      setModalVisible(false);
      onAddClose?.();
    } else {
      showToast({ title: 'Không thể xóa', message: result.message || 'Lỗi thao tác', type: 'danger' });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...toppings];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    reorderToppings(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index >= toppings.length - 1) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...toppings];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    reorderToppings(copy);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Toppings List (Flat Seamless) */}
      <ScrollView
        contentContainerStyle={[
          s.listContainer,
          isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {toppings.map((top, index) => {
          const isFirst = index === 0;
          const isLast = index === toppings.length - 1;

          return (
            <TouchableOpacity
              key={top.id}
              activeOpacity={0.7}
              onPress={() => {
                if (isReorderMode) return;
                handleOpenEdit(top);
              }}
              style={[
                s.toppingCard,
                isWide && { width: '49.2%' },
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 14 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                },
              ]}
            >
              <View style={s.cardLeft}>
                <View
                  style={[
                    s.iconCircle,
                    { backgroundColor: theme.brand.primaryBg },
                  ]}
                >
                  <Icon
                    name="shaker-outline"
                    size={20}
                    color={theme.brand.primary}
                  />
                </View>

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <AppText variant="md" weight="normal" color={theme.text.primary}>
                    {top.name}
                  </AppText>
                  {isReorderMode && (
                    <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                      +{formatCurrency(top.priceDelta)} đ
                    </AppText>
                  )}
                </View>
              </View>

              {isReorderMode ? (
                <View style={s.cardActions}>
                  {/* Reorder Stepper: Up and Down */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleMoveUp(index)}
                    disabled={isFirst}
                    style={[
                      s.iconBtn,
                      {
                        backgroundColor: theme.surface.header,
                        opacity: isFirst ? 0.25 : 1,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel="Di chuyển lên"
                  >
                    <Icon name="chevron-up" size={16} color={theme.text.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleMoveDown(index)}
                    disabled={isLast}
                    style={[
                      s.iconBtn,
                      {
                        backgroundColor: theme.surface.header,
                        opacity: isLast ? 0.25 : 1,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel="Di chuyển xuống"
                  >
                    <Icon name="chevron-down" size={16} color={theme.text.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums>
                    +{formatCurrency(top.priceDelta)} đ
                  </AppText>
                  <Icon name="chevron-right" size={18} color={theme.text.muted} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal Add/Edit Topping */}
      <AppModal
        visible={modalVisible}
        title={editingTopping ? 'Sửa Topping' : 'Thêm Topping Mới'}
        subtitle="Quản lý topping / tùy chọn thêm của món"
        icon="shaker-outline"
        iconColor={theme.brand.primary}
        onClose={() => setModalVisible(false)}
        presentation="dialog"
        maxWidth={440}
        primaryAction={{
          label: 'Lưu Topping',
          variant: 'primary',
          onPress: handleSave,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setModalVisible(false),
        }}
      >
        <View style={{ gap: 12 }}>
          <View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Tên Topping:
            </AppText>
            <TextInput
              value={toppingName}
              onChangeText={setToppingName}
              placeholder="Ví dụ: Trân Châu Trắng 3Q"
              placeholderTextColor={theme.text.muted}
              style={[
                s.input,
                {
                  color: theme.text.primary,
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
              autoFocus
            />
          </View>

          <View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Giá Phụ Thu (VNĐ):
            </AppText>
            <TextInput
              value={toppingPriceStr}
              onChangeText={(val) => {
                const num = val.replace(/\D/g, '');
                setToppingPriceStr(num);
              }}
              placeholder="6000"
              keyboardType="numeric"
              placeholderTextColor={theme.text.muted}
              style={[
                s.input,
                {
                  color: theme.text.primary,
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
            />
            {toppingPriceStr ? (
              <AppText variant="xs" color={theme.brand.primary} tabularNums style={{ marginTop: 4 }}>
                Đơn giá: +{formatCurrency(parseInt(toppingPriceStr, 10) || 0)} đ
              </AppText>
            ) : null}
          </View>

          {/* Nút Xóa Topping Trong Modal Khi Chỉnh Sửa */}
          {editingTopping && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDelete(editingTopping)}
              style={[
                s.btnDeleteModal,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: theme.brand.danger,
                },
              ]}
            >
              <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
              <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                Xóa Topping
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </AppModal>
    </View>
  );
};

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  listContainer: {
    paddingBottom: 140,
  },
  toppingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btnModal: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
});

export default ToppingManagementTab;
