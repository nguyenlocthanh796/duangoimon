import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../api';
import { colors, font, shape, formatPrice } from '../../theme';
import AppText from '../ui/AppText';
import VisualTablePicker from './VisualTablePicker';
import type { Table, TableStatus } from './TableCard';

interface MoveTableModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTable: (tableId: string, tableName: string) => void;
  title?: string;
  excludeTableId?: string;
  filterOccupied?: boolean;
}

export default function MoveTableModal({
  visible,
  onClose,
  onSelectTable,
  title = 'Chọn Bàn Đích',
  excludeTableId,
  filterOccupied,
}: MoveTableModalProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedTable(null);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [tableData, orders] = await Promise.all([
          api.getTables(),
          api.getOrders().catch(() => []),
        ]);

        const orderTotals: Record<string, number> = {};
        (orders || []).forEach((o: any) => {
          if (o.status !== 'da_thanh_toan' && o.table_id) {
            orderTotals[o.table_id] = (orderTotals[o.table_id] || 0) + Number(o.total_amount);
          }
        });

        const mapped: Table[] = (tableData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          capacity: t.capacity || 4,
          area: t.area || t.location || undefined,
          status: (t.status === 'dang_su_dung' ? 'co_khach' : t.status) as TableStatus,
          orderTotal: orderTotals[t.id],
        }));

        setTables(mapped);
      } catch {
        setTables([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const handleConfirm = () => {
    if (!selectedTable) return;
    onSelectTable(selectedTable.id, selectedTable.name);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 540,
            backgroundColor: colors.surface.card,
            borderRadius: shape.radius.lg,
            overflow: 'hidden',
            padding: 16,
            gap: 12,
            maxHeight: '85%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
              paddingBottom: 10,
            }}
          >
            <View>
              <AppText variant="md" color={colors.text.primary} weight="bold">
                {title}
              </AppText>
              <AppText variant="sm" color={colors.text.muted}>
                Chọn bàn từ sơ đồ khu vực trực quan bên dưới
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: shape.radius.md,
                backgroundColor: colors.surface.disabled,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={20} color={colors.icon.default} />
            </TouchableOpacity>
          </View>

          {/* Loading or Visual Table Picker */}
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <AppText variant="sm" color={colors.text.muted}>Đang tải sơ đồ bàn...</AppText>
            </View>
          ) : (
            <VisualTablePicker
              tables={tables}
              selectedTableId={selectedTable?.id || null}
              onSelectTable={(table) => setSelectedTable(table)}
              excludeTableId={excludeTableId}
              filterStatus={filterOccupied ? 'co_khach' : 'all'}
              containerHeight={320}
            />
          )}

          {/* Selected Preview Box & Footer Action */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border.default,
              paddingTop: 12,
              gap: 10,
            }}
          >
            {selectedTable ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.brand.primaryBg,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ gap: 2 }}>
                  <AppText variant="sm" weight="bold" color={colors.brand.primary}>
                    Bàn đã chọn: {selectedTable.name}
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    {selectedTable.area || 'Khu vực chung'} · Trạng thái: {selectedTable.status === 'co_khach' ? 'Đã có khách' : 'Bàn trống'}
                  </AppText>
                </View>

                {selectedTable.orderTotal ? (
                  <AppText variant="sm" weight="bold" color={colors.status.danger}>
                    {formatPrice(selectedTable.orderTotal)}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center' }}>
                Vui lòng bấm chọn một bàn trên sơ đồ
              </AppText>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.surface.disabled,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="sm" weight="bold" color={colors.text.secondary}>
                  Huỷ
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!selectedTable}
                style={{
                  flex: 2,
                  height: 44,
                  borderRadius: shape.radius.md,
                  backgroundColor: selectedTable ? colors.brand.primary : colors.surface.disabled,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={selectedTable ? colors.text.inverse : colors.text.muted}
                >
                  Xác Nhận Thao Tác
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
