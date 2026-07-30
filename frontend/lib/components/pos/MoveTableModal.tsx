import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../api';
import { colors, font, shape, formatPrice } from '../../theme';
import AppText from '../ui/AppText';
import VisualTablePicker from './VisualTablePicker';
import type { Table, TableStatus } from './TableCard';

import { haptic } from '../../haptic';

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
  const insets = useSafeAreaInsets();
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
    haptic.impact('medium');
    onSelectTable(selectedTable.id, selectedTable.name);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={{
            width: '100%',
            maxWidth: 600,
            backgroundColor: colors.surface.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'web' ? 16 : Math.max(Math.floor(insets.bottom * 0.5), 16),
            gap: 12,
            maxHeight: '88%',
          }}
        >
          {/* iOS Grabber Bar */}
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 4 }} />
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E9F0',
              paddingBottom: 10,
            }}
          >
            <View>
              <AppText variant="md" weight="bold" color="#1E293B">
                {title}
              </AppText>
              <AppText variant="sm" color="#64748B" style={{ marginTop: 2 }}>
                Chọn bàn từ sơ đồ khu vực trực quan bên dưới
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#E5E9F0',
              }}
            >
              <Icon name="close" size={18} color="#64748B" />
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
              borderTopColor: '#E5E9F0',
              paddingTop: 12,
              gap: 10,
            }}
          >
            {selectedTable ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: '#FFF7ED',
                  borderWidth: 1,
                  borderColor: '#FDBA74',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ gap: 2 }}>
                  <AppText variant="md" weight="bold" color="#F97316">
                    Bàn đã chọn: {selectedTable.name}
                  </AppText>
                  <AppText variant="sm" color="#64748B">
                    {selectedTable.area || 'Khu vực chung'} · Trạng thái: {selectedTable.status === 'co_khach' ? 'Đã có khách' : 'Bàn trống'}
                  </AppText>
                </View>

                {selectedTable.orderTotal ? (
                  <AppText variant="md" weight="bold" color={colors.status.danger}>
                    {formatPrice(selectedTable.orderTotal)}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <AppText variant="sm" color="#64748B" style={{ textAlign: 'center', paddingVertical: 4 }}>
                Vui lòng bấm chọn một bàn trên sơ đồ
              </AppText>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E9F0',
                }}
              >
                <AppText variant="md" color="#64748B">
                  Huỷ
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!selectedTable}
                style={{
                  flex: 2,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: selectedTable ? colors.brand.primary : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selectedTable ? colors.brand.primary : '#E5E9F0',
                }}
              >
                <AppText
                  variant="md"
                  weight="normal"
                  color={selectedTable ? colors.text.inverse : '#94A3B8'}
                >
                  Xác nhận chuyển bàn
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
