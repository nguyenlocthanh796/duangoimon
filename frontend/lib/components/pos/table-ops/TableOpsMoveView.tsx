import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { TableItem } from '../TableCard';

interface TableOpsMoveViewProps {
  areas: string[];
  selectedArea: string;
  onSelectArea: (area: string) => void;
  otherTables: TableItem[];
  selectedTargetTable: TableItem | null;
  onSelectTargetTable: (table: TableItem) => void;
  insetsBottom: number;
  onConfirmMove: () => void;
}

export const TableOpsMoveView: React.FC<TableOpsMoveViewProps> = ({
  areas,
  selectedArea,
  onSelectArea,
  otherTables,
  selectedTargetTable,
  onSelectTargetTable,
  insetsBottom,
  onConfirmMove,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      {/* Area Filter Chips */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {areas.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => onSelectArea(a)}
              style={[
                s.areaFilterChip,
                {
                  backgroundColor: selectedArea === a ? theme.brand.primary : theme.surface.card,
                  borderColor: selectedArea === a ? theme.brand.primary : theme.border.default,
                },
              ]}
            >
              <AppText
                variant="xs"
                weight={selectedArea === a ? 'medium' : 'normal'}
                color={selectedArea === a ? theme.text.onBrand : theme.text.primary}
              >
                {a}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Table List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
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
                      {t.area} · {t.capacity} chỗ ngồi
                    </AppText>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={[
                      s.statusTag,
                      {
                        backgroundColor: isVacant
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight="medium"
                      color={isVacant ? theme.brand.success : theme.brand.warning}
                    >
                      {isVacant ? 'Bàn Trống' : 'Có Khách'}
                    </AppText>
                  </View>
                  {(t.totalAmount || 0) > 0 && (
                    <AppText variant="xs" tabularNums color={theme.text.muted} style={{ marginTop: 2 }}>
                      {(t.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </AppText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
            title="Chuyển Bàn Ngay"
            leadingIcon={<Icon name="swap-horizontal" size={20} color={theme.text.onBrand} />}
            onPress={onConfirmMove}
          />
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  areaFilterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  groupedInsetContainer: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  groupedInsetTableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  tableDotLarge: { width: 12, height: 12, borderRadius: 6 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fixedBottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
