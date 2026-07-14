import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../lib/theme';
import { useAuth } from '../../lib/context/AuthContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useSidebar } from '../../lib/context/SidebarContext';
import { api } from '../../lib/api';
import { logger, safeApi } from '../../lib/logger';
import ModuleCard from '../../lib/components/ui/ModuleCard';
import { SectionTitle } from '../../lib/components/ui/SectionTitle';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import { formatPrice } from '../../lib/theme';
import {
  DonutChart,
  MiniLineChart,
} from '../../lib/components/ke-toan/ChartComponents';

const SCREEN_W = Dimensions.get('window').width;
const fmt = (n: number) => Intl.NumberFormat('vi-VN').format(n);

// ─── Badge components ────────────────────────────────────────────────────────
function TxBadge({ type }: { type: string }) {
  const isThu = type === 'thu';
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: isThu ? '#E8F5E9' : '#FFEBEE' }}>
      <Text style={{ ...font.badge, fontWeight: '600', color: isThu ? '#2E7D32' : '#C62828' }}>
        {isThu ? 'Thu' : 'Chi'}
      </Text>
    </View>
  );
}

function InvBadge({ status }: { status: string }) {
  const ok = status === 'da_xuat' || status === 'exported';
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, backgroundColor: ok ? '#E8F5E9' : '#FFF8E1' }}>
      <Text style={{ ...font.badge, color: ok ? '#2E7D32' : '#F57F17' }}>
        {ok ? 'Đã xuất' : 'Nháp'}
      </Text>
    </View>
  );
}

