import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TableItem } from '../TableCard';
import { CartItem } from '../../../store/usePOSStore';
import { VOID_REASONS } from './types';

interface TableOpsVoidViewProps {
  selectedTable: TableItem;
  cart: CartItem[];
  subTotal: number;
  totalQty: number;
  selectedVoidReason: string;
  onSelectVoidReason: (reason: string) => void;
  insetsBottom: number;
  onConfirmVoidTable: () => void;
}

export const TableOpsVoidView: React.FC<TableOpsVoidViewProps> = ({
  selectedTable,
  cart,
  subTotal,
  totalQty,
  selectedVoidReason,
  onSelectVoidReason,
  insetsBottom,
  onConfirmVoidTable,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 140, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Notice Box */}
        <View style={[s.fullWarningBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: theme.brand.danger }]}>
          <Icon name="alert-octagon" size={32} color={theme.brand.danger} />
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="medium" color={theme.brand.danger}>
              Cảnh Báo Hủy Đơn Bàn [{selectedTable.name}]
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
              Thao tác này sẽ dọn sạch bàn, xóa toàn bộ món và ghi nhật ký kiểm toán Audit Log.
            </AppText>
          </View>
        </View>

        {/* Lý do hủy bàn */}
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ paddingHorizontal: 4 }}>
          CHỌN LÝ DO HỦY BÀN (BẮT BUỘC):
        </AppText>

        <View style={[s.groupedInsetContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
          {VOID_REASONS.map((r, idx) => {
            const isSelected = selectedVoidReason === r;
            return (
              <TouchableOpacity
                key={r}
                activeOpacity={0.75}
                onPress={() => onSelectVoidReason(r)}
                style={[
                  s.groupedInsetTableRow,
                  {
                    backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    borderBottomColor: theme.border.default,
                    borderBottomWidth: idx === VOID_REASONS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon
                    name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    color={isSelected ? theme.brand.danger : theme.text.muted}
                  />
                  <AppText variant="md" weight={isSelected ? 'medium' : 'normal'} color={isSelected ? theme.brand.danger : theme.text.primary}>
                    {r}
                  </AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Damage / Void Summary */}
        {cart.length > 0 && (
          <View style={[s.voidSummaryCard, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
            <AppText variant="xs" weight="medium" color={theme.text.muted}>
              THÔNG TIN ĐƠN HỦY:
            </AppText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <AppText variant="sm" color={theme.text.muted}>Số món bị hủy:</AppText>
              <AppText variant="sm" weight="medium" color={theme.text.primary}>
                {cart.length} món ({totalQty} phần)
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <AppText variant="sm" color={theme.brand.danger}>Tổng tiền hủy:</AppText>
              <AppText variant="md" weight="medium" tabularNums color={theme.brand.danger}>
                {subTotal.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Dock Action */}
      <View
        style={[
          s.fixedBottomDock,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.default,
            paddingBottom: Math.max(insetsBottom, 16),
          },
        ]}
      >
        <Button
          variant="destructive"
          size="lg"
          title="Hủy Bàn"
          leadingIcon={<Icon name="trash-can-outline" size={20} color={theme.text.onBrand} />}
          onPress={onConfirmVoidTable}
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  fullWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  groupedInsetContainer: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  groupedInsetTableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  voidSummaryCard: { padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  fixedBottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
