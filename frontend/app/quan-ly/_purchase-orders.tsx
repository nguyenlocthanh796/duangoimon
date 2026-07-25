import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import EmptyState from '../../lib/components/ui/EmptyState';
import POForm from '../../lib/components/purchaseOrders/POForm';
import ReceiveModal from '../../lib/components/purchaseOrders/ReceiveModal';
import { request } from '../../lib/api/client';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi PO',
  partial: 'Nhập một phần',
  received: 'Đã nhập kho',
  cancelled: 'Đã hủy',
};

const STATUS_COLOR: Record<string, string> = {
  draft: colors.text.muted,
  sent: colors.brand.primary,
  partial: colors.status.warning,
  received: colors.status.success,
  cancelled: colors.status.danger,
};

const STATUS_BG: Record<string, string> = {
  draft: colors.surface.app,
  sent: colors.brand.primaryBg,
  partial: '#FEF3C7',
  received: '#ECFDF5',
  cancelled: '#FEE2E2',
};

export default function PurchaseOrdersScreen() {
  const { isWide } = useResponsive();
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPo, setSelectedPo] = useState<any | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [posRes, supRes, matRes]: any[] = await Promise.all([
        request('/api/v1/quan-ly/purchase-orders').catch(() => []),
        request('/api/v1/quan-ly/suppliers').catch(() => []),
        request('/api/v1/quan-ly/raw-materials').catch(() => []),
      ]);

      const pos = Array.isArray(posRes) ? posRes : (posRes?.items || []);
      const sups = Array.isArray(supRes) ? supRes : (supRes?.items || []);
      const mats = Array.isArray(matRes) ? matRes : (matRes?.items || []);

      setOrders(pos);
      setSuppliers(sups);
      setRawMaterials(mats);

      if (pos.length > 0 && !selectedPo) {
        setSelectedPo(pos[0]);
      }
    } catch { /* ignore */ } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [selectedPo]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const openAdd = () => {
    setShowCreate(true);
  };

  const renderDetailPanel = () => {
    if (!selectedPo) {
      return (
        <View style={s.panelBox}>
          <View style={s.panelHeader}>
            <Icon name="file-document-outline" size={18} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.text.primary}>Chi tiết đơn PO</AppText>
          </View>
          <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn 1 đơn nhập kho để xem chi tiết
          </AppText>
        </View>
      );
    }

    const po = selectedPo;
    const sc = STATUS_COLOR[po.status] || colors.text.muted;
    const sbg = STATUS_BG[po.status] || colors.surface.app;
    const sl = STATUS_LABEL[po.status] || po.status;

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{po.po_number}</AppText>
            <AppText variant="sm" color={colors.text.muted}>
              {new Date(po.created_at).toLocaleDateString('vi-VN')}
            </AppText>
          </View>
          <View style={[s.badge, { backgroundColor: sbg }]}>
            <AppText variant="sm" weight="bold" color={sc}>{sl}</AppText>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <AppText variant="sm" color={colors.text.secondary}>Nhà cung cấp: <AppText variant="sm" weight="bold" color={colors.text.primary}>{po.supplier_name || '—'}</AppText></AppText>
          <AppText variant="sm" color={colors.text.secondary}>Tổng tiền: <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(po.total_amount)}</AppText></AppText>
          {po.note ? <AppText variant="sm" color={colors.text.secondary}>Ghi chú: {po.note}</AppText> : null}
        </View>

        <View style={s.panelDivider} />

        <AppText variant="sm" weight="bold" color={colors.text.primary}>Danh sách mặt hàng ({po.items?.length || 0})</AppText>
        <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
          {(po.items || []).map((it: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="sm" weight="bold" color={colors.text.primary}>{it.material_name || it.material_id}</AppText>
                <AppText variant="sm" color={colors.text.muted}>
                  Đơn giá: {formatVND(it.unit_price)} / {it.unit}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="sm" weight="bold" color={colors.text.primary}>
                  {it.quantity} {it.unit}
                </AppText>
                <AppText variant="sm" color={colors.brand.primary}>
                  {formatVND(it.total_price || (it.quantity * it.unit_price))}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        {po.status !== 'received' && po.status !== 'cancelled' && (
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

  const renderCard = ({ item }: { item: any }) => {
    const sc = STATUS_COLOR[item.status] || colors.text.muted;
    const sbg = STATUS_BG[item.status] || colors.surface.app;
    const sl = STATUS_LABEL[item.status] || item.status;
    const isSelected = selectedPo?.id === item.id;

    if (!isWide) {
      // 📱 Facebook Mobile Feed Card (Full Width)
      return (
        <View style={s.itemMobile}>
          <TouchableOpacity style={s.cardHeaderRow} onPress={() => setSelectedPo(isSelected ? null : item)} activeOpacity={0.8}>
            <View style={[s.avatarCircle, { backgroundColor: sbg }]}>
              <Icon name="file-document-outline" size={20} color={sc} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="md" weight="bold" color="#050505">{item.po_number}</AppText>
                <View style={[s.badge, { backgroundColor: sbg }]}>
                  <AppText variant="sm" weight="bold" color={sc}>{sl}</AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <AppText variant="sm" color="#65676B">NCC: {item.supplier_name || '—'}</AppText>
                <AppText variant="sm" color="#65676B">· {item.items?.length || 0} mặt hàng</AppText>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 }}>
            <AppText variant="sm" color="#65676B">Ngày lập: {new Date(item.created_at).toLocaleDateString('vi-VN')}</AppText>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(item.total_amount)}</AppText>
          </View>

          <View style={s.cardActionDivider} />

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
            <TouchableOpacity style={s.panelBtnSecondary} onPress={() => setSelectedPo(item)}>
              <Icon name="eye-outline" size={14} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Xem chi tiết</AppText>
            </TouchableOpacity>

            {item.status !== 'received' && item.status !== 'cancelled' && (
              <TouchableOpacity style={s.panelBtnPrimary} onPress={() => { setSelectedPo(item); setShowReceive(true); }}>
                <Icon name="package-down" size={14} color={colors.text.inverse} />
                <AppText variant="sm" weight="bold" color={colors.text.inverse}>Nhập kho</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    // 💻 Wide Screen Card
    return (
      <TouchableOpacity
        onPress={() => setSelectedPo(isSelected ? null : item)}
        style={[s.cardWide, isSelected && { backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="md" weight="bold" color="#050505">{item.po_number}</AppText>
              <View style={[s.badge, { backgroundColor: sbg }]}>
                <AppText variant="sm" weight="bold" color={sc}>{sl}</AppText>
              </View>
            </View>
            <AppText variant="sm" color={colors.text.muted} numberOfLines={1} style={{ marginTop: 2 }}>{item.supplier_name || '—'}</AppText>
          </View>
        </View>

        <View style={s.cardStats}>
          <View style={s.cardStatItem}>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(item.total_amount)}</AppText>
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
      </TouchableOpacity>
    );
  };

  const statuses = ['all', 'draft', 'sent', 'partial', 'received', 'cancelled'];

  const renderFilters = () => (
    <View style={{ marginVertical: 4, marginBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {statuses.map(statusKey => {
          const active = statusFilter === statusKey;
          const label = statusKey === 'all' ? 'Tất cả' : STATUS_LABEL[statusKey] || statusKey;
          return (
            <TouchableOpacity
              key={statusKey}
              onPress={() => setStatusFilter(statusKey)}
              style={[s.chip, active && s.chipActive]}
            >
              <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={s.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{orders.length} đơn PO</AppText>
          <TouchableOpacity onPress={openAdd} style={s.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo PO</AppText>
          </TouchableOpacity>
        </View>
      )}

      {renderFilters()}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 80 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
              ListEmptyComponent={loading ? <TableSkeleton rowCount={5} /> : <EmptyState icon="clipboard-text-off" title="Chưa có đơn nhập hàng" subtitle='Nhấn "Tạo PO" để lập đơn đầu tiên' />}
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          ListEmptyComponent={loading ? <TableSkeleton rowCount={5} /> : <EmptyState icon="clipboard-text-off" title="Chưa có đơn nhập hàng" subtitle='Nhấn "Tạo PO" để lập đơn đầu tiên' />}
        />
      )}

      <POForm
        visible={showCreate}
        suppliers={suppliers}
        materials={rawMaterials}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); loadData(); }}
      />

      <ReceiveModal
        visible={showReceive}
        po={selectedPo}
        onClose={() => setShowReceive(false)}
        onSaved={() => { setShowReceive(false); loadData(); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Filter chips */
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* 💻 Wide Screen Card */
  cardWide: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  cardStats: { flexDirection: 'row', backgroundColor: colors.surface.app, borderRadius: 8, padding: 8, justifyContent: 'space-around' },
  cardStatItem: { alignItems: 'center' },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.surface.app },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
});
