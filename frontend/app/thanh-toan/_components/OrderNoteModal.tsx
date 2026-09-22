import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../../lib/components/ui/AppText';
import { ModalDragIndicator } from '../../../lib/components/ui/ModalDragIndicator';
import { useTheme } from '../../../lib/theme';
import { playTapSound } from '../../../lib/utils/sound';

interface NoteItem {
  id: string;
  icon: keyof typeof Icon.glyphMap;
  shortLabel: string;
  fullText: string;
}

interface NoteCategory {
  title: string;
  icon: keyof typeof Icon.glyphMap;
  items: NoteItem[];
}

const NOTE_CATEGORIES: NoteCategory[] = [
  {
    title: 'Thu Ngân & Hóa Đơn',
    icon: 'receipt',
    items: [
      { id: 'vat', icon: 'file-document-outline', shortLabel: 'VAT', fullText: 'Xuất hóa đơn VAT' },
      { id: 'no', icon: 'clock-outline', shortLabel: 'Nợ lại', fullText: 'Khách quen nợ lại' },
      { id: 'tach_bill', icon: 'content-cut', shortLabel: 'Tách bill', fullText: 'Tách bill khi thanh toán' },
      { id: 'the_vip', icon: 'card-account-details-outline', shortLabel: 'Thẻ VIP', fullText: 'Giảm giá thẻ thành viên' },
    ],
  },
  {
    title: 'Phục Vụ & Bàn Ăn',
    icon: 'room-service-outline',
    items: [
      { id: 'da_rieng', icon: 'cube-outline', shortLabel: 'Đá riêng', fullText: 'Mang về để đá riêng' },
      { id: 'ngoai_san', icon: 'home-outline', shortLabel: 'Ngoài sân', fullText: 'Giao tận bàn ngoài sân' },
      { id: 'them_da', icon: 'cup-water', shortLabel: 'Thêm đá', fullText: 'Cho thêm ly đá' },
      { id: 'lam_truoc', icon: 'flash-outline', shortLabel: 'Làm trước', fullText: 'Ưu tiên làm trước' },
      { id: 'khach_voi', icon: 'run-fast', shortLabel: 'Khách vội', fullText: 'Khách đang vội' },
    ],
  },
  {
    title: 'Pha Chế & Bếp',
    icon: 'coffee-outline',
    items: [
      { id: 'it_ngot', icon: 'spoon-sugar', shortLabel: 'Ít ngọt', fullText: 'Giảm ngọt / Ít đá' },
      { id: 'khong_da', icon: 'snowflake-off', shortLabel: 'Không đá', fullText: 'Không lấy đá' },
      { id: 'khong_duong', icon: 'cube-off-outline', shortLabel: 'Không đường', fullText: 'Không lấy đường' },
      { id: 'khong_cay', icon: 'chili-off', shortLabel: 'Không cay', fullText: 'Không hành / Không cay' },
      { id: 'doi_mon', icon: 'swap-horizontal', shortLabel: 'Đổi món', fullText: 'Khách đổi món' },
    ],
  },
];

interface OrderNoteModalProps {
  visible: boolean;
  onClose: () => void;
  currentNote: string;
  onSaveNote: (note: string) => void;
}

