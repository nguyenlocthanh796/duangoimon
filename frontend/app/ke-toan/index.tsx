import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import ScreenLayout from '../../lib/components/layout/ScreenLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import { SectionTitle } from '../../lib/components/ui/SectionTitle';
import SectionBlock from '../../lib/components/layout/SectionBlock';
import ResponsiveGrid from '../../lib/components/layout/ResponsiveGrid';
import { useAuth } from '../../lib/context/AuthContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useSidebar } from '../../lib/context/SidebarContext';
import { api } from '../../lib/api';
import { logger, safeApi } from '../../lib/logger';
import ModuleCard from '../../lib/components/ui/ModuleCard';
import { formatPrice } from '../../lib/theme';
import { DonutChart } from '../../lib/components/ke-toan/ChartComponents';

const SCREEN_W = Dimensions.get('window').width;
const fmt = (n: number) => Intl.NumberFormat('vi-VN').format(n);

// ─── Badge components ────────────────────────────────────────────────────────
function TxBadge({ type }: { type: string }) {
  const isThu = type === 'thu';
  return (
    <AppText variant="sm" weight="bold" color={isThu ? colors.status.success : colors.status.danger}>
      {isThu ? 'Thu' : 'Chi'}
    </AppText>
  );
}

function InvBadge({ status }: { status: string }) {
  const ok = status === 'da_xuat' || status === 'exported';
  return (
    <AppText variant="sm" weight="bold" color={ok ? colors.status.success : colors.status.warning}>
      {ok ? 'Đã xuất' : 'Nháp'}
    </AppText>
  );
}

const DEFAULT_DASHBOARD = {
  summary: { total_thu: 0, total_chi: 0, balance: 0, transaction_count: 0, invoice_count: 0, exported_count: 0, invoice_total: 0 },
  monthly_revenue: Array.from({ length: 12 }, (_, i) => ({ label: `T${i + 1}`, value: 0, current: i === 6 })),
  expense_by_category: [],
  trend: Array.from({ length: 14 }, (_, i) => ({ label: `Ng${i + 1}`, value: 0 })),
  recent_transactions: [],
  recent_invoices: [],
  this_month: { thu: 0, chi: 0, thu_growth: 0, chi_growth: 0 },
  deadlines: [
    { label: 'Thuế GTGT tháng 6/2026', due: '20/07/2026', days_left: 7 },
    { label: 'Thuế TNCN tháng 6/2026', due: '20/07/2026', days_left: 7 },
    { label: 'Báo cáo thuế quý 2/2026', due: '30/07/2026', days_left: 17 },
    { label: 'Quyết toán thuế năm 2026', due: '31/03/2027', days_left: 261 },
  ],
};

// ─── StatCell: giống StatCard của Quản Lý ──────────────────────────────────
function StatCell({
  icon, value, label, trend, iconColor, iconBg, valueColor
}: {
  icon: string; value: string; label: string; trend?: string;
  iconColor: string; iconBg: string; valueColor?: string;
}) {
  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon as any} size={18} color={iconColor} />
        </View>
        <AppText variant="md" weight="bold" color={valueColor ?? colors.text.primary}
          numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={{ flex: 1 }}>
          {value}
        </AppText>
      </View>
      <AppText variant="sm" color={colors.text.muted}>{label}</AppText>
      {trend && <AppText variant="sm" color={colors.text.muted}>{trend}</AppText>}
    </View>
  );
}


