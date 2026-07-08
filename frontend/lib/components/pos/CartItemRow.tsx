import React from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons, MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, formatPrice } from '../../theme/colors';
import { CartItem } from './types';

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
}

export default function CartItemRow({
  item, onUpdateQty, onSetQty, onRemoveItem, onCancelItem, onMoveItem,
  onOpenModifier, onToggleServiceType, onEditNote,
  qtyEditId, setQtyEditId, splitMode, onToggleSelect, isSelected,
  onRequestMoveItem,
}: CartItemRowProps) {
  const [imageError, setImageError] = React.useState(false);
  const [qtyInput, setQtyInput] = React.useState(String(item.qty));
  const isTakeaway = item.serviceType === 'takeaway';
  const isSentItem = item.isSent;
  const isKitchenLocked = item.isSent && item.status && !['moi', undefined, ''].includes(item.status);
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

  const commitQty = () => {
    setQtyEditId(null);
    const val = parseInt(qtyInput, 10);
    if (isNaN(val) || val < 1) { setQtyInput(String(item.qty)); return; }
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

  let rightActions: React.ReactNode = null;
  if (!isCancelled) {
    if (splitMode) {
      rightActions = (
        <TouchableOpacity
          onPress={() => { swipeRef.current?.close(); onToggleSelect?.(item.cartItemId); }}
          style={{ width: 72, marginBottom: 4, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
        >
          <Icon name={item.selected ? 'check-circle' : 'circle-outline'} size={22} color="#fff" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>Chọn</Text>
        </TouchableOpacity>
      );
    } else if (isKitchenLocked) {
      rightActions = (
        <View style={{ flexDirection: 'row' }}>
          {onMoveItem && (
            <TouchableOpacity
              onPress={() => { swipeRef.current?.close(); onRequestMoveItem?.(item.cartItemId); }}
              style={{ width: 64, marginBottom: 4, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
            >
              <MaterialIcons name="swap-horiz" size={20} color="#fff" />
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff', marginTop: 2 }}>Chuyển</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { swipeRef.current?.close(); handleCancel(); }}
            style={{ width: 64, marginBottom: 4, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
          >
            <MaterialIcons name="block" size={20} color="#fff" />
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff', marginTop: 2 }}>Huỷ</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      rightActions = (
        <TouchableOpacity
          onPress={() => { swipeRef.current?.close(); onRemoveItem(item.cartItemId); }}
          style={{ width: 72, marginBottom: 4, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
        >
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff', marginTop: 2 }}>Xoá</Text>
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
        backgroundColor: isCancelled ? '#fef2f2' : isKitchenLocked ? '#fafafa' : colors.surface.card,
        borderWidth: 1,
        borderColor: isCancelled ? '#fecaca' : isKitchenLocked ? '#e5e5e5' : colors.border.default,
        borderRadius: 8,
        marginBottom: 4,
        opacity: isCancelled ? 0.7 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 6, backgroundColor: colors.surface.disabled, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {item.image && !imageError
            ? <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setImageError(true)} />
            : <Icon name="silverware-fork-knife" size={22} color={colors.icon.muted} />}
          {item.qty > 1 && !isCancelled && (
            <View style={{ position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(249,115,22,0.9)', paddingHorizontal: 4, paddingVertical: 1, borderBottomRightRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>x{item.qty}</Text>
            </View>
          )}
          {isKitchenLocked && !isCancelled && (
            <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: '#16a34a', width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' }}>
              <Icon name="check" size={8} color="#fff" />
            </View>
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isCancelled ? colors.text.muted : colors.text.primary }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text.muted }} numberOfLines={1}>
            {mods ? `${mods} · ` : ''}{item.qty > 1 ? `${formatPrice(unitPrice)} x ${item.qty}` : formatPrice(unitPrice)}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '900', color: isCancelled ? colors.text.muted : colors.brand.primary }}>
            {formatPrice(totalPrice)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isCancelled ? (
              <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: '#fecaca' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#dc2626' }}>Đã huỷ</Text>
              </View>
            ) : isKitchenLocked ? (
              <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: '#bbf7d0' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#16a34a' }}>Đã gửi bếp{` (Lần ${item.orderRound || 1})`}</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => onToggleServiceType?.(item.cartItemId)}
                activeOpacity={0.7}
                style={{ backgroundColor: isTakeaway ? colors.brand.primaryBg : '#f0f9ff', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: isTakeaway ? colors.border.brand : '#bae6fd' }}
              >
                <Text style={{ fontSize: 9, fontWeight: '700', color: isTakeaway ? colors.text.brand : '#0284c7' }}>{isTakeaway ? 'Mang về' : 'Tại bàn'}</Text>
              </TouchableOpacity>
            )}
            {!isCancelled && !isQtyEditing && (
              <TouchableOpacity onPress={() => onEditNote?.(item.cartItemId)} hitSlop={8}>
                <MaterialIcons name="edit-note" size={16} color={colors.icon.muted} />
              </TouchableOpacity>
            )}
          </View>

          {!isCancelled && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              width: 104, height: 34, backgroundColor: colors.surface.disabled, borderWidth: 1,
              borderColor: colors.border.default, padding: 2, borderRadius: 8,
            }}>
              <TouchableOpacity
                onPress={() => handleQtyChange(-1)}
                disabled={item.qty <= 1}
                style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: item.qty <= 1 ? 'transparent' : colors.surface.card, alignItems: 'center', justifyContent: 'center', borderWidth: item.qty <= 1 ? 0 : 1, borderColor: colors.border.default }}
              >
                <MaterialIcons name="remove" size={16} color={item.qty <= 1 ? colors.border.strong : colors.text.secondary} />
              </TouchableOpacity>

              {isQtyEditing ? (
                <TextInput
                  ref={qtyInputRef}
                  value={qtyInput}
                  onChangeText={setQtyInput}
                  onBlur={commitQty}
                  onSubmitEditing={commitQty}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  style={{ fontSize: 15, fontWeight: '700', color: colors.brand.primary, textAlign: 'center', width: 36, padding: 0, margin: 0, height: 30 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => { setQtyInput(String(item.qty)); setQtyEditId(item.cartItemId); }}
                  style={{ flex: 1, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, textAlign: 'center', width: 36 }}>{item.qty}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleQtyChange(1)}
                style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: colors.brand.primaryBg, borderWidth: 1, borderColor: colors.border.brand, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialIcons name="add" size={16} color={colors.brand.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {isCancelled && item.cancelReason && (
        <View style={{ marginTop: 6, padding: 6, backgroundColor: '#fef2f2', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialIcons name="info-outline" size={12} color="#dc2626" />
          <Text style={{ fontSize: 10, color: '#dc2626' }}>Lý do: {item.cancelReason}</Text>
        </View>
      )}

      {!skipNote && item.note ? (
        <TouchableOpacity
          onPress={() => onEditNote?.(item.cartItemId)}
          activeOpacity={0.7}
          style={{ marginTop: 8, padding: 8, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}
        >
          <Icon name="information-outline" size={14} color="#d97706" />
          <Text style={{ fontSize: 11, color: '#92400e', flex: 1, lineHeight: 16 }} numberOfLines={3}>{item.note}</Text>
          <MaterialIcons name="edit" size={12} color="#d97706" style={{ marginTop: 2 }} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  if (rightActions && !isCancelled) {
    return (
      <Swipeable ref={swipeRef} renderRightActions={() => rightActions} overshootRight={false}>
        {card}
      </Swipeable>
    );
  }
  return card;
}
