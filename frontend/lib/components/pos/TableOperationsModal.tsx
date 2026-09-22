import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { AppHeader } from '../ui/AppHeader';
import { ModalDragIndicator } from '../ui/ModalDragIndicator';
import { TableItem } from './TableCard';
import { playTapSound } from '../../utils/sound';
import {
  useSelectedTable,
  useTableList,
  useTableCart,
  useTableDiscount,
  useStoreSettings,
  usePOSActions,
} from '../../store/usePOSStore';
import { CupStickerPreviewModal } from './CupStickerPreviewModal';
import { generateCupStickers, CupStickerData } from '../../utils/labelPrinter';
import {
  OpsViewMode,
  VOID_REASONS,
  TableOpsHubView,
  TableOpsMoveView,
  TableOpsMergeView,
  TableOpsSplitView,
  TableOpsGuestNoteView,
  TableOpsVoidView,
} from './table-ops';
import { useAuthStore } from '../../store/useAuthStore';
import { ManagerPinModal } from './ManagerPinModal';

export interface TableOperationsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenDiscount?: () => void;
  onPrintPreBill?: () => void;
}

export const TableOperationsModal: React.FC<TableOperationsModalProps> = ({
  visible,
  onClose,
  onOpenDiscount,
  onPrintPreBill,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();

  const selectedTable = useSelectedTable();
  const selectedTableId = selectedTable?.id;
  const tables = useTableList();
  const cart = useTableCart(selectedTableId);
  const appliedDiscount = useTableDiscount(selectedTableId);
  const {
    sendToKitchen,
    moveTable,
    mergeTable,
    splitTable,
    updateTableInfo,
    getMergePreview,
    clearCart,
    populateSampleData,
    selectTable,
  } = usePOSActions();

  const [mode, setMode] = useState<OpsViewMode>('hub');
  const [selectedTargetTable, setSelectedTargetTable] = useState<TableItem | null>(null);
  const [selectedArea, setSelectedArea] = useState('Tất Cả');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedVoidReason, setSelectedVoidReason] = useState(VOID_REASONS[0]);
  const [selectedSplitItemIds, setSelectedSplitItemIds] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState(selectedTable?.guestCount || 2);
  const [tableNote, setTableNote] = useState(selectedTable?.note || '');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCupModal, setShowCupModal] = useState(false);
  const [cupStickers, setCupStickers] = useState<CupStickerData[]>([]);
  const settings = useStoreSettings();
  const requiresApproval = useAuthStore((s) => s.requiresManagerApproval);

  const handleOpenCupStickers = () => {
    if (cart.length === 0) {
      showToast('Bàn chưa có món để in tem!');
      return;
    }
    playTapSound();
    const stickers = generateCupStickers(
      selectedTable.name,
      selectedTable.name,
      cart,
      settings.storeName || 'ONGCHU POS'
    );
    setCupStickers(stickers);
    setShowCupModal(true);
  };

  // Toast animation
  const toastFadeAnim = useState(new Animated.Value(0))[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(1800),
      Animated.timing(toastFadeAnim, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  useEffect(() => {
    if (visible) {
      setMode('hub');
      setSelectedTargetTable(null);
      setSelectedArea('Tất Cả');
      setSelectedSplitItemIds([]);
      setGuestCount(selectedTable?.guestCount || 2);
      setTableNote(selectedTable?.note || '');
    }
  }, [visible, selectedTable, appliedDiscount]);

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const subTotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const unsentCount = cart.filter((c) => !c.sentToKitchen).reduce((s, c) => s + c.qty, 0);

  const appliedDiscountAmount = appliedDiscount
    ? appliedDiscount.type === 'percent'
      ? Math.round((subTotal * appliedDiscount.value) / 100)
      : Math.min(subTotal, appliedDiscount.value)
    : 0;
  const appliedFinalTotal = Math.max(0, subTotal - appliedDiscountAmount);

  const areas = ['Tất Cả', ...Array.from(new Set(tables.map((t) => t.area)))];
  const otherTables = tables
    .filter((t) => t.id !== selectedTable.id)
    .filter((t) => selectedArea === 'Tất Cả' || t.area === selectedArea);

  const mergePreview = selectedTargetTable ? getMergePreview(selectedTargetTable.id) : null;

  const splitItems = cart.filter((c) => selectedSplitItemIds.includes(c.cartItemId));
  const splitTotal = splitItems.reduce((s, c) => s + c.unitPrice * c.qty, 0);

  const toggleSplitItem = (cartItemId: string) => {
    playTapSound();
    setSelectedSplitItemIds((prev) =>
      prev.includes(cartItemId) ? prev.filter((id) => id !== cartItemId) : [...prev, cartItemId]
    );
  };

  const handleSendKitchenAction = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const result = sendToKitchen();
    if (result.newCount > 0) {
      showToast(`Đã gửi ${result.newCount} món mới xuống bếp!`);
    } else {
      showToast('Tất cả món đã gửi bếp!');
    }
  };

  const handleGoToCheckout = () => {
    playTapSound();
    onClose();
    router.push('/thanh-toan' as any);
  };

  const handleConfirmMove = () => {
    if (!selectedTargetTable) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const ok = moveTable(selectedTargetTable.id);
    if (ok) {
      showToast(`Đã chuyển toàn bộ sang [${selectedTargetTable.name}]!`);
      setTimeout(() => onClose(), 800);
    }
  };

  const handleConfirmMerge = () => {
    if (!selectedTargetTable) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const ok = mergeTable(selectedTargetTable.id);
    if (ok) {
      showToast(`Đã gộp vào [${selectedTargetTable.name}]`);
      setTimeout(() => onClose(), 800);
    }
  };

  const handleConfirmSplit = () => {
    if (!selectedTargetTable || selectedSplitItemIds.length === 0) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const ok = splitTable(selectedTargetTable.id, selectedSplitItemIds);
    if (ok) {
      showToast(`Đã tách sang [${selectedTargetTable.name}]`);
      setTimeout(() => onClose(), 800);
    }
  };

  const handleSaveGuestNote = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    updateTableInfo(guestCount, tableNote);
    showToast('Đã cập nhật khách và ghi chú');
    setTimeout(() => setMode('hub'), 600);
  };

  const executeVoidTable = () => {
    clearCart();
    updateTableInfo(0, `[Đã dọn bàn - Lý do: ${selectedVoidReason}]`);
    showToast(`Đã hủy đơn bàn & dọn [${selectedTable.name}]!`);
    setTimeout(() => onClose(), 900);
  };

  const handleConfirmVoidTable = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }

    if (cart.length > 0 && requiresApproval('void_order')) {
      setShowPinModal(true);
      return;
    }

    executeVoidTable();
  };

  const getHeaderTitle = () => {
    switch (mode) {
      case 'move':
        return `Chuyển Bàn · ${selectedTable.name}`;
      case 'merge':
        return `Gộp Bàn · ${selectedTable.name}`;
      case 'split':
        return `Tách Bàn / Tách Món · ${selectedTable.name}`;
      case 'guest_note':
        return `Số Khách & Ghi Chú · ${selectedTable.name}`;
      case 'void':
        return `Hủy Bàn · ${selectedTable.name}`;
      default:
        return `Nghiệp Vụ · ${selectedTable.name}`;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (mode !== 'hub') setMode('hub');
        else onClose();
      }}
      statusBarTranslucent
    >
      <View
        style={[
          s.fullScreenRoot,
          {
            backgroundColor: theme.surface.card,
          },
        ]}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <Animated.View
            style={[
              s.toastPill,
              {
                top: Math.max(insets.top, 20) + 60,
                opacity: toastFadeAnim,
                backgroundColor: theme.brand.primary,
                shadowColor: theme.surface.shadow,
              },
            ]}
          >
            <Icon name="check-circle" size={20} color={theme.text.onBrand} />
            <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
              {toastMessage}
            </AppText>
          </Animated.View>
        )}

        {/* Top Screen Header - Hợp nhất về AppHeader chuẩn 100% của toàn bộ dự án */}
        <AppHeader
          showBack
          onBack={() => {
            playTapSound();
            if (mode !== 'hub') setMode('hub');
            else onClose();
          }}
          title={getHeaderTitle()}
          subtitle={`${selectedTable.area} · ${selectedTable.status === 'co_khach' ? `${totalQty} món` : 'Bàn trống'}`}
        />

        {/* Modular Views */}
        {mode === 'hub' && (
          <TableOpsHubView
            selectedTable={selectedTable}
            tables={tables}
            cart={cart}
            appliedDiscount={appliedDiscount}
            appliedDiscountAmount={appliedDiscountAmount}
            appliedFinalTotal={appliedFinalTotal}
            subTotal={subTotal}
            totalQty={totalQty}
            unsentCount={unsentCount}
            insetsBottom={insets.bottom}
            onSetMode={setMode}
            onSendKitchenAction={handleSendKitchenAction}
            onPrintPreBill={onPrintPreBill}
            onOpenCupStickers={handleOpenCupStickers}
            onOpenDiscount={onOpenDiscount}
            onGoToCheckout={handleGoToCheckout}
            onPopulateSample={() => populateSampleData(selectedTable.id)}
            onSelectTable={selectTable}
            onShowToast={showToast}
          />
        )}

        {mode === 'move' && (
          <TableOpsMoveView
            areas={areas}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
            otherTables={otherTables}
            selectedTargetTable={selectedTargetTable}
            onSelectTargetTable={setSelectedTargetTable}
            insetsBottom={insets.bottom}
            onConfirmMove={handleConfirmMove}
          />
        )}

        {mode === 'merge' && (
          <TableOpsMergeView
            selectedTable={selectedTable}
            otherTables={otherTables}
            selectedTargetTable={selectedTargetTable}
            onSelectTargetTable={setSelectedTargetTable}
            mergePreview={mergePreview}
            insetsBottom={insets.bottom}
            onConfirmMerge={handleConfirmMerge}
          />
        )}

        {mode === 'split' && (
          <TableOpsSplitView
            otherTables={otherTables}
            selectedTargetTable={selectedTargetTable}
            onSelectTargetTable={setSelectedTargetTable}
            cart={cart}
            selectedSplitItemIds={selectedSplitItemIds}
            onToggleSplitItem={toggleSplitItem}
            splitTotal={splitTotal}
            insetsBottom={insets.bottom}
            onConfirmSplit={handleConfirmSplit}
          />
        )}

        {mode === 'guest_note' && (
          <TableOpsGuestNoteView
            guestCount={guestCount}
            onSetGuestCount={setGuestCount}
            tableNote={tableNote}
            onSetTableNote={setTableNote}
            insetsBottom={insets.bottom}
            onSaveGuestNote={handleSaveGuestNote}
          />
        )}

        {mode === 'void' && (
          <TableOpsVoidView
            selectedTable={selectedTable}
            cart={cart}
            subTotal={subTotal}
            totalQty={totalQty}
            selectedVoidReason={selectedVoidReason}
            onSelectVoidReason={setSelectedVoidReason}
            insetsBottom={insets.bottom}
            onConfirmVoidTable={handleConfirmVoidTable}
          />
        )}

        <ManagerPinModal
          visible={showPinModal}
          title="Xác Thực Hủy"
          subtitle={`Nhập mã PIN Quản lý để hủy đơn bàn [${selectedTable.name}]`}
          action="void_order"
          onSuccess={executeVoidTable}
          onClose={() => setShowPinModal(false)}
        />

        <CupStickerPreviewModal
          visible={showCupModal}
          stickers={cupStickers}
          onClose={() => setShowCupModal(false)}
        />
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  fullScreenRoot: { flex: 1 },
  toastPill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
