import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppText } from '../../../lib/components/ui';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { SaaSTenant, SaaSInvoiceRecord } from '../../../lib/store/useSaaSAdminStore';
import { playTapSound } from '../../../lib/utils/sound';
import { SAAS_PLAN_NAMES, getExpiryTier } from '../constants';

interface SaaSOverviewTabProps {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    expiringTenants: number;
    suspendedTenants: number;
    totalMRR: number;
    annualARR: number;
    renewalRate: number;
  };
  urgentTenants: SaaSTenant[];
  allTenants?: SaaSTenant[];
  invoicesByTenant?: Record<string, SaaSInvoiceRecord[]>;
  onSelectTenant: (tenantId: string) => void;
  onImpersonate: (tenant: SaaSTenant) => void;
  onQuickRenew?: (tenant: SaaSTenant) => void;
}

export const SaaSOverviewTab: React.FC<SaaSOverviewTabProps> = ({
  metrics,
  urgentTenants,
  allTenants = [],
  invoicesByTenant = {},
  onSelectTenant,
  onImpersonate,
  onQuickRenew,
}) => {
  const { theme } = useTheme();
  const { isWide } = useResponsive();

  // Plan distribution calculation
  const planCounts = React.useMemo(() => {
    const counts = { trial: 0, standard: 0, pro: 0, enterprise: 0 };
    allTenants.forEach((t) => {
      if (counts[t.subscriptionPlan] !== undefined) {
        counts[t.subscriptionPlan]++;
      }
    });
    return counts;
  }, [allTenants]);

  // Aggregate recent invoices
  const recentInvoices = React.useMemo(() => {
    const list: (SaaSInvoiceRecord & { tenantName?: string })[] = [];
    Object.entries(invoicesByTenant).forEach(([tenantId, invList]) => {
      const tenant = allTenants.find((t) => t.id === tenantId);
      invList.forEach((inv) => {
        list.push({ ...inv, tenantName: tenant?.name || tenantId });
      });
    });
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [invoicesByTenant, allTenants]);

  const totalDevices = React.useMemo(() => {
    return allTenants.reduce((sum, t) => sum + (t.deviceCount || 0), 0);
  }, [allTenants]);

  const totalBranches = React.useMemo(() => {
    return allTenants.reduce((sum, t) => sum + (t.branchCount || 0), 0);
  }, [allTenants]);

  return (
    <View style={{ gap: 16 }}>
      {/* 4 Thẻ KPI Điều Hành Cân Đối */}
      <View
        style={
          isWide
            ? { flexDirection: 'row', gap: 14 }
            : { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }
        }
      >
        {/* Card 1: Doanh Thu MRR */}
        <View
          style={[
            s.kpiCard,
            {
              flex: isWide ? 1 : undefined,
              width: isWide ? undefined : '48.5%',
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={s.kpiHeader}>
            <AppText variant="xs" color={theme.text.muted}>
              Doanh Thu Tháng (MRR)
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: theme.brand.accent + '15' }]}>
              <Icon name="cash-multiple" size={18} color={theme.brand.accent} />
            </View>
          </View>
          <AppText
            variant="lg"
            weight="bold"
            color={theme.brand.accent}
            tabularNums
            style={{ marginTop: 8 }}
          >
            {metrics.totalMRR.toLocaleString('vi-VN')} đ
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
            ARR: {metrics.annualARR.toLocaleString('vi-VN')} đ/năm
          </AppText>
        </View>

        {/* Card 2: Tổng Khách Thuê */}
        <View
          style={[
            s.kpiCard,
            {
              flex: isWide ? 1 : undefined,
              width: isWide ? undefined : '48.5%',
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={s.kpiHeader}>
            <AppText variant="xs" color={theme.text.muted}>
              Tổng Khách Thuê
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: theme.brand.primary + '15' }]}>
              <Icon name="storefront-outline" size={18} color={theme.brand.primary} />
            </View>
          </View>
          <AppText
            variant="lg"
            weight="bold"
            color={theme.text.primary}
            tabularNums
            style={{ marginTop: 8 }}
          >
            {metrics.totalTenants} quán
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
            {totalBranches} chi nhánh · {totalDevices} POS
          </AppText>
        </View>

        {/* Card 3: Đang Hoạt Động */}
        <View
          style={[
            s.kpiCard,
            {
              flex: isWide ? 1 : undefined,
              width: isWide ? undefined : '48.5%',
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={s.kpiHeader}>
            <AppText variant="xs" color={theme.text.muted}>
              Đang Hoạt Động
            </AppText>
            <View style={[s.kpiIconBox, { backgroundColor: theme.brand.success + '15' }]}>
              <Icon name="check-circle-outline" size={18} color={theme.brand.success} />
            </View>
          </View>
          <AppText
            variant="lg"
            weight="bold"
            color={theme.brand.success}
            tabularNums
            style={{ marginTop: 8 }}
          >
            {metrics.activeTenants} quán
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
            Tỷ lệ duy trì: {metrics.renewalRate}%
          </AppText>
        </View>

        {/* Card 4: Cần Thu Phí / Hết Hạn */}
        <View
          style={[
            s.kpiCard,
            {
              flex: isWide ? 1 : undefined,
              width: isWide ? undefined : '48.5%',
              backgroundColor: theme.surface.card,
              borderColor: metrics.expiringTenants > 0 ? theme.brand.danger : theme.border.subtle,
            },
          ]}
        >
          <View style={s.kpiHeader}>
            <AppText variant="xs" color={theme.text.muted}>
              Cần Thu Phí / Hết Hạn
            </AppText>
            <View
              style={[
                s.kpiIconBox,
                {
                  backgroundColor:
                    (metrics.expiringTenants > 0 ? theme.brand.danger : theme.text.muted) + '15',
                },
              ]}
            >
              <Icon
                name="alert-circle-outline"
                size={18}
                color={metrics.expiringTenants > 0 ? theme.brand.danger : theme.text.muted}
              />
            </View>
          </View>
          <AppText
            variant="lg"
            weight="bold"
            color={metrics.expiringTenants > 0 ? theme.brand.danger : theme.text.primary}
            tabularNums
            style={{ marginTop: 8 }}
          >
            {metrics.expiringTenants} quán
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
            {metrics.suspendedTenants} quán tạm khóa
          </AppText>
        </View>
      </View>

      {/* Bố Cục 2 Cột Desktop: Cảnh Báo Thu Phí (60%) & Phân Bổ Gói (40%) */}
      <View
        style={
          isWide
            ? { flexDirection: 'row', gap: 16, alignItems: 'stretch' }
            : { gap: 16 }
        }
      >
        {/* Cột Trái: Danh Sách Quán Cần Thu Phí & Hết Hạn */}
        <View
          style={[
            s.sectionCard,
            {
              flex: isWide ? 1.4 : undefined,
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="bell-ring-outline" size={18} color={theme.brand.accent} />
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Quán Cần Thu Phí & Hạn Hợp Đồng
              </AppText>
            </View>
            <View
              style={{
                backgroundColor: (urgentTenants.length > 0 ? theme.brand.danger : theme.brand.success) + '18',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}
            >
              <AppText
                variant="xs"
                weight="medium"
                color={urgentTenants.length > 0 ? theme.brand.danger : theme.brand.success}
                tabularNums
              >
                {urgentTenants.length} quán
              </AppText>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            {urgentTenants.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.brand.success + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="shield-check" size={26} color={theme.brand.success} />
                </View>
                <AppText variant="md" weight="medium" color={theme.text.primary}>
                  Toàn bộ quán đang hoạt động an toàn
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
                  Không có quán nào quá hạn hoặc cần thu phí khẩn cấp trong 14 ngày tới.
                </AppText>
              </View>
            ) : (
              urgentTenants.map((t, idx) => {
                const isLast = idx === urgentTenants.length - 1;
                const tier = getExpiryTier(t.licenseDaysLeft, t.isActive);

                return (
                  <View
                    key={t.id}
                    style={[
                      s.expiringRow,
                      !isLast && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        onSelectTenant(t.id);
                      }}
                      style={{ flex: 1, marginRight: 12 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                          {t.name}
                        </AppText>
                        <View
                          style={{
                            backgroundColor: tier.bgColor,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <AppText variant="xxs" weight="medium" color={tier.color}>
                            {tier.label}
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 3 }}>
                        Mã: {t.subdomain} · SĐT: {t.phone} · {t.ownerName}
                      </AppText>

                      <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                        Gói {SAAS_PLAN_NAMES[t.subscriptionPlan]} · {t.monthlyFee.toLocaleString('vi-VN')} đ/tháng
                      </AppText>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {onQuickRenew && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            playTapSound();
                            onQuickRenew(t);
                          }}
                          style={[s.miniActionBtn, { backgroundColor: theme.brand.accent }]}
                        >
                          <Icon name="lightning-bolt" size={13} color={theme.text.onBrand} />
                          <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                            Gia Hạn
                          </AppText>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          onImpersonate(t);
                        }}
                        style={[s.miniActionBtn, { backgroundColor: theme.surface.app, borderWidth: 1, borderColor: theme.border.subtle }]}
                      >
                        <Icon name="shield-account" size={13} color={theme.text.primary} />
                        <AppText variant="xs" weight="medium" color={theme.text.primary}>
                          Hỗ Trợ
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Cột Phải: Phân Bổ Gói Cước & Hạ Tầng */}
        <View
          style={[
            s.sectionCard,
            {
              flex: isWide ? 1 : undefined,
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="chart-pie" size={18} color={theme.brand.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Phân Bổ Gói Cước
              </AppText>
            </View>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              {allTenants.length} khách
            </AppText>
          </View>

          <View style={{ padding: 16, gap: 14 }}>
            {(
              [
                { plan: 'pro' as const, label: 'Chuyên Nghiệp (PRO)', count: planCounts.pro, color: theme.brand.accent },
                { plan: 'standard' as const, label: 'Gói Chuẩn (STANDARD)', count: planCounts.standard, color: theme.brand.primary },
                { plan: 'enterprise' as const, label: 'Doanh Nghiệp (ENTERPRISE)', count: planCounts.enterprise, color: theme.brand.accent },
                { plan: 'trial' as const, label: 'Dùng Thử (TRIAL)', count: planCounts.trial, color: theme.text.muted },
              ] as const
            ).map((item) => {
              const total = allTenants.length || 1;
              const percent = Math.round((item.count / total) * 100);

              return (
                <View key={item.plan} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      {item.label}
                    </AppText>
                    <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
                      {item.count} quán ({percent}%)
                    </AppText>
                  </View>
                  <View style={[s.progressBarBg, { backgroundColor: theme.surface.app }]}>
                    <View
                      style={[
                        s.progressBarFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            {/* Thống kê hạ tầng nhanh */}
            <View
              style={{
                marginTop: 6,
                paddingTop: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border.subtle,
                flexDirection: 'row',
                justifyContent: 'space-around',
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Chi Nhánh</AppText>
                <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                  {totalBranches}
                </AppText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Máy POS</AppText>
                <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                  {totalDevices}
                </AppText>
              </View>
              <View style={{ alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Uptime</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                  99.9%
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Hàng 3: Dòng Tiền & Hóa Đơn Thu Phí Gần Đây */}
      {recentInvoices.length > 0 && (
        <View
          style={[
            s.sectionCard,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="history" size={18} color={theme.brand.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Nhật Ký Thu Phí SaaS Gần Đây
              </AppText>
            </View>
            <AppText variant="xs" color={theme.text.muted}>
              5 giao dịch mới nhất
            </AppText>
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            {recentInvoices.map((inv, idx) => {
              const isLast = idx === recentInvoices.length - 1;
              return (
                <View
                  key={inv.id}
                  style={[
                    s.invoiceRow,
                    !isLast && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AppText variant="xs" weight="medium" color={theme.brand.accent} tabularNums>
                        {inv.invoiceCode}
                      </AppText>
                      <AppText variant="sm" weight="normal" color={theme.text.primary}>
                        {inv.tenantName}
                      </AppText>
                    </View>
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                      {inv.note || `Gia hạn ${inv.monthsAdded} tháng`} · {new Date(inv.createdAt).toLocaleDateString('vi-VN')}
                    </AppText>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                      +{inv.amount.toLocaleString('vi-VN')} đ
                    </AppText>
                    <View
                      style={{
                        backgroundColor: theme.brand.success + '15',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginTop: 2,
                      }}
                    >
                      <AppText variant="xxs" color={theme.brand.success}>
                        {inv.paymentMethod === 'vietqr' ? 'VietQR 24/7' : 'Chuyển Khoản'}
                      </AppText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  kpiCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expiringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
});

