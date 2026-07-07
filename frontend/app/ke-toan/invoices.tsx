import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Invoice } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import InvoiceFormContent from '../../lib/components/ke-toan/InvoiceFormContent';
import InvoiceCard from '../../lib/components/ke-toan/InvoiceCard';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };

const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_COLOR: Record<string, string> = {
  moi: '#F59E0B',
  da_xuat: '#10B981',
  huy: '#EF4444',
};
const STATUS_BG: Record<string, string> = {
  moi: '#FFFBEB',
  da_xuat: '#ECFDF5',
  huy: '#FEF2F2',
};

type InvoiceFormState = {
  order_id: string;
  buyer_name: string;
  buyer_tax_code: string;
  vat_rate: string;
};

const INITIAL_FORM: InvoiceFormState = {
  order_id: '',
  buyer_name: '',
  buyer_tax_code: '',
  vat_rate: '10',
};

export default function InvoicesScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof InvoiceFormState, string>>>({});
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Order picker state
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể tải hóa đơn';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof InvoiceFormState, string>> = {};
    if (!form.order_id.trim()) newErrors.order_id = 'Vui lòng nhập mã đơn hàng';
    if (!form.buyer_name.trim()) newErrors.buyer_name = 'Vui lòng nhập tên người mua';
    const rate = parseFloat(form.vat_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) newErrors.vat_rate = 'VAT từ 0–100%';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createInvoice({
        order_id: form.order_id.trim(),
        buyer_name: form.buyer_name.trim(),
        buyer_tax_code: form.buyer_tax_code.trim() || undefined,
        vat_rate: parseFloat(form.vat_rate),
      });
      setShowForm(false);
      setForm(INITIAL_FORM);
      setErrors({});
      loadInvoices();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Tạo hóa đơn thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = (id: string, invoiceNumber: string) => {
    Alert.alert(
      'Xuất hóa đơn',
      `Bạn muốn xuất hóa đơn ${invoiceNumber}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xuất hóa đơn',
          onPress: async () => {
            setExportingId(id);
            try {
              await api.exportInvoice(id);
              loadInvoices();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Xuất hóa đơn thất bại';
              Alert.alert('Lỗi', msg);
            } finally {
              setExportingId(null);
            }
          },
        },
      ]
    );
  };

  const openForm = async () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setShowForm(true);
    // Load paid orders for the picker
    setOrdersLoading(true);
    try {
      const orders: any[] = await api.getOrders();
      const paid = orders.filter((o: any) => o.status === 'da_thanh_toan' || o.status === 'completed');
      setPaidOrders(paid.map((o: any) => ({
        id: o.id,
        table_name: o.table_name || `Bàn ${(o.table_id || '').slice(0, 4)}`,
        total: o.total_amount ?? o.total,
        created_at: o.created_at,
      })));
    } catch {
      setPaidOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Invoice }) => (
    <InvoiceCard item={item} exportingId={exportingId} onExport={handleExport} />
  );

  const renderEmpty = () => (
    <EmptyState
      icon="receipt"
      title="Chưa có hóa đơn"
      subtitle="Nhấn + để tạo hóa đơn VAT đầu tiên."
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Hóa đơn VAT"
        subtitle={`${invoices.length} hóa đơn`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        right={
          <TouchableOpacity onPress={openForm} style={styles.addHeaderBtn} accessibilityLabel="Tạo hóa đơn">
            <Icon name="plus" size={18} color="#F97316" />
            <Text style={styles.addHeaderText}>Tạo HĐ</Text>
          </TouchableOpacity>
        }
      />

      {/* Stats strip */}
      {invoices.length > 0 && (
        <View style={styles.statsStrip}>
          {(['moi', 'da_xuat', 'huy'] as const).map((s) => {
            const count = invoices.filter(i => i.status === s).length;
            if (count === 0) return null;
            return (
              <View key={s} style={styles.statItem}>
                <Text style={[styles.statCount, { color: STATUS_COLOR[s] }]}>{count}</Text>
                <Text style={styles.statLabel}>{STATUS_LABEL[s]}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Invoice List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(inv) => inv.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, invoices.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadInvoices(true)}
              tintColor="#F97316"
              colors={['#F97316']}
            />
          }
        />
      )}

      <FAB onPress={openForm} />

      <FormModal
        visible={showForm}
        title="Tạo hóa đơn VAT"
        onClose={() => { setShowForm(false); setErrors({}); }}
        onSave={handleCreate}
        saveLabel="Tạo hóa đơn"
        saving={submitting}
      >
        <InvoiceFormContent
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          paidOrders={paidOrders}
          ordersLoading={ordersLoading}
        />
      </FormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  addHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#F97316',
  },
  addHeaderText: { fontSize: 13, fontWeight: '700', color: '#F97316' },

  // Stats
  statsStrip: {
    flexDirection: 'row', gap: 0,
    backgroundColor: '#fff',
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  statItem: { marginRight: 24, alignItems: 'center' },
  statCount: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 14 },
});
