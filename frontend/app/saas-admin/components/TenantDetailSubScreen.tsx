import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, useAppToast, AppHeader } from '../../../lib/components/ui';
import {
  useSaaSAdminStore,
  SaaSTenant,
  SaaSPlan,
  SAAS_PLAN_TIERS,
  DEFAULT_TENANT_DEVICES,
  DEFAULT_TENANT_ADDONS,
  DEFAULT_SAAS_INVOICES,
  DEFAULT_TENANT_BRANCHES,
  TenantBranch,
  TenantDevice,
  TenantAddon,
  SaaSInvoiceRecord,
} from '../../../lib/store/useSaaSAdminStore';
import { playTapSound } from '../../../lib/utils/sound';
import {
  SAAS_ADDON_OPTIONS,
  SAAS_PLAN_NAMES,
  SaaSDetailSegment,
} from '../constants';

interface TenantDetailSubScreenProps {
  selectedTenant: SaaSTenant;
  detailSegment: SaaSDetailSegment;
  setDetailSegment: (s: SaaSDetailSegment) => void;
  onBack: () => void;
  onImpersonate: (tenant: SaaSTenant) => void;
  onToggleStatus: (tenant: SaaSTenant) => void;
  onDeleteTenant: (tenant: SaaSTenant) => void;
  plans?: any;
}

