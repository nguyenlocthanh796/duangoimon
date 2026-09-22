import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { ModalDragIndicator } from '../ui/ModalDragIndicator';
import { playTapSound } from '../../utils/sound';
import { useToppings, useStoreSettings } from '../../store/usePOSStore';

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItemWithModifiers {
  id: string;
  name: string;
  price: number;
  code?: string;
  category?: string;
  image?: string;
  costPrice?: number;
  unit?: string;
  station?: 'bar' | 'kitchen' | 'snack';
  isOutOfStock?: boolean;
  sizes?: ModifierOption[];
  toppings?: ModifierOption[];
}

export interface SelectedModifierData {
  cartItemId?: string;
  item: MenuItemWithModifiers;
  qty: number;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  selectedToppings: string[];
  note: string;
  unitPrice: number;
  isTakeaway?: boolean;
}

interface ModifierSheetProps {
  visible: boolean;
  item: MenuItemWithModifiers | null;
  initialData?: SelectedModifierData | null;
  onClose: () => void;
  onConfirm: (data: SelectedModifierData) => void;
}

export const BEVERAGE_CATEGORIES = [
  'Trà Sữa',
  'Trà Trái Cây',
  'Trà Chanh',
  'Cà Phê',
  'Đá Xay & Matcha',
  'Nước Ép',
  'Đồ Uống',
];

export function isSugarIceItem(item?: MenuItemWithModifiers | null, allowedCategories?: string[]): boolean {
  if (!item) return false;
  if ((item as any).allowSugarIce === true) return true;
  if ((item as any).allowSugarIce === false) return false;
  const cat = (item.category || '').trim().toLowerCase();
  if (
    cat.includes('chè') ||
    cat.includes('kem') ||
    cat.includes('ăn vặt') ||
    cat.includes('thức ăn') ||
    cat.includes('món ăn')
  ) {
    return false;
  }
  const targetCategories = (allowedCategories && allowedCategories.length > 0)
    ? allowedCategories
    : BEVERAGE_CATEGORIES;
  return targetCategories.some(
    (b) => cat === b.toLowerCase() || cat.includes(b.toLowerCase())
  );
}

export function getQuickNotesForItem(item?: MenuItemWithModifiers | null): string[] {
  if (!item) return ['Mang về', 'Ăn tại quán'];
  const cat = (item.category || '').trim().toLowerCase();
  if (cat.includes('chè')) {
    return ['Mang về', 'Ăn tại quán', 'Ít ngọt', 'Để riêng đá'];
  }
  if (cat.includes('kem')) {
    return ['Mang về', 'Ăn tại quán', 'Ăn liền'];
  }
  if (isSugarIceItem(item)) {
    return ['Mang về', 'Ít ngọt', 'Không đá', 'Để riêng đá'];
  }
  if (cat.includes('ăn vặt') || cat.includes('món ăn') || item.station === 'kitchen' || item.station === 'snack') {
    return ['Mang về', 'Ăn tại quán', 'Ít cay', 'Không cay', 'Để riêng sốt'];
  }
  return ['Mang về', 'Ăn tại quán'];
}

const sugarOptions = ['100%', '70%', '50%', '30%', '0%'];
const iceOptions = ['100%', '70%', '50%', 'Nóng'];

