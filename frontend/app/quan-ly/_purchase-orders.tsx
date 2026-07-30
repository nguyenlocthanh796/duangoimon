import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, Alert,
  RefreshControl, ScrollView, TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import StatusBadge from '../../lib/components/ui/StatusBadge';
import EmptyState from '../../lib/components/ui/EmptyState';
import DetailModal from '../../lib/components/ui/DetailModal';
import POForm from '../../lib/components/purchaseOrders/POForm';
import ReceiveModal from '../../lib/components/purchaseOrders/ReceiveModal';
import { request } from '../../lib/api/client';

const API = '/api/v1/quan-ly';
const STATUS_LABEL: Record<string, string> = { draft: 'Nháp', sent: 'Đã gửi PO', partial: 'Nhập 1 phần', received: 'Đã nhập kho', cancelled: 'Đã hủy' };
const STATUS_COLOR: Record<string, string> = { draft: '#64748B', sent: colors.brand.primary, partial: '#D97706', received: '#16A34A', cancelled: colors.status.danger };
const STATUS_BG: Record<string, string> = { draft: '#F1F5F9', sent: colors.brand.primaryBg, partial: '#FEF3C7', received: '#ECFDF5', cancelled: '#FEE2E2' };

function generateFallbackPOList() {
  return [
    { id: 'po1', po_number: 'PO-202607-001', supplier_name: 'Cty Thực Phẩm Sạch CP', total_amount: 15400000, status: 'received', created_at: '2026-07-22', note: 'Hoàn tất nhập kho 50kg thịt bò Mỹ', items: [{ material_name: 'Thịt Bò Mỹ', unit_price: 220000, quantity: 50, unit: 'kg', total_price: 11000000 }, { material_name: 'Sữa Vinamilk 1L', unit_price: 32000, quantity: 100, unit: 'hộp', total_price: 3200000 }, { material_name: 'Đường Cát Trắng', unit_price: 24000, quantity: 50, unit: 'kg', total_price: 1200000 }] },
    { id: 'po2', po_number: 'PO-202607-002', supplier_name: 'Nông Sản Sạch Đà Lạt', total_amount: 4800000, status: 'sent', created_at: '2026-07-24', note: 'Rau củ quả chuẩn bị giao sáng mai', items: [{ material_name: 'Rau Xà Lách', unit_price: 35000, quantity: 40, unit: 'kg', total_price: 1400000 }, { material_name: 'Cà Rốt Đà Lạt', unit_price: 25000, quantity: 60, unit: 'kg', total_price: 1500000 }, { material_name: 'Trà Oolong', unit_price: 150000, quantity: 12, unit: 'kg', total_price: 1800000 }] },
    { id: 'po3', po_number: 'PO-202607-003', supplier_name: 'Đồ Uống Tân Hiệp', total_amount: 8200000, status: 'partial', created_at: '2026-07-25', note: 'Đã nhận đợt 1 sirdo', items: [{ material_name: 'Siro Đào Monin', unit_price: 180000, quantity: 12, unit: 'chai', total_price: 2160000 }, { material_name: 'Cà Phê Arabica', unit_price: 180000, quantity: 30, unit: 'kg', total_price: 5400000 }] },
  ];
}

