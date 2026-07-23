import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import { useAuth } from '../../../lib/context/AuthContext';
import ScreenLayout from '../../../lib/components/layout/ScreenLayout';
import SectionBlock from '../../../lib/components/layout/SectionBlock';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';

const FORMS = [
  { key: '01-cnkd', label: '01/CNKD — Nhóm 2–4 (GTGT/TNCN)' },
  { key: '01-tkn-cnkd', label: '01/TKN-CNKD — Nhóm 1 (Khoán)' },
];

const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function DeclarationScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  
  const [period, setPeriod] = useState(formatDate(new Date(2026, 6, 1).toISOString()));
  const [form, setForm] = useState('01-cnkd');
  const [xml, setXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!branchId) return;
    setLoading(true);
    try {
      const data = await api.getTaxDeclarationXml(form, branchId, period);
      setXml(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không xuất được tờ khai');
    } finally {
      setLoading(false);
    }
  }, [branchId, period, form]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (!branchId) return;
      await api.post('/thue/declarations/declaration/submit', { form, branch_id: branchId, period });
      Alert.alert('Thành công', 'Đã gửi tờ khai (stub T-VAN).');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Gửi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const hPad = 16;

  return (
    <ScreenLayout
      icon="file-document-edit"
      title="Kê Khai Thuế"
      subtitle="Xuất XML chuẩn Tổng cục Thuế"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
      headerRight={
        <TouchableOpacity
          style={styles.submitBtnHeader}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={18} color="#fff" />
          )}
          {isWide && (
            <AppText variant="md" weight="bold" color="#fff">
              Ký & Gửi T-VAN
            </AppText>
          )}
        </TouchableOpacity>
      }
    >
      <View style={{ backgroundColor: colors.surface.app, paddingBottom: 16 }}>
        <BranchPeriodFilter
          branchId={branchId ?? ''}
          onBranchChange={() => {}}
          period={period}
          onPeriodChange={setPeriod}
          form={form}
          onFormChange={setForm}
          formOptions={FORMS}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => load(true)}
              tintColor={colors.brand.primary}
            />
          }
        >
          <SectionBlock style={{ backgroundColor: colors.text.primary, borderColor: colors.text.primary, padding: 0, marginBottom: 16 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
              <AppText variant="md" weight="bold" color="#fff">Xem trước XML ({form})</AppText>
            </View>
            <ScrollView style={styles.xmlBox} nestedScrollEnabled>
              <AppText variant="sm" color={colors.border.default} style={{ fontFamily: 'monospace' }} selectable>
                {xml || '—'}
              </AppText>
            </ScrollView>
          </SectionBlock>
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  submitBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
  },
  xmlBox: {
    padding: 16,
    maxHeight: 400,
  },
});
