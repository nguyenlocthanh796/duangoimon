"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import POForm from '../../lib/components/purchaseOrders/POForm';
import ReceiveModal from '../../lib/components/purchaseOrders/ReceiveModal';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';
function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', sent: 'Đã gửi', confirmed: 'Xác nhận', received: 'Đã nhận', cancelled: 'Hủy',
};
const STATUS_COLOR: Record<string, string> = {
  draft: '#94A3B8', sent: '#3B82F6', confirmed: '#16A34A', received: '#0D9488', cancelled: '#DC2626',
};
const STATUS_BG: Record<string, string> = {
  draft: '#F1F5F9', sent: '#EFF6FF', confirmed: '#DCFCE7', received: '#F0FDFA', cancelled: '#FEE2E2',
};
const STATUS_ORDER: Record<string, number> = {
  draft: 0, sent: 1, confirmed: 2, received: 3, cancelled: 4,
};

export default function POScreen() {
  const { openSidebar } = useSidebar();
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
    } catch (e) { console.error('Failed to load', e); }
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

  const stats = useMemo(() => ({
    total: pos.length,
    draft: pos.filter(p => p.status === 'draft').length,
    pending: pos.filter(p => p.status === 'sent' || p.status === 'confirmed').length,
    received: pos.filter(p => p.status === 'received').length,
  }), [pos]);

  const numCols = useMemo(() => {
    if (!isWide) return 1;
    return calcGridCols(containerWidth, 300, hPad, gutter);
  }, [isWide, containerWidth, hPad, gutter]);

  const statuses = ['all', 'draft', 'sent', 'confirmed', 'received', 'cancelled'];

  // ── Detail panel ──
  const renderDetail = () => {
    if (!selected) return null;
    const sc = STATUS_COLOR[selected.status] || '#94A3B8';
    const sbg = STATUS_BG[selected.status] || '#F1F5F9';
    const sl = STATUS_LABEL[selected.status] || selected.status;
    const supplier = suppliers.find(s => s.id === selected.supplier_id);
    const totalItems = selected.items?.length || 0;
    const receivedItems = selected.items?.filter((it: any) => it.received_quantity > 0)?.length || 0;

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={[s.panelIconBox, { backgroundColor: sbg }]}>
            <Icon name="clipboard-text" size={20} color={sc} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle}>{selected.po_number}</Text>
            <Text style={s.panelSub}>{supplier?.name || selected.supplier_name || '—'}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: sbg }]}>
            <Text style={{ ...font.micro, fontWeight: '700', color: sc }}>{sl}</Text>
          </View>
        </View>

        <View style={s.detailRow}>
          <View style={s.detailItem}>
            <Text style={s.detailValue}>{formatVND(selected.total_amount)}</Text>
            <Text style={s.detailLabel}>Tổng</Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailItem}>
            <Text style={s.detailValue}>{totalItems}</Text>
            <Text style={s.detailLabel}>Mặt hàng</Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailItem}>
            <Text style={s.detailValue}>{receivedItems}/{totalItems}</Text>
            <Text style={s.detailLabel}>Đã nhập</Text>
          </View>
        </View>

        {/* Items */}
        {selected.items?.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8 }}>
            <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 4 }}>Chi tiết</Text>
            {selected.items.map((it: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ ...font.caption, color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                  {it.raw_material_name || it.raw_material_id?.slice(0, 8)}
                </Text>
                <Text style={{ ...font.caption, color: colors.text.muted }}>
                  {it.quantity} × {formatVND(it.unit_price)}
                </Text>
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
            <Icon name="package-down" size={16} color="#fff" />
            <Text style={s.panelBtnText}>Nhập kho</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Card ──
  const renderCard = (item: any) => {
    const sc = STATUS_COLOR[item.status] || '#94A3B8';
    const sbg = STATUS_BG[item.status] || '#F1F5F9';
    const sl = STATUS_LABEL[item.status] || item.status;
    const isSelected = selectedPo?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedPo(isSelected ? null : item)}
        style={[s.card, isSelected && { borderColor: sc }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.cardPoNum}>{item.po_number}</Text>
              <View style={[s.badge, { backgroundColor: sbg }]}>
                <Text style={{ ...font.micro, fontWeight: '700', color: sc }}>{sl}</Text>
              </View>
            </View>
            <Text style={s.cardSupplier} numberOfLines={1}>{item.supplier_name || '—'}</Text>
          </View>
        </View>

        <View style={s.cardStats}>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{formatVND(item.total_amount)}</Text>
            <Text style={s.cardStatLabel}>Tổng</Text>
          </View>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{item.items?.length || 0}</Text>
            <Text style={s.cardStatLabel}>Mặt hàng</Text>
          </View>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
            <Text style={s.cardStatLabel}>Ngày</Text>
          </View>
        </View>

        {item.status === 'draft' && (
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn}>
              <Icon name="send" size={14} color={colors.brand.primary} />
              <Text style={{ ...font.micro, color: colors.brand.primary }}>Gửi</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={filtered} keyExtractor={item => item.id}
        key={`cols-${numCols}`}
        numColumns={numCols}
        renderItem={({ item }) => renderCard(item as any)}
        contentContainerStyle={{ padding: 4, gap: 8 }}
        columnWrapperStyle={numCols > 1 ? { gap: 8, marginBottom: 8 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        ListEmptyComponent={<EmptyState icon="clipboard-text-off" title="Chưa có đơn nhập hàng" subtitle='Nhấn "Tạo PO" để tạo đơn đầu tiên' />}
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Đơn nhập hàng"
        subtitle={`${stats.total} đơn · ${stats.draft} nháp, ${stats.pending} chờ nhập`}
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={load} style={s.headerBtn}>
              <Icon name="refresh" size={18} color={colors.icon.default} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              {isWide && <Text style={s.addBtnText}>Tạo PO</Text>}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatItem icon="clipboard-text" label="Tổng" value={stats.total} />
        <View style={s.barDivider} />
        <StatItem icon="clock-outline" label="Nháp" value={stats.draft} valueColor={STATUS_COLOR.draft} />
        <View style={s.barDivider} />
        <StatItem icon="send" label="Chờ xử lý" value={stats.pending} valueColor={STATUS_COLOR.sent} />
        <View style={s.barDivider} />
        <StatItem icon="package-down" label="Đã nhập" value={stats.received} valueColor={STATUS_COLOR.received} />
      </View>

      {/* Status filter */}
      <View style={s.filterRow}>
        {statuses.map(statusKey => (
          <TouchableOpacity key={statusKey} onPress={() => setStatusFilter(statusKey)}
            style={[s.chip, statusFilter === statusKey ? { backgroundColor: colors.brand.primary } : null]}>
            <Text style={[s.chipText, statusFilter === statusKey ? { color: '#fff' } : null]}>
              {statusKey === 'all' ? 'Tất cả' : STATUS_LABEL[statusKey] || statusKey}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            {renderList()}
          </View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, paddingTop: 8, paddingLeft: 8, paddingRight: 12 }}>
            {selected ? renderDetail() : (
              <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
                <Icon name="hand-pointing-up" size={36} color={colors.text.muted} />
                <Text style={{ ...font.body, color: colors.text.muted }}>Chọn đơn để xem chi tiết</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          {renderList()}
          {/* FAB */}
          <TouchableOpacity onPress={() => setShowForm(true)} style={s.fab}>
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </>
      )}

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
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value, valueColor }: { icon: string; label: string; value: string | number; valueColor?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={colors.brand.primary} />
      <View>
        <Text style={[s.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  headerBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },

  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  filterRow: { flexDirection: 'row', gap: 4, padding: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { ...font.micro, fontWeight: '600', color: colors.text.muted },
  chipTextActive: { color: '#fff' },

  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border.light },
  cardTop: { marginBottom: 6 },
  cardPoNum: { ...font.body, fontWeight: '700', color: colors.text.primary },
  cardSupplier: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: shape.radius.full },

  cardStats: { flexDirection: 'row', gap: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 6 },
  cardStatItem: { flex: 1, alignItems: 'center' },
  cardStatValue: { ...font.caption, fontWeight: '700', color: colors.text.primary },
  cardStatLabel: { ...font.micro, color: colors.text.muted },

  actionRow: { flexDirection: 'row', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: shape.radius.sm },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border.light, gap: 8 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelIconBox: { width: 40, height: 40, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelSub: { ...font.caption, color: colors.text.muted, marginTop: 1 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelBtnText: { ...font.caption, color: '#fff', fontWeight: '700' },

  detailRow: { flexDirection: 'row', gap: 8 },
  detailItem: { flex: 1, alignItems: 'center' },
  detailValue: { ...font.bodySmall, fontWeight: '900', color: colors.text.primary },
  detailLabel: { ...font.micro, color: colors.text.muted },
  detailDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 4 },

  separator: { width: 1, backgroundColor: colors.border.light },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});