export default function PurchaseOrdersScreen(_props?: { isSearchOpen?: boolean }) {
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
        request(`${API}/purchase-orders`).catch(() => []),
        request(`${API}/suppliers`).catch(() => []),
        request(`${API}/raw-materials`).catch(() => []),
      ]);
      const pos = Array.isArray(posRes) ? posRes : posRes?.items || [];
      const finalPos = pos.length > 0 ? pos : generateFallbackPOList();
      setOrders(finalPos);
      setSuppliers(Array.isArray(supRes) ? supRes : supRes?.items || []);
      setRawMaterials(Array.isArray(matRes) ? matRes : matRes?.items || []);
      if (isWide && finalPos.length > 0 && !selectedPo) setSelectedPo(finalPos[0]);
    } catch {
      const fb = generateFallbackPOList();
      setOrders(fb);
      if (isWide) setSelectedPo(fb[0]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [isWide]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const totalAmountSum = orders.reduce((acc, o) => acc + (o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'sent' || o.status === 'partial' || o.status === 'draft').length;

  const getStatusInfo = (status: string) => ({
    label: STATUS_LABEL[status] || status,
    color: STATUS_COLOR[status] || colors.text.muted,
    bg: STATUS_BG[status] || colors.surface.app,
  });

  const renderDetailPanel = () => {
    if (!selectedPo) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" color="#050505">Chi Tiết Đơn Nhập PO</AppText>
          <AppText variant="md" color="#65676B" style={{ textAlign: 'center' }}>Chọn đơn để xem chi tiết</AppText>
          <TouchableOpacity style={ss.panelCta} onPress={() => setShowCreate(true)}>
            <Icon name="plus" size={18} color="#FFF" /><AppText variant="md" color="#FFF">Tạo PO mới</AppText>
          </TouchableOpacity>
        </View>
      );
    }
    const po = selectedPo;
    const si = getStatusInfo(po.status);
    return (
      <View style={ss.detailPanel}>
        <View style={s.detailHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#050505">{po.po_number}</AppText>
            <AppText variant="md" color="#65676B">Ngày: {po.created_at || 'Mới'}</AppText>
          </View>
          <StatusBadge label={si.label} severity={po.status === 'received' ? 'success' : po.status === 'cancelled' ? 'danger' : po.status === 'partial' || po.status === 'sent' ? 'warning' : 'neutral'} />
        </View>
        <View style={{ gap: 6 }}>
          <AppText variant="md" color="#65676B">NCC: <AppText variant="md" color="#050505">{po.supplier_name || '—'}</AppText></AppText>
          <AppText variant="md" color="#65676B">Tổng: <AppText variant="md" color={colors.brand.primary}>{formatVND(po.total_amount || 0)}</AppText></AppText>
          {po.note ? <AppText variant="md" color="#65676B">Ghi chú: {po.note}</AppText> : null}
        </View>
        <View style={s.panelDivider} />
        <AppText variant="md" color="#050505">Mặt hàng ({po.items?.length || 0})</AppText>
        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
          {(po.items || []).map((it: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="md" color="#050505">{it.material_name || it.material_id || 'Nguyên liệu'}</AppText>
                <AppText variant="md" color="#65676B">{formatVND(it.unit_price || 0)} / {it.unit || 'kg'}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="md" color="#050505">{it.quantity} {it.unit || 'kg'}</AppText>
                <AppText variant="md" color={colors.brand.primary}>{formatVND(it.total_price || (it.quantity || 0) * (it.unit_price || 0))}</AppText>
              </View>
            </View>
          ))}
        </ScrollView>
        {po.status !== 'received' && po.status !== 'cancelled' && (
          <TouchableOpacity onPress={() => setShowReceive(true)} style={ss.panelCta}>
            <Icon name="package-down" size={18} color="#FFF" />
            <AppText variant="md" color="#FFF">Nhập kho PO này</AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCard = ({ item: po }: { item: any }) => {
    const si = getStatusInfo(po.status);
    const isSel = selectedPo?.id === po.id;
    if (!isWide) {
      return (
        <View style={ss.listRow}>
          <View style={[s.posAvatarMiniCircle, { backgroundColor: si.bg }]}><AppText variant="md" color={si.color}>{si.label.slice(0, 2)}</AppText></View>
          <TouchableOpacity style={{ flex: 1, paddingRight: 8 }} onPress={() => setSelectedPo(po)} activeOpacity={0.7}>
            <AppText variant="md" color="#0F172A" numberOfLines={1}>{po.po_number}</AppText>
            <AppText variant="md" color="#64748B">NCC: {po.supplier_name || 'Chưa chọn'}</AppText>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="md" color={colors.brand.primary}>{formatVND(po.total_amount || 0)}</AppText>
            <AppText variant="md" color={si.color}>{si.label}</AppText>
          </View>
          <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedPo(po)}>
            <Icon name="eye-outline" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => setSelectedPo(isSel ? null : po)}
        style={[s.cardWide, isSel && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg }]} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.avatarCircle, { backgroundColor: si.bg }]}><AppText variant="md" color={si.color}>PO</AppText></View>
            <View><AppText variant="md" color="#050505">{po.po_number}</AppText><AppText variant="md" color="#65676B" style={{ marginTop: 2 }}>NCC: {po.supplier_name || 'Chưa chọn'}</AppText></View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="md" color={colors.brand.primary}>{formatVND(po.total_amount || 0)}</AppText>
            <View style={[s.badge, { backgroundColor: si.bg, marginTop: 4 }]}><AppText variant="md" color={si.color}>{si.label}</AppText></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Tìm PO, NCC..." placeholderTextColor="#94A3B8" style={ss.searchTextInput} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Icon name="close-circle" size={18} color="#94A3B8" /></TouchableOpacity>}
        </View>
        <TouchableOpacity style={ss.addBtn} onPress={() => setShowCreate(true)}>
          <Icon name="plus" size={18} color="#FFF" /><AppText variant="md" color="#FFF">Tạo PO</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 46 }} contentContainerStyle={ss.filterChipsContainer}>
        {['all', 'sent', 'partial', 'received', 'cancelled'].map((k) => (
          <TouchableOpacity key={k} onPress={() => setStatusFilter(k)}
            style={[ss.filterChip, statusFilter === k && ss.filterChipActive]}>
            <AppText variant="md" color={statusFilter === k ? colors.brand.primary : '#334155'}>
              {k === 'all' ? `Tất cả (${orders.length})` : `${STATUS_LABEL[k] || k} (${orders.filter(o => o.status === k).length})`}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}><AppText variant="md" color={colors.brand.primary}>PO</AppText></View>
            <View><AppText variant="md" color="#050505">{orders.length} đơn</AppText><AppText variant="md" color="#65676B">Tổng đơn</AppText></View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FEF3C7' }]}><AppText variant="md" color="#D97706">chờ</AppText></View>
            <View><AppText variant="md" color="#D97706">{pendingCount} chờ</AppText><AppText variant="md" color="#65676B">Cần xử lý</AppText></View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}><AppText variant="md" color="#16A34A">đ</AppText></View>
            <View><AppText variant="md" color="#16A34A">{formatVND(totalAmountSum)}</AppText><AppText variant="md" color="#65676B">Tổng giá trị</AppText></View>
          </View>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {loading ? null : filtered.length > 0 ? (
              <FlatList data={filtered} keyExtractor={(item) => item.id} renderItem={renderCard}
                contentContainerStyle={{ gap: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />} />
            ) : (
              <EmptyState icon="file-document-off-outline" title="Chưa có PO" subtitle="Nhấn Tạo PO để bắt đầu" />
            )}
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>DANH SÁCH ĐƠN NHẬP HÀNG ({filtered.length})</AppText>
            </View>
            <View style={ss.sectionItems}>
              {filtered.map(item => (<React.Fragment key={item.id}>{renderCard({ item })}</React.Fragment>))}
            </View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <DetailModal visible={!!selectedPo} title={selectedPo?.po_number || 'Chi tiết PO'}
          subtitle={selectedPo ? `NCC: ${selectedPo.supplier_name || 'N/A'}` : undefined}
          onClose={() => setSelectedPo(null)}
          onDelete={selectedPo ? () => {
            Alert.alert('Xác nhận', `Xóa đơn \"${selectedPo.po_number}\"?`, [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/purchase-orders/${selectedPo.id}`, { method: 'DELETE' }); setSelectedPo(null); loadData(); } catch { Alert.alert('Lỗi', 'Xóa thất bại'); } } },
            ]);
          } : undefined}
          actions={selectedPo ? [{ label: 'Nhận hàng', icon: 'package-down', variant: 'primary', onPress: () => setShowReceive(true) }] : []}>
          {renderDetailPanel()}
        </DetailModal>
      )}

      <POForm visible={showCreate} suppliers={suppliers} materials={rawMaterials}
        onClose={() => setShowCreate(false)} onSaved={loadData} />
      <ReceiveModal visible={showReceive} po={selectedPo}
        onClose={() => setShowReceive(false)} onSaved={loadData} />
    </View>
  );
}

const s = StyleSheet.create({
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  panelDivider: { height: 1, backgroundColor: '#F1F5F9' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 6 },
  cardWide: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  posAvatarMiniCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
});
