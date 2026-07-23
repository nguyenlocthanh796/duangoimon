import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { colors, palette, font, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import { MenuItem, CartItem } from './types';
import AppText from '../ui/AppText';

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
      <View style={{ flex: 1, minHeight: 0 }}>
        {/* Fixed Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingHorizontal: 20,
            paddingTop: isSheet ? 10 : 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: palette.stone[100],
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="lg" color={colors.text.primary} style={{ marginBottom: 4 }}>
              {modalItem?.name}
            </AppText>
            <AppText variant="lg" weight="bold" color={colors.brand.primary}>{formatPrice(modalPrice)}</AppText>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: shape.radius.md,
              backgroundColor: colors.surface.disabled,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.text.body} />
          </TouchableOpacity>
        </View>

        <ScrollComponent
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        >
          {/* Quantity stepper */}
          <View
            style={{
              backgroundColor: colors.surface.app,
              padding: 16,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: colors.border.default,
              marginBottom: 16,
            }}
          >
            <AppText
              variant="md"
              color={colors.text.secondary}
              style={{
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 12,
              }}
            >
              Số lượng
            </AppText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setModalQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1.5,
                  borderColor: colors.border.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                                <MaterialCommunityIcons name="minus" size={22} color={colors.brand.primary} />
              </TouchableOpacity>
              <AppText
                variant="lg"
                color={colors.text.primary}
                style={{
                  width: 60,
                  textAlign: 'center',
                }}
              >
                {modalQty}
              </AppText>
              <TouchableOpacity
                onPress={() => setModalQty((q) => q + 1)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1.5,
                  borderColor: colors.border.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="plus" size={22} color={colors.brand.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sizes */}
          {modalItem && modalItem.sizes && modalItem.sizes.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <AppText
                variant="md"
                color={colors.text.muted}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  marginBottom: 10,
                }}
              >
                Kích thước
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
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
                          paddingVertical: 14,
                          borderRadius: shape.radius.md,
                          borderWidth: 2,
                          alignItems: 'center',
                          backgroundColor: sel ? colors.brand.primaryBg : colors.surface.app,
                          borderColor: sel ? colors.brand.primary : colors.border.default,
                          minHeight: 44,
                        }}
                      >
                        <AppText
                          variant="lg"
                          weight="bold"
                          color={sel ? colors.brand.primary : colors.text.body}
                        >
                          Size {s.name}
                        </AppText>
                        <AppText
                          variant="sm"
                          color={sel ? colors.text.brandDark : colors.text.muted}
                          style={{ marginTop: 4 }}
                        >
                          {deltaText}
                        </AppText>
                        {sel && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: 24,
                              height: 24,
                              backgroundColor: colors.brand.primary,
                              borderBottomLeftRadius: 2,
                              borderTopRightRadius: 4,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MaterialCommunityIcons name="check" size={14} color={colors.text.inverse} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            </View>
          )}

          {/* Toppings */}
          {(modalItem?.toppings?.length ?? 0) > 0 && (
            <View style={{ marginBottom: 16 }}>
              <AppText
                variant="md"
                color={colors.text.secondary}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  marginBottom: 10,
                }}
              >
                Topping
              </AppText>
              <View style={{ gap: 8 }}>
                {modalItem?.toppings?.map((t) => {
                  const sel = modalToppings.includes(t.name);
                  return (
                    <TouchableOpacity
                      key={t.name}
                      onPress={() => toggleTopping(t.name)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        borderRadius: shape.radius.md,
                        borderWidth: 1.5,
                        backgroundColor: sel ? colors.brand.primaryBg : colors.surface.app,
                        borderColor: sel ? colors.brand.primary : colors.border.default,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 2,
                            backgroundColor: sel ? colors.brand.primary : colors.surface.card,
                            borderWidth: 1.5,
                            borderColor: sel ? colors.brand.primary : colors.border.strong,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {sel && (
                            <MaterialCommunityIcons name="check" size={14} color={colors.text.inverse} />
                          )}
                        </View>
                        <AppText
                          variant="md"
                          color={sel ? colors.text.primary : colors.text.body}
                          weight="bold"
                        >
                          {t.name}
                        </AppText>
                      </View>
                      <AppText variant="md" color={colors.text.secondary}>
                        +{formatPrice(t.price)}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={{ marginBottom: 12 }}>
            <AppText
              variant="md"
              color={colors.text.secondary}
              style={{
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 10,
              }}
            >
              Ghi chú cho bếp
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
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
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      minHeight: 44,
                      justifyContent: 'center',
                      borderRadius: shape.radius.md,
                      backgroundColor: active ? colors.brand.primaryBg : colors.surface.disabled,
                      borderWidth: 1,
                      borderColor: active ? colors.border.brand : 'transparent',
                    }}
                  >
                    <AppText
                      variant="sm"
                      color={active ? colors.brand.primary : colors.text.body}
                    >
                      {q}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="square-edit-outline"
                size={18}
                color={colors.text.placeholder}
                style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}
              />
              <InputComponent
                value={modalNote}
                onChangeText={setModalNote}
                placeholder="Gõ ghi chú khác..."
                placeholderTextColor={colors.text.placeholder}
                style={{
                  borderWidth: 1.5,
                  borderColor: colors.border.default,
                  borderRadius: shape.radius.md,
                  paddingVertical: 12,
                  paddingLeft: 38,
                  paddingRight: 16,
                  ...font.sm,
                  color: colors.text.primary,
                  backgroundColor: colors.surface.app,
                }}
              />
            </View>
          </View>
        </ScrollComponent>

        {/* Fixed bottom action buttons */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface.card,
            borderTopWidth: 1,
            borderTopColor: colors.border.default,
            paddingHorizontal: 20,
            paddingVertical: 12,
            paddingBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 8,
                backgroundColor: colors.surface.disabled,
                alignItems: 'center',
              }}
            >
              <AppText variant="md" color={colors.text.body}>Hủy</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={isEditMode ? onSave : onAdd}
              style={{
                flex: 2.5,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  borderTopColor: 'rgba(255,255,255,0.3)',
                  borderTopWidth: 1,
                  borderWidth: 1,
                  borderColor: 'rgba(249,115,22,0.4)',
                  borderRadius: 8,
                  width: '100%',
                }}
              >
                <MaterialCommunityIcons
                  name={isEditMode ? 'pencil' : 'cart-plus'}
                  size={18}
                  color={colors.text.inverse}
                />
                <AppText variant="md" color={colors.text.inverse}>
                  {isEditMode ? 'Cập nhật' : 'Thêm vào giỏ'} · {formatPrice(modalPrice * modalQty)}
                </AppText>
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

      {/* Modifier Modal — iPhone/Mobile screen (Full Screen Locked) */}
      {!isWide && !!modalItem && (
        <Modal visible={!!modalItem} animationType="slide" transparent={false} statusBarTranslucent>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
            {renderModifierContent(false)}
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
