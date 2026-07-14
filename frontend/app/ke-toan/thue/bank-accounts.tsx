import React, { useEffect, useState, useCallback } from 'react';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api as taxApi } from '../../../lib/api';
import { toCsv, downloadText } from '../../../lib/api/csvExport';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import UnifiedHeader from '../../../lib/components/ui/UnifiedHeader';
import ScreenContainer from '../../../lib/components/ui/ScreenContainer';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import RowCard from '../../../lib/components/ke-toan/RowCard';
import StatusBadge from '../../../lib/components/ke-toan/StatusBadge';
import type { SeverityKey } from '../../../lib/components/ke-toan/StatusBadge';
import { useAuth } from '../../../lib/context/AuthContext';

const WALLETS = ['bank', 'momo', 'zalopay', 'vnpay'];

export default function BankAccountsScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const hPad = isWide ? 16 : 4;
  const { branchId } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', wallet_type: 'bank' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!branchId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await taxApi.getTaxBankAccounts(branchId);
        setAccounts(data);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được tài khoản');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!branchId) return;
    if (!form.bank_name.trim() || !form.account_number.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập tên ngân hàng & số tài khoản.');
      return;
    }
    setSubmitting(true);
    try {
      await taxApi.createTaxBankAccount({ ...form, branch_id: branchId });
      setShowForm(false);
      setForm({ bank_name: '', account_number: '', wallet_type: 'bank' });
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Thêm thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (accounts.length === 0) {
      Alert.alert('Không có dữ liệu', 'Chưa có tài khoản để xuất.');
      return;
    }
    const headers = ['Ma_NganHang', 'Ten_NganHang_Vi', 'So_Tai_Khoan', 'Loai_Vi', 'Trang_Thai'];
    const rows = accounts.map((a) => [
      a.id,
      a.bank_name,
      a.account_number,
      a.wallet_type,
      a.form_status || '',
    ]);
    downloadText(`BK-STK_${(branchId ?? '').slice(0, 8)}.csv`, toCsv(headers, rows));
  };

  const statusSeverity = (s: string): SeverityKey =>
    s === 'da_thong_bao' ? 'success' : s === 'tu_choi' ? 'danger' : 'muted';
  const statusLabel = (s: string) =>
    s === 'da_thong_bao' ? 'Đã thông báo' : s === 'tu_choi' ? 'Từ chối' : 'Chờ';

  return (
    <ScreenContainer compact>
      <UnifiedHeader icon="bank" 
        title="TK Ngân Hàng"
        subtitle="01/BK-STK — Thông báo tài khoản (TT18 §5)"
        onBackPress={() => router.push('/ke-toan')}
        backLabel="Tổng quan"
        compact={isWide}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.csvBtn}
              onPress={exportCsv}
              disabled={accounts.length === 0}
            >
              <Icon name="file-delimited" size={18} color={colors.text.inverse} />
              <Text style={styles.csvText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />

      {loading ? (
        <View style={styles.loadingBox}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(i) => i.id}
          numColumns={isWide ? 2 : 1}
          key={isWide ? 'w' : 'n'}
          contentContainerStyle={[styles.list, { paddingHorizontal: hPad }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={'#F97316'}
            />
          }
          ListEmptyComponent={
            <View style={styles.loadingBox}>
              <Text style={[font.bodySmall, { color: '#737373' }]}>Chưa có tài khoản</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RowCard
              title={`${item.bank_name} · ${item.wallet_type.toUpperCase()}`}
              subtitle={`${item.account_number}`}
              right={
                <StatusBadge
                  label={statusLabel(item.form_status)}
                  severity={statusSeverity(item.form_status)}
                />
              }
            />
          )}
        />
      )}

      {showForm && (
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thêm tài khoản (01/BK-STK)</Text>
            <TextInput
              style={styles.field}
              placeholder="Tên ngân hàng/ví"
              placeholderTextColor={'#737373'}
              value={form.bank_name}
              onChangeText={(t) => setForm({ ...form, bank_name: t })}
            />
            <TextInput
              style={styles.field}
              placeholder="Số tài khoản"
              placeholderTextColor={'#737373'}
              value={form.account_number}
              onChangeText={(t) => setForm({ ...form, account_number: t })}
            />
            <View style={styles.walletRow}>
              {WALLETS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.walletChip, form.wallet_type === w && styles.walletChipActive]}
                  onPress={() => setForm({ ...form, wallet_type: w })}
                >
                  <Text
                    style={[styles.walletText, form.wallet_type === w && styles.walletTextActive]}
                  >
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={submitting}>
                <Text style={styles.saveText}>
                  {submitting ? 'Đang lưu...' : 'Lưu & Thông báo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16},
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  csvText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F97316',
  },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  modalTitle: { ...font.bodyBold, color: '#171717' },
  field: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 12,
    height: 46,
    ...font.body,
    color: '#171717',
  },
  walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  walletChip: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  walletChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  walletText: { ...font.caption, color: '#737373', fontWeight: '600' },
  walletTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...font.buttonSmall, color: '#737373', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...font.buttonSmall, color: colors.text.inverse, fontWeight: '600' },
});


