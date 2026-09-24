import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText } from '../../../lib/components/ui/AppText';
import { useAppToast } from '../../../lib/components/ui/AppToast';
import { useStoreSettings } from '../../../lib/store/usePOSStore';
import { RangeConfig, DateRangeKey, SoldProductRecord } from './types';
import { ReportRevenueBarChart } from './ReportRevenueBarChart';
import { playTapSound } from '../../../lib/utils/sound';

interface ReportOverviewTabProps {
  rangeConfig: RangeConfig;
  selectedRange?: DateRangeKey;
  onViewAllSoldItems?: () => void;
  onSelectProduct?: (prod: SoldProductRecord) => void;
}

export const ReportOverviewTab: React.FC<ReportOverviewTabProps> = ({
  rangeConfig,
  selectedRange = 'today',
  onViewAllSoldItems,
  onSelectProduct,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const storeSettings = useStoreSettings();
  const { showToast } = useAppToast();
  const router = useRouter();

  const [taxAccordionOpen, setTaxAccordionOpen] = useState(false);

  const foodCostRatio = rangeConfig.revenue > 0
    ? ((rangeConfig.foodCost / rangeConfig.revenue) * 100).toFixed(1)
    : '0';

  const cashSales = rangeConfig.cashSales ?? Math.max(0, rangeConfig.revenue - rangeConfig.vietqrTotal - (rangeConfig.cardTotal || 0));
  const vatTT40 = Math.round(rangeConfig.revenue * 0.01);
  const tncnTT40 = Math.round(rangeConfig.revenue * 0.005);
  const taxTT40 = vatTT40 + tncnTT40;
  const hasVat = Boolean(storeSettings.vatRate && storeSettings.vatRate > 0);
  const vatAmount = hasVat ? Math.round(rangeConfig.revenue * ((storeSettings.vatRate || 10) / 100)) : 0;

  const handleShareTaxReport = async () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const lines = [
      `BÁO CÁO DOANH THU KHAI THUẾ - ${(storeSettings.storeName || 'ONGCHU POS').toUpperCase()}`,
      `Kỳ kê khai: ${rangeConfig.label} (${rangeConfig.dateText})`,
      `--------------------------------`,
      `• Tổng doanh thu chịu thuế: ${rangeConfig.revenue.toLocaleString('vi-VN')} đ`,
      `• Doanh thu chuyển khoản (khớp sao kê NH): ${rangeConfig.vietqrTotal.toLocaleString('vi-VN')} đ`,
      `• Doanh thu tiền mặt tại quầy: ${cashSales.toLocaleString('vi-VN')} đ`,
      `• Số hóa đơn xuất bán: ${rangeConfig.orderCount} đơn`,
      `--------------------------------`,
      `• Thuế khoán HKD (1.5% TT40): ${taxTT40.toLocaleString('vi-VN')} đ`,
      `  - Thuế GTGT (1%): ${vatTT40.toLocaleString('vi-VN')} đ`,
      `  - Thuế TNCN (0.5%): ${tncnTT40.toLocaleString('vi-VN')} đ`,
    ];
    if (hasVat) {
      lines.push(`• Thuế VAT (${storeSettings.vatRate}%): ${vatAmount.toLocaleString('vi-VN')} đ`);
    }

    const message = lines.join('\n');

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        showToast({
          title: 'Đã Sao Chép',
          message: 'Đã chép số liệu thuế!',
          type: 'success',
        });
      } else {
        await Share.share({
          title: `Báo cáo khai thuế - ${rangeConfig.label}`,
          message,
        });
      }
    } catch (err) {
      console.error('Share tax error:', err);
    }
  };

  const channelBreakdown = rangeConfig.channelBreakdown || {
    dineIn: rangeConfig.revenue,
    takeaway: 0,
    delivery: 0,
  };

  const channelOrders = rangeConfig.channelOrders || {
    dineIn: 0,
    takeaway: 0,
    delivery: 0,
  };

  const paymentShare = rangeConfig.paymentShare || {
    cashAmount: cashSales,
    cashPercent: rangeConfig.revenue > 0 ? Math.round((cashSales / rangeConfig.revenue) * 100) : 0,
    vietqrAmount: rangeConfig.vietqrTotal,
    vietqrPercent: rangeConfig.revenue > 0 ? Math.round((rangeConfig.vietqrTotal / rangeConfig.revenue) * 100) : 0,
    cardAmount: rangeConfig.cardTotal || 0,
    cardPercent: 0,
  };

  const costShare = rangeConfig.costShare || {
    foodCostPercent: Number(foodCostRatio),
    operatingPercent: rangeConfig.revenue > 0 ? Math.round(((rangeConfig.operatingExpenses || rangeConfig.cashExpenses) / rangeConfig.revenue) * 100) : 0,
    fixedPercent: rangeConfig.revenue > 0 ? Math.round(((rangeConfig.fixedExpenses || 0) / rangeConfig.revenue) * 100) : 0,
    netProfitPercent: rangeConfig.profitMargin,
  };

  // 1. Hero Profit Strip
  const renderHeroProfit = () => (
    <View
      style={[
        s.glassHeroProfit,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="sm" color={theme.text.muted}>
              Lợi Nhuận Bỏ Túi ({rangeConfig.label}):
            </AppText>
            <View
              style={[
                s.marginBadge,
                {
                  backgroundColor:
                    rangeConfig.profitMargin >= 20
                      ? 'rgba(21, 128, 61, 0.15)'
                      : rangeConfig.profitMargin > 0
                      ? 'rgba(180, 83, 9, 0.15)'
                      : 'rgba(220, 38, 38, 0.15)',
                },
              ]}
            >
              <AppText
                variant="xxs"
                weight="bold"
                color={
                  rangeConfig.profitMargin >= 20
                    ? theme.brand.success
                    : rangeConfig.profitMargin > 0
                    ? theme.brand.accent
                    : theme.brand.danger
                }
                tabularNums
              >
                Biên lãi {rangeConfig.profitMargin}%
              </AppText>
            </View>
          </View>
          <AppText
            variant="lg"
            weight="bold"
            color={rangeConfig.netProfit >= 0 ? theme.brand.success : theme.brand.danger}
            tabularNums
            style={{ marginTop: 2 }}
          >
            {rangeConfig.netProfit >= 0 ? '+' : ''}{rangeConfig.netProfit.toLocaleString('vi-VN')} đ
          </AppText>
        </View>
        <View style={[s.iconSquircle, { backgroundColor: rangeConfig.netProfit >= 0 ? theme.brand.success : theme.brand.danger }]}>
          <Icon name={rangeConfig.netProfit >= 0 ? 'trending-up' : 'trending-down'} size={24} color={theme.text.onBrand} />
        </View>
      </View>
      <AppText variant="sm" color={theme.text.muted} tabularNums style={{ marginTop: 6 }}>
        Doanh thu {rangeConfig.revenue.toLocaleString('vi-VN')} đ · {rangeConfig.totalSoldQty || 0} món · {rangeConfig.orderCount} đơn · AOV {rangeConfig.avgTicket.toLocaleString('vi-VN')} đ
      </AppText>
    </View>
  );

  // 2. 2-Column Cash in Drawer vs VietQR
  const renderTwoColCashStrip = () => (
    <View
      style={[
        s.glassTwoColStrip,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      {/* Cột 1: Tiền mặt */}
      <View style={s.metricCol}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="sm" color={theme.text.muted}>
            Tiền mặt thu:
          </AppText>
          <Icon name="cash-multiple" size={16} color={theme.brand.success} />
        </View>
        <AppText
          variant="md"
          weight="bold"
          color={theme.brand.success}
          tabularNums
          style={{ marginTop: 4 }}
          numberOfLines={1}
        >
          {rangeConfig.cashInDrawer.toLocaleString('vi-VN')} đ
        </AppText>
        <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
          {rangeConfig.cashExpenses > 0 ? `Đã trừ chi chợ (${paymentShare.cashPercent}%)` : `Thu tiền mặt (${paymentShare.cashPercent}%)`}
        </AppText>
      </View>

      <View style={[s.verticalDivider, { backgroundColor: theme.border.subtle }]} />

      {/* Cột 2: VietQR */}
      <View style={s.metricCol}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="sm" color={theme.text.muted}>
            VietQR MBBank:
          </AppText>
          <Icon name="qrcode-scan" size={16} color={theme.brand.accent} />
        </View>
        <AppText
          variant="md"
          weight="bold"
          color={theme.brand.accent}
          tabularNums
          style={{ marginTop: 4 }}
          numberOfLines={1}
        >
          {rangeConfig.vietqrTotal.toLocaleString('vi-VN')} đ
        </AppText>
        <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
          Đã về tài khoản ({paymentShare.vietqrPercent}%)
        </AppText>
      </View>
    </View>
  );

  // 3. Thước Đo Hiệu Suất Vận Hành & Khách Hàng (Operational Velocity 4 KPIs)
  const renderOperationalVelocity = () => (
    <View
      style={[
        s.glassBreakdownContainer,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="speedometer" size={18} color={theme.brand.primary} />
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Chỉ Số Hiệu Suất & Vận Hành
          </AppText>
        </View>
        <AppText variant="xs" color={theme.text.muted} tabularNums>
          {rangeConfig.orderCount} lượt hóa đơn
        </AppText>
      </View>

      <View style={s.velocityGrid}>
        {/* KPI 1: Lượt khách & Chi tiêu/khách */}
        <View style={[s.velocityCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={theme.text.muted}>Lượt khách</AppText>
            <Icon name="account-group-outline" size={16} color={theme.brand.primary} />
          </View>
          <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 4 }}>
            {rangeConfig.totalGuests || rangeConfig.orderCount} khách
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
            TB: {(rangeConfig.avgSpendPerGuest || rangeConfig.avgTicket).toLocaleString('vi-VN')} đ/người
          </AppText>
        </View>

        {/* KPI 2: Năng suất món / đơn */}
        <View style={[s.velocityCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={theme.text.muted}>Năng suất món</AppText>
            <Icon name="silverware-fork-knife" size={16} color={theme.brand.accent} />
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums style={{ marginTop: 4 }}>
            {rangeConfig.itemsPerOrder || 1} món / đơn
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
            Tổng: {rangeConfig.totalSoldQty} phần xuất bán
          </AppText>
        </View>

        {/* KPI 3: Khung giờ vàng */}
        <View style={[s.velocityCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={theme.text.muted}>Giờ cao điểm</AppText>
            <Icon name="clock-fast" size={16} color={theme.brand.warning} />
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.warning} numberOfLines={1} style={{ marginTop: 4 }}>
            {rangeConfig.peakHourLabel?.split(' ')[0] || '17h-21h'}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ marginTop: 2 }}>
            {rangeConfig.peakHourLabel?.split(' ')[1] || 'Đỉnh tối'}
          </AppText>
        </View>

        {/* KPI 4: Thất thoát & Đơn hủy */}
        <View style={[s.velocityCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={theme.text.muted}>Đơn hủy (Audit)</AppText>
            <Icon name="shield-check-outline" size={16} color={rangeConfig.voidCount ? theme.brand.danger : theme.brand.success} />
          </View>
          <AppText
            variant="md"
            weight="bold"
            color={rangeConfig.voidCount ? theme.brand.danger : theme.brand.success}
            tabularNums
            style={{ marginTop: 4 }}
          >
            {rangeConfig.voidCount || 0} đơn hủy
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
            {rangeConfig.voidAmount ? `-${rangeConfig.voidAmount.toLocaleString('vi-VN')} đ` : 'An toàn 100%'}
          </AppText>
        </View>
      </View>
    </View>
  );

  // 4. Top Món Bán Chạy
  const renderTopProducts = () => {
    if (!rangeConfig.topProducts || rangeConfig.topProducts.length === 0) return null;
    return (
      <View
        style={[
          s.glassBreakdownContainer,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle, gap: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <Icon name="trophy-outline" size={18} color={theme.brand.warning} />
            <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
              Top Món Bán Chạy
            </AppText>
          </View>
          {onViewAllSoldItems && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                onViewAllSoldItems();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <AppText variant="xs" color={theme.brand.primary} weight="bold">
                Xem tất cả ({rangeConfig.totalSoldQty} món)
              </AppText>
              <Icon name="chevron-right" size={14} color={theme.brand.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {rangeConfig.topProducts.slice(0, 5).map((prod, idx) => {
            const maxQty = rangeConfig.topProducts[0]?.qtySold || 1;
            const ratio = Math.min(100, Math.round((prod.qtySold / maxQty) * 100));
            const revShare = rangeConfig.revenue > 0 ? ((prod.revenue / rangeConfig.revenue) * 100).toFixed(1) : '0';
            const isLast = idx === Math.min(4, rangeConfig.topProducts.length - 1);

            return (
              <TouchableOpacity
                key={prod.id}
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  onSelectProduct?.(prod);
                }}
                style={[
                  s.topProductRow,
                  !isLast && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View
                  style={[
                    s.rankBadge,
                    {
                      backgroundColor:
                        idx === 0
                          ? theme.brand.warning
                          : idx === 1
                          ? theme.text.muted
                          : idx === 2
                          ? theme.brand.accent
                          : theme.surface.header,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight="bold"
                    color={idx < 3 ? theme.text.onBrand : theme.text.muted}
                    tabularNums
                  >
                    #{idx + 1}
                  </AppText>
                </View>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="md" color={theme.text.primary} numberOfLines={1} style={{ flex: 1 }}>
                      {prod.name}
                    </AppText>
                    <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                      {prod.revenue.toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                    <AppText variant="xs" color={theme.text.muted}>
                      {prod.category} · Chiếm {revShare}% DT
                    </AppText>
                    <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                      {prod.qtySold} phần
                    </AppText>
                  </View>

                  <View style={[s.progressBarTrack, { backgroundColor: theme.surface.header, marginTop: 4 }]}>
                    <View style={[s.progressBarFill, { width: `${ratio}%`, backgroundColor: idx === 0 ? theme.brand.warning : theme.brand.primary }]} />
                  </View>
                </View>

                <Icon name="chevron-right" size={16} color={theme.text.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // 5. Bóc Tách Doanh Thu & Cơ Cấu 3 Chi Phí + Thanh Tỷ Trọng Ngang
  const renderCostBreakdown = () => (
    <View
      style={[
        s.glassBreakdownContainer,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="chart-pie" size={18} color={theme.brand.primary} />
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Bóc Tách Doanh Thu & Cơ Cấu Chi Phí
          </AppText>
        </View>
        <AppText variant="xs" color={theme.text.muted} tabularNums>
          Biên lãi: {rangeConfig.profitMargin}%
        </AppText>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Stacked Cost Ratio Bar */}
        <View style={{ marginVertical: 8 }}>
          <View style={s.stackedRatioBar}>
            {/* Lãi ròng (Xanh lá) */}
            {costShare.netProfitPercent > 0 && (
              <View style={[s.ratioSegment, { width: `${costShare.netProfitPercent}%`, backgroundColor: theme.brand.success }]} />
            )}
            {/* Giá vốn Food Cost (Đỏ) */}
            {costShare.foodCostPercent > 0 && (
              <View style={[s.ratioSegment, { width: `${costShare.foodCostPercent}%`, backgroundColor: theme.brand.danger }]} />
            )}
            {/* Chi hoạt động (Cam) */}
            {costShare.operatingPercent > 0 && (
              <View style={[s.ratioSegment, { width: `${costShare.operatingPercent}%`, backgroundColor: theme.brand.accent }]} />
            )}
            {/* Chi cố định (Xám/Vàng) */}
            {costShare.fixedPercent > 0 && (
              <View style={[s.ratioSegment, { width: `${costShare.fixedPercent}%`, backgroundColor: theme.text.muted }]} />
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[s.legendDot, { backgroundColor: theme.brand.success }]} />
              <AppText variant="xxs" color={theme.text.muted}>Lãi {costShare.netProfitPercent}%</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[s.legendDot, { backgroundColor: theme.brand.danger }]} />
              <AppText variant="xxs" color={theme.text.muted}>Vốn {costShare.foodCostPercent}%</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[s.legendDot, { backgroundColor: theme.brand.accent }]} />
              <AppText variant="xxs" color={theme.text.muted}>Chợ {costShare.operatingPercent}%</AppText>
            </View>
            {costShare.fixedPercent > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[s.legendDot, { backgroundColor: theme.text.muted }]} />
                <AppText variant="xxs" color={theme.text.muted}>Cố định {costShare.fixedPercent}%</AppText>
              </View>
            )}
          </View>
        </View>

        {/* Bảng kê chi tiết từng dòng */}
        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <AppText variant="md" color={theme.text.muted}>
            Doanh thu bán hàng:
          </AppText>
          <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
            +{rangeConfig.revenue.toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View>
            <AppText variant="md" color={theme.text.muted}>
              1. Giá vốn (Food Cost):
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
              Định mức: {foodCostRatio}% doanh thu
            </AppText>
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
            -{rangeConfig.foodCost.toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View>
            <AppText variant="md" color={theme.text.muted}>
              2. Chi hoạt động (Chi chợ):
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
              Đá, rau, thịt, bao bì ({costShare.operatingPercent}%)
            </AppText>
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
            -{(rangeConfig.operatingExpenses || rangeConfig.cashExpenses).toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        {rangeConfig.fixedExpenses > 0 && (
          <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View>
              <AppText variant="md" color={theme.text.muted}>
                3. Chi cố định (Mặt bằng/Lương):
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                Điện, nước, mặt bằng, lương ({costShare.fixedPercent}%)
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
              -{rangeConfig.fixedExpenses.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}

        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <AppText variant="md" color={theme.text.muted}>
            Giá trị đơn TB (AOV):
          </AppText>
          <AppText variant="md" color={theme.text.primary} tabularNums>
            {rangeConfig.avgTicket.toLocaleString('vi-VN')} đ / đơn
          </AppText>
        </View>

        <View style={[s.row, { paddingTop: 12, alignItems: 'center' }]}>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Lợi nhuận ròng đút túi:
            </AppText>
            <AppText variant="xs" color={theme.brand.accent} weight="bold" tabularNums style={{ marginTop: 2 }}>
              Biên lãi ròng: {rangeConfig.profitMargin}%
            </AppText>
          </View>
          <AppText
            variant="md"
            weight="bold"
            color={rangeConfig.netProfit >= 0 ? theme.brand.success : theme.brand.danger}
            tabularNums
          >
            {rangeConfig.netProfit >= 0 ? '+' : ''}{rangeConfig.netProfit.toLocaleString('vi-VN')} đ
          </AppText>
        </View>
      </View>
    </View>
  );

  // 6. Phân Bổ Kênh Bán Hàng & Phương Thức Thanh Toán
  const renderChannelBreakdown = () => (
    <View
      style={[
        s.glassBreakdownContainer,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      <View style={[s.cardHeader, { borderBottomColor: theme.border.subtle }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="storefront-outline" size={18} color={theme.brand.primary} />
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Kênh Bán & Phương Thức Thanh Toán
          </AppText>
        </View>
        <AppText variant="xs" color={theme.text.muted} tabularNums>
          {rangeConfig.orderCount} đơn
        </AppText>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Phân bổ kênh bán */}
        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="table-chair" size={18} color={theme.brand.primary} />
            <View>
              <AppText variant="md" color={theme.text.primary}>Tại bàn:</AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>{channelOrders.dineIn} đơn</AppText>
            </View>
          </View>
          <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
            {channelBreakdown.dineIn.toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="bag-personal-outline" size={18} color={theme.brand.accent} />
            <View>
              <AppText variant="md" color={theme.text.primary}>Mang về:</AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>{channelOrders.takeaway} đơn</AppText>
            </View>
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
            {channelBreakdown.takeaway.toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="moped-outline" size={18} color={theme.brand.success} />
            <View>
              <AppText variant="md" color={theme.text.primary}>Giao hàng:</AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>{channelOrders.delivery} đơn</AppText>
            </View>
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
            {channelBreakdown.delivery.toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        {/* Tỷ trọng phương thức thanh toán */}
        <View style={[s.row, { borderBottomWidth: 0, paddingTop: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="credit-card-outline" size={18} color={theme.brand.primary} />
            <AppText variant="md" color={theme.text.muted}>Tỷ trọng thanh toán:</AppText>
          </View>
          <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
            {paymentShare.cashPercent}% Két : {paymentShare.vietqrPercent}% QR
          </AppText>
        </View>
      </View>
    </View>
  );

  // 7. Bảng Khai Thuế HKD (Thông tư 40) - Accordion Gọn Gàng
  const renderTaxReport = () => (
    <View
      style={[
        s.glassBreakdownContainer,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.subtle,
          borderRadius: isWide ? 16 : 0,
          borderWidth: isWide ? 1 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          playTapSound();
          setTaxAccordionOpen(!taxAccordionOpen);
        }}
        style={[s.cardHeader, !taxAccordionOpen && { borderBottomWidth: 0 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <Icon name="bank-outline" size={18} color={theme.brand.accent} />
          <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
            Thuế HKD (1.5% TT40)
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
            {taxTT40.toLocaleString('vi-VN')} đ
          </AppText>
          <Icon
            name={taxAccordionOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.text.muted}
          />
        </View>
      </TouchableOpacity>

      {taxAccordionOpen && (
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <AppText variant="md" color={theme.text.muted}>
              Doanh thu tính thuế:
            </AppText>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
              {rangeConfig.revenue.toLocaleString('vi-VN')} đ
            </AppText>
          </View>

          <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" color={theme.text.muted}>
                CK ngân hàng:
              </AppText>
              <View style={[s.tagBadge, { backgroundColor: theme.status.cookingBg }]}>
                <AppText variant="xxs" color={theme.brand.accent} weight="bold">
                  Khớp sao kê
                </AppText>
              </View>
            </View>
            <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
              {rangeConfig.vietqrTotal.toLocaleString('vi-VN')} đ
            </AppText>
          </View>

          <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <AppText variant="md" color={theme.text.muted}>
              Tiền mặt tại quầy:
            </AppText>
            <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
              {cashSales.toLocaleString('vi-VN')} đ
            </AppText>
          </View>

          <View style={[s.row, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <AppText variant="md" color={theme.text.muted}>
              Số hóa đơn xuất:
            </AppText>
            <AppText variant="md" color={theme.text.primary} tabularNums>
              {rangeConfig.orderCount} đơn {rangeConfig.eInvoiceCount ? `(${rangeConfig.eInvoiceCount} HĐĐT)` : ''}
            </AppText>
          </View>

          <View style={[s.row, !hasVat && { borderBottomWidth: 0 }, hasVat && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View>
              <AppText variant="md" color={theme.text.muted}>
                Thuế khoán (1.5% TT40):
              </AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                GTGT 1%: {vatTT40.toLocaleString('vi-VN')} đ · TNCN 0.5%: {tncnTT40.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
              {taxTT40.toLocaleString('vi-VN')} đ
            </AppText>
          </View>

          {hasVat && (
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <AppText variant="md" color={theme.text.muted}>
                Thuế VAT ({storeSettings.vatRate}%):
              </AppText>
              <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
                {vatAmount.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
              <Icon name="information-outline" size={16} color={theme.text.muted} />
              <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                Chuẩn hóa sao kê eTax Mobile
              </AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShareTaxReport}
              style={[
                s.taxShareButton,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.1)',
                  borderColor: theme.border.subtle,
                },
              ]}
            >
              <Icon name="share-variant-outline" size={16} color={theme.brand.accent} />
              <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                Gửi Kế Toán
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // 8. Đánh Giá Tình Hình Thực Chiến & Khuyến Nghị Hành Động (AI Insight Banner with Action Buttons)
  const renderAIInsight = () => {
    const isFoodCostHigh = Number(foodCostRatio) > 35;
    const isCashInDrawerHigh = rangeConfig.cashInDrawer > 10000000;

    return (
      <View
        style={[
          s.glassInsight,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            padding: 16,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Icon name="lightbulb-on-outline" size={18} color={theme.brand.accent} />
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Đánh Giá & Khuyến Nghị Vận Hành
          </AppText>
        </View>

        <View style={{ gap: 10 }}>
          {/* Insight 1: Food Cost */}
          <View style={[s.insightItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color={theme.text.primary}>
                • Định mức Food Cost: <AppText variant="md" weight="bold" color={isFoodCostHigh ? theme.brand.danger : theme.brand.success} tabularNums>{foodCostRatio}%</AppText> {isFoodCostHigh ? '(Cao hơn mức trần 35%)' : '(Đạt chuẩn F&B 30-35%)'}
              </AppText>
            </View>
            {isFoodCostHigh && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  router.push('/kho-hang');
                }}
                style={[s.insightActionBtn, { backgroundColor: theme.brand.primary }]}
              >
                <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                  Kiểm Tra Kho
                </AppText>
              </TouchableOpacity>
            )}
          </View>

          {/* Insight 2: Cash in drawer security */}
          <View style={[s.insightItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color={theme.text.primary}>
                • Tiền mặt két: <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>{rangeConfig.cashInDrawer.toLocaleString('vi-VN')} đ</AppText> {isCashInDrawerHigh ? '· Khuyên rút bớt nộp NH' : '· Dồi dào tiền thối ca'}
              </AppText>
            </View>
            {isCashInDrawerHigh && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  router.push('/so-quy');
                }}
                style={[s.insightActionBtn, { backgroundColor: theme.brand.accent }]}
              >
                <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                  Rút Bớt Két
                </AppText>
              </TouchableOpacity>
            )}
          </View>

          {/* Insight 3: Peak hour & combo */}
          <View style={[s.insightItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color={theme.text.primary}>
                • Giờ vàng: <AppText variant="md" weight="bold" color={theme.brand.warning}>{rangeConfig.peakHourLabel || '17h-21h (Đỉnh tối)'}</AppText> · Biên lãi <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>{rangeConfig.profitMargin}%</AppText>
              </AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                playTapSound();
                router.push('/thuc-don');
              }}
              style={[s.insightActionBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth }]}
            >
              <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                Xem Món
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isWide || isDesktopLarge) {
    return (
      <View style={{ gap: 14 }}>
        {/* 2-COLUMN DASHBOARD CHO MÀN HÌNH DESKTOP / TABLET WIDE */}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {/* CỘT TRÁI (52%): KPI LỢI NHUẬN + KÉT TIỀN + CHỈ SỐ VẬN HÀNH + BIỂU ĐỒ DOANH THU + AI INSIGHT */}
          <View style={{ flex: 1.08, gap: 14 }}>
            {renderHeroProfit()}
            {renderTwoColCashStrip()}
            {renderOperationalVelocity()}
            <ReportRevenueBarChart rangeConfig={rangeConfig} selectedRange={selectedRange} />
            {renderAIInsight()}
          </View>

          {/* CỘT PHẢI (48%): TOP MÓN + BÓC TÁCH CHI PHÍ + KÊNH BÁN + THUẾ TT40 */}
          <View style={{ flex: 1, gap: 14 }}>
            {renderTopProducts()}
            {renderCostBreakdown()}
            {renderChannelBreakdown()}
            {renderTaxReport()}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: isWide ? 12 : 14 }}>
      {renderHeroProfit()}
      {renderTwoColCashStrip()}
      {renderOperationalVelocity()}
      <ReportRevenueBarChart rangeConfig={rangeConfig} selectedRange={selectedRange} />
      {renderTopProducts()}
      {renderCostBreakdown()}
      {renderChannelBreakdown()}
      {renderTaxReport()}
      {renderAIInsight()}
    </View>
  );
};

const s = StyleSheet.create({
  glassHeroProfit: {
    padding: 16,
    borderRadius: 16,
  },
  marginBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  iconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassTwoColStrip: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
  },
  metricCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  verticalDivider: {
    width: 1,
    marginVertical: 4,
  },
  glassBreakdownContainer: {
    borderRadius: 16,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  velocityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
  },
  velocityCard: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stackedRatioBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    width: '100%',
  },
  ratioSegment: {
    height: '100%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 48,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  glassInsight: {
    borderRadius: 16,
    padding: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  insightActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  taxShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taxFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    marginBottom: 8,
  },
});
