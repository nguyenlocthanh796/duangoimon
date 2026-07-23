import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, font, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import { CartItem } from './types';
import CartItemRow from './CartItemRow';
import NoteEditor from './NoteEditor';
import MoreMenu from './MoreMenu';
import MoveTableModal from './MoveTableModal';
import CartSummary from './CartSummary';
import CartMainActions from './CartMainActions';
import CartSplitActions from './CartSplitActions';
import AppText from '../ui/AppText';

interface CartPanelProps {
  cart: CartItem[];
  total: number;
  itemCount: number;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onSetQty: (cartItemId: string, qty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onCancelItem?: (cartItemId: string, reason: string) => void;
  onMoveItem?: (cartItemId: string) => void;
  onMoveItemToTable?: (cartItemId: string, tableId: string) => void;
  onSplitBill?: (selectedIds: string[]) => void;
  onMergeBill?: (sourceOrderId?: string) => void;
  onMoveTable?: (tableId: string) => void;
  onSplitTable?: (cartItemId: string, targetTableId: string) => void;
  onMergeTable?: (sourceOrderId: string) => void;
  onOpenModifier: (item: CartItem) => void;
  onSendToKitchen: () => void;
  onSaveTable: () => void;
  onPay: () => void;
  onPrintTemporary?: () => void;
  submitting: boolean;
  isWide: boolean;
  cartSheet: boolean;
  setCartSheet: (visible: boolean) => void;
  onToggleServiceType?: (cartItemId: string) => void;
  onEditNote?: (cartItemId: string, note: string) => void;
  serviceChargePercent?: number;
  tableId?: string;
}

export default function CartPanel({
  cart,
  total,
  itemCount,
  onUpdateQty,
  onSetQty,
  onRemoveItem,
  onCancelItem,
  onMoveItem,
  onSplitBill,
  onMergeBill,
  onMoveTable,
  onSplitTable,
  onMergeTable,
  onOpenModifier,
  onSendToKitchen,
  onSaveTable,
  onPay,
  onPrintTemporary,
  submitting,
  isWide,
  cartSheet,
  setCartSheet,
  onToggleServiceType,
  onEditNote,
  serviceChargePercent = 0,
  tableId,
}: CartPanelProps) {
  const insets = useSafeAreaInsets();

  const [noteEditId, setNoteEditId] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState('');
  const [qtyEditId, setQtyEditId] = React.useState<string | null>(null);
  const [splitMode, setSplitMode] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [moveAction, setMoveAction] = React.useState<
    'move_table' | 'split_table' | 'merge_bill' | 'merge_table' | 'move_item' | null
  >(null);
  const [moveItemCartId, setMoveItemCartId] = React.useState<string | null>(null);

  const openNoteEditor = (cartItemId: string) => {
    const item = cart.find((i) => i.cartItemId === cartItemId);
    if (!item) return;
    setNoteText(item.note || '');
    setNoteEditId(cartItemId);
  };

  const saveNote = () => {
    if (noteEditId && onEditNote) onEditNote(noteEditId, noteText);
    setNoteEditId(null);
  };

  const groupedItems = React.useMemo(() => {
    const groups: {
      category: string;
      label: string;
      unsent: CartItem[];
      sent: CartItem[];
      cancelled: CartItem[];
    }[] = [];
    const map: Record<string, { canc: CartItem[]; unsent: CartItem[]; sent: CartItem[] }> = {};
    cart.forEach((item) => {
      const cat = item.category || 'khac';
      if (!map[cat]) map[cat] = { canc: [], unsent: [], sent: [] };
      if (item.cancelReason) {
        map[cat].canc.push(item);
        return;
      }
      if (item.isSent && item.status && !['moi', undefined, ''].includes(item.status)) {
        map[cat].sent.push(item);
        return;
      }
      map[cat].unsent.push(item);
    });
    Object.entries(map).forEach(([cat, { canc, unsent, sent }]) => {
      groups.push({ category: cat, label: cat, unsent, sent, cancelled: canc });
    });
    return groups;
  }, [cart]);

  const serviceCharge =
    serviceChargePercent > 0 ? Math.round((total * serviceChargePercent) / 100) : 0;
  const grandTotal = total + serviceCharge;
  const vatAmount = React.useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.cancelReason) return sum;
      const rate = item.vatRate ?? 8;
      const itemTax = Math.round(item.qty * item.unitPrice * (rate / (100 + rate)));
      return sum + itemTax;
    }, 0);
  }, [cart]);
  const hasUnsentItems = cart.some(
    (i) => !(i.isSent && i.status && !['moi', undefined, ''].includes(i.status)) && !i.cancelReason
  );
  const allDineIn = cart.length > 0 && cart.every((i) => i.serviceType !== 'takeaway');
  const allTakeaway = cart.length > 0 && cart.every((i) => i.serviceType === 'takeaway');
  const canBulkToggle = hasUnsentItems && (allDineIn || allTakeaway);

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSplit = () => {
    if (selectedItems.size < 1) return;
    onSplitBill?.(Array.from(selectedItems));
    setSplitMode(false);
    setSelectedItems(new Set());
  };

  const itemRowProps = (item: CartItem) => ({
    item,
    onUpdateQty,
    onSetQty,
    onRemoveItem,
    onCancelItem,
    onMoveItem,
    onOpenModifier,
    onToggleServiceType,
    onEditNote: openNoteEditor,
    qtyEditId,
    setQtyEditId,
    splitMode,
    onToggleSelect: toggleSelectItem,
    isSelected: selectedItems.has(item.cartItemId),
    onRequestMoveItem: (id: string) => {
      setMoveItemCartId(id);
      setMoveAction('move_item');
    },
  });

  const renderCartItems = () => {
    if (cart.length === 0) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginTop: 40,
          }}
        >
          <MaterialCommunityIcons name="basket" size={48} color={colors.icon.muted} />
          <AppText variant="medium" color={colors.text.secondary}>Giỏ hàng trống</AppText>
          <TouchableOpacity
            onPress={() => setCartSheet(false)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: colors.brand.primaryBg,
            borderWidth: 1,
            borderColor: colors.border.brand,
          }}
        >
          <AppText variant="medium" color={colors.text.brand}>Thêm món ngay</AppText>
        </TouchableOpacity>
        </View>
      );
    }

    return groupedItems.map((group) => {
      const { unsent, sent, cancelled } = group;
      if (!unsent.length && !sent.length && !cancelled.length) return null;

      return (
        <View key={group.category} style={{ marginBottom: 4 }}>
          {unsent.length > 0 && (
            <>
              {(sent.length > 0 || cancelled.length > 0) && (
                <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
                  <AppText variant="base" color={colors.brand.primary}>Món mới</AppText>
                </View>
              )}
              {unsent.map((item) => (
                <CartItemRow key={item.cartItemId} {...itemRowProps(item)} />
              ))}
            </>
          )}

          {sent.length > 0 && (
            <>
              {(unsent.length > 0 || cancelled.length > 0) && (
                <View style={{ paddingHorizontal: 4, paddingVertical: 4 }}>
                  <AppText variant="base" color="#16a34a">Đã gửi bếp</AppText>
                </View>
              )}
              {sent.map((item) => (
                <CartItemRow key={item.cartItemId} {...itemRowProps(item)} />
              ))}
            </>
          )}

          {cancelled.length > 0 && (
            <>
              <View style={{ paddingHorizontal: 4, paddingVertical: 4 }}>
                <AppText variant="base" color="#dc2626">Đã huỷ</AppText>
              </View>
              {cancelled.map((item) => (
                <CartItemRow key={item.cartItemId} {...itemRowProps(item)} />
              ))}
            </>
          )}
        </View>
      );
    });
  };

  const handleBulkToggle = () => {
    cart.forEach((i) => {
      if (!(i.isSent && i.status && !['moi', undefined, ''].includes(i.status)) && !i.cancelReason)
        onToggleServiceType?.(i.cartItemId);
    });
  };

  const renderFooter = () => (
    <View
      style={{
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: isWide ? insets.bottom + 8 : 8,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        backgroundColor: colors.surface.card,
      }}
    >
      <CartSummary
        total={total}
        serviceChargePercent={serviceChargePercent}
        serviceCharge={serviceCharge}
        vatAmount={vatAmount}
        grandTotal={grandTotal}
      />

      {splitMode ? (
        <CartSplitActions
          cart={cart}
          selectedItems={selectedItems}
          onSelectAll={() =>
            setSelectedItems(new Set(cart.filter((i) => !i.cancelReason).map((i) => i.cartItemId)))
          }
          onDeselectAll={() => setSelectedItems(new Set())}
          onCancelSplit={() => {
            setSplitMode(false);
            setSelectedItems(new Set());
          }}
          onConfirmSplit={handleSplit}
        />
      ) : (
        <CartMainActions
          hasUnsentItems={hasUnsentItems}
          submitting={submitting}
          canBulkToggle={canBulkToggle}
          onSendToKitchen={onSendToKitchen}
          onSaveTable={onSaveTable}
          onPay={onPay}
          onPrintTemporary={onPrintTemporary}
          onBulkToggle={handleBulkToggle}
          bulkToggleLabel={allTakeaway ? 'Chuyển tất cả về bàn' : 'Chuyển tất cả mang về'}
        />
      )}

      <MoveTableModal
        visible={moveAction !== null}
        onClose={() => setMoveAction(null)}
        onSelectTable={(tableId, tableName) => {
          switch (moveAction) {
            case 'move_table':
              onMoveTable?.(tableId);
              break;
            case 'merge_bill':
              Alert.alert('Xác nhận', `Gộp hoá đơn từ bàn ${tableName}?`, [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Gộp', onPress: () => onMergeBill?.(tableId) },
              ]);
              break;
            case 'split_table':
              if (selectedItems.size < 1) {
                Alert.alert('Chọn món', 'Vui lòng chọn món cần tách trước.');
                return;
              }
              onSplitTable?.(tableId, Array.from(selectedItems)[0]);
              break;
            case 'merge_table':
              Alert.alert('Xác nhận', `Gộp tất cả món từ bàn ${tableName}?`, [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Gộp', onPress: () => onMergeTable?.(tableId) },
              ]);
              break;
            case 'move_item':
              setMoveItemCartId(moveItemCartId || '');
              break;
          }
          setMoveAction(null);
        }}
        title={
          moveAction === 'move_table'
            ? 'Chọn bàn đích'
            : moveAction === 'merge_bill'
              ? 'Chọn hoá đơn cần gộp'
              : moveAction === 'split_table'
                ? 'Chọn bàn mới'
                : moveAction === 'merge_table'
                  ? 'Chọn bàn cần gộp'
                  : 'Chọn bàn'
        }
        filterOccupied={moveAction === 'merge_bill' || moveAction === 'merge_table'}
        excludeTableId={tableId}
      />
    </View>
  );

  const hasMoreActions = !!(
    onSplitBill ||
    onMergeBill ||
    onMoveTable ||
    onSplitTable ||
    onMergeTable
  );
  const btnSize = isWide ? 40 : 36;
  const iconSize = isWide ? 22 : 18;
  const paddingV = 8;
  const paddingH = isWide ? 10 : 12;

  const content = (
    <>
      <View
        style={{
          paddingTop: isWide ? 10 : insets.top,
          height: isWide ? 56 : insets.top + 52,
          paddingHorizontal: paddingH,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.surface.header,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
          boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isWide && (
            <TouchableOpacity
              onPress={() => setCartSheet(false)}
              style={{
                height: btnSize,
                borderRadius: 8,
                backgroundColor: colors.surface.disabled,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 2,
              }}
            >
              <MaterialCommunityIcons name="close" size={iconSize} color={colors.icon.default} />
            </TouchableOpacity>
          )}
          <AppText variant={isWide ? "large" : "medium"} color={colors.text.primary} weight="bold">
            Giỏ hàng
          </AppText>
          {itemCount > 0 && (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.25)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 4,
              }}
            >
              <AppText variant="medium" color={colors.brand.primary} weight="bold">
                {itemCount} món
              </AppText>
            </View>
          )}
        </View>
        {hasMoreActions && (
          <TouchableOpacity
            onPress={() => setShowMoreMenu(true)}
            style={{
              width: btnSize,
              height: btnSize,
              borderRadius: 8,
              backgroundColor: colors.surface.disabled,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={iconSize} color={colors.icon.default} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1, backgroundColor: colors.surface.card }}>
        {cart.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <MaterialCommunityIcons name="basket" size={48} color={colors.icon.muted} />
            <AppText variant="medium" color={colors.text.secondary}>Giỏ hàng trống</AppText>
            {!isWide && (
              <TouchableOpacity
                onPress={() => setCartSheet(false)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                }}
              >
                <AppText variant="medium" color={colors.text.brand}>Thêm món ngay</AppText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 8, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {renderCartItems()}
            </ScrollView>
            {renderFooter()}
          </>
        )}
      </View>

      <NoteEditor
        visible={!!noteEditId}
        noteText={noteText}
        onChangeText={setNoteText}
        onSave={saveNote}
        onCancel={() => setNoteEditId(null)}
      />
      <MoreMenu
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        onSplitBill={
          onSplitBill
            ? () => {
                setSplitMode(true);
              }
            : undefined
        }
        onMergeBill={
          onMergeBill
            ? () => {
                setMoveAction('merge_bill');
              }
            : undefined
        }
        onMoveTable={
          onMoveTable
            ? () => {
                setMoveAction('move_table');
              }
            : undefined
        }
        onSplitTable={
          onSplitTable
            ? () => {
                setMoveAction('split_table');
              }
            : undefined
        }
        onMergeTable={
          onMergeTable
            ? () => {
                setMoveAction('merge_table');
              }
            : undefined
        }
      />
    </>
  );

  if (isWide) {
    return <View style={{ flex: 1, backgroundColor: colors.surface.card }}>{content}</View>;
  }

  return (
    <Modal visible={cartSheet} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.surface.card }}
        edges={['bottom', 'left', 'right']}
      >
        {content}
      </SafeAreaView>
    </Modal>
  );
}
