import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { colors, palette, font, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import { MenuItem, CartItem } from './types';
import AppText from '../ui/AppText';
import { haptic } from '../../haptic';

const QUICK_NOTES = ['Ít đá', 'Nhiều đá', 'Không đá', 'Ít ngọt', 'Không đường', 'Nước béo'];

interface ModifierSheetProps {
  modalItem: MenuItem | null;
  modalQty: number;
  setModalQty: React.Dispatch<React.SetStateAction<number>>;
  modalSize: string | null;
  setModalSize: (size: string | null) => void;
  modalToppings: string[];
  setModalToppings: React.Dispatch<React.SetStateAction<string[]>>;
  modalNote: string;
  setModalNote: (note: string) => void;
  modalPrice: number;
  isWide: boolean;
  onClose: () => void;
  onSave: () => void;
  onAdd: () => void;
}

export default function ModifierSheet({
  modalItem,
  modalQty,
  setModalQty,
  modalSize,
  setModalSize,
  modalToppings,
  setModalToppings,
  modalNote,
  setModalNote,
  modalPrice,
  isWide,
  onClose,
  onSave,
  onAdd,
}: ModifierSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const toggleTopping = (name: string) => {
    setModalToppings((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const isEditMode = modalItem && 'cartItemId' in modalItem;

  const renderModifierContent = (isSheet: boolean) => {
    const InputComponent = isSheet ? BottomSheetTextInput : TextInput;
    const ScrollComponent = isSheet ? BottomSheetScrollView : ScrollView;
    return (
      <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.surface.app }}>
        {/* iOS Drag Handlebar */}
        <View style={{ width: '100%', alignItems: 'center', paddingTop: 8, paddingBottom: 2, backgroundColor: '#F8FAFC' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
        </View>

        {/* Fixed Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: isSheet ? 6 : Math.max(insets.top, 10),
            paddingBottom: 10,
            backgroundColor: '#F8FAFC',
            borderBottomWidth: 1,
            borderBottomColor: colors.border.default,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.text.primary} numberOfLines={1}>
              {modalItem?.name}
            </AppText>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {formatPrice(modalPrice)}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E5E9F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollComponent
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 110 }}
        >
          {/* CardBox 1: Quantity Stepper */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E9F0',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <View
              style={{
                backgroundColor: '#F8FAFC',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: '#E5E9F0',
              }}
            >
              <AppText variant="md" weight="bold" color="#1E293B">
                SỐ LƯỢNG
              </AppText>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                gap: 16,
              }}
            >
              <TouchableOpacity
                onPress={() => setModalQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="minus" size={20} color={colors.brand.primary} />
              </TouchableOpacity>
              <AppText
                variant="md"
                weight="bold"
                color={colors.text.primary}
                style={{
                  minWidth: 40,
                  textAlign: 'center',
                }}
              >
                {modalQty}
              </AppText>
              <TouchableOpacity
                onPress={() => setModalQty((q) => q + 1)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.brand.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* CardBox 2: Sizes */}
          {modalItem && modalItem.sizes && modalItem.sizes.length > 0 && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: '#E5E9F0',
                }}
              >
                <AppText variant="md" weight="bold" color="#1E293B">
                  KÍCH THƯỚC
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', padding: 10, gap: 8 }}>
                {(() => {
                  const allSizes = [{ name: 'M', price: modalItem.price }, ...modalItem.sizes];
                  return allSizes.map((s) => {
                    const sel = modalSize === s.name;
                    const sizeDelta = s.price - modalItem.price;
                    const deltaText =
                      sizeDelta > 0
                        ? `+${formatPrice(sizeDelta)}`
                        : sizeDelta < 0
                          ? `-${formatPrice(Math.abs(sizeDelta))}`
                          : '0đ';
                    return (
                      <TouchableOpacity
                        key={s.name}
                        onPress={() => setModalSize(s.name)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 6,
                          borderWidth: 1,
                          alignItems: 'center',
                          backgroundColor: sel ? '#FFF7ED' : '#F8FAFC',
                          borderColor: sel ? '#F97316' : '#E2E8F0',
                        }}
                      >
                        <AppText
                          variant="md"
                          weight="normal"
                          color={sel ? '#F97316' : '#0F172A'}
                        >
                          Size {s.name}
                        </AppText>
                        <AppText
                          variant="xs"
                          color={sel ? '#C2410C' : '#64748B'}
                          style={{ marginTop: 2 }}
                        >
                          {deltaText}
                        </AppText>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            </View>
          )}

          {/* CardBox 3: Toppings */}
          {(modalItem?.toppings?.length ?? 0) > 0 && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: '#E5E9F0',
                }}
              >
                <AppText variant="md" weight="bold" color="#1E293B">
                  CHỌN TOPPING
                </AppText>
              </View>

              <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                {modalItem?.toppings?.map((t, idx) => {
                  const sel = modalToppings.includes(t.name);
                  const isLast = idx === (modalItem.toppings?.length || 0) - 1;
                  return (
                    <TouchableOpacity
                      key={t.name}
                      onPress={() => toggleTopping(t.name)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: '#F1F5F9',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            backgroundColor: sel ? '#F97316' : '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: sel ? '#F97316' : '#CBD5E1',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {sel && (
                            <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
                          )}
                        </View>
                        <AppText
                          variant="md"
                          weight="normal"
                          color={sel ? '#F97316' : '#0F172A'}
                        >
                          {t.name}
                        </AppText>
                      </View>
                      <AppText variant="md" color="#64748B">
                        +{formatPrice(t.price)}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* CardBox 4: Notes */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E9F0',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <View
              style={{
                backgroundColor: '#F8FAFC',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: '#E5E9F0',
              }}
            >
              <AppText variant="md" weight="bold" color="#1E293B">
                GHI CHÚ CHO BẾP
              </AppText>
            </View>

            <View style={{ padding: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {QUICK_NOTES.map((q) => {
                  const active = modalNote.includes(q);
                  return (
                    <TouchableOpacity
                      key={q}
                      onPress={() =>
                        setModalNote(
                          active
                            ? modalNote
                                .replace(q, '')
                                .replace(', ,', ',')
                                .replace(/^, |, $/, '')
                                .trim()
                            : modalNote
                              ? `${modalNote}, ${q}`
                              : q
                        )
                      }
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: active ? '#FFF7ED' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: active ? '#F97316' : '#E2E8F0',
                      }}
                    >
                      <AppText
                        variant="md"
                        color={active ? '#F97316' : '#475569'}
                      >
                        {q}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ position: 'relative' }}>
                <MaterialCommunityIcons
                  name="square-edit-outline"
                  size={16}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: 10, top: 11, zIndex: 1 }}
                />
                <InputComponent
                  value={modalNote}
                  onChangeText={setModalNote}
                  placeholder="Gõ ghi chú khác..."
                  placeholderTextColor="#94A3B8"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E9F0',
                    borderRadius: 6,
                    paddingVertical: 8,
                    paddingLeft: 34,
                    paddingRight: 12,
                    ...font.sm,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollComponent>

        {/* Fixed Bottom Actions */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E9F0',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: isSheet ? 14 : (Platform.OS === 'web' ? 6 : Math.max(Math.floor(insets.bottom * 0.5), 6)),
          }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={onClose}
              delayPressIn={0}
              activeOpacity={0.7}
              style={{
                width: 72,
                height: 52,
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="md" color="#64748B">Hủy</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                haptic.impact('medium');
                if (isEditMode) onSave();
                else onAdd();
              }}
              delayPressIn={0}
              activeOpacity={0.85}
              style={{
                flex: 1,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={{
                  height: 52,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderRadius: 8,
                  width: '100%',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons
                    name={isEditMode ? 'pencil' : 'cart-plus'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <AppText variant="md" weight="normal" color="#FFFFFF">
                    {isEditMode ? 'Cập nhật' : 'Thêm vào giỏ'}
                  </AppText>
                </View>

                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 6,
                  }}
                >
                  <AppText variant="md" weight="bold" color="#FFFFFF">
                    {formatPrice(modalPrice * modalQty)}
                  </AppText>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Modifier Modal — iPad/Tablet wide screen */}
      {isWide && !!modalItem && (
        <Modal visible={!!modalItem} animationType="none" transparent statusBarTranslucent>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface.overlay,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
            <View
              style={{
                backgroundColor: colors.surface.card,
                width: 480,
                maxHeight: '85%',
                borderRadius: shape.radius.md,
                overflow: 'hidden',
                ...shape.shadow.lg,
              }}
            >
              {renderModifierContent(false)}
            </View>
          </View>
        </Modal>
      )}

      {/* Modifier Modal — iPhone/Mobile screen (Full Screen Bottom Sheet iOS style) */}
      {!isWide && !!modalItem && (
        <Modal visible={!!modalItem} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
            <BottomSheet
              ref={bottomSheetRef}
              index={1}
              snapPoints={snapPoints}
              onChange={handleSheetChange}
              enablePanDownToClose
              handleIndicatorStyle={{
                backgroundColor: '#CBD5E1',
                width: 40,
                height: 5,
                borderRadius: 2.5,
              }}
              backgroundStyle={{
                backgroundColor: colors.surface.app,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              {renderModifierContent(true)}
            </BottomSheet>
          </View>
        </Modal>
      )}
    </>
  );
}
