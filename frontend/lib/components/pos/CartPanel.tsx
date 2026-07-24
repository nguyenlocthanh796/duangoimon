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
import SplitItemModal from './SplitItemModal';
import CartSummary from './CartSummary';
import CartMainActions from './CartMainActions';
import CartSplitActions from './CartSplitActions';
import AppText from '../ui/AppText';
import UnifiedHeader from '../ui/UnifiedHeader';
import { CATEGORIES } from '../../constants/categories';

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
  tableName?: string;
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
  tableName,
}: CartPanelProps) {
  const insets = useSafeAreaInsets();

  const [noteEditId, setNoteEditId] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState('');
  const [qtyEditId, setQtyEditId] = React.useState<string | null>(null);
  const [splitMode, setSplitMode] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [showSplitModal, setShowSplitModal] = React.useState(false);
  const [pendingSplitItems, setPendingSplitItems] = React.useState<
    { cartItemId: string; splitQty: number }[]
  >([]);
  const [moveAction, setMoveAction] = React.useState<
    'move_table' | 'split_table' | 'merge_bill' | 'merge_table' | 'move_item' | null
  >(null);
  const [moveItemCartId, setMoveItemCartId] = React.useState<string | null>(null);

  const openNoteEditor = React.useCallback((cartItemId: string) => {
    const item = cart.find((i) => i.cartItemId === cartItemId);
    if (!item) return;
    setNoteText(item.note || '');
    setNoteEditId(cartItemId);
  }, [cart]);

  const saveNote = React.useCallback(() => {
    if (noteEditId && onEditNote) onEditNote(noteEditId, noteText);
    setNoteEditId(null);
  }, [noteEditId, onEditNote, noteText]);

  // Group cart items by (productId + variantId) for iPad grouped mode
  const groupedCart = React.useMemo(() => {
    if (!isWide) return cart; // no grouping on iPhone
    const groups = new Map<string, CartItem & { groupQty: number; groupTotal: number }>();
    cart.forEach((item) => {
      if (item.cancelReason) return;
      const key = item.id + '_' + (item.selectedSize || 'default');
      const existing = groups.get(key);
      if (existing) {
        existing.groupQty += item.qty;
        existing.groupTotal += item.unitPrice * item.qty;
      } else {
        groups.set(key, {
          ...item,
          groupQty: item.qty,
          groupTotal: item.unitPrice * item.qty,
        });
      }
    });
    return Array.from(groups.values());
  }, [cart, isWide]);

  // Group cart by category for iPhone narrow layout
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
      const label = CATEGORIES.find(c => c.id === cat)?.name || cat;
      groups.push({ category: cat, label, unsent, sent, cancelled: canc });
    });
    return groups;
  }, [cart]);

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

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          <AppText variant="md" color={colors.text.secondary}>Giỏ hàng trống</AppText>
          {!isWide && (
            <TouchableOpacity
              onPress={() => setCartSheet(false)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: shape.radius.md,
                backgroundColor: colors.brand.primaryBg,
                borderWidth: 1,
                borderColor: colors.border.brand,
              }}
            >
              <AppText variant="md" color={colors.text.brand}>Thêm món ngay</AppText>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Wide (iPad) — compact flat list
    if (isWide) {
      return (
        <>
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light }}>
            <AppText variant={'md'} weight="bold" color={colors.text.primary}>
              Món ({itemCount})
            </AppText>
          </View>
          {groupedCart.map((item) => (
            <CartItemRow
              key={item.cartItemId}
              {...itemRowProps(item)}
              groupedMode={true}
            />
          ))}
        </>
      );
    }

    // Narrow (iPhone) — grouped by category
    return groupedItems.map((group) => {
      const { unsent, sent, cancelled } = group;
      if (!unsent.length && !sent.length && !cancelled.length) return null;

      return (
        <View key={group.category} style={{ marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 4, paddingVertical: 8, backgroundColor: colors.surface.app, borderRadius: shape.radius.sm, marginBottom: 4 }}>
            <AppText variant="md" weight="bold" color={colors.text.primary}>
              {group.label}
            </AppText>
          </View>
          {unsent.length > 0 && (
            <>
              {(sent.length > 0 || cancelled.length > 0) && (
                <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
                  <AppText variant={'md'} color={colors.brand.primary}>Món mới</AppText>
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
                  <AppText variant={'md'} color={colors.status.success}>Đã gửi bếp</AppText>
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
                <AppText variant={'md'} color={colors.status.danger}>Đã huỷ</AppText>
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

      <SplitItemModal
        visible={showSplitModal}
        cart={cart}
        tableName={tableName || 'bàn'}
        onClose={() => setShowSplitModal(false)}
        onConfirmSplit={(items) => {
          setPendingSplitItems(items);
          setShowSplitModal(false);
          setMoveAction('split_table');
        }}
      />

      <MoveTableModal
        visible={moveAction !== null}
        onClose={() => setMoveAction(null)}
        onSelectTable={(targetTableId, tableName) => {
          switch (moveAction) {
            case 'move_table':
              onMoveTable?.(targetTableId);
              break;
            case 'merge_bill':
              Alert.alert('Xác nhận', `Gộp hoá đơn từ bàn ${tableName}?`, [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Gộp', onPress: () => onMergeBill?.(targetTableId) },
              ]);
              break;
            case 'split_table':
              const idsToSplit = pendingSplitItems.length > 0
                ? pendingSplitItems.map((i) => i.cartItemId)
                : Array.from(selectedItems);

              if (idsToSplit.length < 1) {
                Alert.alert('Chọn món', 'Vui lòng chọn món cần tách trước.');
                return;
              }
              if (onSplitTable) {
                onSplitTable(idsToSplit[0], targetTableId);
              } else if (onSplitBill) {
                onSplitBill(idsToSplit);
              }
              setPendingSplitItems([]);
              break;
            case 'merge_table':
              Alert.alert('Xác nhận', `Gộp tất cả món từ bàn ${tableName}?`, [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Gộp', onPress: () => onMergeTable?.(targetTableId) },
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
            ? 'Chọn Bàn Đích Cần Chuyển'
            : moveAction === 'merge_bill'
              ? 'Chọn Bàn Cần Gộp Hoá Đơn'
              : moveAction === 'split_table'
                ? 'Chọn Bàn Đích Nhận Món Tách'
                : moveAction === 'merge_table'
                  ? 'Chọn Bàn Cần Gộp Món'
                  : 'Chọn Bàn'
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
  const btnSize = 44;
  const iconSize = isWide ? 22 : 18;
  const paddingV = 8;
  const paddingH = isWide ? 10 : 12;

  const titleComponent = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText variant={'lg'} color={colors.text.primary} weight="bold">
        Giỏ hàng
      </AppText>
      {itemCount > 0 && (
        <View
          style={{
            backgroundColor: colors.brand.primary + '40',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: shape.radius.xs,
          }}
        >
          <AppText variant={'md'} color={colors.brand.primary} weight="bold">
            {itemCount} món
          </AppText>
        </View>
      )}
    </View>
  );

  const rightActions = (hasMoreActions && cart.length > 0) ? (
    <TouchableOpacity
      onPress={() => setShowMoreMenu(true)}
      style={{
        width: btnSize,
        height: btnSize,
        borderRadius: shape.radius.md,
        backgroundColor: colors.surface.disabled,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name="dots-horizontal" size={iconSize} color={colors.icon.default} />
    </TouchableOpacity>
  ) : null;

  const content = (
    <>
      <UnifiedHeader
        titleComponent={titleComponent}
        onBackPress={!isWide ? () => setCartSheet(false) : undefined}
        backIcon="close"
        right={rightActions}
      />

      {/* Cart items */}
      <View style={{ flex: 1, backgroundColor: colors.surface.card }}>
        {cart.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <MaterialCommunityIcons name="basket" size={48} color={colors.icon.muted} />
            <AppText variant={'md'} color={colors.text.secondary} numberOfLines={1}>Giỏ hàng trống</AppText>
            {!isWide && (
              <TouchableOpacity
                onPress={() => setCartSheet(false)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                }}
              >
                <AppText variant="md" color={colors.text.brand}>Thêm món ngay</AppText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: isWide ? 0 : 4, paddingTop: isWide ? 0 : 8, paddingBottom: 16 }}
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
        onSplitBill={onSplitBill ? () => setShowSplitModal(true) : undefined}
        onMergeBill={onMergeBill ? () => setMoveAction('merge_bill') : undefined}
        onMoveTable={onMoveTable ? () => setMoveAction('move_table') : undefined}
        onSplitTable={onSplitTable ? () => setShowSplitModal(true) : undefined}
        onMergeTable={onMergeTable ? () => setMoveAction('merge_table') : undefined}
      />
    </>
  );

  if (isWide) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface.card,
          borderLeftWidth: 1,
          borderLeftColor: colors.border.default,
          shadowColor: '#000000',
          shadowOffset: { width: -3, height: 0 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <Modal visible={cartSheet} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.surface.card }}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {content}
      </SafeAreaView>
    </Modal>
  );
}
