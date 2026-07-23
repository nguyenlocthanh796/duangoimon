import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
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
import { colors } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import StatusBadge, { type BadgeSeverity } from '../../../lib/components/ui/StatusBadge';
import { useAuth } from '../../../lib/context/AuthContext';
import ScreenLayout from '../../../lib/components/layout/ScreenLayout';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';

const WALLETS = ['bank', 'momo', 'zalopay', 'vnpay'];

export default function BankAccountsScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const hPad = 16;
  const { branchId } = useAuth();
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', wallet_type: 'bank' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
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
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

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

  const statusSeverity = (s: string): BadgeSeverity =>
    s === 'da_thong_bao' ? 'success' : s === 'tu_choi' ? 'danger' : 'muted';
  const statusLabel = (s: string) =>
    s === 'da_thong_bao' ? 'Đã thông báo' : s === 'tu_choi' ? 'Từ chối' : 'Chờ';

  return (
    <ScreenLayout
      icon="bank"
      title="TK Ngân Hàng"
      subtitle="01/BK-STK — Thông báo tài khoản (TT18 §5)"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
      headerRight={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.csvBtn}
            onPress={exportCsv}
            disabled={accounts.length === 0}
          >
            <Icon name="file-delimited" size={18} color={colors.text.inverse} />
            {isWide && <AppText variant="sm" weight="bold" color="#fff" style={{ marginLeft: 6 }}>CSV</AppText>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <AppText variant="md" weight="bold" color="#fff" style={{ marginLeft: 6 }}>Thêm</AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ backgroundColor: colors.surface.app, paddingBottom: 16 }}>
        <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(i) => i.id}
          numColumns={isWide ? 2 : 1}
          key={isWide ? 'w' : 'n'}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <AppText variant="md" color={colors.text.muted}>Chưa có tài khoản</AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.mRow, isWide && { flex: 1, margin: 8, borderBottomWidth: 0, borderWidth: 1, borderColor: colors.border.default }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="md" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>
                  {item.bank_name} · {item.wallet_type.toUpperCase()}
                </AppText>
                <AppText variant="sm" color={colors.text.muted}>
                  {item.account_number}
                </AppText>
              </View>
              <StatusBadge
                label={statusLabel(item.form_status)}
                severity={statusSeverity(item.form_status)}
              />
            </View>
          )}
        />
      )}

      {showForm && (
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <AppText variant="lg" weight="bold" style={{ marginBottom: 16 }}>Thêm tài khoản (01/BK-STK)</AppText>
            
            <AppText variant="sm" color={colors.text.muted} style={{ marginBottom: 8 }}>Tên ngân hàng / ví</AppText>
            <TextInput
              style={styles.field}
              placeholder="VD: Vietcombank"
              placeholderTextColor={colors.text.muted}
              value={form.bank_name}
              onChangeText={(t) => setForm({ ...form, bank_name: t })}
            />
            
            <AppText variant="sm" color={colors.text.muted} style={{ marginBottom: 8, marginTop: 12 }}>Số tài khoản</AppText>
            <TextInput
              style={styles.field}
              placeholder="Nhập số tài khoản"
              placeholderTextColor={colors.text.muted}
              value={form.account_number}
              onChangeText={(t) => setForm({ ...form, account_number: t })}
            />

            <AppText variant="sm" color={colors.text.muted} style={{ marginBottom: 8, marginTop: 16 }}>Loại ví</AppText>
            <View style={styles.walletRow}>
              {WALLETS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.walletChip, form.wallet_type === w && styles.walletChipActive]}
                  onPress={() => setForm({ ...form, wallet_type: w })}
                >
                  <AppText variant="sm" weight="bold" color={form.wallet_type === w ? '#fff' : colors.text.muted}>
                    {w.toUpperCase()}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <AppText variant="md" color={colors.text.primary}>Huỷ</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={submitting}>
                <AppText variant="md" weight="bold" color="#fff">
                  {submitting ? 'Đang lưu...' : 'Lưu & Thông báo'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    minWidth: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
  },
  mRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.text.inverse,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  modalCard: {
    backgroundColor: colors.text.inverse,
    borderRadius: 8,
    padding: 24,
  },
  field: {
    backgroundColor: colors.surface.app,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: colors.text.primary,
  },
  walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  walletChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  walletChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