export const TenantDetailSubScreen: React.FC<TenantDetailSubScreenProps> = ({
  selectedTenant,
  detailSegment,
  setDetailSegment,
  onBack,
  onImpersonate,
  onToggleStatus,
  onDeleteTenant,
  plans,
}) => {
  const { theme } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const [renewMonths, setRenewMonths] = useState<number>(3);
  const [inlineRescueInfo, setInlineRescueInfo] = useState<{
    pin: string;
    code: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [redeemKeyInput, setRedeemKeyInput] = useState<string>('');
  const [isRedeemingKey, setIsRedeemingKey] = useState(false);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<string | null>(null);

  // Branch creation state
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Store hooks
  const updateTenantPlan = useSaaSAdminStore((s) => s.updateTenantPlan || s.changeTenantPlan);
  const renewTenant = useSaaSAdminStore((s) => s.renewTenant || s.renewTenantLicense);
  const resetTenantPin = useSaaSAdminStore((s) => s.resetTenantPin);
  const generateRescueCode = useSaaSAdminStore((s) => s.generateRescueCode);
  const redeemLicenseKey = useSaaSAdminStore((s) => s.redeemLicenseKey);
  const getTenantQuota = useSaaSAdminStore((s) => s.getTenantQuota);
  const branchesByTenant = useSaaSAdminStore((s) => s.branchesByTenant);
  const devicesByTenant = useSaaSAdminStore((s) => s.devicesByTenant);
  const addonsByTenant = useSaaSAdminStore((s) => s.addonsByTenant);
  const invoicesByTenant = useSaaSAdminStore((s) => s.invoicesByTenant);
  const addTenantBranch = useSaaSAdminStore((s) => s.addTenantBranch || s.createTenantBranch);
  const toggleBranchStatus = useSaaSAdminStore((s) => s.toggleBranchStatus || s.toggleTenantBranchStatus);
  const toggleDeviceStatus = useSaaSAdminStore((s) => s.toggleDeviceStatus || s.toggleTenantDeviceStatus);
  const unbindDevice = useSaaSAdminStore((s) => s.unbindDevice || s.unbindTenantDevice);
  const toggleTenantAddon = useSaaSAdminStore((s) => s.toggleTenantAddon);

  const planCfg = (plans && plans[selectedTenant.subscriptionPlan]) || SAAS_PLAN_TIERS[selectedTenant.subscriptionPlan];
  const isExpiringSoon = selectedTenant.licenseDaysLeft <= 14 && selectedTenant.licenseDaysLeft > 0;
  const isExpired = selectedTenant.licenseDaysLeft === 0;

  const tenantBranches: TenantBranch[] = branchesByTenant[selectedTenant.id] || DEFAULT_TENANT_BRANCHES[selectedTenant.id] || [];
  const tenantDevices: TenantDevice[] = devicesByTenant[selectedTenant.id] || DEFAULT_TENANT_DEVICES[selectedTenant.id] || [];
  const tenantAddons: TenantAddon[] = addonsByTenant[selectedTenant.id] || DEFAULT_TENANT_ADDONS[selectedTenant.id] || [];
  const tenantInvoices: SaaSInvoiceRecord[] = invoicesByTenant[selectedTenant.id] || DEFAULT_SAAS_INVOICES[selectedTenant.id] || [];
  const activeAddonsCount = tenantAddons.filter((a) => a.isEnabled).length;
  const quota = getTenantQuota(selectedTenant.id);

  const handleChangePlan = async (tenantId: string, plan: SaaSPlan) => {
    playTapSound();
    try {
      await updateTenantPlan(tenantId, plan);
      showToast({
        title: 'Đổi Gói Thành Công',
        message: `Đã chuyển sang gói ${SAAS_PLAN_NAMES[plan]}.`,
        type: 'success',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Đổi Gói',
        message: e?.message || 'Không thể đổi gói',
        type: 'danger',
      });
    }
  };

  const handleRedeemKey = async (tenantId: string) => {
    if (!redeemKeyInput.trim()) return;
    playTapSound();
    setIsRedeemingKey(true);
    try {
      const res = await redeemLicenseKey(tenantId, redeemKeyInput.trim().toUpperCase());
      showToast({
        title: 'Nạp Key Thành Công',
        message: `Đã kích hoạt thêm ${res.daysAdded} ngày cho gói ${(res.plan || '').toUpperCase()}.`,
        type: 'success',
      });
      setRedeemKeyInput('');
    } catch (e: any) {
      showToast({
        title: 'Nạp Key Thất Bại',
        message: e?.message || 'Mã key không hợp lệ hoặc đã dùng',
        type: 'danger',
      });
    } finally {
      setIsRedeemingKey(false);
    }
  };

  const handleInlineRenew = async (tenantId: string, months: number) => {
    playTapSound();
    setIsProcessingAction(true);
    try {
      await renewTenant(tenantId, months);
      showToast({
        title: 'Gia Hạn Thành Công',
        message: `Đã cộng thêm ${months} tháng bản quyền cho quán.`,
        type: 'success',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Gia Hạn',
        message: e?.message || 'Không thể gia hạn',
        type: 'danger',
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleInlineRescue = async (tenantId: string) => {
    playTapSound();
    setIsProcessingAction(true);
    try {
      const rescueFn = generateRescueCode || resetTenantPin;
      const res = await rescueFn!(tenantId);
      setInlineRescueInfo({
        pin: (res as any).ownerPinReset || (res as any).ownerPin || '9999',
        code: res.rescueCode,
      });
      showToast({
        title: 'Cấp Cứu Hộ Thành Công',
        message: 'Đã tạo mã gỡ thiết bị và đặt lại PIN Chủ Quán 9999.',
        type: 'success',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Cứu Hộ',
        message: e?.message || 'Không thể tạo mã',
        type: 'danger',
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      showToast({
        title: 'Thiếu Tên Chi Nhánh',
        message: 'Nhập tên chi nhánh mới',
        type: 'warning',
      });
      return;
    }
    playTapSound();
    setIsCreatingBranch(true);
    try {
      await addTenantBranch(selectedTenant.id, {
        name: newBranchName.trim(),
        address: newBranchAddress.trim() || undefined,
        phone: newBranchPhone.trim() || undefined,
        managerName: newBranchManager.trim() || undefined,
      });
      showToast({
        title: 'Thêm Chi Nhánh Thành Công',
        message: `Chi nhánh ${newBranchName.trim()} đã được kích hoạt.`,
        type: 'success',
      });
      setNewBranchName('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      setNewBranchManager('');
      setIsAddingBranch(false);
    } catch (e: any) {
      showToast({
        title: 'Lỗi Tạo Chi Nhánh',
        message: e?.message || 'Không thể tạo chi nhánh',
        type: 'danger',
      });
    } finally {
      setIsCreatingBranch(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* Header màn hình con với nút Back chuẩn */}
      <AppHeader
        title={selectedTenant.name}
        subtitle={`Mã: ${selectedTenant.subdomain} · ${selectedTenant.phone}`}
        showBack
        showHamburger={false}
        onBack={() => {
          onBack();
          setInlineRescueInfo(null);
          setSelectedInvoiceForReceipt(null);
          setIsAddingBranch(false);
        }}
        rightCustom={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onImpersonate(selectedTenant)}
            style={[s.headerSupportBtn, { backgroundColor: theme.brand.purple }]}
            accessibilityLabel="Đăng nhập hỗ trợ kỹ thuật"
          >
            <Icon name="shield-account" size={15} color={theme.text.onBrand} />
            <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
              Hỗ Trợ POS
            </AppText>
          </TouchableOpacity>
        }
      />

      {/* Thanh 5 Segment Điều Hướng Nội Tuyến */}
      <View
        style={[
          s.tabBarWrapper,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            s.tabBarContent,
            isWide ? { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 16 } : { paddingHorizontal: 8 },
          ]}
        >
          {[
            { id: 'plan', label: 'Gói Cước', icon: 'shield-check-outline' },
            {
              id: 'branches',
              label: 'Chi Nhánh',
              icon: 'source-branch',
              badge: tenantBranches.length,
            },
            {
              id: 'devices',
              label: 'Thiết Bị',
              icon: 'devices',
              badge: tenantDevices.length,
            },
            {
              id: 'addons',
              label: 'Tính Năng',
              icon: 'puzzle-outline',
              badge: activeAddonsCount,
            },
            {
              id: 'invoices',
              label: 'Lịch Sử Thu',
              icon: 'receipt-text-outline',
              badge: tenantInvoices.length,
            },
          ].map((seg) => {
            const isSelected = detailSegment === seg.id;
            return (
              <TouchableOpacity
                key={seg.id}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setDetailSegment(seg.id as any);
                }}
                style={[
                  s.tabButton,
                  isSelected && {
                    borderBottomColor: theme.brand.accent,
                    borderBottomWidth: 3,
                  },
                ]}
              >
                <Icon
                  name={seg.icon as any}
                  size={16}
                  color={isSelected ? theme.brand.accent : theme.text.muted}
                />
                <AppText
                  variant="md"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? theme.brand.accent : theme.text.muted}
                >
                  {seg.label}
                </AppText>
                {seg.badge !== undefined && (
                  <View
                    style={[
                      s.tabBadge,
                      {
                        backgroundColor: isSelected
                          ? theme.brand.accent
                          : theme.surface.header,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight="medium"
                      tabularNums
                      color={isSelected ? theme.text.onBrand : theme.text.muted}
                    >
                      {seg.badge}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.detailScrollContent,
          isWide && { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 16 },
          { paddingBottom: isWide ? 40 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PHÂN ĐOẠN 1: GÓI CƯỚC & QUOTA */}
        {detailSegment === 'plan' && (
          <View style={isWide ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : { gap: 12 }}>
            {/* CỘT TRÁI (60%): Thông tin, Quota & Chuyển đổi gói */}
            <View style={isWide ? { flex: 1.15, gap: 14 } : { gap: 12 }}>
              {/* 1. Thẻ Nhận Diện & Trạng Thái Bản Quyền */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary}>
                        {selectedTenant.name}
                      </AppText>
                      <View style={[s.planBadge, { backgroundColor: planCfg.badgeColor + '20' }]}>
                        <AppText variant="xs" color={planCfg.badgeColor} weight="bold">
                          {SAAS_PLAN_NAMES[selectedTenant.subscriptionPlan] || planCfg.name}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
                      Mã Cửa Hàng: <AppText variant="xs" weight="bold" color={theme.text.primary}>{selectedTenant.subdomain}</AppText>
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                      Chủ Quán: <AppText variant="xs" weight="medium" color={theme.text.primary}>{selectedTenant.ownerName}</AppText> · SĐT: {selectedTenant.phone}
                    </AppText>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      s.statusPill,
                      {
                        backgroundColor: isExpired
                          ? 'rgba(239, 68, 68, 0.12)'
                          : isExpiringSoon
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(16, 185, 129, 0.12)',
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight="bold"
                      color={
                        isExpired
                          ? theme.brand.danger
                          : isExpiringSoon
                          ? theme.brand.warning
                          : theme.brand.success
                      }
                      tabularNums
                    >
                      {!selectedTenant.isActive
                        ? 'Tạm Khóa'
                        : selectedTenant.licenseDaysLeft === 0
                        ? 'Hết Hạn'
                        : `Còn ${selectedTenant.licenseDaysLeft} ngày`}
                    </AppText>
                  </View>
                </View>

                {/* 3 Cột Chỉ Số Nhanh */}
                <View style={[s.statsRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View style={s.statCol}>
                    <AppText variant="xs" color={theme.text.muted}>Hạn Bản Quyền</AppText>
                    <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                      {new Date(selectedTenant.licenseExpiresAt).toLocaleDateString('vi-VN')}
                    </AppText>
                  </View>
                  <View style={[s.statCol, { borderLeftColor: theme.border.subtle, borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 12 }]}>
                    <AppText variant="xs" color={theme.text.muted}>Phí Thuê Hàng Tháng</AppText>
                    <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
                      {selectedTenant.monthlyFee > 0 ? `${selectedTenant.monthlyFee.toLocaleString('vi-VN')} đ` : 'Miễn Phí'}
                    </AppText>
                  </View>
                  <View style={[s.statCol, { borderLeftColor: theme.border.subtle, borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 12 }]}>
                    <AppText variant="xs" color={theme.text.muted}>Quy Mô Điểm</AppText>
                    <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                      {tenantBranches.length} CN · {tenantDevices.length} POS
                    </AppText>
                  </View>
                </View>
              </View>

              {/* 2. Thẻ Thước Đo Quota Trực Quan */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="gauge" size={18} color={theme.brand.accent} />
                    <AppText variant="sm" weight="bold" color={theme.text.primary}>
                      Hạn Mức Sử Dụng Gói ({SAAS_PLAN_NAMES[selectedTenant.subscriptionPlan] || planCfg.name})
                    </AppText>
                  </View>
                  <View style={[s.planBadge, { backgroundColor: planCfg.badgeColor + '20' }]}>
                    <AppText variant="xs" color={planCfg.badgeColor} weight="bold">
                      {SAAS_PLAN_NAMES[selectedTenant.subscriptionPlan] || planCfg.name}
                    </AppText>
                  </View>
                </View>

                {/* Quota Gauge 1: Chi Nhánh */}
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="source-branch" size={15} color={theme.text.muted} />
                      <AppText variant="xs" color={theme.text.primary} weight="medium">
                        Số Chi Nhánh
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="xs" color={theme.text.primary} weight="bold" tabularNums>
                        {quota.branchCount} / {quota.maxBranches === 'unlimited' ? 'Không giới hạn' : `${quota.maxBranches} CN`}
                      </AppText>
                      {quota.isOverBranchLimit ? (
                        <View style={[s.quotaBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                          <AppText variant="xs" color={theme.brand.danger} weight="bold">
                            VƯỢT HẠN
                          </AppText>
                        </View>
                      ) : quota.isAtBranchLimit ? (
                        <View style={[s.quotaBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                          <AppText variant="xs" color={theme.brand.warning} weight="bold">
                            ĐẦY QUOTA
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={[s.quotaTrack, { backgroundColor: theme.surface.header }]}>
                    <View
                      style={[
                        s.quotaBar,
                        {
                          width: `${Math.min(100, quota.branchPercent)}%`,
                          backgroundColor:
                            quota.isOverBranchLimit
                              ? theme.brand.danger
                              : quota.isAtBranchLimit
                              ? theme.brand.warning
                              : theme.brand.accent,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Quota Gauge 2: Thiết Bị POS */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="devices" size={15} color={theme.text.muted} />
                      <AppText variant="xs" color={theme.text.primary} weight="medium">
                        Thiết Bị POS / KDS
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="xs" color={theme.text.primary} weight="bold" tabularNums>
                        {quota.deviceCount} / {quota.maxDevices === 'unlimited' ? 'Không giới hạn' : `${quota.maxDevices} Máy`}
                      </AppText>
                      {quota.isOverDeviceLimit ? (
                        <View style={[s.quotaBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                          <AppText variant="xs" color={theme.brand.danger} weight="bold">
                            VƯỢT HẠN
                          </AppText>
                        </View>
                      ) : quota.isAtDeviceLimit ? (
                        <View style={[s.quotaBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                          <AppText variant="xs" color={theme.brand.warning} weight="bold">
                            ĐẦY QUOTA
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={[s.quotaTrack, { backgroundColor: theme.surface.header }]}>
                    <View
                      style={[
                        s.quotaBar,
                        {
                          width: `${Math.min(100, quota.devicePercent)}%`,
                          backgroundColor:
                            quota.isOverDeviceLimit
                              ? theme.brand.danger
                              : quota.isAtDeviceLimit
                              ? theme.brand.warning
                              : theme.brand.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* 3. Thẻ Chuyển Đổi Gói Cước 1-Chạm */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="package-variant-closed" size={18} color={theme.brand.accent} />
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    Chuyển Đổi Gói Cước 1-Chạm
                  </AppText>
                </View>
                <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 12 }}>
                  Nâng cấp để mở rộng số chi nhánh & máy POS, hoặc hạ gói theo quy mô quán:
                </AppText>

                <View style={{ gap: 8 }}>
                  {(['trial', 'standard', 'pro', 'enterprise'] as SaaSPlan[]).map((planKey) => {
                    const tier = (plans && plans[planKey]) || SAAS_PLAN_TIERS[planKey];
                    const isCurrent = selectedTenant.subscriptionPlan === planKey;
                    return (
                      <View
                        key={planKey}
                        style={[
                          s.planSwitcherRow,
                          {
                            backgroundColor: isCurrent ? theme.brand.accent + '0D' : theme.surface.header,
                            borderColor: isCurrent ? theme.brand.accent : theme.border.subtle,
                            borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText
                              variant="sm"
                              weight={isCurrent ? 'bold' : 'medium'}
                              color={isCurrent ? theme.brand.accent : theme.text.primary}
                            >
                              {SAAS_PLAN_NAMES[planKey] || tier.name}
                            </AppText>
                            {isCurrent && (
                              <View style={[s.planBadge, { backgroundColor: theme.brand.accent + '20' }]}>
                                <AppText variant="xs" color={theme.brand.accent} weight="bold">
                                  Đang Dùng
                                </AppText>
                              </View>
                            )}
                          </View>
                          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                            {tier.pricePerMonth > 0 ? `${tier.pricePerMonth.toLocaleString('vi-VN')} đ/tháng` : 'Miễn Phí'} · {tier.maxBranches === 'unlimited' ? '∞ CN' : `Tối đa ${tier.maxBranches} CN`} · {tier.maxDevices === 'unlimited' ? '∞ POS' : `Tối đa ${tier.maxDevices} POS`}
                          </AppText>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          disabled={isCurrent}
                          onPress={() => handleChangePlan(selectedTenant.id, planKey)}
                          style={[
                            s.miniActionBtn,
                            {
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 8,
                              borderColor: isCurrent ? theme.border.subtle : theme.brand.accent,
                              borderWidth: isCurrent ? 1 : 0,
                              backgroundColor: isCurrent ? theme.surface.header : theme.brand.accent,
                            },
                          ]}
                        >
                          <AppText
                            variant="xs"
                            weight={isCurrent ? 'normal' : 'bold'}
                            color={isCurrent ? theme.text.muted : theme.text.onBrand}
                          >
                            {isCurrent ? 'Hiện Tại' : 'Chuyển Gói'}
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* CỘT PHẢI (40%): License Key, Hỗ Trợ, Gia Hạn, Cứu Hộ, Khóa, Xóa */}
            <View style={isWide ? { flex: 0.85, gap: 14 } : { gap: 12 }}>
              {/* 4. Thẻ Nạp License Key Kích Hoạt */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="key-wireless" size={18} color={theme.brand.accent} />
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    Nạp License Key
                  </AppText>
                </View>
                <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 12 }}>
                  Nhập mã key (7, 15, 30 ngày...) gia hạn tức thì:
                </AppText>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View
                    style={[
                      s.formInput,
                      {
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.subtle,
                        height: 44,
                      },
                    ]}
                  >
                    <TextInput
                      value={redeemKeyInput}
                      onChangeText={setRedeemKeyInput}
                      placeholder="VD: OC-PRO-30D-8F2A-99B1"
                      placeholderTextColor={theme.text.muted}
                      autoCapitalize="characters"
                      style={{
                        flex: 1,
                        color: theme.text.primary,
                        fontSize: 16,
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                        padding: 0,
                      }}
                    />
                    {redeemKeyInput.length > 0 && (
                      <TouchableOpacity activeOpacity={0.7} onPress={() => setRedeemKeyInput('')}>
                        <Icon name="close-circle" size={16} color={theme.text.muted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isRedeemingKey || !redeemKeyInput.trim()}
                    onPress={() => handleRedeemKey(selectedTenant.id)}
                    style={{
                      paddingHorizontal: 16,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: redeemKeyInput.trim() ? theme.brand.accent : theme.surface.header,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon
                      name="check-decagram"
                      size={16}
                      color={redeemKeyInput.trim() ? theme.text.onBrand : theme.text.muted}
                    />
                    <AppText
                      variant="sm"
                      weight="bold"
                      color={redeemKeyInput.trim() ? theme.text.onBrand : theme.text.muted}
                    >
                      {isRedeemingKey ? 'Đang Nạp...' : 'Kích Hoạt'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 5. Thẻ Đăng Nhập Hỗ Trợ Kỹ Thuật (View as Owner) */}
              <View
                style={[
                  s.detailCard,
                  s.impersonateCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.brand.accent,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1.5 : 0,
                    borderTopWidth: isWide ? 1.5 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="shield-account-outline" size={18} color={theme.brand.accent} />
                      <AppText variant="sm" weight="bold" color={theme.text.primary}>
                        Hỗ Trợ Kỹ Thuật (View as Owner)
                      </AppText>
                    </View>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      Đăng nhập trực tiếp dưới quyền Quản trị của quán để kiểm tra cấu hình & thực đơn.
                    </AppText>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onImpersonate(selectedTenant)}
                    style={[s.impersonateBtn, { backgroundColor: theme.brand.accent }]}
                  >
                    <Icon name="login" size={16} color={theme.text.onBrand} />
                    <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                      Vào Quán
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 6. Thẻ Gia Hạn Bản Quyền Nhanh */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name="calendar-clock" size={18} color={theme.brand.accent} />
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    Gia Hạn Bản Quyền Nhanh
                  </AppText>
                </View>

                <View style={s.renewChipsRow}>
                  {[
                    { months: 1, label: '+1 Tháng' },
                    { months: 3, label: '+3 Tháng' },
                    { months: 6, label: '+6 Tháng' },
                    { months: 12, label: '+1 Năm' },
                  ].map((item) => {
                    const isSelected = renewMonths === item.months;
                    return (
                      <TouchableOpacity
                        key={item.months}
                        activeOpacity={0.7}
                        onPress={() => {
                          playTapSound();
                          setRenewMonths(item.months);
                        }}
                        style={[
                          s.renewChip,
                          {
                            backgroundColor: isSelected ? theme.brand.accent : theme.surface.header,
                            borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="sm"
                          weight={isSelected ? 'bold' : 'normal'}
                          color={isSelected ? theme.text.onBrand : theme.text.primary}
                        >
                          {item.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[s.renewFooterRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View>
                    <AppText variant="xs" color={theme.text.muted}>Tạm tính phí:</AppText>
                    <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
                      {selectedTenant.monthlyFee > 0
                        ? `${(selectedTenant.monthlyFee * renewMonths).toLocaleString('vi-VN')} đ`
                        : 'Miễn Phí (Dùng Thử)'}
                    </AppText>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isProcessingAction}
                    onPress={() => handleInlineRenew(selectedTenant.id, renewMonths)}
                    style={[s.inlineRenewBtn, { backgroundColor: theme.brand.accent }]}
                  >
                    <Icon name="check-decagram-outline" size={16} color={theme.text.onBrand} />
                    <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                      {isProcessingAction ? 'Đang Xử Lý...' : `Gia Hạn +${renewMonths}T`}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 7. Khối Cứu Hộ & Mở Khóa Khẩn Cấp */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name="shield-lock-outline" size={18} color={theme.brand.warning} />
                  <AppText variant="sm" weight="normal" color={theme.text.primary}>
                    Khôi Phục Quyền & Mã Cứu Hộ Thiết Bị
                  </AppText>
                </View>
                <AppText variant="xs" color={theme.text.muted}>
                  Cấp mã cứu hộ SaaS để gỡ máy POS bị kẹt thiết bị hoặc đặt lại mã PIN Chủ Quán về mặc định (9999) khi nhân viên đổi mật mã:
                </AppText>

                {inlineRescueInfo ? (
                  <View style={[s.rescueResultBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                    <View style={{ gap: 4 }}>
                      <AppText variant="xs" color={theme.text.muted}>Mã Cứu Hộ Gỡ Thiết Bị POS (SaaS Rescue Code):</AppText>
                      <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums>
                        {inlineRescueInfo.code}
                      </AppText>
                    </View>
                    <View style={{ gap: 4, marginTop: 8 }}>
                      <AppText variant="xs" color={theme.text.muted}>Mã PIN Chủ Quán đã đặt lại:</AppText>
                      <AppText variant="md" weight="medium" color={theme.brand.danger} tabularNums>
                        {inlineRescueInfo.pin}
                      </AppText>
                    </View>
                    <View style={{ gap: 4, marginTop: 8 }}>
                      <AppText variant="xs" color={theme.text.muted}>Mật khẩu SaaS Chủ Quán (Reset về mặc định):</AppText>
                      <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                        123456
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isProcessingAction}
                    onPress={() => handleInlineRescue(selectedTenant.id)}
                    style={[s.rescueTriggerBtn, { borderColor: theme.border.subtle, backgroundColor: theme.surface.header }]}
                  >
                    <Icon name="key-wireless" size={16} color={theme.text.primary} />
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      {isProcessingAction ? 'Đang cấp...' : 'Cấp Lại PIN & Mã Cứu Hộ'}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>

              {/* 8. Khóa / Mở Quán Quản Trị */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <AppText variant="sm" weight="normal" color={theme.text.primary}>
                      Trạng Thái Hoạt Động Quán
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      {selectedTenant.isActive
                        ? 'Quán đang mở bán bình thường trên các máy POS'
                        : 'Quán đang tạm khóa, toàn bộ máy POS sẽ ngừng giao dịch'}
                    </AppText>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onToggleStatus(selectedTenant)}
                    style={[
                      s.toggleStatusBtn,
                      {
                        borderColor: selectedTenant.isActive ? theme.brand.danger : theme.brand.success,
                        backgroundColor: selectedTenant.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      },
                    ]}
                  >
                    <Icon
                      name={selectedTenant.isActive ? 'lock-outline' : 'lock-open-outline'}
                      size={15}
                      color={selectedTenant.isActive ? theme.brand.danger : theme.brand.success}
                    />
                    <AppText
                      variant="xs"
                      weight="medium"
                      color={selectedTenant.isActive ? theme.brand.danger : theme.brand.success}
                    >
                      {selectedTenant.isActive ? 'Khóa Quán' : 'Mở Quán'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 9. Vùng Nguy Hiểm: Xóa Vĩnh Viễn Quán */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.brand.danger + '33',
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                      Xóa Vĩnh Viễn Quán
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      Xóa toàn bộ database Shard SQLite, hóa đơn, chi nhánh và tài khoản
                    </AppText>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onDeleteTenant(selectedTenant)}
                    style={[
                      s.toggleStatusBtn,
                      {
                        borderColor: theme.brand.danger,
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      },
                    ]}
                  >
                    <Icon
                      name="trash-can-outline"
                      size={15}
                      color={theme.brand.danger}
                    />
                    <AppText
                      variant="xs"
                      weight="medium"
                      color={theme.brand.danger}
                    >
                      Xóa Quán
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* PHÂN ĐOẠN 2: CHI NHÁNH */}
        {detailSegment === 'branches' && (
          <>
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 18 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="source-branch" size={18} color={theme.brand.primary} />
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Danh Sách Chi Nhánh
                    </AppText>
                  </View>
                  <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
                    Hạn mức gói {planCfg.name}: {quota.branchCount}/{quota.maxBranches === 'unlimited' ? 'Không giới hạn' : `${quota.maxBranches} CN`}
                  </AppText>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    if (!isAddingBranch && quota.isAtBranchLimit) {
                      showToast({
                        title: 'Đạt Hạn Mức Chi Nhánh',
                        message: `Gói ${planCfg.name} tối đa ${quota.maxBranches} CN. Hãy nâng cấp gói!`,
                        type: 'warning',
                      });
                      return;
                    }
                    setIsAddingBranch(!isAddingBranch);
                  }}
                  style={[
                    s.miniActionBtn,
                    {
                      backgroundColor: isAddingBranch ? theme.surface.header : theme.brand.primary,
                      borderColor: isAddingBranch ? theme.border.subtle : theme.brand.primary,
                      borderWidth: StyleSheet.hairlineWidth,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    },
                  ]}
                >
                  <Icon
                    name={isAddingBranch ? 'close' : 'plus'}
                    size={14}
                    color={isAddingBranch ? theme.text.primary : theme.text.onBrand}
                  />
                  <AppText
                    variant="xs"
                    weight="medium"
                    color={isAddingBranch ? theme.text.primary : theme.text.onBrand}
                  >
                    {isAddingBranch ? 'Đóng Form' : '+ Thêm CN'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Form Thêm Chi Nhánh Mới */}
              {isAddingBranch && (
                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopColor: theme.border.subtle,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    gap: 10,
                  }}
                >
                  <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                    THÊM CHI NHÁNH MỚI (HẠN MỨC CÒN {typeof quota.maxBranches === 'number' ? quota.maxBranches - quota.branchCount : '∞'})
                  </AppText>

                  <View style={s.fieldGroup}>
                    <AppText variant="xs" color={theme.text.muted}>Tên chi nhánh *</AppText>
                    <TextInput
                      value={newBranchName}
                      onChangeText={setNewBranchName}
                      placeholder="VD: Chi Nhánh 2 - Cầu Giấy"
                      placeholderTextColor={theme.text.muted}
                      style={[s.formInput, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
                    />
                  </View>

                  <View style={s.fieldGroup}>
                    <AppText variant="xs" color={theme.text.muted}>Địa chỉ</AppText>
                    <TextInput
                      value={newBranchAddress}
                      onChangeText={setNewBranchAddress}
                      placeholder="VD: 123 Cầu Giấy, Hà Nội"
                      placeholderTextColor={theme.text.muted}
                      style={[s.formInput, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[s.fieldGroup, { flex: 1 }]}>
                      <AppText variant="xs" color={theme.text.muted}>Số điện thoại</AppText>
                      <TextInput
                        value={newBranchPhone}
                        onChangeText={setNewBranchPhone}
                        placeholder="VD: 0987654321"
                        placeholderTextColor={theme.text.muted}
                        keyboardType="phone-pad"
                        style={[s.formInput, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
                      />
                    </View>
                    <View style={[s.fieldGroup, { flex: 1 }]}>
                      <AppText variant="xs" color={theme.text.muted}>Quản lý CN</AppText>
                      <TextInput
                        value={newBranchManager}
                        onChangeText={setNewBranchManager}
                        placeholder="VD: Chị Lan"
                        placeholderTextColor={theme.text.muted}
                        style={[s.formInput, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIsAddingBranch(false)}
                      style={[s.actionBtn, { flex: 1, borderColor: theme.border.subtle, backgroundColor: theme.surface.header }]}
                    >
                      <AppText variant="xs" color={theme.text.muted}>Hủy</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isCreatingBranch || !newBranchName.trim()}
                      onPress={handleCreateBranch}
                      style={[s.actionBtn, { flex: 2, backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
                    >
                      <Icon name="check" size={15} color={theme.text.onBrand} />
                      <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                        {isCreatingBranch ? 'Đang tạo...' : 'Kích Hoạt Chi Nhánh'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Danh Sách Chi Nhánh */}
            {tenantBranches.map((br) => (
              <View
                key={br.id}
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="md" weight="medium" color={theme.text.primary}>
                        {br.name}
                      </AppText>
                      {br.isMain && (
                        <View style={[s.planBadge, { backgroundColor: theme.brand.primary + '20' }]}>
                          <AppText variant="xs" color={theme.brand.primary} weight="medium">
                            Trụ Sở Chính
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      {br.address || 'Chưa cập nhật địa chỉ'} {br.phone ? `· SĐT: ${br.phone}` : ''}
                    </AppText>
                    {br.managerName && (
                      <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                        Quản lý: {br.managerName}
                      </AppText>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        s.statusPill,
                        { backgroundColor: br.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' },
                      ]}
                    >
                      <AppText variant="xs" weight="medium" color={br.isActive ? theme.brand.success : theme.brand.danger}>
                        {br.isActive ? 'Hoạt Động' : 'Tạm Dừng'}
                      </AppText>
                    </View>

                    {!br.isMain && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          playTapSound();
                          toggleBranchStatus(selectedTenant.id, br.id);
                        }}
                        style={[s.miniActionBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth }]}
                      >
                        <Icon name={br.isActive ? 'pause' : 'play'} size={14} color={theme.text.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* PHÂN ĐOẠN 3: THIẾT BỊ */}
        {detailSegment === 'devices' && (
          <>
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 18 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="radar" size={18} color={theme.brand.primary} />
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Hạm Đội Thiết Bị Kết Nối
                    </AppText>
                  </View>
                  <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 4 }}>
                    Hạn mức: {quota.deviceCount}/{quota.maxDevices === 'unlimited' ? 'Không giới hạn' : `${quota.maxDevices} máy`} · Giám sát máy POS, KDS, CFD.
                  </AppText>
                </View>

                <View
                  style={[
                    s.statusPill,
                    {
                      backgroundColor: quota.isOverDeviceLimit
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(16, 185, 129, 0.12)',
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight="medium"
                    color={quota.isOverDeviceLimit ? theme.brand.danger : theme.brand.success}
                    tabularNums
                  >
                    {tenantDevices.filter((d) => d.isOnline).length} Online
                  </AppText>
                </View>
              </View>
            </View>

            {tenantDevices.map((dev) => (
              <View
                key={dev.id}
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="md" weight="medium" color={theme.text.primary}>
                        {dev.deviceName}
                      </AppText>
                      <View style={[s.planBadge, { backgroundColor: theme.surface.header }]}>
                        <AppText variant="xs" color={theme.text.muted}>
                          {(dev.deviceRole || 'pos').toUpperCase()}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      Chi nhánh: {dev.branchId || 'Chính'} · IP: {dev.ipAddress || 'LAN'}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                      Mã máy: {(dev.id || '').slice(0, 16)}...
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        s.statusPill,
                        { backgroundColor: dev.isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)' },
                      ]}
                    >
                      <AppText variant="xs" weight="medium" color={dev.isOnline ? theme.brand.success : theme.text.muted}>
                        {dev.isOnline ? '● Online' : '○ Offline'}
                      </AppText>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        if (toggleDeviceStatus) {
                          toggleDeviceStatus(selectedTenant.id, dev.id);
                        }
                      }}
                      style={[s.miniActionBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth }]}
                    >
                      <Icon name={dev.isActive ? 'lock-open-outline' : 'lock-outline'} size={14} color={dev.isActive ? theme.brand.success : theme.brand.danger} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        unbindDevice(selectedTenant.id, dev.id);
                      }}
                      style={[s.miniActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: theme.brand.danger, borderWidth: StyleSheet.hairlineWidth }]}
                    >
                      <Icon name="link-off" size={14} color={theme.brand.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* PHÂN ĐOẠN 4: TÍNH NĂNG ADDONS */}
        {detailSegment === 'addons' && (
          <>
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 18 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon name="puzzle-outline" size={18} color={theme.brand.primary} />
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Tính Năng & Module Mở Rộng
                </AppText>
              </View>
              <AppText variant="xs" color={theme.text.muted}>
                Bật/tắt các module chuyên biệt cho quán:
              </AppText>
            </View>

            <View style={{ gap: 8 }}>
              {SAAS_ADDON_OPTIONS.map((opt) => {
                const addon = tenantAddons.find((a) => a.addonCode === opt.code);
                const isEnabled = addon ? addon.isEnabled : false;
                return (
                  <View
                    key={opt.code}
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: isEnabled ? theme.brand.primary : theme.border.subtle,
                        borderWidth: isEnabled ? 1.5 : StyleSheet.hairlineWidth,
                        borderRadius: isWide ? 18 : 0,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
                        <View style={[s.iconBox, { backgroundColor: isEnabled ? theme.brand.primary + '18' : theme.surface.header }]}>
                          <Icon name={opt.icon} size={20} color={isEnabled ? theme.brand.primary : theme.text.muted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppText variant="md" weight="medium" color={theme.text.primary}>
                            {opt.name}
                          </AppText>
                          <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                            {opt.desc}
                          </AppText>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          if (toggleTenantAddon) {
                            toggleTenantAddon(selectedTenant.id, opt.code, !isEnabled);
                          }
                        }}
                        style={[
                          s.miniActionBtn,
                          {
                            backgroundColor: isEnabled ? theme.brand.primary : theme.surface.header,
                            borderColor: isEnabled ? theme.brand.primary : theme.border.subtle,
                            borderWidth: StyleSheet.hairlineWidth,
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 8,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight="medium"
                          color={isEnabled ? theme.text.onBrand : theme.text.muted}
                        >
                          {isEnabled ? 'Đang Mở' : 'Bật Module'}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* PHÂN ĐOẠN 5: LỊCH SỬ HÓA ĐƠN THU TIỀN */}
        {detailSegment === 'invoices' && (
          <>
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 18 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="receipt-text-outline" size={18} color={theme.brand.primary} />
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Lịch Sử Thu Phí Dịch Vụ SaaS
                    </AppText>
                  </View>
                  <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                    Lưu vết toàn bộ dòng tiền thanh toán và gia hạn bản quyền
                  </AppText>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="xs" color={theme.text.muted}>Tổng Tiền Đã Thu:</AppText>
                  <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums>
                    {tenantInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString('vi-VN')} đ
                  </AppText>
                </View>
              </View>
            </View>

            {tenantInvoices.length === 0 ? (
              <View style={[s.detailCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle, alignItems: 'center', paddingVertical: 28 }]}>
                <Icon name="receipt-text" size={32} color={theme.text.muted} />
                <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 8 }}>
                  Chưa có hóa đơn nào cho quán này
                </AppText>
              </View>
            ) : (
              tenantInvoices.map((inv) => {
                const isReceiptOpen = selectedInvoiceForReceipt === inv.id;
                return (
                  <View
                    key={inv.id}
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 18 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                            {inv.amount.toLocaleString('vi-VN')} đ
                          </AppText>
                          <View style={[s.planBadge, { backgroundColor: theme.surface.header }]}>
                            <AppText variant="xs" color={theme.text.primary} weight="medium">
                              +{inv.monthsAdded}T
                            </AppText>
                          </View>
                        </View>
                        <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                          Mã: {inv.invoiceCode} · {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('vi-VN') : ''}
                        </AppText>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          setSelectedInvoiceForReceipt(isReceiptOpen ? null : inv.id);
                        }}
                        style={[
                          s.miniActionBtn,
                          {
                            borderColor: isReceiptOpen ? theme.brand.primary : theme.border.subtle,
                            borderWidth: StyleSheet.hairlineWidth,
                            backgroundColor: isReceiptOpen ? 'rgba(13, 148, 136, 0.12)' : theme.surface.header,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          },
                        ]}
                      >
                        <Icon name="file-document-outline" size={13} color={isReceiptOpen ? theme.brand.primary : theme.text.primary} />
                        <AppText variant="xs" weight="medium" color={isReceiptOpen ? theme.brand.primary : theme.text.primary}>
                          {isReceiptOpen ? 'Đóng' : 'Biên Lai'}
                        </AppText>
                      </TouchableOpacity>
                    </View>

                    {/* Hộp xem trước biên lai */}
                    {isReceiptOpen && (
                      <View style={[s.rescueResultBox, { backgroundColor: theme.surface.header, borderColor: theme.brand.primary + '40', marginTop: 12, padding: 14 }]}>
                        <View style={{ alignItems: 'center', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }}>
                          <AppText variant="sm" weight="medium" color={theme.brand.primary}>
                            BIÊN LAI ĐIỆN TỬ SAAS
                          </AppText>
                          <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                            Hệ Thống Quản Trị OngChu Lean POS
                          </AppText>
                        </View>

                        <View style={{ gap: 6, marginTop: 10 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <AppText variant="xs" color={theme.text.muted}>Mã Hóa Đơn:</AppText>
                            <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{inv.invoiceCode}</AppText>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <AppText variant="xs" color={theme.text.muted}>Khách Hàng:</AppText>
                            <AppText variant="xs" color={theme.text.primary}>{selectedTenant.name}</AppText>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <AppText variant="xs" color={theme.text.muted}>Tổng Thanh Toán:</AppText>
                            <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                              {inv.amount.toLocaleString('vi-VN')} đ
                            </AppText>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Thanh Tác Vụ Cố Định Đáy Cho Di Động */}
      {!isWide && (
        <View
          style={[
            s.dockedBottomBar,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onToggleStatus(selectedTenant)}
            style={[
              s.dockedBtn,
              {
                borderColor: selectedTenant.isActive ? theme.brand.danger : theme.brand.success,
                backgroundColor: theme.surface.header,
                flex: 1,
              },
            ]}
          >
            <Icon
              name={selectedTenant.isActive ? 'lock-outline' : 'lock-open-outline'}
              size={16}
              color={selectedTenant.isActive ? theme.brand.danger : theme.brand.success}
            />
            <AppText
              variant="xs"
              weight="medium"
              color={selectedTenant.isActive ? theme.brand.danger : theme.brand.success}
            >
              {selectedTenant.isActive ? 'Khóa Quán' : 'Mở Quán'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onImpersonate(selectedTenant)}
            style={[s.dockedBtn, { backgroundColor: theme.brand.purple, flex: 2 }]}
          >
            <Icon name="shield-account" size={16} color={theme.text.onBrand} />
            <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
              Hỗ Trợ Quán
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabBarWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  scrollView: {
    flex: 1,
  },
  detailScrollContent: {
    paddingVertical: 14,
    gap: 12,
  },
  detailCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
  },
  statCol: {
    flex: 1,
  },
  impersonateCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
  },
  impersonateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  renewChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  renewChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  renewFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  inlineRenewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rescueResultBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  rescueTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  toggleStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotaBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  quotaTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  quotaBar: {
    height: '100%',
    borderRadius: 3,
  },
  planSwitcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  miniActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formInput: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockedBottomBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