// ─── Default data (when API fails) ───────────────────────────────────────────
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
        bid
          ? safeApi(() => api.getTaxProfileStatus(bid), null)
          : Promise.resolve(null),
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

  const hPad = isWide ? 24 : 4;
  const chartW = isWide ? Math.min(containerWidth * 0.55, 520) : SCREEN_W - hPad * 2 - 40;
  const s = data.summary || {};
  const profit = s.balance || s.total_thu - s.total_chi;
  const profitPct = s.total_thu > 0 ? Math.round((profit / s.total_thu) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <UnifiedHeader
        icon="wallet-outline"
        title="Kế Toán & Thuế"
        subtitle="Tổng quan tài chính — dữ liệu thực tế"
        onMenuPress={openSidebar}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={'#737373'} />}
        contentContainerStyle={{ paddingHorizontal: hPad, paddingBottom: 40, gap: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {loadError && (
          <View style={errBanner}>
            <Icon name="alert-circle-outline" size={16} color={'#DC2626'} />
            <Text style={{ flex: 1, ...font.bodySmall, color: '#DC2626' }}>{loadError}</Text>
            <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ paddingHorizontal: 32, paddingVertical: 5, borderRadius: 16, backgroundColor: '#DC2626' }}>
              <Text style={{ ...font.buttonSmall, color: '#fff' }}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════ KPI CARDS ═══════════════════════ */}
        <View style={secHeader}>
          <Icon name="speedometer" size={16} color={'#737373'} />
          <Text style={secTitle}>Tổng quan tài chính</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 10 }}>
          {/* Tổng thu */}
          <View style={[kpiCard, { width: isWide ? undefined : '48%', flex: isWide ? 1 : undefined }]}>
            <Text style={kpiLabel}>Tổng thu</Text>
            <Text style={[kpiVal, { color: '#059669' }]}>{formatPrice(s.total_thu)}</Text>
            <Text style={kpiSub}>↑ {data.this_month?.thu_growth ?? 0}% so với tháng trước</Text>
          </View>
          {/* Tổng chi */}
          <View style={[kpiCard, { width: isWide ? undefined : '48%', flex: isWide ? 1 : undefined }]}>
            <Text style={kpiLabel}>Tổng chi</Text>
            <Text style={[kpiVal, { color: '#DC2626' }]}>{formatPrice(s.total_chi)}</Text>
            <Text style={kpiSub}>↑ {data.this_month?.chi_growth ?? 0}% so với tháng trước</Text>
          </View>
          {/* Lợi nhuận */}
          <View style={[kpiCard, { width: isWide ? undefined : '48%', flex: isWide ? 1 : undefined }]}>
            <Text style={kpiLabel}>Lợi nhuận</Text>
            <Text style={[kpiVal, { color: profit >= 0 ? '#059669' : '#DC2626' }]}>{formatPrice(profit)}</Text>
            <Text style={kpiSub}>Biên lợi nhuận {profitPct}%</Text>
          </View>
          {/* Hóa đơn VAT */}
          <View style={[kpiCard, { width: isWide ? undefined : '48%', flex: isWide ? 1 : undefined }]}>
            <Text style={kpiLabel}>Hóa đơn VAT</Text>
            <Text style={[kpiVal, { color: '#7C3AED' }]}>{s.invoice_count ?? 0}</Text>
            <Text style={kpiSub}>{s.exported_count ?? 0} đã xuất / {s.invoice_count ?? 0} tổng</Text>
          </View>
        </View>

        {/* ═══════════════════════ CHARTS ═══════════════════════ */}
        <View style={secHeader}>
          <Icon name="chart-line" size={16} color={'#737373'} />
          <Text style={secTitle}>Biểu đồ doanh thu & chi phí</Text>
        </View>
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 32, marginBottom: 10 }}>
          {/* Bar chart */}
          <View style={[chartCard, isWide ? { flex: 3 } : {}, { minWidth: isWide ? containerWidth * 0.55 - hPad : 0 }]}>
            <Text style={{ ...font.caption, color: '#737373', fontWeight: '600', marginBottom: 8 }}>
              Doanh thu 12 tháng
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 8}}>
              {data.monthly_revenue.map((m: any, i: number) => {
                const maxVal = Math.max(...data.monthly_revenue.map((r: any) => r.value), 1);
                const h = maxVal > 0 ? (m.value / maxVal) * 140 : 2;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4}}>
                    <View
                      style={{
                        width: '70%',
                        height: Math.max(h, 2),
                        borderRadius: 3,
                        backgroundColor: m.current ? '#0F172A' : '#CBD5E1',
                      }}
                    />
                    <Text style={{ ...font.micro, color: '#737373', textAlign: 'center' }}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          {/* Expense donut */}
          {isWide && data.expense_by_category.length > 0 && (
            <View style={[chartCard, { flex: 2 }]}>
              <Text style={{ ...font.caption, color: '#737373', fontWeight: '600', marginBottom: 8 }}>
                Chi phí theo nhóm
              </Text>
              <DonutChart data={data.expense_by_category} size={Math.min(chartW * 0.35, 160)} />
              <View style={{ gap: 8, marginTop: 8 }}>
                {data.expense_by_category.slice(0, 5).map((e: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: e.color }} />
                    <Text style={{ flex: 1, ...font.micro, color: '#737373' }} numberOfLines={1}>{e.category}</Text>
                    <Text style={{ ...font.micro, color: '#0F172A', fontWeight: '600' }}>{e.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════ TAX STATUS ═══════════════════════ */}
        <View style={secHeader}>
          <Icon name="file-document-outline" size={16} color={'#737373'} />
          <Text style={secTitle}>Trạng thái thuế</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
          <View style={[taxCard, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="chart-bell-curve" size={16} color={'#2563EB'} />
            <Text style={taxLabel}>Phân tầng</Text>
            <Text style={[taxValue, { color: '#2563EB' }]}>{taxStatus?.tier ?? '—'}</Text>
          </View>
          <View style={[taxCard, { backgroundColor: '#F97316' }]}>
            <Icon name="currency-usd" size={16} color={'#F97316'} />
            <Text style={taxLabel}>Doanh số YTD</Text>
            <Text style={[taxValue, { color: '#F97316' }]}>
              {taxStatus?.revenueYtd || taxStatus?.revenue_ytd ? formatPrice(taxStatus.revenueYtd || taxStatus.revenue_ytd) : '—'}
            </Text>
          </View>
          <View style={[taxCard, { backgroundColor: taxStatus?.penaltyRisk ? '#D97706' : '#16A34A' }]}>
            <Icon name="calendar-alert" size={16} color={taxStatus?.penaltyRisk ? '#D97706' : '#059669'} />
            <Text style={taxLabel}>Hạn nộp</Text>
            <Text style={[taxValue, { color: taxStatus?.penaltyRisk ? '#D97706' : '#059669' }]}>
              {taxStatus?.nextDeadline ?? '—'}
            </Text>
          </View>
        </View>

        {/* ═══════════════════════ QUICK TABLES ═══════════════════════ */}
        <View style={secHeader}>
          <Icon name="table-eye" size={16} color={'#737373'} />
          <Text style={secTitle}>Bảng xem nhanh</Text>
        </View>
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 32, marginBottom: 18 }}>
          {/* Transactions */}
          <View style={[tblWrap, { flex: isWide ? 1 : undefined }]}>
            <View style={tblHead}>
              <Icon name="swap-vertical" size={14} color={'#737373'} />
              <Text style={tblHeadText}>Giao dịch gần đây</Text>
              <TouchableOpacity onPress={() => open('/ke-toan/thu-chi')}>
                <Text style={{ ...font.badge, color: '#2563EB' }}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            <View style={tblCols}>
              <Text style={[tblCol, { flex: 1 }]}>Ngày</Text>
              <Text style={[tblCol, { flex: 0.5 }]}>Loại</Text>
              <Text style={[tblCol, { flex: 2 }]}>Mô tả</Text>
              <Text style={[tblCol, { flex: 1, textAlign: 'right' }]}>Số tiền</Text>
            </View>
            {(data.recent_transactions || []).slice(0, isWide ? 5 : 3).map((t: any, i: number) => (
              <View key={t.id || i} style={[tblRow, i % 2 === 1 && { backgroundColor: '#FAFAFA' }]}>
                <Text style={[tblCell, { flex: 1 }]}>{t.created_at ? t.created_at.slice(0, 10) : '—'}</Text>
                <View style={{ flex: 0.5 }}><TxBadge type={t.type} /></View>
                <Text style={[tblCell, { flex: 2, color: '#0F172A' }]} numberOfLines={1}>{t.note || t.category || '—'}</Text>
                <Text style={[tblCell, { flex: 1, textAlign: 'right', ...font.tableCellBold }]}>
                  {fmt(Number(t.amount) || 0)}₫
                </Text>
              </View>
            ))}
            {(data.recent_transactions || []).length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ ...font.caption, color: '#737373' }}>Chưa có dữ liệu giao dịch</Text>
              </View>
            )}
          </View>
          {/* Invoices */}
          <View style={[tblWrap, { flex: isWide ? 1 : undefined }]}>
            <View style={tblHead}>
              <Icon name="receipt" size={14} color={'#737373'} />
              <Text style={tblHeadText}>Hóa đơn gần đây</Text>
              <TouchableOpacity onPress={() => open('/ke-toan/invoices')}>
                <Text style={{ ...font.badge, color: '#2563EB' }}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            <View style={tblCols}>
              <Text style={[tblCol, { flex: 1 }]}>Số HĐ</Text>
              <Text style={[tblCol, { flex: 1.5 }]}>Người mua</Text>
              <Text style={[tblCol, { flex: 1, textAlign: 'right' }]}>Giá trị</Text>
              <Text style={[tblCol, { flex: 0.8, textAlign: 'center' }]}>Trạng thái</Text>
            </View>
            {(data.recent_invoices || []).slice(0, isWide ? 4 : 2).map((inv: any, i: number) => (
              <View key={inv.id || i} style={[tblRow, i % 2 === 1 && { backgroundColor: '#FAFAFA' }]}>
                <Text style={[tblCell, { flex: 1, fontFamily: 'BeVietnamPro_500Medium', fontWeight: '500' }]}>{inv.invoice_number || '—'}</Text>
                <Text style={[tblCell, { flex: 1.5, color: '#0F172A' }]} numberOfLines={1}>{inv.buyer_name || '—'}</Text>
                <Text style={[tblCell, { flex: 1, textAlign: 'right', ...font.tableCellBold }]}>
                  {fmt(Number(inv.total_amount) || 0)}₫
                </Text>
                <View style={{ flex: 0.8, alignItems: 'center' }}><InvBadge status={inv.status} /></View>
              </View>
            ))}
            {(data.recent_invoices || []).length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ ...font.caption, color: '#737373' }}>Chưa có dữ liệu hóa đơn</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══════════════════════ DEADLINES ═══════════════════════ */}
        <View style={secHeader}>
          <Icon name="calendar-clock" size={16} color={'#737373'} />
          <Text style={secTitle}>Hạn nộp thuế</Text>
        </View>
        <View style={{ gap: 12, marginBottom: 24 }}>
          {(data.deadlines || []).map((d: any, i: number) => {
            const urgent = d.days_left <= 7;
            const warn = d.days_left > 7 && d.days_left <= 17;
            return (
              <View key={i} style={[dlCard, { backgroundColor: urgent ? '#DC2626' : warn ? '#D97706' : '#16A34A' }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: urgent ? '#DC2626' : warn ? '#D97706' : '#059669' }} />
                    <Text style={{ ...font.bodySmall, color: '#0F172A', fontWeight: '600' }}>{d.label}</Text>
                  </View>
                  <Text style={{ ...font.micro, color: '#737373', marginTop: 2, marginLeft: 12 }}>Hạn: {d.due}</Text>
                </View>
                <View style={[dlPill, { backgroundColor: urgent ? '#FEE2E2' : warn ? '#FEF3C7' : '#DCFCE7' }]}>
                  <Text style={{ ...font.badge, color: urgent ? '#DC2626' : warn ? '#D97706' : '#059669', fontWeight: '600' }}>
                    Còn {d.days_left} ngày
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ═══════════════════════ MODULES ═══════════════════════ */}
        <View style={secHeader}>
          <Icon name="grid" size={16} color={'#737373'} />
          <Text style={secTitle}>Mô-đun nghiệp vụ</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16}}>
          {modules.map((m) => (
            <View key={m.key} style={{ width: isWide ? `${100 / columns(180) - 1.5}%` : '48%' }}>
              <ModuleCard icon={m.icon} title={m.title} description={m.desc} onPress={() => open(m.path)} />
            </View>
          ))}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles — sử dụng font tokens ────────────────────────────────────────────
const secHeader: any = { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, marginTop: 16 };
const secTitle: any = { ...font.tableHeader, color: '#0F172A' };

const kpiCard: any = { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' };
const kpiLabel: any = { ...font.badge, color: '#737373', textTransform: 'uppercase', letterSpacing: 0.5 };
const kpiVal: any = { ...font.sectionTitle, marginTop: 2 };
const kpiSub: any = { ...font.micro, color: '#737373', marginTop: 2 };

const chartCard: any = { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' };
const taxCard: any = { flex: 1, borderRadius: 12, padding: 14, minWidth: 90 };
const taxLabel: any = { ...font.micro, color: '#737373', marginTop: 4 };
const taxValue: any = { ...font.bodyBold, marginTop: 2 };

const tblWrap: any = { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' };
const tblHead: any = { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' };
const tblHeadText: any = { ...font.caption, color: '#0F172A', fontWeight: '600', flex: 1 };
const tblCols: any = { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' };
const tblCol: any = { ...font.tableHeader, color: '#737373' };
const tblRow: any = { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#FAFAFA' };
const tblCell: any = { ...font.tableCell, color: '#737373' };
const dlCard: any = { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, gap: 16 };
const dlPill: any = { paddingHorizontal: 32, paddingVertical: 8, borderRadius: 16 };
const errBanner: any = { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#DC2626', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FECACA' };
