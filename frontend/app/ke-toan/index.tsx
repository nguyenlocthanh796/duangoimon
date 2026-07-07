import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Transaction } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import TransactionFormContent from '../../lib/components/ke-toan/TransactionFormContent';

type FilterType = null | 'thu' | 'chi';

type FormState = {
  type: 'thu' | 'chi';
  category: string;
  amount: string;
  note: string;
};

const INITIAL_FORM: FormState = { type: 'thu', category: '', amount: '', note: '' };

function formatAmount(n: number) {
  return n.toLocaleString('vi-VN') + '₫';
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function KeToanScreen() {
  const { openSidebar } = useSidebar();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const loadTxs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getTransactions(filter ?? undefined);
      setTxs(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể tải dữ liệu';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { loadTxs(); }, [loadTxs]);

  const totalThu = txs.filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0);
  const totalChi = txs.filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.category.trim()) newErrors.category = 'Vui lòng nhập danh mục';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) newErrors.amount = 'Số tiền phải lớn hơn 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createTransaction({
        type: form.type,
        category: form.category.trim(),
        amount: parseFloat(form.amount),
        note: form.note.trim(),
      });
      setShowForm(false);
      setForm(INITIAL_FORM);
      setErrors({});
      loadTxs();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ghi nhận thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setShowForm(true);
  };

  const renderSummaryBar = () => {
    const showThu = filter !== 'chi';
    const showChi = filter !== 'thu';
    return (
      <View style={styles.summaryBar}>
        {showThu && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
            <View>
              <Text style={styles.summaryLabel}>Tổng Thu</Text>
              <Text style={[styles.summaryAmount, { color: '#10B981' }]}>+{formatAmount(totalThu)}</Text>
            </View>
          </View>
        )}
        {showThu && showChi && <View style={styles.summaryDivider} />}
        {showChi && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: '#EF4444' }]} />
            <View>
              <Text style={styles.summaryLabel}>Tổng Chi</Text>
              <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>-{formatAmount(totalChi)}</Text>
            </View>
          </View>
        )}
        {showThu && showChi && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#6366F1' }]} />
              <View>
                <Text style={styles.summaryLabel}>Còn lại</Text>
                <Text style={[styles.summaryAmount, { color: totalThu - totalChi >= 0 ? '#10B981' : '#EF4444' }]}>
                  {formatAmount(totalThu - totalChi)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.item}>
      <View style={[styles.typeIcon, { backgroundColor: item.type === 'thu' ? '#ECFDF5' : '#FEF2F2' }]}>
        <Icon
          name={item.type === 'thu' ? 'arrow-down' : 'arrow-up'}
          size={18}
          color={item.type === 'thu' ? '#10B981' : '#EF4444'}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.itemNote} numberOfLines={1}>
          {item.note?.trim() ? item.note : (item.category || 'Không ghi chú')}
        </Text>
        <Text style={styles.itemMeta}>
          {item.category || 'Khác'}
          {item.created_at ? ' · ' + formatDate(item.created_at) : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: item.type === 'thu' ? '#10B981' : '#EF4444' }]}>
        {item.type === 'thu' ? '+' : '-'}{formatAmount(item.amount)}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="wallet-outline"
      title="Chưa có giao dịch"
      subtitle={filter === 'thu' ? 'Không có khoản thu nào.' : filter === 'chi' ? 'Không có khoản chi nào.' : 'Nhấn + để ghi nhận giao dịch đầu tiên.'}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Kế Toán"
        subtitle="Quản lý thu chi"
        onMenuPress={openSidebar}
        right={
          <TouchableOpacity onPress={openForm} style={styles.addHeaderBtn} accessibilityLabel="Ghi nhận giao dịch">
            <Icon name="plus" size={18} color="#F97316" />
            <Text style={styles.addHeaderText}>Ghi nhận</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {([null, 'thu', 'chi'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f ?? 'all'}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            accessibilityLabel={f ? (f === 'thu' ? 'Lọc thu' : 'Lọc chi') : 'Tất cả'}
          >
            {f === 'thu' && <Icon name="arrow-down" size={13} color={filter === f ? '#fff' : '#10B981'} style={{ marginRight: 3 }} />}
            {f === 'chi' && <Icon name="arrow-up" size={13} color={filter === f ? '#fff' : '#EF4444'} style={{ marginRight: 3 }} />}
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f ? (f === 'thu' ? 'Thu' : 'Chi') : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Bar */}
      {txs.length > 0 && renderSummaryBar()}

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={txs}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, txs.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTxs(true)}
              tintColor="#F97316"
              colors={['#F97316']}
            />
          }
        />
      )}

      <FAB onPress={openForm} />

      <FormModal
        visible={showForm}
        title="Ghi nhận giao dịch"
        onClose={() => { setShowForm(false); setErrors({}); }}
        onSave={handleAdd}
        saveLabel={form.type === 'thu' ? 'Thêm thu' : 'Thêm chi'}
        saving={submitting}
      >
        <TransactionFormContent
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
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

  // Filter
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#fff' },

  // Summary
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryDot: { width: 10, height: 10, borderRadius: 5 },
  summaryLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  summaryAmount: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#E2E8F0', marginHorizontal: 8 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 14 },

  // Item
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  typeIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  itemNote: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  itemMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800', marginLeft: 8 },

});
