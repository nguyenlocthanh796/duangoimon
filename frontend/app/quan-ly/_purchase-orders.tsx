import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { request } from '../../lib/api/client';
import POForm from '../../lib/components/purchaseOrders/POForm';
import ReceiveModal from '../../lib/components/purchaseOrders/ReceiveModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import AppText from '../../lib/components/ui/AppText';
import FAB from '../../lib/components/ui/FAB';

const API = '/api/v1/quan-ly';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', sent: 'Đã gửi', confirmed: 'Xác nhận', received: 'Đã nhập kho', cancelled: 'Hủy',
};
const STATUS_COLOR: Record<string, string> = {
  draft: colors.text.muted, sent: colors.status.info, confirmed: colors.status.success, received: '#0D9488', cancelled: colors.status.danger,
};
const STATUS_BG: Record<string, string> = {
  draft: colors.surface.app, sent: '#EFF6FF', confirmed: colors.brand.primaryBg, received: '#F0FDFA', cancelled: colors.status.dangerBg,
};

export default function POScreen() {
  const { isWide, containerWidth, hPad, gutter } = useResponsive();
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [poData, supData, matData] = await Promise.all([
        request<any>(API + '/purchase-orders'),
        request<any>(API + '/suppliers'),
        request<any>(API + '/raw-materials'),
      ]);
      setPos(Array.isArray(poData) ? poData : poData?.items || []);
      setSuppliers(Array.isArray(supData) ? supData : supData?.items || []);
      setMaterials(Array.isArray(matData) ? matData : matData?.items || []);
    } catch (e) { console.error('Failed to load POs', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [poData, supData, matData] = await Promise.all([
        request<any>(API + '/purchase-orders'),
        request<any>(API + '/suppliers'),
        request<any>(API + '/raw-materials'),
      ]);
      setPos(Array.isArray(poData) ? poData : poData?.items || []);
      setSuppliers(Array.isArray(supData) ? supData : supData?.items || []);
      setMaterials(Array.isArray(matData) ? matData : matData?.items || []);
    } catch { } finally { setRefreshing(false); }
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return pos;
    return pos.filter(p => p.status === statusFilter);
  }, [pos, statusFilter]);

  const selected = useMemo(() => {
    if (!selectedPo) return null;
    return pos.find(p => p.id === selectedPo.id);
  }, [pos, selectedPo]);

  const numCols = useMemo(() => {
    if (!isWide) return 1;
    return calcGridCols(containerWidth, 300, hPad, gutter);
  }, [isWide, containerWidth, hPad, gutter]);

  const statuses = ['all', 'draft', 'sent', 'confirmed', 'received', 'cancelled'];

  // ── Detail Panel ──
  const renderDetail = () => {
    if (!selected) return null;
    const sc = STATUS_COLOR[selected.status] || colors.text.muted;
    const sbg = STATUS_BG[selected.status] || colors.surface.app;
    const sl = STATUS_LABEL[selected.status] || selected.status;
    const supplier = suppliers.find(s => s.id === selected.supplier_id);
    const totalItems = selected.items?.length || 0;
    const receivedItems = selected.items?.filter((it: any) => it.received_quantity > 0)?.length || 0;

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={[s.panelIconBox, { backgroundColor: sbg }]}>
            <Icon name="clipboard-text" size={18} color={sc} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.po_number}</AppText>
            <AppText variant="sm" color={colors.text.muted}>{supplier?.name || selected.supplier_name || '—'}</AppText>
          </View>
          <View style={[s.badge, { backgroundColor: sbg }]}>
            <AppText variant="sm" weight="bold" color={sc}>{sl}</AppText>
          </View>
        </View>

        <View style={s.detailRow}>
          <View style={s.detailItem}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(selected.total_amount)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng tiền</AppText>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailItem}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{totalItems}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Mặt hàng</AppText>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailItem}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{receivedItems}/{totalItems}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã nhập</AppText>
          </View>
        </View>

        {/* Items */}
        {selected.items?.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Chi tiết mặt hàng PO</AppText>
            {selected.items.map((it: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }} numberOfLines={1}>
                  {it.raw_material_name || it.raw_material_id?.slice(0, 8)}
                </AppText>
                <AppText variant="sm" color={colors.text.secondary}>
                  {it.quantity} × {formatVND(it.unit_price)}
                </AppText>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {selected.status !== 'received' && selected.status !== 'cancelled' && (
          <TouchableOpacity
            onPress={() => { setShowReceive(true); }}
            style={[s.panelBtn, { backgroundColor: colors.brand.primary, justifyContent: 'center', marginTop: 4 }]}
          >
            <Icon name="package-down" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Nhập kho tự động</AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Card ──
  const renderCard = (item: any) => {
    const sc = STATUS_COLOR[item.status] || colors.text.muted;
    const sbg = STATUS_BG[item.status] || colors.surface.app;
    const sl = STATUS_LABEL[item.status] || item.status;
    const isSelected = selectedPo?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedPo(isSelected ? null : item)}
        style={[s.card, isSelected && { backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>{item.po_number}</AppText>
              <View style={[s.badge, { backgroundColor: sbg }]}>
                <AppText variant="sm" weight="bold" color={sc}>{sl}</AppText>
              </View>
            </View>
            <AppText variant="sm" color={colors.text.muted} numberOfLines={1} style={{ marginTop: 2 }}>{item.supplier_name || '—'}</AppText>
          </View>
        </View>

        <View style={s.cardStats}>
          <View style={s.cardStatItem}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(item.total_amount)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng tiền</AppText>
          </View>
          <View style={s.cardStatItem}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{item.items?.length || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Mặt hàng</AppText>
          </View>
          <View style={s.cardStatItem}>
            <AppText variant="sm" color={colors.text.secondary}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Ngày lập</AppText>
          </View>
        </View>

        {item.status === 'draft' && (
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn}>
              <Icon name="send" size={14} color={colors.brand.primary} />
              <AppText variant="sm" color={colors.brand.primary}>Gửi đơn PO</AppText>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilters = () => (
    <View style={s.filterRow}>
      {statuses.map(statusKey => (
        <TouchableOpacity
          key={statusKey}
          onPress={() => setStatusFilter(statusKey)}
          style={[s.chip, statusFilter === statusKey ? s.chipActive : null]}
        >
          <AppText variant="sm" color={statusFilter === statusKey ? colors.brand.primary : colors.text.secondary}>
            {statusKey === 'all' ? 'Tất cả' : STATUS_LABEL[statusKey] || statusKey}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderList = () => {
    if (loading) return <TableSkeleton rowCount={5} />;
    return (
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        key={`cols-${numCols}`}
        numColumns={numCols}
        renderItem={({ item }) => renderCard(item as any)}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 4, gap: 8 }}
        columnWrapperStyle={numCols > 1 ? { gap: 8, marginBottom: 6 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        ListHeaderComponent={renderFilters}
        ListEmptyComponent={<EmptyState icon="clipboard-text-off" title="Chưa có đơn nhập hàng" subtitle='Nhấn "Tạo PO" để lập đơn đầu tiên' />}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {renderList()}
          </View>
          <View style={{ flex: 0.45 }}>
            {selected ? renderDetail() : (
              <View style={[s.panelBox, { alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 8 }]}>
                <Icon name="hand-pointing-up" size={32} color={colors.icon.muted} />
                <AppText variant="sm" color={colors.text.muted}>Chọn một đơn để xem chi tiết</AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          {renderList()}
        </View>
      )}

      {!isWide && <FAB onPress={() => setShowForm(true)} />}

      <POForm
        visible={showForm}
        suppliers={suppliers}
        materials={materials}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
      {selected && (
        <ReceiveModal
          visible={showReceive}
          po={selected}
          onClose={() => { setShowReceive(false); setSelectedPo(null); }}
          onSaved={() => { setShowReceive(false); setSelectedPo(null); load(); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 6, paddingVertical: 6, flexWrap: 'wrap', marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: shape.radius.sm, backgroundColor: colors.surface.card },
  chipActive: { backgroundColor: colors.brand.primaryBg },

  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, marginBottom: 8 },
  cardTop: { marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.radius.sm },

  cardStats: { flexDirection: 'row', gap: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 6 },
  cardStatItem: { flex: 1, alignItems: 'center' },

  actionRow: { flexDirection: 'row', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8 },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelIconBox: { width: 36, height: 36, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },

  detailRow: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  detailItem: { flex: 1, alignItems: 'center' },
  detailDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
});
