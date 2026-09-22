import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { playTapSound } from '../../utils/sound';
import { useToppings, useStoreSettings } from '../../store/usePOSStore';
import {
  MenuItemWithModifiers,
  ModifierOption,
  SelectedModifierData,
  isSugarIceItem,
  getQuickNotesForItem,
} from '../pos';

export interface InlineModifierPaneProps {
  item: MenuItemWithModifiers;
  initialData?: SelectedModifierData | null;
  onClose: () => void;
  onConfirm: (data: SelectedModifierData) => void;
}

const sugarOptions = ['100%', '70%', '50%', '30%', '0%'];
const iceOptions = ['100%', '70%', '50%', 'Nóng'];

export const InlineModifierPane: React.FC<InlineModifierPaneProps> = ({
  item,
  initialData,
  onClose,
  onConfirm,
}) => {
  const { theme, isDark } = useTheme();

  const storeSettings = useStoreSettings();
  const enableSugarIce = storeSettings?.enableSugarIceModifier ?? false;
  const isBeverage = enableSugarIce && isSugarIceItem(item, storeSettings?.sugarIceCategories);
  const quickNotes =
    (storeSettings?.quickNotesList && storeSettings.quickNotesList.length > 0)
      ? storeSettings.quickNotesList
      : getQuickNotesForItem(item);
  const storeToppings = useToppings();
  const sizes = item.sizes && item.sizes.length > 0 ? item.sizes : [];
  const toppings =
    item.toppings && item.toppings.length > 0
      ? item.toppings
      : isBeverage && storeToppings.length > 0
      ? storeToppings
      : [];

  const [qty, setQty] = useState(1);
  const [isTakeaway, setIsTakeaway] = useState<boolean>(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sugarLevel, setSugarLevel] = useState<string>('100%');
  const [iceLevel, setIceLevel] = useState<string>('100%');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setQty(initialData.qty || 1);
      setIsTakeaway(Boolean(initialData.isTakeaway));
      setSelectedSize(initialData.selectedSize || (sizes.length > 0 ? sizes[0].name : ''));
      setSugarLevel(initialData.sugarLevel || (isBeverage ? '100%' : ''));
      setIceLevel(initialData.iceLevel || (isBeverage ? '100%' : ''));
      setSelectedToppings(initialData.selectedToppings || []);
      setNote(initialData.note || '');
    } else if (item) {
      setQty(1);
      setIsTakeaway(false);
      setSelectedSize(sizes.length > 0 ? sizes[0].name : '');
      setSugarLevel(isBeverage ? '100%' : '');
      setIceLevel(isBeverage ? '100%' : '');
      setSelectedToppings([]);
      setNote('');
    }
  }, [initialData, item]);

  const sizeDelta = sizes.find((s) => s.name === selectedSize)?.priceDelta || 0;
  const toppingsDelta = selectedToppings.reduce((sum, topName) => {
    const top = toppings.find((t) => t.name === topName);
    return sum + (top ? top.priceDelta : 0);
  }, 0);

  const unitPrice = item.price + sizeDelta + toppingsDelta;
  const totalPrice = unitPrice * qty;

  const toggleTopping = (name: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setSelectedToppings((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleSave = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }
    onConfirm({
      cartItemId: initialData?.cartItemId,
      item,
      qty,
      selectedSize: selectedSize || undefined,
      sugarLevel: isBeverage ? sugarLevel : undefined,
      iceLevel: isBeverage ? iceLevel : undefined,
      selectedToppings,
      note,
      unitPrice,
      isTakeaway,
    });
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <View style={[s.container, { backgroundColor: theme.surface.card, borderLeftColor: theme.border.subtle }]}>
      {/* 🌟 1. HEADER CHỈNH MÓN (MORPHING DOCK HEADER) */}
      <View style={[s.header, { backgroundColor: theme.surface.header, borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Quay lại giỏ hàng"
          onPress={() => {
            playTapSound();
            onClose();
          }}
          style={[s.backBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-left" size={18} color={theme.text.primary} />
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            Giỏ Hàng
          </AppText>
        </TouchableOpacity>

        <View style={s.headerTitleBox}>
          <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="xxs" color={theme.text.muted}>
            {isEditing ? 'Đang sửa món' : 'Tùy chỉnh món mới'}
          </AppText>
        </View>
      </View>

      {/* 🌟 2. THÂN CUỘN CÁC TÙY CHỌN 1-CHẠM */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2.0. HÌNH THỨC PHỤC VỤ (TẠI CHỖ · MANG VỀ) */}
        <View style={s.sectionBlock}>
          <View style={s.sectionHeader}>
            <Icon name="silverware-fork-knife" size={15} color={theme.brand.accent} />
            <AppText variant="xs" weight="bold" color={theme.text.muted}>
              HÌNH THỨC PHỤC VỤ
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Phục vụ tại chỗ"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                }
                setIsTakeaway(false);
              }}
              style={[
                s.optionChip,
                { flex: 1, height: 42, justifyContent: 'center' },
                !isTakeaway
                  ? { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : theme.brand.primary, borderColor: 'transparent' }
                  : { backgroundColor: theme.surface.header, borderColor: theme.border.default },
              ]}
            >
              <Icon name="table-chair" size={16} color={!isTakeaway ? theme.text.onBrand : theme.text.primary} />
              <AppText
                variant="sm"
                weight={!isTakeaway ? 'bold' : 'medium'}
                color={!isTakeaway ? theme.text.onBrand : theme.text.primary}
              >
                Tại Chỗ
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Đóng gói mang về"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                }
                setIsTakeaway(true);
              }}
              style={[
                s.optionChip,
                { flex: 1, height: 42, justifyContent: 'center' },
                isTakeaway
                  ? { backgroundColor: theme.brand.accent, borderColor: 'transparent' }
                  : { backgroundColor: theme.surface.header, borderColor: theme.border.default },
              ]}
            >
              <Icon name="shopping-outline" size={16} color={isTakeaway ? theme.text.onBrand : theme.text.primary} />
              <AppText
                variant="sm"
                weight={isTakeaway ? 'bold' : 'medium'}
                color={isTakeaway ? theme.text.onBrand : theme.text.primary}
              >
                Mang Về
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2.1. KÍCH CỠ (SIZE) */}
        {sizes.length > 0 && (
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Icon name="cup-outline" size={15} color={theme.brand.primary} />
              <AppText variant="xs" weight="bold" color={theme.text.muted}>
                KÍCH CỠ (SIZE)
              </AppText>
            </View>
            <View style={s.chipRowWrap}>
              {sizes.map((sz) => {
                const active = selectedSize === sz.name;
                return (
                  <TouchableOpacity
                    key={sz.name}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn kích cỡ ${sz.name}`}
                    onPress={() => {
                      playTapSound();
                      setSelectedSize(sz.name);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    style={[
                      s.optionChip,
                      {
                        backgroundColor: active ? theme.brand.primaryBg : theme.surface.header,
                        borderColor: active ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={active ? 'medium' : 'normal'}
                      color={active ? theme.brand.primary : theme.text.primary}
                    >
                      {sz.name} {sz.priceDelta > 0 ? `(+${(sz.priceDelta / 1000)}k)` : ''}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 2.2. LƯỢNG ĐƯỜNG */}
        {isBeverage && (
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Icon name="cube-outline" size={15} color={theme.brand.primary} />
              <AppText variant="xs" weight="bold" color={theme.text.muted}>
                LƯỢNG ĐƯỜNG
              </AppText>
            </View>
            <View style={s.chipRowWrap}>
              {sugarOptions.map((opt) => {
                const active = sugarLevel === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn lượng đường ${opt}`}
                    onPress={() => {
                      playTapSound();
                      setSugarLevel(opt);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    style={[
                      s.optionChip,
                      {
                        backgroundColor: active ? theme.brand.primaryBg : theme.surface.header,
                        borderColor: active ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={active ? 'medium' : 'normal'}
                      color={active ? theme.brand.primary : theme.text.primary}
                    >
                      {opt}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 2.3. LƯỢNG ĐÁ */}
        {isBeverage && (
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Icon name="snowflake" size={15} color={theme.brand.primary} />
              <AppText variant="xs" weight="bold" color={theme.text.muted}>
                LƯỢNG ĐÁ
              </AppText>
            </View>
            <View style={s.chipRowWrap}>
              {iceOptions.map((opt) => {
                const active = iceLevel === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn lượng đá ${opt}`}
                    onPress={() => {
                      playTapSound();
                      setIceLevel(opt);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    style={[
                      s.optionChip,
                      {
                        backgroundColor: active ? theme.brand.primaryBg : theme.surface.header,
                        borderColor: active ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={active ? 'medium' : 'normal'}
                      color={active ? theme.brand.primary : theme.text.primary}
                    >
                      {opt}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 2.4. TOPPING (CHỌN NHIỀU) */}
        {toppings.length > 0 && (
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Icon name="plus-circle-outline" size={15} color={theme.brand.primary} />
              <AppText variant="xs" weight="bold" color={theme.text.muted}>
                THÊM TOPPING
              </AppText>
            </View>
            <View style={s.chipRowWrap}>
              {toppings.map((top) => {
                const active = selectedToppings.includes(top.name);
                return (
                  <TouchableOpacity
                    key={top.id || top.name}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Thêm topping ${top.name}`}
                    onPress={() => toggleTopping(top.name)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    style={[
                      s.optionChip,
                      {
                        backgroundColor: active ? theme.brand.primaryBg : theme.surface.header,
                        borderColor: active ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <Icon
                      name={active ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={16}
                      color={active ? theme.brand.primary : theme.text.muted}
                      style={{ marginRight: 4 }}
                    />
                    <AppText
                      variant="xs"
                      weight={active ? 'medium' : 'normal'}
                      color={active ? theme.brand.primary : theme.text.primary}
                    >
                      {top.name} (+{(top.priceDelta / 1000)}k)
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 2.5. GHI CHÚ NHANH */}
        <View style={s.sectionBlock}>
          <View style={s.sectionHeader}>
            <Icon name="note-edit-outline" size={15} color={theme.brand.primary} />
            <AppText variant="xs" weight="bold" color={theme.text.muted}>
              GHI CHÚ MÓN
            </AppText>
          </View>
          <View style={s.chipRowWrap}>
            {quickNotes.map((qn) => {
              const active = note.includes(qn);
              return (
                <TouchableOpacity
                  key={qn}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Thêm ghi chú ${qn}`}
                  onPress={() => {
                    playTapSound();
                    setNote((prev) => (prev ? `${prev}, ${qn}` : qn));
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  style={[
                    s.quickNoteChip,
                    {
                      backgroundColor: active ? theme.brand.primaryBg : theme.surface.header,
                      borderColor: active ? theme.brand.primary : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText variant="xs" color={active ? theme.brand.primary : theme.text.primary}>
                    + {qn}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Nhập ghi chú khác cho bếp..."
            placeholderTextColor={theme.text.muted}
            style={[
              s.noteInput,
              {
                backgroundColor: theme.surface.header,
                color: theme.text.primary,
                borderColor: theme.border.subtle,
              },
            ]}
          />
        </View>
      </ScrollView>

      {/* 🌟 3. DOCKED BOTTOM ACTION BAR: [STEPPER] + [CTA THÊM VÀO GIỎ] */}
      <View style={[s.bottomDock, { backgroundColor: theme.surface.card, borderTopColor: theme.border.subtle }]}>
        {/* Stepper Số lượng */}
        <View style={[s.stepperBox, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Bớt 1 phần"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={() => {
              playTapSound();
              setQty((q) => Math.max(1, q - 1));
            }}
            style={s.stepBtn}
          >
            <Icon name="minus" size={18} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={s.qtyDisplay}>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
              {qty}
            </AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Thêm 1 phần"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={() => {
              playTapSound();
              setQty((q) => q + 1);
            }}
            style={s.stepBtn}
          >
            <Icon name="plus" size={18} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Nút Thêm Món Vào GiỎ (Apple Warm Orange Action Thread) */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Lưu thay đổi món' : 'Thêm món vào giỏ'}
          onPress={handleSave}
          style={[s.ctaAddBtn, { backgroundColor: theme.brand.accent }]}
        >
          <Icon name={isEditing ? 'check-bold' : 'cart-plus'} size={20} color={theme.text.onBrand} style={{ marginRight: 6 }} />
          <AppText variant="md" weight="bold" color={theme.text.onBrand}>
            {isEditing ? 'Lưu Thay Đổi' : 'Thêm Vào Giỏ'} ·{' '}
          </AppText>
          <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
            {totalPrice.toLocaleString('vi-VN')} đ
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitleBox: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 16,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickNoteChip: {
    paddingHorizontal: 12,
    height: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
    marginTop: 4,
  },
  bottomDock: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyDisplay: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaAddBtn: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
