import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TableItem } from '../TableCard';
import { CartItem } from '../../../store/usePOSStore';

interface TableOpsSplitViewProps {
  cart: CartItem[];
  selectedSplitItemIds: string[];
  onToggleSplitItem: (cartItemId: string) => void;
  otherTables: TableItem[];
  selectedTargetTable: TableItem | null;
  onSelectTargetTable: (table: TableItem) => void;
  splitTotal: number;
  insetsBottom: number;
  onConfirmSplit: () => void;
}

export const TableOpsSplitView: React.FC<TableOpsSplitViewProps> = ({
  cart,
  selectedSplitItemIds,
  onToggleSplitItem,
  otherTables,
  selectedTargetTable,
  onSelectTargetTable,
  splitTotal,
  insetsBottom,
  onConfirmSplit,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 160, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bước 1: Chọn món cần tách */}
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ paddingHorizontal: 4 }}>
          BƯỚC 1: CHỌN MÓN CẦN TÁCH ({selectedSplitItemIds.length} ĐÃ CHỌN):
        </AppText>

        <View style={[s.groupedInsetContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
          {cart.map((c, idx) => {
            const isChecked = selectedSplitItemIds.includes(c.cartItemId);
            const itemTotal = c.unitPrice * c.qty;
            return (
              <TouchableOpacity
                key={c.cartItemId}
                activeOpacity={0.75}
                onPress={() => onToggleSplitItem(c.cartItemId)}
                style={[
                  s.groupedInsetTableRow,
                  {
                    backgroundColor: isChecked ? theme.brand.primaryBg : 'transparent',
                    borderBottomColor: theme.border.default,
                    borderBottomWidth: idx === cart.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Icon
                    name={isChecked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={22}
                    color={isChecked ? theme.brand.primary : theme.text.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight={isChecked ? 'medium' : 'normal'} color={theme.text.primary} numberOfLines={1}>
                      {c.qty}x {c.item.name}
                    </AppText>
                    {c.selectedSize && (
                      <AppText variant="xs" color={theme.text.muted}>
                        {c.selectedSize}
                      </AppText>
                    )}
                  </View>
                </View>

                <AppText variant="md" weight="medium" tabularNums color={isChecked ? theme.brand.primary : theme.text.primary}>
                  {itemTotal.toLocaleString('vi-VN')} đ
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bước 2: Chọn bàn đích */}
        {selectedSplitItemIds.length > 0 && (
          <>
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ paddingHorizontal: 4, marginTop: 6 }}>
              BƯỚC 2: CHỌN BÀN ĐÍCH ĐỂ TÁCH SANG:
            </AppText>

            <View style={[s.groupedInsetContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
              {otherTables.map((t, idx) => {
                const isVacant = t.status === 'trong';
                const isSelected = selectedTargetTable?.id === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.75}
                    onPress={() => onSelectTargetTable(t)}
                    style={[
                      s.groupedInsetTableRow,
                      {
                        backgroundColor: isSelected ? theme.brand.primaryBg : 'transparent',
                        borderBottomColor: theme.border.default,
                        borderBottomWidth: idx === otherTables.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={[
                          s.tableDotLarge,
                          { backgroundColor: isVacant ? theme.brand.success : theme.brand.warning },
                        ]}
                      />
                      <View>
                        <AppText variant="md" weight="medium" color={isSelected ? theme.brand.primary : theme.text.primary}>
                          {t.name}
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted}>
                          {t.area} · {isVacant ? 'Bàn trống' : 'Đang có khách'}
                        </AppText>
                      </View>
                    </View>

                    <View style={[s.statusTag, { backgroundColor: isVacant ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)' }]}>
                      <AppText variant="xs" weight="medium" color={isVacant ? theme.brand.success : theme.brand.warning}>
                        {isVacant ? 'Bàn Trống' : 'Có Khách'}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Dock Action */}
      {selectedSplitItemIds.length > 0 && selectedTargetTable && (
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
            variant="default"
            size="lg"
            title="Tách Đơn Ngay"
            leadingIcon={<Icon name="call-split" size={20} color={theme.text.onBrand} />}
            onPress={onConfirmSplit}
          />
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  groupedInsetContainer: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  groupedInsetTableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  tableDotLarge: { width: 12, height: 12, borderRadius: 6 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fixedBottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