// ─── Main component ──────────────────────────────────────────────────────────
export default function KeToanHub() {
  const router = useRouter();
  const { branchId } = useAuth();
  const { isWide, columns, containerWidth } = useResponsive();
  const { openSidebar } = useSidebar();

  const [data, setData] = useState<any>(DEFAULT_DASHBOARD);
  const [taxStatus, setTaxStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const bid = branchId ?? '';
    try {
      const [dash, tax] = await Promise.all([
        safeApi(() => api.getKeToanDashboard(), DEFAULT_DASHBOARD),
        bid ? safeApi(() => api.getTaxProfileStatus(bid), null) : Promise.resolve(null),
      ]);
      setData(dash);
      setTaxStatus(tax);
    } catch (e) {
      logger.error('ke-toan', 'load failed', e);
      setLoadError('Không thể tải dữ liệu tổng quan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);
  const open = (path: string) => router.push(path as any);

  const modules = [
    { key: 'thu-chi', icon: 'swap-vertical', title: 'Thu Chi', desc: 'Quản lý thu, chi hằng ngày', path: '/ke-toan/thu-chi' },
    { key: 'invoices', icon: 'receipt', title: 'Hóa đơn VAT', desc: 'Phát hành xuất hóa đơn', path: '/ke-toan/invoices' },
    { key: 'tier', icon: 'chart-bell-curve', title: 'Phân Tầng HKD', desc: 'Xác định hạng KD', path: '/ke-toan/thue/tier' },
    { key: 'so-sach', icon: 'book-open-page-variant', title: 'Sổ Kế Toán', desc: 'Ghi chép sổ sách', path: '/ke-toan/thue/so-sach' },
    { key: 'declaration', icon: 'file-document-edit', title: 'Kê Khai Thuế', desc: 'Kê khai hàng kỳ', path: '/ke-toan/thue/declaration' },
    { key: 'bank', icon: 'bank', title: 'TK Ngân Hàng', desc: 'Quản lý tài khoản', path: '/ke-toan/thue/bank-accounts' },
    { key: 'deadlines', icon: 'calendar-alert', title: 'Hạn Nộp', desc: 'Lịch hạn nộp thuế', path: '/ke-toan/thue/deadlines' },
    { key: 'legacy', icon: 'package-variant-closed', title: 'Chuyển Tiếp', desc: 'Dữ liệu cũ', path: '/ke-toan/thue/legacy' },
  ] as const;

  const chartW = isWide ? Math.min(containerWidth * 0.55, 520) : 300;
  const s = data.summary || {};
  const profit = s.balance || s.total_thu - s.total_chi;
  const profitPct = s.total_thu > 0 ? Math.round((profit / s.total_thu) * 100) : 0;

  return (
    <ScreenLayout
      icon="wallet-outline"
      title="Kế Toán & Thuế"
      subtitle="Tổng quan tài chính — dữ liệu thực tế"
      onMenuPress={openSidebar}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
        {loadError && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface.danger, borderRadius: 0, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border.danger }}>
            <Icon name="alert-circle-outline" size={16} color={colors.status.danger} />
            <AppText variant="md" color={colors.status.danger} style={{ flex: 1 }}>{loadError}</AppText>
            <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ paddingHorizontal: 32, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.brand.primary }}>
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thử lại</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ───── KPI 2×2 grid ───── */}
        <SectionTitle icon="speedometer" title="Tổng quan tài chính" />
        <SectionBlock padding={false}>
          <ResponsiveGrid mobileCols={2} minColWidth={150} gap={0}>
            <View>
              <StatCell icon="arrow-up-bold" value={formatPrice(s.total_thu)} label="Tổng thu" trend={data.this_month?.thu_growth != null ? `↑ ${data.this_month.thu_growth}% so với tháng trước` : undefined} iconColor={colors.status.success} iconBg="#F0FDF4" valueColor={colors.status.success} />
            </View>
            <View>
              <StatCell icon="arrow-down-bold" value={formatPrice(s.total_chi)} label="Tổng chi" trend={data.this_month?.chi_growth != null ? `↑ ${data.this_month.chi_growth}% so với tháng trước` : undefined} iconColor={colors.status.danger} iconBg="#FEF2F2" valueColor={colors.status.danger} />
            </View>
            <View>
              <StatCell icon="chart-line" value={formatPrice(profit)} label="Lợi nhuận" trend={`Biên lợi nhuận ${profitPct}%`} iconColor={profit >= 0 ? colors.status.success : colors.status.danger} iconBg={profit >= 0 ? '#F0FDF4' : '#FEF2F2'} valueColor={profit >= 0 ? colors.status.success : colors.status.danger} />
            </View>
            <View>
              <StatCell icon="file-document" value={`${s.invoice_count ?? 0}`} label="Hóa đơn VAT" trend={`${s.exported_count ?? 0} đã xuất / ${s.invoice_count ?? 0} tổng`} iconColor={colors.brand.primary} iconBg="#FFF7ED" />
            </View>
          </ResponsiveGrid>
        </SectionBlock>

        {/* ───── CHARTS ───── */}
        <SectionTitle icon="chart-line" title="Biểu đồ doanh thu & chi phí" />
        <SectionBlock padding={false}><View style={{ padding: isWide ? 16 : 12 }}>
          <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: 3 }}>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Doanh thu 12 tháng</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6 }}>
                {data.monthly_revenue.map((m: any, i: number) => {
                  const maxVal = Math.max(...data.monthly_revenue.map((r: any) => r.value), 1);
                  const h = maxVal > 0 ? (m.value / maxVal) * 140 : 2;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <View style={{ width: '75%', height: Math.max(h, 2), borderRadius: 4, backgroundColor: m.current ? colors.brand.primary : colors.border.default }} />
                      <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center' }}>{m.label}</AppText>
                    </View>
                  );
                })}
              </View>
            </View>
            {isWide && data.expense_by_category.length > 0 && (
              <View style={{ flex: 2 }}>
                <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Chi phí theo nhóm</AppText>
                <DonutChart data={data.expense_by_category} size={Math.min(chartW * 0.35, 160)} />
                <View style={{ gap: 8, marginTop: 8 }}>
                  {data.expense_by_category.slice(0, 5).map((e: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.color }} />
                      <AppText variant="sm" color={colors.text.muted} style={{ flex: 1 }} numberOfLines={1}>{e.category}</AppText>
                      <AppText variant="sm" weight="bold" color={colors.text.primary}>{e.pct}%</AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
        </SectionBlock>

        {/* ───── TAX STATUS ───── */}
        <SectionTitle icon="file-document-outline" title="Trạng thái thuế" />
        <SectionBlock padding={false}>
          <View style={{ flexDirection: 'row', padding: isWide ? 16 : 12 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="chart-bell-curve" size={14} color={colors.brand.primary} />
                </View>
                <AppText variant="sm" color={colors.text.muted}>Phân tầng</AppText>
              </View>
              <AppText variant="md" weight="bold" color={colors.text.primary}>{taxStatus?.tier ?? '—'}</AppText>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="currency-usd" size={14} color={colors.brand.primary} />
                </View>
                <AppText variant="sm" color={colors.text.muted}>Doanh số YTD</AppText>
              </View>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>{taxStatus?.revenueYtd || taxStatus?.revenue_ytd ? formatPrice(taxStatus.revenueYtd || taxStatus.revenue_ytd) : '—'}</AppText>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: taxStatus?.penaltyRisk ? '#FEF2F2' : '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar-alert" size={14} color={taxStatus?.penaltyRisk ? colors.status.warning : colors.brand.primary} />
                </View>
                <AppText variant="sm" color={colors.text.muted}>Hạn nộp</AppText>
              </View>
              <AppText variant="md" weight="bold" color={taxStatus?.penaltyRisk ? colors.status.warning : colors.status.success}>{taxStatus?.nextDeadline ?? '—'}</AppText>
            </View>
          </View>
        </SectionBlock>

        {/* ───── QUICK TABLES ───── */}
        <SectionTitle icon="table-eye" title="Bảng xem nhanh" />
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 8 }}>
          <SectionBlock padding={false} style={{ flex: isWide ? 1 : undefined }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <Icon name="swap-vertical" size={18} color={colors.brand.primary} />
              <AppText variant="md" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>Giao dịch gần đây</AppText>
              <TouchableOpacity onPress={() => open('/ke-toan/thu-chi')}>
                <AppText variant="sm" color={colors.text.muted}>Xem tất cả →</AppText>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 1, textTransform: 'uppercase' }}>Ngày</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 0.5, textTransform: 'uppercase' }}>Loại</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 1, textTransform: 'uppercase' }}>Mô tả</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 1, textAlign: 'right', textTransform: 'uppercase' }}>Số tiền</AppText>
            </View>
            {(data.recent_transactions || []).slice(0, isWide ? 5 : 3).map((t: any, i: number) => (
              <View key={t.id || i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default, backgroundColor: '#FFFFFF' }}>
                <AppText variant="md" color={colors.text.muted} style={{ flex: 1 }}>{t.created_at ? t.created_at.slice(0, 10) : '—'}</AppText>
                <View style={{ flex: 0.5 }}><TxBadge type={t.type} /></View>
                <AppText variant="md" color={colors.text.muted} style={{ flex: 1 }} numberOfLines={1}>{t.note || t.category || '—'}</AppText>
                <AppText variant="md" weight="bold" color={colors.text.primary} style={{ flex: 1, textAlign: 'right' }}>{fmt(Number(t.amount) || 0)}₫</AppText>
              </View>
            ))}
            {(data.recent_transactions || []).length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <AppText variant="md" color={colors.text.muted}>Chưa có dữ liệu giao dịch</AppText>
              </View>
            )}
          </SectionBlock>
          <SectionBlock padding={false} style={{ flex: isWide ? 1 : undefined }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <Icon name="receipt" size={18} color={colors.brand.primary} />
              <AppText variant="md" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>Hóa đơn gần đây</AppText>
              <TouchableOpacity onPress={() => open('/ke-toan/invoices')}>
                <AppText variant="sm" color={colors.text.muted}>Xem tất cả →</AppText>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 1, textTransform: 'uppercase' }}>Số HĐ</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 1, textTransform: 'uppercase' }}>Người mua</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 1, textAlign: 'right', textTransform: 'uppercase' }}>Giá trị</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.muted} style={{ flex: 0.8, textAlign: 'center', textTransform: 'uppercase' }}>Trạng thái</AppText>
            </View>
            {(data.recent_invoices || []).slice(0, isWide ? 4 : 2).map((inv: any, i: number) => (
              <View key={inv.id || i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default, backgroundColor: '#FFFFFF' }}>
                <AppText variant="md" color={colors.text.muted} style={{ flex: 1 }}>{inv.invoice_number || '—'}</AppText>
                <AppText variant="md" color={colors.text.muted} style={{ flex: 1 }} numberOfLines={1}>{inv.buyer_name || '—'}</AppText>
                <AppText variant="md" weight="bold" color={colors.text.primary} style={{ flex: 1, textAlign: 'right' }}>{fmt(Number(inv.total_amount) || 0)}₫</AppText>
                <View style={{ flex: 0.8, alignItems: 'center' }}><InvBadge status={inv.status} /></View>
              </View>
            ))}
            {(data.recent_invoices || []).length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <AppText variant="md" color={colors.text.muted}>Chưa có dữ liệu hóa đơn</AppText>
              </View>
            )}
          </SectionBlock>
        </View>

        {/* ───── DEADLINES ───── */}
        <SectionTitle icon="calendar-clock" title="Hạn nộp thuế" />
        <SectionBlock padding={false}>
          <View style={{ paddingHorizontal: isWide ? 16 : 12 }}>
          {(data.deadlines || []).map((d: any, i: number) => {
            const urgent = d.days_left <= 7;
            const warn = d.days_left > 7 && d.days_left <= 17;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: i < (data.deadlines?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: colors.border.default }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: urgent ? colors.status.danger : warn ? colors.status.warning : colors.status.success }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>{d.label}</AppText>
                  <AppText variant="sm" color={colors.text.muted}>Hạn: {d.due}</AppText>
                </View>
                <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: urgent ? '#FEF2F2' : warn ? '#FFFBEB' : '#F0FDF4' }}>
                  <AppText variant="sm" weight="bold" color={urgent ? colors.status.danger : warn ? colors.status.warning : colors.status.success}>Còn {d.days_left} ngày</AppText>
                </View>
              </View>
            );
          })}
        </View>
        </SectionBlock>

        {/* ───── MODULES ───── */}
        <SectionTitle icon="grid" title="Mô-đun nghiệp vụ" />
        <ResponsiveGrid minColWidth={160} gap={8}>
          {modules.map((m) => (
            <ModuleCard key={m.key} icon={m.icon} title={m.title} description={m.desc} onPress={() => open(m.path)} />
          ))}
        </ResponsiveGrid>
        <View style={{ height: 60 }} />
    </ScreenLayout>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = {

};