export function OrderNoteModal({
  visible,
  onClose,
  currentNote,
  onSaveNote,
}: OrderNoteModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState(currentNote);

  useEffect(() => {
    if (visible) {
      setNote(currentNote);
    }
  }, [visible, currentNote]);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(style);
      } catch {}
    }
  };

  const selectedList = note
    ? note.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const handleToggleChip = (preset: string) => {
    triggerHaptic();
    if (selectedList.includes(preset)) {
      setNote(selectedList.filter((s) => s !== preset).join(', '));
    } else {
      setNote([...selectedList, preset].join(', '));
    }
  };

  const handleSave = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onSaveNote(note.trim());
    onClose();
  };

  const handleClear = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setNote('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[s.fullScreenRoot, { backgroundColor: theme.surface.app, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }]}>
        <ModalDragIndicator />
        {/* 🌟 1. TOP BAR CỐ ĐỊNH CHUẨN POS */}
        <View
          style={[
            s.topBar,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.default,
              paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 16),
              height: 60 + Math.max(insets.top, Platform.OS === 'android' ? 12 : 16),
            },
          ]}
        >
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => {
                triggerHaptic();
                onClose();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                s.navBtn,
                { backgroundColor: theme.surface.header, borderColor: theme.border.default },
              ]}
            >
              <Icon name="arrow-left" size={20} color={theme.text.primary} />
            </TouchableOpacity>

            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                Ghi Chú Đơn Hàng
              </AppText>
              <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                In trên bill & thông báo KDS Bếp
              </AppText>
            </View>
          </View>

          <View
            style={[
              s.headerBadge,
              {
                backgroundColor: selectedList.length > 0 ? theme.brand.primaryBg : theme.surface.header,
                borderColor: selectedList.length > 0 ? theme.brand.primary : theme.border.default,
              },
            ]}
          >
            <AppText
              variant="sm"
              weight="medium"
              color={selectedList.length > 0 ? theme.brand.primary : theme.text.muted}
              tabularNums
            >
              {selectedList.length > 0 ? `${selectedList.length} mục` : 'Trống'}
            </AppText>
          </View>
        </View>

        {/* 🌟 2. BODY CUỘN TOÀN MÀN HÌNH (FLAT SEAMLESS CANVAS) */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.scrollBody,
            { paddingBottom: Math.max(insets.bottom, 16) + 84 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* KHUNG XEM TRƯỚC GHI CHÚ PHẲNG LIỀN MẠCH (FLAT SEAMLESS LIVE PREVIEW STRIP) */}
          <View
            style={[
              s.flatPreviewStrip,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
              },
            ]}
          >
            <View style={s.previewCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon
                  name={selectedList.length > 0 ? 'clipboard-check' : 'clipboard-edit-outline'}
                  size={18}
                  color={selectedList.length > 0 ? theme.brand.primary : theme.text.muted}
                />
                <AppText
                  variant="xs"
                  weight="medium"
                  color={selectedList.length > 0 ? theme.brand.primary : theme.text.muted}
                >
                  NỘI DUNG IN TRÊN BILL
                </AppText>
              </View>
              {selectedList.length > 0 && (
                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  {selectedList.length} mục
                </AppText>
              )}
            </View>

            {selectedList.length > 0 ? (
              <View style={s.activeChipsWrap}>
                {selectedList.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      s.activeNotePill,
                      {
                        backgroundColor: theme.brand.primaryBg,
                        borderColor: theme.brand.primary,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                      {item}
                    </AppText>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ghi chú ${item}`}
                      onPress={() => handleToggleChip(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 4 }}
                    >
                      <Icon name="close" size={13} color={theme.brand.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.emptyPreviewBox}>
                <AppText variant="xs" color={theme.text.muted}>
                  Chạm các biểu tượng bên dưới để chọn nhanh (1-chạm không cần gõ phím).
                </AppText>
              </View>
            )}
          </View>

          {/* CÁC PHÂN NHÓM GHI CHÚ: DÃY ICON - KHI CHỌN BUNG TOÀN TEXT */}
          {NOTE_CATEGORIES.map((category, catIdx) => (
            <View key={catIdx} style={s.categorySection}>
              {/* Category Header */}
              <View style={s.categoryHeaderRow}>
                <View style={[s.categoryIconBox, { backgroundColor: theme.brand.primaryBg }]}>
                  <Icon name={category.icon} size={15} color={theme.brand.primary} />
                </View>
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  {category.title.toUpperCase()}
                </AppText>
              </View>

              {/* Tactical Chips Grid: Icon + shortLabel, bung fullText khi chọn */}
              <View style={s.chipGrid}>
                {category.items.map((item) => {
                  const isSelected = selectedList.includes(item.fullText);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Chọn ghi chú ${item.fullText}`}
                      onPress={() => handleToggleChip(item.fullText)}
                      style={[
                        s.tacticalChip,
                        {
                          backgroundColor: isSelected
                            ? theme.brand.primaryBg
                            : isDark
                            ? theme.surface.card
                            : theme.surface.card,
                          borderColor: isSelected ? theme.brand.primary : theme.border.default,
                        },
                      ]}
                    >
                      <Icon
                        name={isSelected ? 'check-circle' : item.icon}
                        size={16}
                        color={isSelected ? theme.brand.primary : theme.text.muted}
                      />
                      <AppText
                        variant="xs"
                        weight={isSelected ? 'medium' : 'normal'}
                        color={isSelected ? theme.brand.primary : theme.text.primary}
                      >
                        {isSelected ? item.fullText : item.shortLabel}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* 🌟 3. BOTTOM DOCK ACTION CỐ ĐỊNH CHUẨN DISCOUNT MODAL */}
        <View
          style={[
            s.fixedBottomDock,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.default,
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {selectedList.length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Xóa hết tất cả ghi chú"
                onPress={handleClear}
                style={[
                  s.dockSecondaryBtn,
                  {
                    borderColor: theme.brand.danger,
                    backgroundColor: theme.status.dangerBg,
                  },
                ]}
              >
                <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                  XÓA HẾT
                </AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => {
                  triggerHaptic();
                  onClose();
                }}
                style={[
                  s.dockSecondaryBtn,
                  {
                    borderColor: theme.border.default,
                    backgroundColor: theme.surface.header,
                  },
                ]}
              >
                <AppText variant="sm" weight="medium" color={theme.text.muted}>
                  ĐÓNG
                </AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Lưu ghi chú đơn hàng"
              onPress={handleSave}
              style={[
                s.dockPrimaryBtn,
                {
                  backgroundColor: theme.brand.primary,
                },
              ]}
            >
              <Icon name="check" size={18} color={theme.text.onBrand} />
              <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                {selectedList.length > 0 ? `LƯU GHI CHÚ (${selectedList.length})` : 'LƯU GHI CHÚ'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scrollBody: {
    paddingBottom: 88,
  },
  flatPreviewStrip: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeNotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyPreviewBox: {
    paddingVertical: 2,
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  categoryIconBox: {
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tacticalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fixedBottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 10,
  },
  dockSecondaryBtn: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default OrderNoteModal;
