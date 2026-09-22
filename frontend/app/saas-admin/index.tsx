import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { AppText, useAppToast, AppHeader, AppModal } from '../../lib/components/ui';
import { useAuthStore } from '../../lib/store/useAuthStore';
import {
  useSaaSAdminStore,
  SaaSTenant,
  SaaSPlan,
  SAAS_PLAN_TIERS,
  SaaSLicenseKey,
} from '../../lib/store/useSaaSAdminStore';
import { playTapSound } from '../../lib/utils/sound';

import {
  SAAS_ADDON_OPTIONS,
  SAAS_PLAN_NAMES,
  SAAS_PLAN_LIMIT_DESC,
  SaaSAdminTab,
  SaaSDetailSegment,
} from './constants';
import { SaaSOverviewTab } from './components/SaaSOverviewTab';
import { SaaSTenantsTab } from './components/SaaSTenantsTab';
import { SaaSNewTenantTab } from './components/SaaSNewTenantTab';
import { SaaSPlansTab } from './components/SaaSPlansTab';
import { TenantDetailSubScreen } from './components/TenantDetailSubScreen';

export { SAAS_ADDON_OPTIONS, SAAS_PLAN_NAMES, SAAS_PLAN_LIMIT_DESC };

export default function SaaSAdminScreen() {
  const { theme } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useAppToast();

  const [activeTab, setActiveTab] = useState<SaaSAdminTab>('overview');

  // Inline Sub-Screen Selected Tenant (Zero-Modal Invariant)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detailSegment, setDetailSegment] = useState<SaaSDetailSegment>('plan');

  // Sub-tab for Tab 4 ('plans')
  const [planSubTab, setPlanSubTab] = useState<'matrix' | 'keys'>('matrix');

  // Plan editing states
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [editPrice, setEditPrice] = useState<string>('0');
  const [editMaxBranches, setEditMaxBranches] = useState<string>('1');
  const [editMaxDevices, setEditMaxDevices] = useState<string>('1');
  const [editAddons, setEditAddons] = useState<string[]>([]);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // License Key generator states
  const [genPlan, setGenPlan] = useState<SaaSPlan>('pro');
  const [genDuration, setGenDuration] = useState<number>(30);
  const [genNote, setGenNote] = useState<string>('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [lastGeneratedKey, setLastGeneratedKey] = useState<SaaSLicenseKey | null>(null);
  const [keyFilter, setKeyFilter] = useState<'all' | 'unused' | 'used'>('all');

  // Super Admin Delete Tenant State
  const [tenantToDelete, setTenantToDelete] = useState<SaaSTenant | null>(null);
  const [isDeletingTenant, setIsDeletingTenant] = useState(false);

  // Quick Renew Modal State
  const [renewingTenant, setRenewingTenant] = useState<SaaSTenant | null>(null);
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  const startImpersonation = useAuthStore((s) => s.startImpersonation);

  const tenants = useSaaSAdminStore((s) => s.tenants);
  const plans = useSaaSAdminStore((s) => s.plans);
  const licenseKeys = useSaaSAdminStore((s) => s.licenseKeys);
  const invoicesByTenant = useSaaSAdminStore((s) => s.invoicesByTenant);
  const searchQuery = useSaaSAdminStore((s) => s.searchQuery);
  const selectedStatusFilter = useSaaSAdminStore((s) => s.selectedStatusFilter);
  const [formName, setFormName] = useState('');
  const [formSubdomain, setFormSubdomain] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formPin, setFormPin] = useState('9999');
  const [formPlan, setFormPlan] = useState<SaaSPlan>('trial');
  const [formDuration, setFormDuration] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoverData, setHandoverData] = useState<{
    name: string;
    subdomain: string;
    phone: string;
    username: string;
    password: string;
    pin: string;
    plan: SaaSPlan;
  } | null>(null);

  const fetchTenants = useSaaSAdminStore((s) => s.fetchTenants);
  const fetchPlans = useSaaSAdminStore((s) => s.fetchPlans || s.fetchPlanConfigs);
  const fetchLicenseKeys = useSaaSAdminStore((s) => s.fetchLicenseKeys);
  const setSearchQuery = useSaaSAdminStore((s) => s.setSearchQuery);
  const setStatusFilter = useSaaSAdminStore((s) => s.setStatusFilter);
  const createTenant = useSaaSAdminStore((s) => s.createTenant);
  const toggleTenantStatus = useSaaSAdminStore((s) => s.toggleTenantStatus);
  const deleteTenant = useSaaSAdminStore((s) => s.deleteTenant);
  const renewTenantLicense = useSaaSAdminStore((s) => s.renewTenantLicense);
  const updatePlanConfig = useSaaSAdminStore((s) => s.updatePlanConfig);
  const resetPlansToDefault = useSaaSAdminStore((s) => s.resetPlansToDefault || s.resetPlanConfigs);
  const generateLicenseKey = useSaaSAdminStore((s) => s.generateLicenseKey);
  const deleteLicenseKey = useSaaSAdminStore((s) => s.deleteLicenseKey);

  useEffect(() => {
    fetchTenants?.();
    fetchPlans?.();
    fetchLicenseKeys?.();
  }, [fetchTenants, fetchPlans, fetchLicenseKeys]);

  // Handle hardware Back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (selectedTenantId !== null) {
        setSelectedTenantId(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedTenantId]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.isActive).length;
    const expiringTenants = tenants.filter(
      (t) => t.isActive && t.licenseDaysLeft <= 14 && t.licenseDaysLeft > 0
    ).length;
    const suspendedTenants = tenants.filter((t) => !t.isActive || t.licenseDaysLeft === 0).length;
    const totalMRR = tenants.reduce((sum, t) => sum + (t.isActive ? t.monthlyFee : 0), 0);
    const annualARR = totalMRR * 12;
    const renewalRate = totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 100;

    return {
      totalTenants,
      activeTenants,
      expiringTenants,
      suspendedTenants,
      totalMRR,
      annualARR,
      renewalRate,
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchQuery =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone.includes(searchQuery) ||
        t.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchQuery) return false;

      if (selectedStatusFilter === 'active') return t.isActive && t.licenseDaysLeft > 0;
      if (selectedStatusFilter === 'expiring') return t.isActive && t.licenseDaysLeft <= 14 && t.licenseDaysLeft > 0;
      if (selectedStatusFilter === 'suspended') return !t.isActive || t.licenseDaysLeft === 0;
      return true;
    });
  }, [tenants, searchQuery, selectedStatusFilter]);

  const urgentTenants = useMemo(() => {
    return tenants
      .filter((t) => !t.isActive || t.licenseDaysLeft <= 14)
      .sort((a, b) => a.licenseDaysLeft - b.licenseDaysLeft);
  }, [tenants]);

  // Active Tenant Object for Sub-Screen
  const selectedTenant = useMemo(() => {
    if (!selectedTenantId) return null;
    return tenants.find((t) => t.id === selectedTenantId) || null;
  }, [tenants, selectedTenantId]);

  // Actions
  const handleStartImpersonate = (tenant: SaaSTenant) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    startImpersonation({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      phone: tenant.phone,
      subscriptionPlan: tenant.subscriptionPlan,
    });
    showToast({
      title: 'Đang Xem Dưới Quyền Quán',
      message: `Đã kết nối trực tiếp vào cửa hàng "${tenant.name}".`,
      type: 'success',
    });
    router.replace('/');
  };

  const handleStartQuickRenew = (tenant: SaaSTenant) => {
    playTapSound();
    setRenewingTenant(tenant);
    setRenewMonths(1);
  };

  const handleConfirmQuickRenew = async () => {
    if (!renewingTenant) return;
    playTapSound();
    setIsRenewing(true);
    try {
      const res = await renewTenantLicense(renewingTenant.id, renewMonths);
      if (res.success) {
        showToast({
          title: 'Gia Hạn Thành Công',
          message: `Quán "${renewingTenant.name}" đã được cộng ${renewMonths} tháng.`,
          type: 'success',
        });
        setRenewingTenant(null);
      } else {
        showToast({
          title: 'Lỗi Gia Hạn',
          message: 'Không thể gia hạn gói cước',
          type: 'danger',
        });
      }
    } catch (e: any) {
      showToast({
        title: 'Lỗi Gia Hạn',
        message: e?.message || 'Không thể gia hạn gói cước',
        type: 'danger',
      });
    } finally {
      setIsRenewing(false);
    }
  };

  const handleToggleStatus = async (tenant: SaaSTenant) => {
    playTapSound();
    try {
      await toggleTenantStatus(tenant.id);
      showToast({
        title: tenant.isActive ? 'Đã Khóa Quán' : 'Đã Mở Quán',
        message: `Trạng thái quán "${tenant.name}" đã được cập nhật.`,
        type: 'success',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Cập Nhật Trạng Thái',
        message: e?.message || 'Không thể đổi trạng thái',
        type: 'danger',
      });
    }
  };

  const handleConfirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    playTapSound();
    setIsDeletingTenant(true);
    try {
      await deleteTenant(tenantToDelete.id);
      showToast({
        title: 'Đã Xóa Vĩnh Viễn Quán',
        message: `Đã xóa sạch database và tài khoản của "${tenantToDelete.name}".`,
        type: 'success',
      });
      if (selectedTenantId === tenantToDelete.id) {
        setSelectedTenantId(null);
      }
      setTenantToDelete(null);
    } catch (e: any) {
      showToast({
        title: 'Lỗi Xóa Quán',
        message: e?.message || 'Không thể xóa quán',
        type: 'danger',
      });
    } finally {
      setIsDeletingTenant(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!formName.trim() || !formSubdomain.trim()) {
      showToast({
        title: 'Thiếu Thông Tin',
        message: 'Cần nhập tên quán và mã quán',
        type: 'warning',
      });
      return;
    }
    playTapSound();
    setIsSubmitting(true);
    try {
      const cleanSub = formSubdomain.trim().toLowerCase();
      const cleanPh = formPhone.trim();
      const cleanUser = formUsername.trim() || cleanPh || 'owner';
      const cleanPass = formPassword.trim() || '123456';
      const cleanPin = formPin.trim() || '9999';

      const res = await createTenant({
        name: formName.trim(),
        subdomain: cleanSub,
        phone: cleanPh,
        ownerName: formOwnerName.trim() || undefined,
        ownerUsername: cleanUser,
        ownerPassword: cleanPass,
        ownerPin: cleanPin,
        subscriptionPlan: formPlan,
        durationMonths: formDuration,
      });
      if (!res.success) {
        throw new Error(res.error || 'Không thể tạo quán');
      }

      // Lưu thông tin bàn giao để hiện Modal
      setHandoverData({
        name: formName.trim(),
        subdomain: cleanSub,
        phone: cleanPh,
        username: res.ownerUsername || cleanUser,
        password: res.ownerPassword || cleanPass,
        pin: res.ownerPin || cleanPin,
        plan: formPlan,
      });

      showToast({
        title: 'Cấp Quán Thành Công',
        message: `Quán "${formName.trim()}" (mã: ${cleanSub}) đã sẵn sàng hoạt động.`,
        type: 'success',
      });

      setFormName('');
      setFormSubdomain('');
      setFormPhone('');
      setFormOwnerName('');
      setFormUsername('');
      setFormPassword('123456');
      setFormPin('9999');
      setFormPlan('trial');
      setFormDuration(1);
    } catch (e: any) {
      showToast({
        title: 'Lỗi Tạo Quán',
        message: e?.message || 'Kiểm tra lại thông tin',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditPlan = (planKey: SaaSPlan) => {
    playTapSound();
    const p = (plans && plans[planKey]) || SAAS_PLAN_TIERS[planKey];
    setEditingPlan(planKey);
    setEditPrice(String(p.pricePerMonth));
    setEditMaxBranches(String(p.maxBranches));
    setEditMaxDevices(String(p.maxDevices));
    setEditAddons(p.enabledAddons || []);
  };

  const handleSavePlanConfig = async (planKey: SaaSPlan) => {
    playTapSound();
    setIsSavingPlan(true);
    try {
      const priceNum = parseInt(editPrice.replace(/\D/g, ''), 10) || 0;
      const branchesVal =
        editMaxBranches.toLowerCase() === 'unlimited'
          ? 'unlimited'
          : parseInt(editMaxBranches, 10) || 1;
      const devicesVal =
        editMaxDevices.toLowerCase() === 'unlimited'
          ? 'unlimited'
          : parseInt(editMaxDevices, 10) || 1;

      await updatePlanConfig(planKey, {
        pricePerMonth: priceNum,
        maxBranches: branchesVal,
        maxDevices: devicesVal,
        enabledAddons: editAddons,
      });

      showToast({
        title: 'Lưu Gói Thành Công',
        message: `Đã cập nhật biểu phí gói ${SAAS_PLAN_NAMES[planKey]}.`,
        type: 'success',
      });
      setEditingPlan(null);
    } catch (e: any) {
      showToast({
        title: 'Lỗi Lưu Gói',
        message: e?.message || 'Không thể cập nhật gói',
        type: 'danger',
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleResetPlans = async () => {
    playTapSound();
    try {
      if (resetPlansToDefault) {
        await resetPlansToDefault();
      }
      showToast({
        title: 'Đã Đặt Lại Mặc Định',
        message: 'Bảng giá và hạn mức 4 gói cước đã trở về mặc định chuẩn.',
        type: 'success',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Khôi Phục',
        message: e?.message || 'Không thể đặt lại',
        type: 'danger',
      });
    }
  };

  const handleGenerateKey = async () => {
    playTapSound();
    setIsGeneratingKey(true);
    try {
      if (!generateLicenseKey) {
        throw new Error('Chức năng tạo key chưa khả dụng');
      }
      const newKey = await generateLicenseKey(genPlan, genDuration, genNote);
      setLastGeneratedKey(newKey);
      setGenNote('');
      showToast({
        title: 'Tạo Key Thành Công',
        message: `Mã ${newKey.key} (${genDuration} ngày) đã được lưu vào hệ thống.`,
        type: 'success',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Tạo Key',
        message: e?.message || 'Không thể tạo key',
        type: 'danger',
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = (keyStr: string) => {
    playTapSound();
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(keyStr);
      }
    }
    showToast({
      title: 'Đã Sao Chép Key',
      message: `${keyStr} đã được sao chép vào bộ nhớ tạm.`,
      type: 'info',
    });
  };

  const handleDeleteKey = async (keyStr: string) => {
    playTapSound();
    try {
      if (deleteLicenseKey) {
        await deleteLicenseKey(keyStr);
      }
      showToast({
        title: 'Đã Xóa Key',
        message: `Đã hủy mã license key ${keyStr}.`,
        type: 'info',
      });
    } catch (e: any) {
      showToast({
        title: 'Lỗi Xóa Key',
        message: e?.message || 'Không thể xóa key',
        type: 'danger',
      });
    }
  };

  // =========================================================================
  // 🚀 INLINE SUB-SCREEN: CHI TIẾT QUÁN (ZERO-MODAL DETAIL INVARIANT)
  // =========================================================================
  if (selectedTenantId !== null && selectedTenant) {
    return (
      <TenantDetailSubScreen
        selectedTenant={selectedTenant}
        detailSegment={detailSegment}
        setDetailSegment={setDetailSegment}
        onBack={() => setSelectedTenantId(null)}
        onImpersonate={handleStartImpersonate}
        onToggleStatus={handleToggleStatus}
        onDeleteTenant={setTenantToDelete}
        plans={plans}
      />
    );
  }

  // =========================================================================
  // 🏢 MÀN HÌNH CHÍNH SAAS ADMIN (DASHBOARD & DANH SÁCH QUÁN)
  // =========================================================================
  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 1. Header Cổng Quản Trị Độc Lập */}
      <AppHeader
        title="Quản Trị SaaS"
        subtitle={`Chủ Dự Án · ${tenants.length} Quán · MRR ${metrics.totalMRR.toLocaleString('vi-VN')} đ`}
        showBack={false}
        showHamburger={false}
        rightCustom={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                fetchTenants();
              }}
              style={s.headerActionBtn}
              accessibilityLabel="Làm mới dữ liệu SaaS"
            >
              <Icon name="refresh" size={16} color={theme.text.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                }
                useAuthStore.getState().logout();
                router.replace({ pathname: '/login', params: { tab: 'account' } } as any);
              }}
              style={[
                s.headerActionBtn,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  backgroundColor: theme.brand.danger + '15',
                  borderColor: theme.brand.danger + '40',
                },
              ]}
              accessibilityLabel="Đăng xuất cổng quản trị"
            >
              <Icon name="logout" size={15} color={theme.brand.danger} />
              <AppText variant="xs" weight="bold" color={theme.brand.danger}>
                Đăng Xuất
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 2. Thanh 4 Tab Cấp 1 */}
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
            { id: 'overview', label: 'Tổng Quan', icon: 'view-dashboard-outline' },
            {
              id: 'tenants',
              label: 'Khách Thuê',
              icon: 'store-outline',
              badge: tenants.length,
            },
            { id: 'new_tenant', label: '+ Cấp Quán Mới', icon: 'store-plus-outline' },
            { id: 'plans', label: 'Bảng Giá & Key', icon: 'tag-multiple-outline' },
          ].map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setActiveTab(t.id as SaaSAdminTab);
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
                  name={t.icon as any}
                  size={16}
                  color={isSelected ? theme.brand.accent : theme.text.muted}
                />
                <AppText
                  variant="md"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? theme.brand.accent : theme.text.muted}
                >
                  {t.label}
                </AppText>
                {t.badge !== undefined && (
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
                      {t.badge}
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Nội Dung Tab */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          isWide && { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 16 },
          { paddingBottom: isWide ? 40 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <SaaSOverviewTab
            metrics={metrics}
            urgentTenants={urgentTenants}
            allTenants={tenants}
            invoicesByTenant={invoicesByTenant}
            onSelectTenant={setSelectedTenantId}
            onImpersonate={handleStartImpersonate}
            onQuickRenew={handleStartQuickRenew}
          />
        )}

        {activeTab === 'tenants' && (
          <SaaSTenantsTab
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedStatusFilter={selectedStatusFilter}
            onStatusFilterChange={setStatusFilter}
            filteredTenants={filteredTenants}
            plans={plans}
            onSelectTenant={setSelectedTenantId}
            onImpersonate={handleStartImpersonate}
            onToggleStatus={handleToggleStatus}
            onDeleteTenant={setTenantToDelete}
            onQuickRenew={handleStartQuickRenew}
          />
        )}

        {activeTab === 'new_tenant' && (
          <SaaSNewTenantTab
            formName={formName}
            setFormName={setFormName}
            formSubdomain={formSubdomain}
            setFormSubdomain={setFormSubdomain}
            formPhone={formPhone}
            setFormPhone={setFormPhone}
            formOwnerName={formOwnerName}
            setFormOwnerName={setFormOwnerName}
            formUsername={formUsername}
            setFormUsername={setFormUsername}
            formPassword={formPassword}
            setFormPassword={setFormPassword}
            formPin={formPin}
            setFormPin={setFormPin}
            formPlan={formPlan}
            setFormPlan={setFormPlan}
            formDuration={formDuration}
            setFormDuration={setFormDuration}
            isSubmitting={isSubmitting}
            onCreateTenant={handleCreateTenant}
            plans={plans}
          />
        )}

        {activeTab === 'plans' && (
          <SaaSPlansTab
            planSubTab={planSubTab}
            setPlanSubTab={setPlanSubTab}
            editingPlan={editingPlan}
            setEditingPlan={setEditingPlan}
            editPrice={editPrice}
            setEditPrice={setEditPrice}
            editMaxBranches={editMaxBranches}
            setEditMaxBranches={setEditMaxBranches}
            editMaxDevices={editMaxDevices}
            setEditMaxDevices={setEditMaxDevices}
            editAddons={editAddons}
            setEditAddons={setEditAddons}
            isSavingPlan={isSavingPlan}
            onSavePlanConfig={handleSavePlanConfig}
            onStartEditPlan={handleStartEditPlan}
            onResetPlans={handleResetPlans}
            genPlan={genPlan}
            setGenPlan={setGenPlan}
            genDuration={genDuration}
            setGenDuration={setGenDuration}
            genNote={genNote}
            setGenNote={setGenNote}
            isGeneratingKey={isGeneratingKey}
            lastGeneratedKey={lastGeneratedKey}
            setLastGeneratedKey={setLastGeneratedKey}
            keyFilter={keyFilter}
            setKeyFilter={setKeyFilter}
            licenseKeys={licenseKeys}
            onGenerateKey={handleGenerateKey}
            onCopyKey={handleCopyKey}
            onDeleteKey={handleDeleteKey}
            plans={plans}
          />
        )}
      </ScrollView>

      {/* Super Admin Modal Gia Hạn Nhanh 1-Chạm */}
      <AppModal
        visible={!!renewingTenant}
        title="Gia Hạn Bản Quyền"
        onClose={() => !isRenewing && setRenewingTenant(null)}
        presentation="dialog"
        primaryAction={{
          label: isRenewing ? 'Đang Xử Lý...' : 'Gia Hạn Ngay',
          loading: isRenewing,
          disabled: isRenewing,
          onPress: handleConfirmQuickRenew,
          icon: 'lightning-bolt',
        }}
        secondaryAction={{
          label: 'Hủy Bỏ',
          disabled: isRenewing,
          onPress: () => setRenewingTenant(null),
        }}
      >
        {renewingTenant && (
          <View style={{ gap: 14, paddingVertical: 4 }}>
            {/* Header info */}
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: theme.surface.app,
                borderColor: theme.border.subtle,
                borderWidth: 1,
                gap: 4,
              }}
            >
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                {renewingTenant.name}
              </AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>
                Mã: {renewingTenant.subdomain} · Gói: {SAAS_PLAN_NAMES[renewingTenant.subscriptionPlan]} · {renewingTenant.monthlyFee.toLocaleString('vi-VN')} đ/tháng
              </AppText>
              <AppText variant="xs" color={theme.brand.accent} tabularNums>
                Hạn hiện tại: {new Date(renewingTenant.licenseExpiresAt).toLocaleDateString('vi-VN')}
              </AppText>
            </View>

            {/* Chọn số tháng */}
            <View style={{ gap: 6 }}>
              <AppText variant="xs" color={theme.text.muted}>
                Chọn gói gia hạn:
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 3, 6, 12].map((m) => {
                  const isSel = renewMonths === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      activeOpacity={0.8}
                      onPress={() => {
                        playTapSound();
                        setRenewMonths(m);
                      }}
                      style={[
                        s.monthChip,
                        {
                          backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                          borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <AppText
                        variant="sm"
                        weight={isSel ? 'bold' : 'normal'}
                        color={isSel ? theme.text.onBrand : theme.text.primary}
                        tabularNums
                      >
                        +{m} tháng
                      </AppText>
                      {m >= 6 && (
                        <AppText
                          variant="xxs"
                          color={isSel ? theme.brand.accent : theme.brand.accent}
                          weight="bold"
                        >
                          {m === 6 ? 'Tặng 15 ngày' : 'Tặng 1 tháng'}
                        </AppText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Số tiền cần thu & Mã VietQR */}
            <View
              style={{
                backgroundColor: theme.brand.accent + '12',
                borderRadius: 10,
                padding: 12,
                borderColor: theme.brand.accent + '40',
                borderWidth: 1,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Tổng tiền thu:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                  {((renewingTenant.monthlyFee || 199000) * renewMonths).toLocaleString('vi-VN')} đ
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Cú pháp VietQR:</AppText>
                <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                  ONGCHU {renewingTenant.subdomain.toUpperCase()} {renewMonths}T
                </AppText>
              </View>
            </View>
          </View>
        )}
      </AppModal>

      {/* Super Admin Modal Xác Nhận Xóa Vĩnh Viễn Quán */}
      <AppModal
        visible={!!tenantToDelete}
        title="Xóa Vĩnh Viễn Quán"
        onClose={() => !isDeletingTenant && setTenantToDelete(null)}
        presentation="dialog"
        primaryAction={{
          label: isDeletingTenant ? 'Đang Xóa...' : 'Xác Nhận Xóa',
          variant: 'danger',
          loading: isDeletingTenant,
          disabled: isDeletingTenant,
          onPress: handleConfirmDeleteTenant,
          icon: 'trash-can-outline',
        }}
        secondaryAction={{
          label: 'Hủy Bỏ',
          disabled: isDeletingTenant,
          onPress: () => setTenantToDelete(null),
        }}
      >
        <View style={{ gap: 14, paddingVertical: 4 }}>
          <View
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: theme.brand.danger + '40',
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Icon name="alert-octagon" size={18} color={theme.brand.danger} />
              <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                Hành Động Không Thể Khôi Phục
              </AppText>
            </View>
            <AppText variant="xs" color={theme.text.muted}>
              Toàn bộ dữ liệu doanh thu, hóa đơn, thực đơn và tài khoản của quán{' '}
              <AppText variant="xs" weight="bold" color={theme.text.primary}>
                {tenantToDelete?.name}
              </AppText>{' '}
              (Mã: {tenantToDelete?.subdomain}) sẽ bị xóa vĩnh viễn khỏi máy chủ VPS và cơ sở dữ liệu.
            </AppText>
          </View>
        </View>
      </AppModal>

      {/* 4. Modal Bàn Giao Tài Khoản Quán Mới Tạo */}
      <AppModal
        visible={handoverData !== null}
        title="🎉 Cấp Quán Thành Công!"
        onClose={() => {
          setHandoverData(null);
          setActiveTab('tenants');
        }}
        presentation="dialog"
        primaryAction={{
          label: '📋 Sao Chép Thông Tin',
          variant: 'primary',
          onPress: async () => {
            playTapSound();
            if (!handoverData) return;
            const textToCopy = `👑 THÔNG TIN TÀI KHOẢN ONGUCHU POS\n━━━━━━━━━━━━━━━━━━━━\n🏢 Tên Quán: ${handoverData.name}\n🔑 Mã Quán (Subdomain): ${handoverData.subdomain}\n🌐 Link Đăng Nhập: https://app.ongchu.cloud/login\n👤 Tài Khoản: ${handoverData.username}\n🔒 Mật Khẩu: ${handoverData.password}\n🔢 Mã PIN Quản Lý: ${handoverData.pin}\n📦 Gói Cước: ${SAAS_PLAN_NAMES[handoverData.plan]}\n━━━━━━━━━━━━━━━━━━━━`;
            try {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(textToCopy);
              }
              showToast({
                title: 'Đã Sao Chép',
                message: 'Thông tin đăng nhập đã lưu vào clipboard.',
                type: 'success',
              });
            } catch {}
          },
          icon: 'content-copy',
        }}
        secondaryAction={{
          label: '🚀 Đăng Nhập Vào Quán',
          onPress: () => {
            if (!handoverData) return;
            const target = tenants.find((t) => t.subdomain === handoverData.subdomain);
            if (target) {
              handleStartImpersonate(target);
            } else {
              setHandoverData(null);
              setActiveTab('tenants');
            }
          },
        }}
      >
        {handoverData && (
          <View style={{ gap: 12, paddingVertical: 4 }}>
            <AppText variant="xs" color={theme.text.muted}>
              Vui lòng lưu lại hoặc gửi ngay thông tin dưới đây cho chủ quán{' '}
              <AppText variant="xs" weight="bold" color={theme.text.primary}>
                {handoverData.name}
              </AppText>
              :
            </AppText>

            <View
              style={{
                backgroundColor: theme.surface.app,
                borderRadius: 12,
                padding: 14,
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border.subtle,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Mã Quán (Tenant Code):</AppText>
                <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                  {handoverData.subdomain}
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Tài Khoản (Username):</AppText>
                <AppText variant="xs" weight="bold" color={theme.text.primary}>
                  {handoverData.username}
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Mật Khẩu (Password):</AppText>
                <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                  {handoverData.password}
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" color={theme.text.muted}>Mã PIN Quản Lý:</AppText>
                <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                  {handoverData.pin}
                </AppText>
              </View>

              <View style={{ height: 1, backgroundColor: theme.border.subtle, marginVertical: 2 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xxs" color={theme.text.muted}>Cổng Đăng Nhập:</AppText>
                <AppText variant="xxs" weight="medium" color={theme.brand.accent}>
                  https://app.ongchu.cloud/login
                </AppText>
              </View>
            </View>
          </View>
        )}
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActionBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContent: {
    paddingVertical: 12,
    gap: 12,
  },
  dialogBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  monthChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 2,
  },
});
