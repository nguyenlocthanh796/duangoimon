import React from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppText } from '../../../lib/components/ui';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { SaaSPlan, SAAS_PLAN_TIERS } from '../../../lib/store/useSaaSAdminStore';
import { SAAS_PLAN_NAMES, SAAS_PLAN_LIMIT_DESC } from '../constants';
import { playTapSound } from '../../../lib/utils/sound';

interface SaaSNewTenantTabProps {
  formName: string;
  setFormName: (v: string) => void;
  formSubdomain: string;
  setFormSubdomain: (v: string) => void;
  formPhone: string;
  setFormPhone: (v: string) => void;
  formOwnerName: string;
  setFormOwnerName: (v: string) => void;
  formUsername: string;
  setFormUsername: (v: string) => void;
  formPassword: string;
  setFormPassword: (v: string) => void;
  formPin: string;
  setFormPin: (v: string) => void;
  formPlan: SaaSPlan;
  setFormPlan: (v: SaaSPlan) => void;
  formDuration: number;
  setFormDuration: (v: number) => void;
  isSubmitting: boolean;
  onCreateTenant: () => void;
  plans?: any;
}

export const SaaSNewTenantTab: React.FC<SaaSNewTenantTabProps> = ({
  formName,
  setFormName,
  formSubdomain,
  setFormSubdomain,
  formPhone,
  setFormPhone,
  formOwnerName,
  setFormOwnerName,
  formUsername,
  setFormUsername,
  formPassword,
  setFormPassword,
  formPin,
  setFormPin,
  formPlan,
  setFormPlan,
  formDuration,
  setFormDuration,
  isSubmitting,
  onCreateTenant,
  plans,
}) => {
  const { theme } = useTheme();
  const { isWide } = useResponsive();
  const [showPassword, setShowPassword] = React.useState(false);

  const selectedPlanCfg = (plans && plans[formPlan]) || SAAS_PLAN_TIERS[formPlan];
  const totalPrice = (selectedPlanCfg?.pricePerMonth || 0) * (formPlan === 'trial' ? 0 : formDuration);
  const isFormValid = Boolean((formName || '').trim() && (formSubdomain || '').trim());

  const effectiveUsername = formUsername.trim() || formPhone.trim() || 'owner';
  const effectivePassword = formPassword.trim() || '123456';
  const effectivePin = formPin.trim() || '9999';

  // Calculate estimated expiry date
  const estimatedExpiry = React.useMemo(() => {
    const d = new Date();
    if (formPlan === 'trial') {
      d.setDate(d.getDate() + 14);
    } else {
      d.setMonth(d.getMonth() + formDuration);
    }
    return d.toLocaleDateString('vi-VN');
  }, [formPlan, formDuration]);

  return (
    <View
      style={
        isWide
          ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start' }
          : { gap: 16 }
      }
    >
      {/* Cột Trái (60% Desktop): Form Nhập Liệu Chuẩn Hóa */}
      <View
        style={[
          s.formCard,
          {
            flex: isWide ? 1.4 : undefined,
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            padding: isWide ? 20 : 16,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: theme.brand.accent + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="store-plus" size={20} color={theme.brand.accent} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Thông Tin Khách Thuê Mới
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Cấp tài khoản và không gian hoạt động độc lập
            </AppText>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          {/* Tên quán */}
          <View style={s.fieldGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>Tên Quán / Thương Hiệu</AppText>
              <AppText variant="xs" color={theme.brand.danger}>*</AppText>
            </View>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              placeholder="Ví dụ: Cà Phê Trứng Hà Nội"
              placeholderTextColor={theme.text.muted}
              style={[s.formInput, { backgroundColor: theme.surface.app, color: theme.text.primary, borderColor: theme.border.subtle }]}
            />
          </View>

          {/* Subdomain */}
          <View style={s.fieldGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>Mã Quán / Tên Miền Con (Subdomain)</AppText>
              <AppText variant="xs" color={theme.brand.danger}>*</AppText>
            </View>
            <TextInput
              value={formSubdomain}
              onChangeText={(t) => setFormSubdomain(t.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="Ví dụ: caphetrung"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              style={[
                s.formInput,
                {
                  backgroundColor: theme.surface.app,
                  color: theme.brand.accent,
                  borderColor: theme.border.subtle,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                },
              ]}
            />
            <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 2 }}>
              Địa chỉ truy cập: https://{formSubdomain || 'tenquan'}.ongchu.cloud
            </AppText>
          </View>

          {/* Số điện thoại & Chủ quán */}
          <View style={isWide ? { flexDirection: 'row', gap: 12 } : { gap: 14 }}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>Số Điện Thoại Chủ Quán</AppText>
              <TextInput
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="Ví dụ: 0912 345 678"
                keyboardType="phone-pad"
                placeholderTextColor={theme.text.muted}
                style={[s.formInput, { backgroundColor: theme.surface.app, color: theme.text.primary, borderColor: theme.border.subtle }]}
              />
            </View>

            <View style={[s.fieldGroup, { flex: 1 }]}>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>Họ & Tên Chủ Quán</AppText>
              <TextInput
                value={formOwnerName}
                onChangeText={setFormOwnerName}
                placeholder="Ví dụ: Anh Tuấn"
                placeholderTextColor={theme.text.muted}
                style={[s.formInput, { backgroundColor: theme.surface.app, color: theme.text.primary, borderColor: theme.border.subtle }]}
              />
            </View>
          </View>

          {/* Khối Tài Khoản & Mật Khẩu Khởi Tạo (Bắt Buộc Để Đăng Nhập) */}
          <View
            style={{
              backgroundColor: theme.surface.app,
              borderRadius: 12,
              padding: 12,
              gap: 12,
              borderWidth: 1,
              borderColor: theme.brand.accent + '30',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="shield-key" size={16} color={theme.brand.accent} />
              <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                Thông Tin Đăng Nhập Khởi Tạo Cho Chủ Quán
              </AppText>
            </View>

            <View style={isWide ? { flexDirection: 'row', gap: 12 } : { gap: 12 }}>
              {/* Tên Đăng Nhập */}
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <AppText variant="xs" weight="medium" color={theme.text.primary}>
                  Tên Đăng Nhập (Username)
                </AppText>
                <TextInput
                  value={formUsername}
                  onChangeText={setFormUsername}
                  placeholder={formPhone ? formPhone : 'Mặc định: owner'}
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="none"
                  style={[s.formInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.border.subtle }]}
                />
              </View>

              {/* Mật Khẩu */}
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <AppText variant="xs" weight="medium" color={theme.text.primary}>
                  Mật Khẩu Đăng Nhập
                </AppText>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput
                    value={formPassword}
                    onChangeText={setFormPassword}
                    placeholder="Mặc định: 123456"
                    placeholderTextColor={theme.text.muted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[s.formInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.border.subtle, paddingRight: 40 }]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, padding: 4 }}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mã PIN */}
              <View style={[s.fieldGroup, { width: isWide ? 130 : undefined }]}>
                <AppText variant="xs" weight="medium" color={theme.text.primary}>
                  Mã PIN Quản Lý
                </AppText>
                <TextInput
                  value={formPin}
                  onChangeText={(t) => setFormPin(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Mặc định: 9999"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                  maxLength={6}
                  style={[s.formInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.border.subtle, textAlign: 'center', fontWeight: 'bold' }]}
                />
              </View>
            </View>
          </View>

          {/* Chọn Gói Cước */}
          <View style={s.fieldGroup}>
            <AppText variant="xs" weight="medium" color={theme.text.primary}>Lựa Chọn Gói Cước</AppText>
            <View style={s.planSelectGrid}>
              {(['trial', 'standard', 'pro', 'enterprise'] as SaaSPlan[]).map((pk) => {
                const p = (plans && plans[pk]) || SAAS_PLAN_TIERS[pk];
                const isSelected = formPlan === pk;
                return (
                  <TouchableOpacity
                    key={pk}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setFormPlan(pk);
                    }}
                    style={[
                      s.planOptionCard,
                      {
                        backgroundColor: isSelected ? theme.brand.accent + '12' : theme.surface.app,
                        borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                        borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText
                        variant="sm"
                        weight={isSelected ? 'bold' : 'medium'}
                        color={isSelected ? theme.brand.accent : theme.text.primary}
                      >
                        {SAAS_PLAN_NAMES[pk]}
                      </AppText>
                      {isSelected && (
                        <Icon name="check-circle" size={16} color={theme.brand.accent} />
                      )}
                    </View>

                    <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 4 }}>
                      {p.pricePerMonth > 0 ? `${p.pricePerMonth.toLocaleString('vi-VN')} đ/tháng` : 'Miễn Phí'}
                    </AppText>

                    <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      {SAAS_PLAN_LIMIT_DESC[pk]}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Thời Hạn Ban Đầu */}
          {formPlan !== 'trial' && (
            <View style={s.fieldGroup}>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>Thời Hạn Thanh Toán Ban Đầu</AppText>
              <View style={s.durationChipsRow}>
                {[
                  { m: 1, label: '1 Tháng' },
                  { m: 3, label: '3 Tháng' },
                  { m: 6, label: '6 Tháng' },
                  { m: 12, label: '1 Năm' },
                ].map((d) => {
                  const isSelected = formDuration === d.m;
                  return (
                    <TouchableOpacity
                      key={d.m}
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        setFormDuration(d.m);
                      }}
                      style={[
                        s.durationChip,
                        {
                          backgroundColor: isSelected ? theme.brand.accent : theme.surface.app,
                          borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                        },
                      ]}
                    >
                      <AppText
                        variant="xs"
                        weight={isSelected ? 'bold' : 'normal'}
                        color={isSelected ? theme.text.onBrand : theme.text.primary}
                        tabularNums
                      >
                        {d.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Cột Phải (40% Desktop): Thẻ Tóm Tắt Hợp Đồng Live Preview */}
      <View
        style={[
          s.summaryCard,
          {
            flex: isWide ? 1 : undefined,
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            padding: isWide ? 20 : 16,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Icon name="file-document-check-outline" size={20} color={theme.brand.primary} />
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Tóm Tắt Hợp Đồng & Kích Hoạt
          </AppText>
        </View>

        <View
          style={{
            backgroundColor: theme.surface.app,
            borderRadius: 12,
            padding: 14,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="xs" color={theme.text.muted}>Thương hiệu:</AppText>
            <AppText variant="xs" weight="bold" color={theme.text.primary} numberOfLines={1} style={{ maxWidth: '60%' }}>
              {formName || 'Chưa nhập'}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="xs" color={theme.text.muted}>Tên miền:</AppText>
            <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
              {formSubdomain || 'chua-dat'}.ongchu.cloud
            </AppText>
          </View>

          {/* Chi tiết tài khoản đăng nhập */}
          <View style={{ backgroundColor: theme.surface.card, padding: 10, borderRadius: 8, gap: 6, marginVertical: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="xxs" color={theme.text.muted}>Mã quán (Code):</AppText>
              <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                {formSubdomain || 'chua-dat'}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="xxs" color={theme.text.muted}>Tài khoản (User):</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.primary}>
                {effectiveUsername}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="xxs" color={theme.text.muted}>Mật khẩu (Pass):</AppText>
              <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                {effectivePassword}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="xxs" color={theme.text.muted}>Mã PIN quản lý:</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                {effectivePin}
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="xs" color={theme.text.muted}>Gói đăng ký:</AppText>
            <AppText variant="xs" weight="bold" color={theme.text.primary}>
              {SAAS_PLAN_NAMES[formPlan]}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="xs" color={theme.text.muted}>Thời hạn:</AppText>
            <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
              {formPlan === 'trial' ? '14 Ngày Dùng Thử' : `${formDuration} Tháng`}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="xs" color={theme.text.muted}>Hạn dùng đến:</AppText>
            <AppText variant="xs" weight="medium" color={theme.brand.success} tabularNums>
              {estimatedExpiry}
            </AppText>
          </View>

          <View style={{ height: 1, backgroundColor: theme.border.subtle, marginVertical: 4 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="sm" weight="bold" color={theme.text.primary}>Tổng Tiền Thu:</AppText>
            <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
              {totalPrice > 0 ? `${totalPrice.toLocaleString('vi-VN')} đ` : '0 đ (Miễn Phí)'}
            </AppText>
          </View>
        </View>

        {/* Nút Cấp Quán CTA */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isSubmitting || !isFormValid}
          onPress={onCreateTenant}
          style={[
            s.submitButton,
            {
              backgroundColor: isFormValid ? theme.brand.accent : theme.surface.app,
              borderColor: isFormValid ? theme.brand.accent : theme.border.subtle,
              marginTop: 16,
            },
          ]}
        >
          <Icon
            name="rocket-launch"
            size={18}
            color={isFormValid ? theme.text.onBrand : theme.text.muted}
          />
          <AppText
            variant="md"
            weight="bold"
            color={isFormValid ? theme.text.onBrand : theme.text.muted}
          >
            {isSubmitting ? 'Đang Khởi Tạo...' : 'Cấp Quán Mới'}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  formCard: {
    borderWidth: 1,
  },
  summaryCard: {
    borderWidth: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  formInput: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  planSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planOptionCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 10,
  },
  durationChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
});
