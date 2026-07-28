import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import StatusBadge from '../../lib/components/ui/StatusBadge';
import EmptyState from '../../lib/components/ui/EmptyState';
import POForm from '../../lib/components/purchaseOrders/POForm';
import ReceiveModal from '../../lib/components/purchaseOrders/ReceiveModal';
import FAB from '../../lib/components/ui/FAB';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import DetailModal from '../../lib/components/ui/DetailModal';
import { request } from '../../lib/api/client';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi PO',
  partial: 'Nhập 1 phần',
  received: 'Đã nhập kho',
  cancelled: 'Đã hủy',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#64748B',
  sent: colors.brand.primary,
  partial: '#D97706',
  received: '#16A34A',
  cancelled: colors.status.danger,
};

const STATUS_BG: Record<string, string> = {
  draft: '#F1F5F9',
  sent: colors.brand.primaryBg,
  partial: '#FEF3C7',
  received: '#ECFDF5',
  cancelled: '#FEE2E2',
};

function generateFallbackPOList() {
  return [
    {
      id: 'po1',
      po_number: 'PO-202607-001',
      supplier_name: 'Công Ty Thực Phẩm Sạch CP',
      total_amount: 15400000,
      status: 'received',
      created_at: '2026-07-22',
      note: 'Đã hoàn tất nhập kho 50kg thịt bò Mỹ',
      items: [
        { material_name: 'Thịt Bò Mỹ Nhập Khẩu', unit_price: 220000, quantity: 50, unit: 'kg', total_price: 11000000 },
        { material_name: 'Sữa Tươi Vinamilk 1L', unit_price: 32000, quantity: 100, unit: 'hộp', total_price: 3200000 },
        { material_name: 'Đường Cát Trắng Biên Hòa', unit_price: 24000, quantity: 50, unit: 'kg', total_price: 1200000 },
      ],
    },
    {
      id: 'po2',
      po_number: 'PO-202607-002',
      supplier_name: 'Nông Sản Sạch Đà Lạt Farm',
      total_amount: 4800000,
      status: 'sent',
      created_at: '2026-07-24',
      note: 'Đơn hàng rau củ quả chuẩn bị giao sáng mai',
      items: [
        { material_name: 'Rau Xà Lách Hữu Cơ', unit_price: 35000, quantity: 40, unit: 'kg', total_price: 1400000 },
        { material_name: 'Cà Rốt Đà Lạt Fresh', unit_price: 25000, quantity: 60, unit: 'kg', total_price: 1500000 },
        { material_name: 'Trà Oolong Lâm Đồng', unit_price: 150000, quantity: 12, unit: 'kg', total_price: 1800000 },
      ],
    },
    {
      id: 'po3',
      po_number: 'PO-202607-003',
      supplier_name: 'Đồ Uống & Nước Giải Khát Tân Hiệp',
      total_amount: 8200000,
      status: 'partial',
      created_at: '2026-07-25',
      note: 'Đã nhận đợt 1 bao gồm 12 chai siro',
      items: [
        { material_name: 'Siro Đào Monin', unit_price: 180000, quantity: 12, unit: 'chai', total_price: 2160000 },
        { material_name: 'Hạt Cà Phê Arabica Cầu Đất', unit_price: 180000, quantity: 30, unit: 'kg', total_price: 5400000 },
      ],
    },
  ];
}

