import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, RefreshControl, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api as taxApi } from '../../../lib/api';
import { toCsv, downloadText } from '../../../lib/api/csvExport';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import GradientHeader from '../../../lib/components/ui/GradientHeader';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import RowCard from '../../../lib/components/ke-toan/RowCard';
import StatusBadge from '../../../lib/components/ke-toan/StatusBadge';
import type { SeverityKey } from '../../../lib/components/ke-toan/StatusBadge';

const WALLETS = ['bank', 'momo', 'zalopay', 'vnpay'];

export default function BankAccountsScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const [branchId, setBranchId] = useState('11111111-1111-1111-1111-111111111111');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', wallet_type: 'bank' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await taxApi.getTaxBankAccounts(branchId);
      setAccounts(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được tài khoản');
    } finally { setLoading(false); setRefreshing(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.bank_name.trim() || !form.account_number.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập tên ngân hàng & số tài khoản.');
      return;
    }
    setSubmitting(true);
    try {
      await taxApi.createTaxBankAccount({ ...form, branch_id: branchId });
      setShowForm(false); setForm({ bank_name: '', account_number: '', wallet_type: 'bank' });
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Thêm thất bại');
    } finally { setSubmitting(false); }
  };

  const exportCsv = () => {
    if (accounts.length === 0) { Alert.alert('Không có dữ liệu', 'Chưa có tài khoản để xuất.'); return; }
    const headers = ['Ma_NganHang', 'Ten_NganHang_Vi', 'So_Tai_Khoan', 'Loai_Vi', 'Trang_Thai'];
    const rows = accounts.map((a) => [
      a.id, a.bank_name, a.account_number, a.wallet_type, a.form_status || '',
    ]);
    downloadText(`BK-STK_${branchId.slice(0, 8)}.csv`, toCsv(headers, rows));
  };

  const statusSeverity = (s: string): SeverityKey => s === 'da_thong_bao' ? 'success' : s === 'tu_choi' ? 'danger' : 'muted';
  const statusLabel = (s: string) => s === 'da_thong_bao' ? 'Đã thông báo' : s === 'tu_choi' ? 'Từ chối' : 'Chờ';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <GradientHeader title="TK Ngân Hàng" subtitle="01/BK-STK — Thông báo tài khoản (TT18 §5)" icon="bank" onBackPress={() => router.push('/ke-toan')} backLabel="Tổng quan" compact={isWide}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.csvBtn} onPress={exportCsv} disabled={accounts.length === 0}>
              <Icon name="file-delimited" size={18} color={colors.text.inverse} />
              <Text style={styles.csvText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        } />
      <BranchPeriodFilter branchId={branchId} onBranchChange={setBranchId} />

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.brand.primary} /></View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(i) => i.id}
          numColumns={isWide ? 2 : 1}
          key={isWide ? 'w' : 'n'}
          contentContainerStyle={[styles.list, isWide && { paddingHorizontal: 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand.primary} />}
          ListEmptyComponent={<View style={styles.loadingBox}><Text style={[font.bodySmall, { color: colors.text.muted }]}>Chưa có tài khoản</Text></View>}
          renderItem={({ item }) => (
            <RowCard
              leftIcon="bank"
              title={`${item.bank_name} · ${item.wallet_type.toUpperCase()}`}
              subtitle={`${item.account_number}`}
              right={<StatusBadge label={statusLabel(item.form_status)} severity={statusSeverity(item.form_status)} />}
            />
          )}
        />
      )}

      {showForm && (
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thêm tài khoản (01/BK-STK)</Text>
            <TextInput style={styles.field} placeholder="Tên ngân hàng/ví" placeholderTextColor={colors.text.muted} value={form.bank_name} onChangeText={(t) => setForm({ ...form, bank_name: t })} />
            <TextInput style={styles.field} placeholder="Số tài khoản" placeholderTextColor={colors.text.muted} value={form.account_number} onChangeText={(t) => setForm({ ...form, account_number: t })} />
            <View style={styles.walletRow}>
              {WALLETS.map((w) => (
                <TouchableOpacity key={w} style={[styles.walletChip, form.wallet_type === w && styles.walletChipActive]} onPress={() => setForm({ ...form, wallet_type: w })}>
                  <Text style={[styles.walletText, form.wallet_type === w && styles.walletTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Huỷ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={submitting}><Text style={styles.saveText}>{submitting ? 'Đang lưu...' : 'Lưu & Thông báo'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  csvBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: shape.radius.md, backgroundColor: 'rgba(255,255,255,0.18)' },
  csvText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24, zIndex: 10 },
  modalCard: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 20, gap: 12 },
  modalTitle: { ...font.h4, color: colors.text.primary },
  field: { backgroundColor: colors.surface.app, borderRadius: shape.radius.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 12, height: 46, ...font.body, color: colors.text.primary },
  walletRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  walletChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  walletChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  walletText: { ...font.caption, color: colors.text.muted, fontWeight: '600' },
  walletTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 46, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...font.buttonSmall, color: colors.text.muted, fontWeight: '600' },
  saveBtn: { flex: 1, height: 46, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { ...font.buttonSmall, color: colors.text.inverse, fontWeight: '600' },
});
