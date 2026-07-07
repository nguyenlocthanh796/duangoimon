"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import POForm from '../../lib/components/purchaseOrders/POForm';
import ReceiveModal from '../../lib/components/purchaseOrders/ReceiveModal';

const API = '/api/v1/quan-ly';

function formatVND(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', sent: 'Đã gửi', confirmed: 'Xác nhận', received: 'Đã nhận', cancelled: 'Hủy',
};
const STATUS_COLOR: Record<string, string> = {
  draft: '#94A3B8', sent: '#3B82F6', confirmed: '#16A34A', received: '#0D9488', cancelled: '#DC2626',
};
const STATUS_BG: Record<string, string> = {
  draft: '#F1F5F9', sent: '#EFF6FF', confirmed: '#DCFCE7', received: '#F0FDFA', cancelled: '#FEE2E2',
};

export default function POScreen() {
  const { openSidebar } = useSidebar();
  const [pos, setPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [poData, supData, matData] = await Promise.all([
        request<any[]>(API + '/purchase-orders'),
        request<any[]>(API + '/suppliers'),
        request<any[]>(API + '/raw-materials'),
      ]);
      setPos(poData);
      setSuppliers(supData);
      setMaterials(matData);
    } catch (e) {
      console.error('Failed to load', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: any }) => {
    const sc = STATUS_COLOR[item.status] || '#94A3B8';
    const sbg = STATUS_BG[item.status] || '#F1F5F9';
    const sl = STATUS_LABEL[item.status] || item.status;
    return (
      <TouchableOpacity onPress={() => setSelectedPo(item)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={{ ...font.h3, color: colors.text.primary }}>{item.po_number}</Text>
          <View style={[styles.badge, { backgroundColor: sbg }]}>
            <Text style={[styles.badgeText, { color: sc }]}>{sl}</Text>
          </View>
        </View>
        <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>{item.supplier_name}</Text>
        <View style={styles.cardStats}>
          <Text style={{ ...font.caption, color: colors.text.muted }}>{formatVND(item.total_amount)}</Text>
          <Text style={{ ...font.caption, color: colors.text.muted }}>
            {item.items?.length || 0} items
          </Text>
        </View>
        {selectedPo?.id === item.id && item.status !== 'received' && item.status !== 'cancelled' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => { setShowReceive(true); setSelectedPo(item); }}
              style={styles.receiveBtn}
            >
              <Icon name="package-down" size={16} color={colors.text.inverse} />
              <Text style={{ ...font.tab, color: colors.text.inverse }}>Nhập kho</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <ScreenHeader
        title="Đơn nhập hàng"
        subtitle={`${pos.length} đơn`}
        onMenuPress={openSidebar}
        right={
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={{ color: colors.text.inverse, ...font.tab }}>Tạo PO</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="clipboard-text-off" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có đơn nào</Text>
            </View>
          }
        />
      )}

      <POForm
        visible={showForm}
        suppliers={suppliers}
        materials={materials}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
      {selectedPo && (
        <ReceiveModal
          visible={showReceive}
          po={selectedPo}
          onClose={() => { setShowReceive(false); setSelectedPo(null); }}
          onSaved={() => { setShowReceive(false); setSelectedPo(null); load(); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.brand.primary },
  card: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { ...font.badge, fontWeight: '700' },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  receiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});