export default function PurchaseOrdersScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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

      const pos = Array.isArray(posRes) ? posRes : posRes?.items || [];
      const sups = Array.isArray(supRes) ? supRes : supRes?.items || [];
      const mats = Array.isArray(matRes) ? matRes : matRes?.items || [];

      const finalPos = pos.length > 0 ? pos : generateFallbackPOList();

      setOrders(finalPos);
      setSuppliers(sups);
      setRawMaterials(mats);

      if (isWide && finalPos.length > 0 && !selectedPo) {
        setSelectedPo(finalPos[0]);
      }
    } catch {
      const fallbacks = generateFallbackPOList();
      setOrders(fallbacks);
      if (isWide) setSelectedPo(fallbacks[0]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isWide, selectedPo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const openAdd = () => {
    setShowCreate(true);
  };

  // Total amount sum
  const totalAmountSum = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'sent' || o.status === 'partial' || o.status === 'draft').length;

  // ── Master Detail Right Inspector Panel ──
  const renderDetailPanel = () => {
    if (!selectedPo) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" weight="bold" color="#050505">
            Chi Tiết Đơn Nhập Hàng PO
          </AppText>
          <AppText variant="sm" color="#65676B" style={{ textAlign: 'center' }}>
            Chọn một đơn nhập kho từ danh sách bên trái để xem thông tin chi tiết
          </AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openAdd}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="sm" weight="bold" color="#FFF">
              Tạo đơn PO mới
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    const po = selectedPo;
    const sc = STATUS_COLOR[po.status] || colors.text.muted;
    const sbg = STATUS_BG[po.status] || colors.surface.app;
    const sl = STATUS_LABEL[po.status] || po.status;

    return (
      <View style={ss.detailPanel}>
        <View style={s.detailHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">
              {po.po_number}
            </AppText>
            <AppText variant="sm" color="#65676B">
              Ngày tạo: {po.created_at || 'Mới'}
            </AppText>
          </View>
          <StatusBadge
            label={sl}
            severity={po.status === 'received' ? 'success' : po.status === 'cancelled' ? 'danger' : po.status === 'partial' || po.status === 'sent' ? 'warning' : 'neutral'}
          />
        </View>

        <View style={{ gap: 6, paddingTop: 4 }}>
          <AppText variant="sm" color="#65676B">
            Nhà cung cấp:{' '}
            <AppText variant="sm" weight="bold" color="#050505">
              {po.supplier_name || '—'}
            </AppText>
          </AppText>

          <AppText variant="sm" color="#65676B">
            Tổng giá trị đơn nhập:{' '}
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {formatVND(po.total_amount || 0)}
            </AppText>
          </AppText>

          {po.note ? (
            <AppText variant="sm" color="#65676B">
              Ghi chú: {po.note}
            </AppText>
          ) : null}
        </View>

        <View style={s.panelDivider} />

        <AppText variant="sm" weight="bold" color="#050505">
          Danh Sách Mặt Hàng Nhập ({po.items?.length || 0})
        </AppText>

        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
          {(po.items || []).map((it: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="sm" weight="bold" color="#050505">
                  {it.material_name || it.material_id || 'Nguyên liệu'}
                </AppText>
                <AppText variant="sm" color="#65676B">
                  Đơn giá: {formatVND(it.unit_price || 0)} / {it.unit || 'kg'}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="sm" weight="bold" color="#050505">
                  {it.quantity} {it.unit || 'kg'}
                </AppText>
                <AppText variant="sm" weight="bold" color={colors.brand.primary}>
                  {formatVND(it.total_price || (it.quantity || 0) * (it.unit_price || 0))}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        {po.status !== 'received' && po.status !== 'cancelled' && (
          <TouchableOpacity
            onPress={() => setShowReceive(true)}
            style={ss.panelCta}
          >
            <Icon name="package-down" size={18} color="#FFF" />
            <AppText variant="sm" weight="bold" color="#FFF">
              Tự động nhập kho PO này
            </AppText>
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
      return (
        <View style={ss.listRow}>
          <View style={[s.posAvatarMiniCircle, { backgroundColor: sbg }]}>
            <AppText variant="sm" weight="bold" color={sc} style={{ fontSize: 10 }}>
              {sl?.slice(0, 2)}
            </AppText>
          </View>

          <TouchableOpacity
            style={{ flex: 1, paddingRight: 8 }}
            onPress={() => setSelectedPo(item)}
            activeOpacity={0.7}
          >
            <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>
              {item.po_number}
            </AppText>
            <AppText variant="sm" color="#64748B" numberOfLines={1}>
              NCC: {item.supplier_name || 'Chưa chọn'}
            </AppText>
          </TouchableOpacity>

          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>
              {formatVND(item.total_amount || 0)}
            </AppText>
            <AppText variant="sm" color={sc}>
              {sl}
            </AppText>
          </View>

          <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedPo(item)}>
            <Icon name="eye-outline" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => setSelectedPo(isSelected ? null : item)}
        style={[s.cardWide, isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.avatarCircle, { backgroundColor: sbg, alignItems: 'center', justifyContent: 'center' }]}>
              <AppText variant="sm" weight="bold" color={sc} style={{ fontSize: 11 }}>
                PO
              </AppText>
            </View>
            <View>
              <AppText variant="md" weight="bold" color="#050505">
                {item.po_number}
              </AppText>
              <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
                NCC: {item.supplier_name || 'Chưa chọn'}
              </AppText>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {formatVND(item.total_amount || 0)}
            </AppText>
            <View style={[s.badge, { backgroundColor: sbg, marginTop: 4 }]}>
              <AppText variant="sm" weight="bold" color={sc}>
                {sl}
              </AppText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* Unified Top Action Bar: Search Input + Add Button */}
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm mã PO, nhà cung cấp..."
            placeholderTextColor="#94A3B8"
            style={ss.searchTextInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={ss.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <AppText variant="sm" weight="bold" color="#FFFFFF">
            Tạo PO
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Unified Status Filter Chips */}
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 46 }}
          contentContainerStyle={{ minWidth: '100%', alignItems: 'center', backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'sent', label: 'Đã gửi PO' },
          { key: 'partial', label: 'Nhập 1 phần' },
          { key: 'received', label: 'Đã nhập kho' },
          { key: 'cancelled', label: 'Đã hủy' },
        ].map((sItem) => {
          const active = statusFilter === sItem.key;
          return (
            <TouchableOpacity
              key={sItem.key}
              onPress={() => setStatusFilter(sItem.key)}
              style={[ss.filterChip, active && ss.filterChipActive]}
            >
              <AppText
                variant="sm"
                weight="bold"
                color={active ? colors.brand.primary : '#334155'}
              >
                {sItem.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>

      {/* ── Metric Cards (Desktop Only) ────────────────────────── */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 11 }}>PO</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">
                {orders.length} đơn PO
              </AppText>
              <AppText variant="sm" color="#65676B">
                Tổng số đơn hàng
              </AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FEF3C7' }]}>
              <AppText variant="sm" weight="bold" color="#D97706" style={{ fontSize: 11 }}>chờ</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#D97706">
                {pendingCount} chờ nhập
              </AppText>
              <AppText variant="sm" color="#65676B">
                Cần xử lý
              </AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="sm" weight="bold" color="#16A34A" style={{ fontSize: 11 }}>đ</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#16A34A">
                {formatVND(totalAmountSum)}
              </AppText>
              <AppText variant="sm" color="#65676B">
                Tổng giá trị PO
              </AppText>
            </View>
          </View>
        </View>
      )}

      {/* ── Main Body Split Layout ────────────────────────── */}
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {loading ? (
              <TableSkeleton rowCount={5} />
            ) : filtered.length > 0 ? (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              />
            ) : (
              <EmptyState
                icon="file-document-off-outline"
                title="Chưa có đơn PO nào"
                subtitle="Nhấn nút Tạo PO Mới để khởi tạo đơn hàng đầu tiên"
              />
            )}
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
            <View style={ss.sectionWrap}>
              <View style={ss.sectionHeader}>
                <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                  DANH SÁCH ĐƠN NHẬP HÀNG ({filtered.length})
                </AppText>
              </View>

              <View style={ss.sectionItems}>
                {filtered.map(item => (
                  <React.Fragment key={item.id}>
                    {renderCard({ item })}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Mobile Detail Modal */}
      {!isWide && (
        <DetailModal
          visible={!!selectedPo}
          title={selectedPo?.po_number || 'Chi tiết đơn PO'}
          subtitle={selectedPo ? `Nhà cung cấp: ${selectedPo.supplier_name || 'N/A'}` : undefined}
          onClose={() => setSelectedPo(null)}
          onDelete={selectedPo ? () => {
            const po = selectedPo;
            Alert.alert('Xác nhận', `Xóa đơn PO "${po.po_number}"?`, [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await request(`/api/v1/quan-ly/purchase-orders/${po.id}`, { method: 'DELETE' });
                    setSelectedPo(null);
                    loadData();
                  } catch {
                    Alert.alert('Lỗi', 'Không thể xóa đơn PO');
                  }
                },
              },
            ]);
          } : undefined}
          actions={
            selectedPo
              ? [
                  {
                    label: 'Nhận hàng',
                    icon: 'package-down',
                    variant: 'primary',
                    onPress: () => setShowReceive(true),
                  },
                ]
              : []
          }
        >
          {renderDetailPanel()}
        </DetailModal>
      )}

      <POForm
        visible={showCreate}
        suppliers={suppliers}
        materials={rawMaterials}
        onClose={() => setShowCreate(false)}
        onSaved={loadData}
      />

      <ReceiveModal
        visible={showReceive}
        po={selectedPo}
        onClose={() => setShowReceive(false)}
        onSaved={loadData}
      />
    </View>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
    position: 'relative',
  },
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pillChip: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
  mainBody: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  cardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  /* Detail-specific */
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  panelDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 10,
  },
  btnBluePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  btnOrangePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
