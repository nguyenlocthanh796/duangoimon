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
  useCategories,
  useMenuItems,
  usePOSActions,
  CategoryItem,
} from '../../../lib/store/usePOSStore';
import { playTapSound } from '../../../lib/utils/sound';

const AVAILABLE_ICONS: (keyof typeof Icon.glyphMap)[] = [
  'cup-water',
  'coffee',
  'fruit-cherries',
  'food',
  'glass-cocktail',
  'blender',
  'tea',
  'cake-variant',
  'silverware-fork-knife',
  'tag-outline',
  'noodles',
  'beer',
];

interface CategoryManagementTabProps {
  isWide?: boolean;
  isReorderMode?: boolean;
  isAddOpen?: boolean;
  onAddClose?: () => void;
}

export const CategoryManagementTab: React.FC<CategoryManagementTabProps> = ({
  isWide = false,
  isReorderMode = false,
  isAddOpen = false,
  onAddClose,
}) => {
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();
  const categories = useCategories();
  const menuItems = useMenuItems();
  const { addCategory, updateCategory, deleteCategory, reorderCategories } = usePOSActions();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('cup-water');

  React.useEffect(() => {
    if (isAddOpen) {
      setEditingCategory(null);
      setCategoryName('');
      setSelectedIcon('cup-water');
      setModalVisible(true);
    }
  }, [isAddOpen]);

  const handleOpenAdd = () => {
    playTapSound();
    setEditingCategory(null);
    setCategoryName('');
    setSelectedIcon('cup-water');
    setModalVisible(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    playTapSound();
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setSelectedIcon(cat.icon || 'cup-water');
    setModalVisible(true);
  };

  const handleSave = () => {
    playTapSound();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      showToast({ title: 'Thiếu tên', message: 'Nhập tên danh mục!', type: 'danger' });
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, trimmed, selectedIcon);
      showToast({ title: 'Đã cập nhật', message: `Đã lưu danh mục "${trimmed}"`, type: 'success' });
    } else {
      addCategory(trimmed, selectedIcon);
      showToast({ title: 'Đã thêm', message: `Đã tạo danh mục "${trimmed}"`, type: 'success' });
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    setModalVisible(false);
    onAddClose?.();
  };

  const handleDelete = (cat: CategoryItem) => {
    playTapSound();
    const result = deleteCategory(cat.id);
    if (result.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({ title: 'Đã xóa', message: `Đã xóa danh mục "${cat.name}"`, type: 'success' });
      setModalVisible(false);
      onAddClose?.();
    } else {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
      showToast({ title: 'Không thể xóa', message: result.message || 'Lỗi xóa danh mục', type: 'danger' });
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
    const copy = [...categories];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    reorderCategories(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...categories];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    reorderCategories(copy);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Categories List (Flat Seamless) */}
      <ScrollView
        contentContainerStyle={[
          s.listContainer,
          isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat, index) => {
          const itemCount = menuItems.filter((m) => m.category === cat.name).length;
          const isFirst = index === 0;
          const isLast = index === categories.length - 1;

          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() => {
                if (isReorderMode) return;
                handleOpenEdit(cat);
              }}
              style={[
                s.categoryCard,
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
                    name={(cat.icon as any) || 'tag-outline'}
                    size={20}
                    color={theme.brand.primary}
                  />
                </View>

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <AppText variant="md" weight="normal" color={theme.text.primary}>
                    {cat.name}
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted} tabularNums>
                    {itemCount} món
                  </AppText>
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
                <Icon name="chevron-right" size={18} color={theme.text.muted} style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal Add / Edit Category */}
      <AppModal
        visible={modalVisible}
        title={editingCategory ? 'Chỉnh Sửa Nhóm Món' : 'Thêm Nhóm Danh Mục'}
        subtitle="Quản lý danh mục thực đơn của quán"
        icon={selectedIcon || 'tag-outline'}
        iconColor={theme.brand.primary}
        onClose={() => setModalVisible(false)}
        presentation="dialog"
        maxWidth={460}
        primaryAction={{
          label: editingCategory ? 'Cập Nhật' : 'Tạo Nhóm',
          variant: 'primary',
          onPress: handleSave,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setModalVisible(false),
        }}
      >
        <View style={{ gap: 12 }}>
          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Tên danh mục món
            </AppText>
            <TextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="VD: Cà Phê, Trà Sữa, Bánh Ngọt..."
              placeholderTextColor={theme.text.muted}
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                  color: theme.text.primary,
                },
              ]}
              autoFocus
            />
          </View>

          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 8 }}>
              Chọn biểu tượng đại diện
            </AppText>
            <View style={s.iconGrid}>
              {AVAILABLE_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <TouchableOpacity
                    key={iconName}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setSelectedIcon(iconName);
                    }}
                    style={[
                      s.iconOption,
                      {
                        backgroundColor: isSelected
                          ? theme.brand.primary
                          : theme.surface.header,
                        borderColor: isSelected
                          ? theme.brand.primary
                          : theme.border.default,
                      },
                    ]}
                  >
                    <Icon
                      name={iconName}
                      size={20}
                      color={isSelected ? theme.text.onBrand : theme.text.primary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Nút Xóa Danh Mục An Toàn Trong Modal */}
          {editingCategory && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDelete(editingCategory)}
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
                Xóa Danh Mục
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
    paddingVertical: 8,
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  listContainer: {
    paddingVertical: 4,
    paddingBottom: 100,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
});

export default CategoryManagementTab;
