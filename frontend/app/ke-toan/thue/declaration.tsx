import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import GradientHeader from '../../../lib/components/ui/GradientHeader';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import FAB from '../../../lib/components/ui/FAB';
import { colHeader } from '../../../lib/theme/dataText';

const FORMS = [
  { key: '01-cnkd', label: '01/CNKD — Nhóm 2–4 (GTGT/TNCN)' },
  { key: '01-tkn-cnkd', label: '01/TKN-CNKD — Nhóm 1 (Khoán)' },
];

const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function DeclarationScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const [branchId, setBranchId] = useState('11111111-1111-1111-1111-111111111111');
  const [period, setPeriod] = useState(formatDate(new Date(2026, 6, 1).toISOString()));
  const [form, setForm] = useState('01-cnkd');
  const [xml, setXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getTaxDeclarationXml(form, branchId, period);
      setXml(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không xuất được tờ khai');
    } finally { setLoading(false); setRefreshing(false); }
  }, [branchId, period, form]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/thue/declaration/submit', { form, branch_id: branchId, period });
      Alert.alert('Thành công', 'Đã gửi tờ khai (stub T-VAN).');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Gửi thất bại');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <GradientHeader title="Kê Khai Thuế" subtitle="Xuất XML chuẩn Tổng cục Thuế" icon="file-document-edit" onBackPress={() => router.push('/ke-toan')} backLabel="Tổng quan" compact={isWide} />
      <BranchPeriodFilter
        branchId={branchId}
        onBranchChange={setBranchId}
        period={period}
        onPeriodChange={setPeriod}
        form={form}
        onFormChange={setForm}
        formOptions={FORMS}
      />

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.brand.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand.primary} />}>
          <Text style={styles.xmlTitle}>Xem trước XML ({form})</Text>
          <View style={styles.xmlBox}>
            <Text style={styles.xmlText} selectable>{xml || '—'}</Text>
          </View>
          {isWide ? (
            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
              <Icon name="send" size={18} color={colors.text.inverse} />
              <Text style={styles.submitText}>{submitting ? 'Đang gửi...' : 'Ký & Gửi T-VAN (stub)'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.mobileSpacer} />
          )}
        </ScrollView>
      )}
      {!isWide && (
        <FAB icon="send" onPress={submit} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 12, paddingBottom: 100 },
  xmlTitle: { ...colHeader },
  xmlBox: { backgroundColor: '#0F172A', borderRadius: shape.radius.md, padding: 14, maxHeight: 360 },
  xmlText: { ...font.caption, color: '#E2E8F0', fontFamily: 'monospace' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 14 },
  submitText: { ...font.buttonSmall, color: colors.text.inverse, fontWeight: '600' },
  mobileSpacer: { height: 80 },
});
