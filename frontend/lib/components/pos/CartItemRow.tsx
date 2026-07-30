import React from 'react';
import { View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, font, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import AppText from '../ui/AppText';
import { CartItem } from './types';
import { haptic } from '../../haptic';

const NO_NOTE_CATS = ['do-uong', 'khai-vi'];

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onSetQty: (cartItemId: string, qty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onCancelItem?: (cartItemId: string, reason: string) => void;
  onMoveItem?: (cartItemId: string) => void;
  onOpenModifier: (item: CartItem) => void;
  onToggleServiceType?: (cartItemId: string) => void;
  onEditNote?: (cartItemId: string) => void;
  qtyEditId: string | null;
  setQtyEditId: (id: string | null) => void;
  splitMode: boolean;
  onToggleSelect?: (id: string) => void;
  isSelected: boolean;
  onRequestMoveItem?: (cartItemId: string) => void;
  /** iPad grouped mode: compact stepper row */
  groupedMode?: boolean;
  rightActions?: React.ReactNode;
}

const MemoCartItemRow = React.memo(function CartItemRow({
  item,
  onUpdateQty,
  onSetQty,
  onRemoveItem,
  onCancelItem,
  onMoveItem,
  onOpenModifier,
  onToggleServiceType,
  onEditNote,
  qtyEditId,
  setQtyEditId,
  splitMode,
  onToggleSelect,
  isSelected,
  onRequestMoveItem,
  groupedMode,
  rightActions,
}: CartItemRowProps) {
  const [imageError, setImageError] = React.useState(false);
  const [qtyInput, setQtyInput] = React.useState(String(item.qty));
  const isTakeaway = item.serviceType === 'takeaway';
  const isKitchenLocked =
    item.isSent && item.status && !['moi', undefined, ''].includes(item.status);
  const isCancelled = !!item.cancelReason;
  const mods = [item.selectedSize, ...(item.selectedToppings || [])].filter(Boolean).join(' · ');
  const unitPrice = item.unitPrice || 0;
  const totalPrice = unitPrice * item.qty;
  const skipNote = NO_NOTE_CATS.includes(item.category);

  const swipeRef = React.useRef<Swipeable>(null);
  const isQtyEditing = qtyEditId === item.cartItemId;
  const qtyInputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    if (isQtyEditing) qtyInputRef.current?.focus();
  }, [isQtyEditing]);

  // ─── iPad Grouped Mode ─────────────────────────────────────
  if (groupedMode) {
    return (
      <View
        style={{
          height: 64,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => onOpenModifier(item)}
          activeOpacity={0.7}
          style={{ flex: 1 }}
        >
          <AppText
            variant="md"
            color={colors.text.primary}
            numberOfLines={1}
          >
            {item.name}
          </AppText>
          {item.selectedSize ? (
            <AppText variant="sm" color={colors.text.muted}>
              {item.selectedSize}
            </AppText>
          ) : null}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              haptic.impact('light');
              if (item.qty <= 1) {
                onRemoveItem(item.cartItemId);
              } else {
                onUpdateQty(item.cartItemId, -1);
              }
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: colors.surface.disabled,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={item.qty <= 1 ? 'trash-can-outline' : 'minus'}
              size={16}
              color={item.qty <= 1 ? colors.status.danger : colors.text.secondary}
            />
          </TouchableOpacity>

          <AppText
            variant="md"
            color={colors.text.primary}
            style={{ fontWeight: '600', minWidth: 24, textAlign: 'center' }}
          >
            {item.qty}
          </AppText>

          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              haptic.impact('light');
              onUpdateQty(item.cartItemId, 1);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: colors.surface.disabled,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="plus" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <AppText
          variant="md"
          weight="bold"
          color="#0F172A"
          style={{ marginLeft: 12, minWidth: 70, textAlign: 'right' }}
        >
          {formatPrice(totalPrice)}
        </AppText>
      </View>
    );
  }

  // ─── Original Mode (iPhone) ───────────────────────────────
  const commitQty = () => {
    setQtyEditId(null);
    const val = parseInt(qtyInput, 10);
    if (isNaN(val) || val < 1) {
      setQtyInput(String(item.qty));
      return;
    }
    if (val !== item.qty) {
      if (isKitchenLocked) {
        Alert.alert('Xác nhận', 'Bếp đang làm món này. Cập nhật số lượng?', [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Cập nhật', onPress: () => onSetQty?.(item.cartItemId, val) },
        ]);
      } else {
        onSetQty?.(item.cartItemId, val);
      }
    }
  };

  const handleQtyChange = (delta: number) => {
    if (isKitchenLocked) {
      Alert.alert('Xác nhận', 'Bếp đang làm món này. Cập nhật số lượng?', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Cập nhật', onPress: () => { onUpdateQty(item.cartItemId, delta); setQtyInput(String(item.qty + delta)); } },
      ]);
    } else {
      onUpdateQty(item.cartItemId, delta);
      setQtyInput(String(item.qty + delta));
    }
  };

  const handleCancel = () => {
    Alert.alert('Huỷ món', 'Chọn lý do:', [
      { text: 'Khách huỷ', onPress: () => onCancelItem?.(item.cartItemId, 'Khách huỷ') },
      { text: 'Hết món', onPress: () => onCancelItem?.(item.cartItemId, 'Hết món') },
      { text: 'Huỷ thao tác', style: 'cancel' },
    ]);
  };

  let swipeRightActions: React.ReactNode = null;
  if (!isCancelled) {
    if (splitMode) {
      swipeRightActions = (
        <TouchableOpacity onPress={() => { swipeRef.current?.close(); onToggleSelect?.(item.cartItemId); }} style={{ width: 72, marginBottom: 4, borderRadius: 8, backgroundColor: colors.status.success, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <Icon name={item.selected ? 'check-circle' : 'circle-outline'} size={22} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse} style={{ marginTop: 2 }}>Chọn</AppText>
        </TouchableOpacity>
      );
    } else if (isKitchenLocked) {
      swipeRightActions = (
        <View style={{ flexDirection: 'row' }}>
          {onMoveItem && (
            <TouchableOpacity onPress={() => { swipeRef.current?.close(); onRequestMoveItem?.(item.cartItemId); }} style={{ width: 64, marginBottom: 4, borderRadius: 8, backgroundColor: colors.status.info, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
              <Icon name="swap-horizontal" size={20} color={colors.text.inverse} />
              <AppText variant="md" color={colors.text.inverse} style={{ marginTop: 2 }}>Chuyển</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { swipeRef.current?.close(); handleCancel(); }} style={{ width: 64, marginBottom: 4, borderRadius: 8, backgroundColor: colors.status.danger, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
            <Icon name="cancel" size={20} color={colors.text.inverse} />
            <AppText variant="md" color={colors.text.inverse} style={{ marginTop: 2 }}>Huỷ</AppText>
          </TouchableOpacity>
        </View>
      );
    } else {
      swipeRightActions = (
        <TouchableOpacity onPress={() => { swipeRef.current?.close(); onRemoveItem(item.cartItemId); }} style={{ width: 72, marginBottom: 4, borderRadius: 8, backgroundColor: colors.status.danger, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <Icon name="trash-can-outline" size={22} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse} style={{ marginTop: 2 }}>Xoá</AppText>
        </TouchableOpacity>
      );
    }
  }

  const card = (
    <TouchableOpacity
      onPress={() => onOpenModifier(item)}
      disabled={isCancelled}
      activeOpacity={0.85}
      style={{
        padding: 8,
        backgroundColor: isCancelled
          ? colors.status.dangerBg
          : isKitchenLocked
          ? colors.surface.app
          : colors.surface.card,
        borderBottomWidth: 1,
        borderColor: isCancelled
          ? colors.border.danger
          : isKitchenLocked
          ? colors.border.default
          : colors.border.default,
        opacity: isCancelled ? 0.7 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: '#FFF7ED', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {item.image && !imageError ? (
            <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} cachePolicy="disk" onError={() => setImageError(true)} />
          ) : (
            <Icon name="bowl-mix" size={22} color="#F97316" />
          )}
          {item.qty > 1 && !isCancelled && (
            <View style={{ position: 'absolute', top: 0, left: 0, backgroundColor: colors.brand.primary, paddingHorizontal: 4, paddingVertical: 1, borderBottomRightRadius: 6 }}>
              <AppText variant="xs" color={colors.text.inverse}>x{item.qty}</AppText>
            </View>
          )}
          {isKitchenLocked && !isCancelled && (
            <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: colors.status.success, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.text.inverse }}>
              <Icon name="check" size={8} color="#fff" />
            </View>
          )}
        </View>
        <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 1 }}>
          <AppText variant="md" color={isCancelled ? colors.text.muted : colors.text.primary} numberOfLines={1}>{item.name}</AppText>
          <AppText variant="sm" color={colors.text.muted} numberOfLines={1}>{mods ? `${mods} · ` : ''}{item.qty > 1 ? `${formatPrice(unitPrice)} x ${item.qty}` : formatPrice(unitPrice)}</AppText>
          <AppText variant="md" weight="bold" color={isCancelled ? colors.text.muted : '#0F172A'}>{formatPrice(totalPrice)}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isCancelled ? (
              <View style={{ backgroundColor: colors.status.dangerBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border.danger }}>
                <AppText variant="xs" color={colors.status.danger}>Đã huỷ</AppText>
              </View>
            ) : (
              <>
                {(() => {
                  const st = item.status;
                  let bg = '#FFF7ED', text = '#EA580C', label = 'Đã gửi bếp';
                  if (st === 'dang_lam') { bg = '#EFF6FF'; text = '#1D4ED8'; label = 'Đang chế biến'; }
                  else if (st === 'hoan_thanh') { bg = '#ECFDF5'; text = '#16A34A'; label = 'Hoàn thành'; }
                  else if (st === 'moi' || !st) { label = ''; }
                  if (!label) return null;
                  return (
                    <View style={{ backgroundColor: bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <AppText variant="xs" color={text}>{label}</AppText>
                    </View>
                  );
                })()}
                {(!item.status || item.status === 'moi') && (
                  <TouchableOpacity onPress={() => onToggleServiceType?.(item.cartItemId)} activeOpacity={0.7} style={{ backgroundColor: isTakeaway ? colors.brand.primaryBg : colors.badge.info.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: isTakeaway ? colors.border.brand : colors.border.info }}>
                    <AppText variant="xs" color={isTakeaway ? colors.text.brand : colors.status.info}>{isTakeaway ? 'Mang về' : 'Tại bàn'}</AppText>
                  </TouchableOpacity>
                )}
              </>
            )}
            {!isCancelled && !isQtyEditing && (
              <TouchableOpacity onPress={() => onEditNote?.(item.cartItemId)} hitSlop={8}>
                <Icon name="square-edit-outline" size={16} color={colors.icon.muted} />
              </TouchableOpacity>
            )}
          </View>
          {!isCancelled && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 104, height: 34, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default, padding: 2, borderRadius: 6 }}>
              <TouchableOpacity onPress={() => { haptic.impact('light'); handleQtyChange(-1); }} disabled={item.qty <= 1} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }} style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: item.qty <= 1 ? 'transparent' : colors.surface.card, alignItems: 'center', justifyContent: 'center', borderWidth: item.qty <= 1 ? 0 : 1, borderColor: colors.border.default }}>
                <Icon name="minus" size={16} color={item.qty <= 1 ? colors.border.strong : colors.text.secondary} />
              </TouchableOpacity>
              {isQtyEditing ? (
                <TextInput ref={qtyInputRef} value={qtyInput} onChangeText={setQtyInput} onBlur={commitQty} onSubmitEditing={commitQty} keyboardType="number-pad" selectTextOnFocus style={{ ...font.md, color: colors.brand.primary, textAlign: 'center', width: 36, padding: 0, margin: 0, height: 30 }} />
              ) : (
                <TouchableOpacity onPress={() => { setQtyInput(String(item.qty)); setQtyEditId(item.cartItemId); }} style={{ flex: 1, alignItems: 'center' }}>
                  <AppText variant="md" color={colors.text.primary} style={{ textAlign: 'center', width: 36 }}>{item.qty}</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { haptic.impact('light'); handleQtyChange(1); }} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }} style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: colors.brand.primaryBg, borderWidth: 1, borderColor: colors.border.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={16} color={colors.brand.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      {isCancelled && item.cancelReason && (
        <View style={{ marginTop: 6, padding: 6, backgroundColor: colors.status.dangerBg, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="information-outline" size={12} color={colors.status.danger} />
          <AppText variant="sm" color={colors.status.danger}>Lý do: {item.cancelReason}</AppText>
        </View>
      )}
      {!skipNote && item.note ? (
        <TouchableOpacity onPress={() => onEditNote?.(item.cartItemId)} activeOpacity={0.7} style={{ marginTop: 8, padding: 8, backgroundColor: colors.status.warningBg, borderWidth: 1, borderColor: palette.amber[200], borderRadius: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
          <Icon name="information-outline" size={14} color={colors.status.warning} />
          <AppText variant="sm" color={palette.amber[800]} style={{ flex: 1 }} numberOfLines={3}>{item.note}</AppText>
          <Icon name="pencil" size={12} color={colors.status.warning} style={{ marginTop: 2 }} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  if (swipeRightActions && !isCancelled) {
    return (
      <Swipeable ref={swipeRef} renderRightActions={() => swipeRightActions} overshootRight={false}>
        {card}
      </Swipeable>
    );
  }
  return card;
});
export default MemoCartItemRow;
