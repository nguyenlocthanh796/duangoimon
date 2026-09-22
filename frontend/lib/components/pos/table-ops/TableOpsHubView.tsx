import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TableItem } from '../TableCard';
import { CartItem, TableDiscount } from '../../../store/usePOSStore';
import { OpsViewMode } from './types';

interface TableOpsHubViewProps {
  selectedTable: TableItem;
  tables: TableItem[];
  cart: CartItem[];
  appliedDiscount?: TableDiscount;
  appliedDiscountAmount: number;
  appliedFinalTotal: number;
  subTotal: number;
  totalQty: number;
  unsentCount: number;
  insetsBottom: number;
  onSetMode: (mode: OpsViewMode) => void;
  onSendKitchenAction: () => void;
  onPrintPreBill?: () => void;
  onOpenCupStickers?: () => void;
  onOpenDiscount?: () => void;
  onGoToCheckout: () => void;
  onPopulateSample: () => void;
  onSelectTable: (table: TableItem) => void;
  onShowToast: (msg: string) => void;
}

export const TableOpsHubView: React.FC<TableOpsHubViewProps> = ({
  selectedTable,
  tables,
  cart,
  appliedDiscount,
  appliedDiscountAmount,
  appliedFinalTotal,
  subTotal,
  totalQty,
  unsentCount,
  insetsBottom,
  onSetMode,
  onSendKitchenAction,
  onPrintPreBill,
  onOpenCupStickers,
  onOpenDiscount,
  onGoToCheckout,
  onPopulateSample,
  onSelectTable,
  onShowToast,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.surface.card }}
        contentContainerStyle={[s.scrollBody, { paddingBottom: Math.max(insetsBottom, 24) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {appliedDiscount && (
          <View style={[s.discountStrip, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
            <Icon name="ticket-percent-outline" size={16} color={theme.brand.primary} />
            <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums style={{ flex: 1 }}>
              {appliedDiscount.note} (-{appliedDiscountAmount.toLocaleString('vi-VN')} đ)
            </AppText>
            <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
              Còn: {appliedFinalTotal.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}

        <View style={[s.seamlessContainer, { backgroundColor: theme.surface.card }]}>
          {/* 1. Báo Bếp */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onSendKitchenAction}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="silverware-fork-knife" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText variant="md" weight="medium" color={theme.text.primary}>
                  Báo Bếp
                </AppText>
                {unsentCount > 0 && (
                  <View style={[s.badgeMini, { backgroundColor: theme.brand.accent }]}>
                    <AppText variant="xs" weight="bold" color={theme.text.onBrand} tabularNums>
                      {unsentCount} mới
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="xs" color={theme.text.muted}>
                {unsentCount > 0 ? `Đang có ${unsentCount} món mới cần chế biến` : 'Tất cả món đã gửi bếp'}
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 2. In Tạm Tính */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              if (onPrintPreBill) onPrintPreBill();
              else onSetMode('prebill');
            }}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="printer-outline" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                In Tạm Tính
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                In phiếu tạm tính cho khách kiểm tra tiền
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 2.5. In Tem Dán Ly */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              if (onOpenCupStickers) onOpenCupStickers();
            }}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="label-outline" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                In Tem Ly
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                In nhãn dán ly đồ uống và topping
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 3. Chuyển Bàn */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSetMode('move')}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="swap-horizontal" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Chuyển Bàn
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Chuyển toàn bộ món sang bàn trống khác
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 4. Gộp Bàn */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSetMode('merge')}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="call-merge" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Gộp Bàn
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Ghép hóa đơn vào bàn khác
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 5. Tách Bàn */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSetMode('split')}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="call-split" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Tách Bàn
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Chọn món trong bàn để tách sang bàn khác
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 6. Giảm Giá */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              if (onOpenDiscount) onOpenDiscount();
              else onSetMode('discount');
            }}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="ticket-percent-outline" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Giảm Giá
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Chiết khấu theo % hoặc trừ thẳng tiền mặt
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 7. Ghi Chú Bàn */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSetMode('guest_note')}
            style={[s.seamlessRow, { borderBottomColor: theme.border.subtle }]}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
              <Icon name="account-group-outline" size={20} color={theme.text.primary} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Ghi Chú Bàn
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                {selectedTable.guestCount || 2} khách · {selectedTable.note || 'Không có ghi chú'}
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.text.muted} />
          </TouchableOpacity>

          {/* 8. Hủy Bàn */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSetMode('void')}
            style={s.seamlessRow}
          >
            <View style={[s.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.10)' }]}>
              <Icon name="trash-can-outline" size={20} color={theme.brand.danger} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <AppText variant="md" weight="medium" color={theme.brand.danger}>
                Hủy Bàn
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Xóa toàn bộ món và đưa bàn về trạng thái trống
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.brand.danger} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Dock: Fast Pay */}
      {cart.length > 0 && (
        <View
          style={[
            s.fixedBottomDock,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: Math.max(insetsBottom, 14),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onGoToCheckout}
            style={[s.payBtnObsidian, { backgroundColor: theme.brand.accent }]}
          >
            <Icon name="cash-check" size={22} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
              THANH TOÁN ({appliedFinalTotal.toLocaleString('vi-VN')} đ)
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  scrollBody: { paddingVertical: 0, gap: 0 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 4 },
  kitchenAlertStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  sendKitchenMiniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  discountStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, gap: 8, padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  seamlessContainer: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(15, 23, 42, 0.08)' },
  seamlessRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeMini: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  payBtnObsidian: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fixedBottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
