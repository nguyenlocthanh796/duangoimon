import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TableItem } from '../TableCard';
import { MergePreviewData } from '../../../store/usePOSStore';

interface TableOpsMergeViewProps {
  selectedTable: TableItem;
  otherTables: TableItem[];
  selectedTargetTable: TableItem | null;
  onSelectTargetTable: (table: TableItem) => void;
  mergePreview: MergePreviewData | null;
  insetsBottom: number;
  onConfirmMerge: () => void;
}

export const TableOpsMergeView: React.FC<TableOpsMergeViewProps> = ({
  selectedTable,
  otherTables,
  selectedTargetTable,
  onSelectTargetTable,
  mergePreview,
  insetsBottom,
  onConfirmMerge,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 160, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ paddingHorizontal: 4 }}>
          CHỌN BÀN ĐANG CÓ KHÁCH CẦN GỘP VÀO:
        </AppText>

        {/* Grouped Inset Tables */}
        <View style={[s.groupedInsetContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
          {otherTables
            .filter((t) => t.status === 'co_khach' || (t.totalAmount || 0) > 0)
            .map((t, idx, arr) => {
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
                      borderBottomWidth: idx === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.tableDotLarge, { backgroundColor: theme.brand.accent }]} />
                    <View>
                      <AppText variant="md" weight="medium" color={isSelected ? theme.brand.primary : theme.text.primary}>
                        {t.name}
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted}>
                        {t.area} · Đang phục vụ
                      </AppText>
                    </View>
                  </View>

                  <AppText variant="md" weight="medium" tabularNums color={theme.brand.primary}>
                    {(t.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </AppText>
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Merge Audit Preview Card */}
        {mergePreview && (
          <View style={[s.fullMergePreviewCard, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="calculator-variant-outline" size={20} color={theme.brand.accent} />
              <AppText variant="sm" weight="medium" color={theme.brand.accent}>
                BẢNG ĐỐI SOÁT HÓA ĐƠN TRƯỚC KHI GỘP
              </AppText>
            </View>

            <View style={{ gap: 6, marginVertical: 10 }}>
              <View style={s.mergeRow}>
                <AppText variant="sm" color={theme.text.muted}>
                  {selectedTable.name} (Bàn nguồn):
                </AppText>
                <AppText variant="sm" weight="medium" tabularNums color={theme.text.primary}>
                  {mergePreview.sourceItemsCount} món · {mergePreview.sourceTotal.toLocaleString('vi-VN')} đ
                </AppText>
              </View>

              <View style={s.mergeRow}>
                <AppText variant="sm" color={theme.text.muted}>
                  ➕ {selectedTargetTable?.name} (Bàn đích):
                </AppText>
                <AppText variant="sm" weight="medium" tabularNums color={theme.text.primary}>
                  {mergePreview.targetItemsCount} món · {mergePreview.targetTotal.toLocaleString('vi-VN')} đ
                </AppText>
              </View>

              <View style={[s.dividerHairline, { borderTopColor: theme.border.default }]} />

              <View style={s.mergeRow}>
                <AppText variant="md" weight="medium" color={theme.text.primary}>
                  🟰 Tổng sau khi gộp:
                </AppText>
                <AppText variant="md" weight="medium" tabularNums color={theme.brand.primary}>
                  {mergePreview.combinedItemsCount} món · {mergePreview.combinedTotal.toLocaleString('vi-VN')} đ
                </AppText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Dock Action */}
      {selectedTargetTable && (
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
            title="Gộp Bàn Ngay"
            leadingIcon={<Icon name="call-merge" size={20} color={theme.text.onBrand} />}
            onPress={onConfirmMerge}
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
  fullMergePreviewCard: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  mergeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dividerHairline: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 6 },
  fixedBottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