export const ModifierSheet: React.FC<ModifierSheetProps> = ({
  visible,
  item,
  initialData,
  onClose,
  onConfirm,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = insets.top;
  const bottomInset = insets.bottom;

  const storeSettings = useStoreSettings();
  const enableSugarIce = storeSettings?.enableSugarIceModifier ?? false;
  const isBeverage = enableSugarIce && isSugarIceItem(item, storeSettings?.sugarIceCategories);
  const quickNotes =
    (storeSettings?.quickNotesList && storeSettings.quickNotesList.length > 0)
      ? storeSettings.quickNotesList
      : getQuickNotesForItem(item);
  const storeToppings = useToppings();
  const sizes = item?.sizes && item.sizes.length > 0 ? item.sizes : [];
  const toppings =
    item?.toppings && item.toppings.length > 0
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
      setSelectedSize(initialData.selectedSize || (item?.sizes && item.sizes.length > 0 ? item.sizes[0].name : ''));
      setSugarLevel(initialData.sugarLevel || (isBeverage ? '100%' : ''));
      setIceLevel(initialData.iceLevel || (isBeverage ? '100%' : ''));
      setSelectedToppings(initialData.selectedToppings || []);
      setNote(initialData.note || '');
    } else if (item) {
      setQty(1);
      setIsTakeaway(false);
      setSelectedSize(item.sizes && item.sizes.length > 0 ? item.sizes[0].name : '');
      setSugarLevel(isBeverage ? '100%' : '');
      setIceLevel(isBeverage ? '100%' : '');
      setSelectedToppings([]);
      setNote('');
    }
  }, [initialData, item, visible]);

  if (!item) return null;

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
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View
        style={[
          s.fullContainer,
          {
            backgroundColor: theme.surface.app,
          },
        ]}
      >
        {/* 🌟 1. HEADER TOÀN MÀN HÌNH CHUẨN POS */}
        <View
          style={[
            s.header,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.default,
              paddingTop: topInset,
              height: 56 + topInset,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => {
              playTapSound();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              s.backBtn,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
              },
            ]}
          >
            <Icon name="arrow-left" size={22} color={theme.text.primary} />
          </TouchableOpacity>

          <View style={s.headerTitleCol}>
            <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              {isEditing ? 'Chỉnh sửa món trong giỏ' : 'Tùy chỉnh món mới'}
            </AppText>
          </View>

          <View style={[s.priceHeaderBadge, { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent }]}>
            <AppText variant="sm" weight="medium" color={theme.brand.accent} tabularNums>
              {unitPrice.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        </View>

        {/* 🌟 2. BODY CUỘN LIỀN MẠCH (SEAMLESS BORDERLESS FLOW) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.scrollBody, { paddingBottom: (insets.bottom > 0 ? Math.round(insets.bottom * 0.25) : 4) + 68 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 🌟 0. HÌNH THỨC PHỤC VỤ (TẠI CHỖ · MANG VỀ) */}
            <View style={s.sectionBlock}>
              <View style={s.sectionHeaderRow}>
                <Icon name="silverware-fork-knife" size={16} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.text.muted}>
                  HÌNH THỨC PHỤC VỤ
                </AppText>
              </View>

              <View style={[s.segmentedPillTrack, { backgroundColor: theme.surface.card, borderColor: theme.border.default, borderWidth: StyleSheet.hairlineWidth, height: 42, padding: 3 }]}>
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
                    s.segmentedPillBtn,
                    !isTakeaway
                      ? {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : theme.brand.primary,
                          borderRadius: 8,
                          shadowColor: theme.surface.shadow,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.15,
                          shadowRadius: 2,
                          elevation: 2,
                        }
                      : { backgroundColor: 'transparent' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="table-chair" size={16} color={!isTakeaway ? theme.text.onBrand : theme.text.primary} />
                    <AppText
                      variant="sm"
                      weight={!isTakeaway ? 'bold' : 'medium'}
                      color={!isTakeaway ? theme.text.onBrand : theme.text.primary}
                    >
                      Tại Chỗ
                    </AppText>
                  </View>
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
                    s.segmentedPillBtn,
                    isTakeaway
                      ? {
                          backgroundColor: theme.brand.accent,
                          borderRadius: 8,
                          shadowColor: theme.surface.shadow,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.15,
                          shadowRadius: 2,
                          elevation: 2,
                        }
                      : { backgroundColor: 'transparent' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="shopping-outline" size={16} color={isTakeaway ? theme.text.onBrand : theme.text.primary} />
                    <AppText
                      variant="sm"
                      weight={isTakeaway ? 'bold' : 'medium'}
                      color={isTakeaway ? theme.text.onBrand : theme.text.primary}
                    >
                      Mang Về
                    </AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* 1. CHỌN KÍCH CỠ (SEAMLESS SEGMENTED INSET GROUP) */}
            {sizes.length > 0 && (
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Icon name="cup" size={16} color={theme.brand.accent} />
                  <AppText variant="xs" weight="bold" color={theme.text.muted}>
                    KÍCH CỠ (SIZE)
                  </AppText>
                </View>

                <View style={[s.groupedInsetContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
                  {sizes.map((sz, idx) => {
                    const active = selectedSize === sz.name;
                    return (
                      <TouchableOpacity
                        key={sz.name}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Chọn cỡ ${sz.name}${sz.priceDelta > 0 ? `, thêm ${sz.priceDelta.toLocaleString('vi-VN')} đồng` : ''}`}
                        onPress={() => {
                          playTapSound();
                          if (Platform.OS !== 'web') {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch (_) {}
                          }
                          setSelectedSize(sz.name);
                        }}
                        style={[
                          s.groupedInsetRow,
                          {
                            backgroundColor: active ? theme.status.warningBg : 'transparent',
                            borderBottomColor: theme.border.default,
                            borderBottomWidth: idx === sizes.length - 1 ? 0 : StyleSheet.hairlineWidth,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Icon
                            name={active ? 'radiobox-marked' : 'radiobox-blank'}
                            size={20}
                            color={active ? theme.brand.accent : theme.text.muted}
                          />
                          <AppText
                            variant="sm"
                            weight={active ? 'medium' : 'normal'}
                            color={active ? theme.brand.accent : theme.text.primary}
                          >
                            {sz.name}
                          </AppText>
                        </View>

                        <AppText
                          variant="sm"
                          weight={active ? 'medium' : 'normal'}
                          color={active ? theme.brand.accent : theme.text.muted}
                          tabularNums
                        >
                          {sz.priceDelta > 0 ? `+${sz.priceDelta.toLocaleString('vi-VN')} đ` : 'Tiêu chuẩn'}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. MỨC ĐƯỜNG & ĐÁ (CONTINUOUS SEGMENTED KHAY BẤM) */}
            {isBeverage && (
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Icon name="tune" size={16} color={theme.brand.accent} />
                  <AppText variant="xs" weight="bold" color={theme.text.muted}>
                    ĐỘ NGỌT & ĐỘ LẠNH (ĐƯỜNG · ĐÁ)
                  </AppText>
                </View>

                <View style={[s.segmentedGroup, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
                  {/* Đường */}
                  <View style={{ padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.default }}>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 8 }}>
                      Lượng đường: <AppText variant="xs" weight="bold" color={theme.brand.accent}>{sugarLevel}</AppText>
                    </AppText>
                    <View style={[s.segmentedPillTrack, { backgroundColor: theme.surface.header }]}>
                      {sugarOptions.map((sg) => {
                        const active = sugarLevel === sg;
                        return (
                          <TouchableOpacity
                            key={sg}
                            accessibilityRole="button"
                            accessibilityLabel={`Mức đường ${sg}`}
                            onPress={() => {
                              playTapSound();
                              if (Platform.OS !== 'web') {
                                try {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                } catch (_) {}
                              }
                              setSugarLevel(sg);
                            }}
                            style={[
                              s.segmentedPillBtn,
                              active
                                ? {
                                    backgroundColor: theme.brand.accent,
                                    shadowColor: theme.surface.shadow,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.12,
                                    shadowRadius: 4,
                                    elevation: 2,
                                  }
                                : {
                                    backgroundColor: 'transparent',
                                  },
                            ]}
                          >
                            <AppText
                              variant="sm"
                              weight={active ? 'bold' : 'medium'}
                              color={active ? theme.text.onBrand : theme.text.primary}
                              tabularNums
                            >
                              {sg}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Đá */}
                  <View style={{ padding: 12 }}>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 8 }}>
                      Lượng đá: <AppText variant="xs" weight="bold" color={theme.brand.accent}>{iceLevel}</AppText>
                    </AppText>
                    <View style={[s.segmentedPillTrack, { backgroundColor: theme.surface.header }]}>
                      {iceOptions.map((ic) => {
                        const active = iceLevel === ic;
                        return (
                          <TouchableOpacity
                            key={ic}
                            accessibilityRole="button"
                            accessibilityLabel={`Mức đá ${ic}`}
                            onPress={() => {
                              playTapSound();
                              if (Platform.OS !== 'web') {
                                try {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                } catch (_) {}
                              }
                              setIceLevel(ic);
                            }}
                            style={[
                              s.segmentedPillBtn,
                              active
                                ? {
                                    backgroundColor: theme.brand.accent,
                                    shadowColor: theme.surface.shadow,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.12,
                                    shadowRadius: 4,
                                    elevation: 2,
                                  }
                                : {
                                    backgroundColor: 'transparent',
                                  },
                            ]}
                          >
                            <AppText
                              variant="sm"
                              weight={active ? 'bold' : 'medium'}
                              color={active ? theme.text.onBrand : theme.text.primary}
                              tabularNums
                            >
                              {ic}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 3. THÊM TOPPING (GROUPED INSET LIST) */}
            {toppings.length > 0 && (
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Icon name="plus-circle-outline" size={16} color={theme.brand.accent} />
                  <AppText variant="xs" weight="bold" color={theme.text.muted}>
                    TOPPING THÊM ({selectedToppings.length} ĐÃ CHỌN)
                  </AppText>
                </View>

                <View style={[s.groupedInsetContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
                  {toppings.map((top, idx) => {
                    const active = selectedToppings.includes(top.name);
                    return (
                      <TouchableOpacity
                        key={top.name}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`${active ? 'Bỏ chọn' : 'Chọn'} topping ${top.name}, thêm ${top.priceDelta.toLocaleString('vi-VN')} đồng`}
                        onPress={() => toggleTopping(top.name)}
                        style={[
                          s.groupedInsetRow,
                          {
                            backgroundColor: active ? theme.status.warningBg : 'transparent',
                            borderBottomColor: theme.border.default,
                            borderBottomWidth: idx === toppings.length - 1 ? 0 : StyleSheet.hairlineWidth,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <Icon
                            name={active ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                            size={20}
                            color={active ? theme.brand.accent : theme.text.muted}
                          />
                          <AppText
                            variant="sm"
                            weight={active ? 'medium' : 'normal'}
                            color={active ? theme.brand.accent : theme.text.primary}
                            numberOfLines={1}
                          >
                            {top.name}
                          </AppText>
                        </View>

                        <AppText
                          variant="sm"
                          weight={active ? 'medium' : 'normal'}
                          color={active ? theme.brand.accent : theme.text.muted}
                          tabularNums
                        >
                          +{top.priceDelta.toLocaleString('vi-VN')} đ
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4. GHI CHÚ CHO BẾP */}
            <View style={s.sectionBlock}>
              <View style={s.sectionHeaderRow}>
                <Icon name="note-edit-outline" size={16} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.text.muted}>
                  GHI CHÚ CHO PHA CHẾ / BẾP
                </AppText>
              </View>

              {/* Quick note soft chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
                {quickNotes.map((qn) => {
                  const isActive = note.includes(qn);
                  return (
                    <TouchableOpacity
                      key={qn}
                      accessibilityRole="button"
                      accessibilityLabel={`${isActive ? 'Bỏ ghi chú' : 'Thêm ghi chú'} ${qn}`}
                      onPress={() => {
                        playTapSound();
                        if (Platform.OS !== 'web') {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch (_) {}
                        }
                        if (isActive) {
                          const parts = note
                            .split(',')
                            .map((p) => p.trim())
                            .filter((p) => p !== qn && p.length > 0);
                          setNote(parts.join(', '));
                        } else {
                          setNote((prev) => (prev ? `${prev}, ${qn}` : qn));
                        }
                      }}
                      style={[
                        s.quickNoteChip,
                        {
                          backgroundColor: isActive ? theme.status.warningBg : theme.surface.card,
                          borderColor: isActive ? theme.brand.accent : theme.border.default,
                        },
                      ]}
                    >
                      <AppText
                        variant="xs"
                        weight={isActive ? 'medium' : 'normal'}
                        color={isActive ? theme.brand.accent : theme.text.primary}
                      >
                        {isActive ? `✓ ${qn}` : `+ ${qn}`}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Ghi chú món..."
                placeholderTextColor={theme.text.muted}
                style={[
                  s.noteInputBox,
                  {
                    backgroundColor: theme.surface.card,
                    color: theme.text.primary,
                    borderColor: theme.border.default,
                  },
                ]}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* 🌟 3. FIXED FLOATING BOTTOM DOCK CHUẨN ERGONOMIC */}
        <View
          style={[
            s.fixedDock,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.default,
              paddingBottom: insets.bottom > 0 ? Math.round(insets.bottom * 0.25) : 4,
              paddingTop: 8,
            },
          ]}
        >
          {/* Stepper Qty */}
          <View style={[s.stepperBox, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Bớt 1 phần"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                if (qty > 1) {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (_) {}
                  }
                  setQty(qty - 1);
                }
              }}
              style={s.stepperBtn}
            >
              <Icon name="minus" size={20} color={qty > 1 ? theme.text.primary : theme.text.muted} />
            </TouchableOpacity>

            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ minWidth: 28, textAlign: 'center' }}>
              {qty}
            </AppText>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Thêm 1 phần"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                }
                setQty(qty + 1);
              }}
              style={s.stepperBtn}
            >
              <Icon name="plus" size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Confirm CTA */}
          <View style={{ flex: 1 }}>
            <Button
              variant="accent"
              size="lg"
              title={isEditing ? `LƯU · ${totalPrice.toLocaleString('vi-VN')} đ` : `THÊM · ${totalPrice.toLocaleString('vi-VN')} đ`}
              leadingIcon={<Icon name={isEditing ? 'check' : 'cart-plus'} size={20} color={theme.text.onBrand} />}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  priceHeaderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scrollBody: {
    padding: 16,
    gap: 16,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  groupedInsetContainer: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  groupedInsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  segmentedGroup: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  segmentedPillTrack: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentedPillBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  quickNoteChip: {
    height: 44,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInputBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fixedDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
