import React from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppText } from '../../../lib/components/ui';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { SaaSTenant, SaaSPlan, SAAS_PLAN_TIERS } from '../../../lib/store/useSaaSAdminStore';
import { playTapSound } from '../../../lib/utils/sound';
import { SAAS_PLAN_NAMES, getExpiryTier, TenantSortOption } from '../constants';

interface SaaSTenantsTabProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatusFilter: 'all' | 'active' | 'expiring' | 'suspended';
  onStatusFilterChange: (st: 'all' | 'active' | 'expiring' | 'suspended') => void;
  selectedPlanFilter?: 'all' | SaaSPlan;
  onPlanFilterChange?: (p: 'all' | SaaSPlan) => void;
  sortOption?: TenantSortOption;
  onSortOptionChange?: (s: TenantSortOption) => void;
  filteredTenants: SaaSTenant[];
  plans?: any;
  onSelectTenant: (tenantId: string) => void;
  onImpersonate: (tenant: SaaSTenant) => void;
  onToggleStatus: (tenant: SaaSTenant) => void;
  onDeleteTenant: (tenant: SaaSTenant) => void;
  onQuickRenew?: (tenant: SaaSTenant) => void;
}

export const SaaSTenantsTab: React.FC<SaaSTenantsTabProps> = ({
  searchQuery,
  onSearchChange,
  selectedStatusFilter,
  onStatusFilterChange,
  selectedPlanFilter = 'all',
  onPlanFilterChange,
  sortOption = 'expiry_asc',
  onSortOptionChange,
  filteredTenants,
  plans,
  onSelectTenant,
  onImpersonate,
  onToggleStatus,
  onDeleteTenant,
  onQuickRenew,
}) => {
  const { theme } = useTheme();
  const { isWide } = useResponsive();

  // Apply plan filter & sorting
  const processedTenants = React.useMemo(() => {
    let list = [...filteredTenants];
    if (selectedPlanFilter !== 'all') {
      list = list.filter((t) => t.subscriptionPlan === selectedPlanFilter);
    }
    if (sortOption === 'expiry_asc') {
      list.sort((a, b) => a.licenseDaysLeft - b.licenseDaysLeft);
    } else if (sortOption === 'revenue_desc') {
      list.sort((a, b) => (b.monthlyFee || 0) - (a.monthlyFee || 0));
    } else if (sortOption === 'created_desc') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    return list;
  }, [filteredTenants, selectedPlanFilter, sortOption]);

  return (
    <View style={{ gap: 14 }}>
      {/* Thanh Tìm Kiếm & Bộ Lọc Nâng Cao */}
      <View style={{ gap: 10 }}>
        {/* Ô Tìm Kiếm */}
        <View style={[s.searchBox, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
          <Icon name="magnify" size={20} color={theme.text.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Tìm tên quán, SĐT, mã subdomain, tên chủ quán..."
            placeholderTextColor={theme.text.muted}
            style={[s.searchInput, { color: theme.text.primary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Icon name="close-circle" size={18} color={theme.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Trạng Thái & Gói Cước */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {/* Trạng thái */}
          {[
            { id: 'all' as const, label: 'Tất Cả' },
            { id: 'active' as const, label: 'Đang Thuê' },
            { id: 'expiring' as const, label: 'Sắp Hết Hạn' },
            { id: 'suspended' as const, label: 'Tạm Khóa' },
          ].map((st) => {
            const isSelected = selectedStatusFilter === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  onStatusFilterChange(st.id);
                }}
                style={[
                  s.chip,
                  {
                    backgroundColor: isSelected ? theme.brand.primary : theme.surface.card,
                    borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={isSelected ? 'medium' : 'normal'}
                  color={isSelected ? theme.text.onBrand : theme.text.primary}
                >
                  {st.label}
                </AppText>
              </TouchableOpacity>
            );
          })}

          {/* Dải phân cách */}
          {onPlanFilterChange && (
            <>
              <View style={{ width: 1, height: 16, backgroundColor: theme.border.subtle, marginHorizontal: 4 }} />

              {/* Lọc theo Gói */}
              {(
                [
                  { id: 'all' as const, label: 'Mọi Gói' },
                  { id: 'pro' as const, label: 'Chuyên Nghiệp' },
                  { id: 'standard' as const, label: 'Chuẩn' },
                  { id: 'enterprise' as const, label: 'Doanh Nghiệp' },
                ] as const
              ).map((p) => {
                const isSelected = selectedPlanFilter === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      onPlanFilterChange(p.id);
                    }}
                    style={[
                      s.chip,
                      {
                        backgroundColor: isSelected ? theme.brand.accent : theme.surface.card,
                        borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSelected ? 'medium' : 'normal'}
                      color={isSelected ? theme.text.onBrand : theme.text.muted}
                    >
                      {p.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* Danh Sách Thẻ Quán Lưới 2 Cột Desktop */}
      <View style={isWide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14 } : { gap: 10 }}>
        {processedTenants.length === 0 ? (
          <View
            style={[
              s.sectionCard,
              {
                width: '100%',
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
                borderRadius: isWide ? 16 : 0,
                alignItems: 'center',
                paddingVertical: 40,
                gap: 8,
              },
            ]}
          >
            <Icon name="store-off-outline" size={36} color={theme.text.muted} />
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              Không tìm thấy quán nào phù hợp
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
            </AppText>
          </View>
        ) : (
          processedTenants.map((t) => {
            const planCfg = (plans && plans[t.subscriptionPlan]) || SAAS_PLAN_TIERS[t.subscriptionPlan];
            const tier = getExpiryTier(t.licenseDaysLeft, t.isActive);

            return (
              <View
                key={t.id}
                style={[
                  s.tenantCard,
                  {
                    width: isWide ? '49%' : '100%',
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 14 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {/* Header Thẻ: Avatar Quán + Tên Quán + Gói + Trạng Thái */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      onSelectTenant(t.id);
                    }}
                    style={{ flex: 1, marginRight: 10 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: theme.brand.primary + '12',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="storefront" size={20} color={theme.brand.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                            {t.name}
                          </AppText>
                          <View
                            style={{
                              backgroundColor: (planCfg?.badgeColor || theme.brand.accent) + '18',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <AppText
                              variant="xxs"
                              weight="bold"
                              color={planCfg?.badgeColor || theme.brand.accent}
                            >
                              {SAAS_PLAN_NAMES[t.subscriptionPlan] || 'Gói Chuẩn'}
                            </AppText>
                          </View>
                        </View>
                        <AppText variant="xs" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
                          {t.subdomain}.ongchu.cloud
                        </AppText>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Badge Thời Hạn */}
                  <View
                    style={{
                      backgroundColor: tier.bgColor,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name={tier.icon as any} size={14} color={tier.color} />
                    <AppText variant="xs" weight="medium" color={tier.color} tabularNums>
                      {tier.label}
                    </AppText>
                  </View>
                </View>

                {/* Ma Trận Thông Số 3 Cột */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: theme.surface.app,
                    borderRadius: 10,
                    padding: 10,
                    marginVertical: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="xxs" color={theme.text.muted}>Chủ Quán</AppText>
                    <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1} style={{ marginTop: 2 }}>
                      {t.ownerName || 'Chưa đặt tên'}
                    </AppText>
                    <AppText variant="xxs" color={theme.text.muted} tabularNums style={{ marginTop: 1 }}>
                      {t.phone}
                    </AppText>
                  </View>

                  <View style={{ width: 1, backgroundColor: theme.border.subtle, marginHorizontal: 8 }} />

                  <View style={{ flex: 1 }}>
                    <AppText variant="xxs" color={theme.text.muted}>Quy Mô Kết Nối</AppText>
                    <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                      {t.branchCount} chi nhánh
                    </AppText>
                    <AppText variant="xxs" color={theme.text.muted} tabularNums style={{ marginTop: 1 }}>
                      {t.deviceCount} máy POS
                    </AppText>
                  </View>

                  <View style={{ width: 1, backgroundColor: theme.border.subtle, marginHorizontal: 8 }} />

                  <View style={{ flex: 1 }}>
                    <AppText variant="xxs" color={theme.text.muted}>Phí Thu Hàng Tháng</AppText>
                    <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
                      {t.monthlyFee > 0 ? `${t.monthlyFee.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                    </AppText>
                    <AppText variant="xxs" color={theme.text.muted} tabularNums style={{ marginTop: 1 }}>
                      Hạn: {new Date(t.licenseExpiresAt).toLocaleDateString('vi-VN')}
                    </AppText>
                  </View>
                </View>

                {/* Cụm Nút Hành Động Chuẩn Mực */}
                <View style={s.actionRow}>
                  {onQuickRenew && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        playTapSound();
                        onQuickRenew(t);
                      }}
                      style={[s.actionBtn, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent }]}
                    >
                      <Icon name="lightning-bolt" size={14} color={theme.text.onBrand} />
                      <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                        Gia Hạn
                      </AppText>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      onSelectTenant(t.id);
                    }}
                    style={[s.actionBtn, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
                  >
                    <Icon name="cog-outline" size={14} color={theme.text.onBrand} />
                    <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                      Chi Tiết
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      onImpersonate(t);
                    }}
                    style={[s.actionBtn, { backgroundColor: theme.surface.app, borderColor: theme.border.subtle }]}
                  >
                    <Icon name="shield-account" size={14} color={theme.text.primary} />
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      Hỗ Trợ
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      onToggleStatus(t);
                    }}
                    style={[
                      s.actionBtn,
                      {
                        backgroundColor: t.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        borderColor: t.isActive ? theme.brand.danger : theme.brand.success,
                      },
                    ]}
                  >
                    <Icon
                      name={t.isActive ? 'lock-outline' : 'lock-open-outline'}
                      size={14}
                      color={t.isActive ? theme.brand.danger : theme.brand.success}
                    />
                    <AppText
                      variant="xs"
                      weight="medium"
                      color={t.isActive ? theme.brand.danger : theme.brand.success}
                    >
                      {t.isActive ? 'Khóa' : 'Mở'}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      onDeleteTenant(t);
                    }}
                    style={[
                      s.actionBtn,
                      {
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        borderColor: theme.brand.danger,
                        paddingHorizontal: 8,
                      },
                    ]}
                  >
                    <Icon name="trash-can-outline" size={14} color={theme.brand.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionCard: {
    borderWidth: 1,
  },
  tenantCard: {
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
