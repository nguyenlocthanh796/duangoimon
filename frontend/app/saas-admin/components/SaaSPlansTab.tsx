import React from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../../lib/components/ui';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { SaaSPlan, SaaSLicenseKey, SAAS_PLAN_TIERS } from '../../../lib/store/useSaaSAdminStore';
import { playTapSound } from '../../../lib/utils/sound';
import { SAAS_ADDON_OPTIONS } from '../constants';

interface SaaSPlansTabProps {
  planSubTab: 'matrix' | 'keys';
  setPlanSubTab: (tab: 'matrix' | 'keys') => void;
  editingPlan: SaaSPlan | null;
  setEditingPlan: (p: SaaSPlan | null) => void;
  editPrice: string;
  setEditPrice: (p: string) => void;
  editMaxBranches: string;
  setEditMaxBranches: (b: string) => void;
  editMaxDevices: string;
  setEditMaxDevices: (d: string) => void;
  editAddons: string[];
  setEditAddons: React.Dispatch<React.SetStateAction<string[]>>;
  isSavingPlan: boolean;
  onSavePlanConfig: (planKey: SaaSPlan) => void;
  onStartEditPlan: (planKey: SaaSPlan) => void;
  onResetPlans: () => void;
  genPlan: SaaSPlan;
  setGenPlan: (p: SaaSPlan) => void;
  genDuration: number;
  setGenDuration: (d: number) => void;
  genNote: string;
  setGenNote: (n: string) => void;
  isGeneratingKey: boolean;
  lastGeneratedKey: SaaSLicenseKey | null;
  setLastGeneratedKey: (k: SaaSLicenseKey | null) => void;
  keyFilter: 'all' | 'unused' | 'used';
  setKeyFilter: (f: 'all' | 'unused' | 'used') => void;
  licenseKeys: SaaSLicenseKey[];
  onGenerateKey: () => void;
  onCopyKey: (keyStr: string) => void;
  onDeleteKey: (keyStr: string) => void;
  plans?: any;
}

export const SaaSPlansTab: React.FC<SaaSPlansTabProps> = ({
  planSubTab,
  setPlanSubTab,
  editingPlan,
  setEditingPlan,
  editPrice,
  setEditPrice,
  editMaxBranches,
  setEditMaxBranches,
  editMaxDevices,
  setEditMaxDevices,
  editAddons,
  setEditAddons,
  isSavingPlan,
  onSavePlanConfig,
  onStartEditPlan,
  onResetPlans,
  genPlan,
  setGenPlan,
  genDuration,
  setGenDuration,
  genNote,
  setGenNote,
  isGeneratingKey,
  lastGeneratedKey,
  setLastGeneratedKey,
  keyFilter,
  setKeyFilter,
  licenseKeys,
  onGenerateKey,
  onCopyKey,
  onDeleteKey,
  plans,
}) => {
  const { theme } = useTheme();
  const { isWide } = useResponsive();

  const handleToggleEditAddon = (addonCode: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setEditAddons((prev) =>
      prev.includes(addonCode)
        ? prev.filter((c) => c !== addonCode)
        : [...prev, addonCode]
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Sub-Tab Navigation Switcher */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginHorizontal: isWide ? 0 : 12,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            setPlanSubTab('matrix');
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: planSubTab === 'matrix' ? theme.brand.accent : theme.border.subtle,
            backgroundColor: planSubTab === 'matrix' ? theme.brand.accent + '15' : theme.surface.card,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
        >
          <Icon
            name="table-edit"
            size={16}
            color={planSubTab === 'matrix' ? theme.brand.accent : theme.text.muted}
          />
          <AppText
            variant="sm"
            weight={planSubTab === 'matrix' ? 'bold' : 'normal'}
            color={planSubTab === 'matrix' ? theme.brand.accent : theme.text.primary}
          >
            Bảng Giá & Gói
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            setPlanSubTab('keys');
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: planSubTab === 'keys' ? theme.brand.accent : theme.border.subtle,
            backgroundColor: planSubTab === 'keys' ? theme.brand.accent + '15' : theme.surface.card,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
        >
          <Icon
            name="key-wireless"
            size={16}
            color={planSubTab === 'keys' ? theme.brand.accent : theme.text.muted}
          />
          <AppText
            variant="sm"
            weight={planSubTab === 'keys' ? 'bold' : 'normal'}
            color={planSubTab === 'keys' ? theme.brand.accent : theme.text.primary}
          >
            License Key
          </AppText>
          {licenseKeys && licenseKeys.filter((k) => !k.isUsed).length > 0 && (
            <View style={[s.tabBadge, { backgroundColor: theme.brand.accent }]}>
              <AppText variant="xs" color={theme.text.onBrand} weight="bold" tabularNums>
                {licenseKeys.filter((k) => !k.isUsed).length}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 1: BẢNG GIÁ & MA TRẬN TÍNH NĂNG              */}
      {/* ---------------------------------------------------- */}
      {planSubTab === 'matrix' && (
        <>
          {/* Header Action Banner */}
          <View
            style={[
              s.pricingCard,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
                borderRadius: isWide ? 18 : 0,
                borderWidth: isWide ? 1 : 0,
                borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                borderBottomWidth: StyleSheet.hairlineWidth,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <AppText variant="sm" weight="medium" color={theme.text.primary}>
                Bảng Giá & Gói Cước
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                Điều chỉnh giá niêm yết, trần thiết bị và tính năng.
              </AppText>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onResetPlans}
              style={[
                s.miniActionBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border.subtle,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                },
              ]}
            >
              <Icon name="restore" size={14} color={theme.text.muted} />
              <AppText variant="xs" color={theme.text.muted}>
                Mặc Định
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Danh Sách 4 Gói Cước */}
          <View style={isWide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14 } : { gap: 12 }}>
            {(['trial', 'standard', 'pro', 'enterprise'] as SaaSPlan[]).map((planKey) => {
              const p = (plans && plans[planKey]) || SAAS_PLAN_TIERS[planKey];
              const isEditing = editingPlan === planKey;

              if (isEditing) {
                // Inline Plan Editor
                return (
                  <View
                    key={planKey}
                    style={[
                      s.pricingCard,
                      {
                        width: isWide ? '49%' : '100%',
                        backgroundColor: theme.surface.card,
                        borderColor: theme.brand.primary,
                        borderRadius: isWide ? 18 : 0,
                        borderWidth: 1.5,
                        gap: 12,
                      },
                    ]}
                  >
                    {/* Editor Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="pencil" size={18} color={theme.brand.primary} />
                        <AppText variant="md" weight="medium" color={theme.brand.primary}>
                          Sửa Gói: {p.name}
                        </AppText>
                      </View>
                      <View style={[s.planBadge, { backgroundColor: p.badgeColor + '20' }]}>
                        <AppText variant="xs" color={p.badgeColor} weight="medium">
                          {p.id.toUpperCase()}
                        </AppText>
                      </View>
                    </View>

                    {/* Input 1: Giá Niêm Yết */}
                    <View style={{ gap: 4 }}>
                      <AppText variant="xs" weight="medium" color={theme.text.muted}>
                        GIÁ (Đ/THÁNG):
                      </AppText>
                      <TextInput
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.text.muted}
                        style={[
                          s.formInput,
                          {
                            backgroundColor: theme.surface.header,
                            color: theme.text.primary,
                            borderColor: theme.border.subtle,
                            fontSize: 16,
                          },
                        ]}
                      />
                      {/* Quick Price Chips */}
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {[
                          { label: '0 đ', val: 0 },
                          { label: '199k', val: 199000 },
                          { label: '399k', val: 399000 },
                          { label: '799k', val: 799000 },
                        ].map((item) => (
                          <TouchableOpacity
                            key={item.val}
                            activeOpacity={0.7}
                            onPress={() => setEditPrice(String(item.val))}
                            style={[
                              s.chip,
                              {
                                backgroundColor:
                                  parseInt(editPrice.replace(/\D/g, ''), 10) === item.val
                                    ? theme.brand.primary + '20'
                                    : theme.surface.header,
                                borderColor:
                                  parseInt(editPrice.replace(/\D/g, ''), 10) === item.val
                                    ? theme.brand.primary
                                    : theme.border.subtle,
                              },
                            ]}
                          >
                            <AppText
                              variant="xs"
                              color={
                                parseInt(editPrice.replace(/\D/g, ''), 10) === item.val
                                  ? theme.brand.primary
                                  : theme.text.muted
                              }
                              tabularNums
                            >
                              {item.label}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Input 2: Trần Chi Nhánh */}
                    <View style={{ gap: 4 }}>
                      <AppText variant="xs" weight="medium" color={theme.text.muted}>
                        TRẦN CHI NHÁNH:
                      </AppText>
                      <TextInput
                        value={editMaxBranches}
                        onChangeText={setEditMaxBranches}
                        placeholder="1 hoặc unlimited"
                        placeholderTextColor={theme.text.muted}
                        style={[
                          s.formInput,
                          {
                            backgroundColor: theme.surface.header,
                            color: theme.text.primary,
                            borderColor: theme.border.subtle,
                            fontSize: 16,
                          },
                        ]}
                      />
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {['1', '3', '5', 'unlimited'].map((v) => (
                          <TouchableOpacity
                            key={v}
                            activeOpacity={0.7}
                            onPress={() => setEditMaxBranches(v)}
                            style={[
                              s.chip,
                              {
                                backgroundColor: editMaxBranches === v ? theme.brand.primary + '20' : theme.surface.header,
                                borderColor: editMaxBranches === v ? theme.brand.primary : theme.border.subtle,
                              },
                            ]}
                          >
                            <AppText
                              variant="xs"
                              color={editMaxBranches === v ? theme.brand.primary : theme.text.muted}
                            >
                              {v === 'unlimited' ? '∞ Vô hạn' : `${v} CN`}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Input 3: Trần Máy POS */}
                    <View style={{ gap: 4 }}>
                      <AppText variant="xs" weight="medium" color={theme.text.muted}>
                        TRẦN MÁY POS:
                      </AppText>
                      <TextInput
                        value={editMaxDevices}
                        onChangeText={setEditMaxDevices}
                        placeholder="1 hoặc unlimited"
                        placeholderTextColor={theme.text.muted}
                        style={[
                          s.formInput,
                          {
                            backgroundColor: theme.surface.header,
                            color: theme.text.primary,
                            borderColor: theme.border.subtle,
                            fontSize: 16,
                          },
                        ]}
                      />
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {['1', '3', '10', 'unlimited'].map((v) => (
                          <TouchableOpacity
                            key={v}
                            activeOpacity={0.7}
                            onPress={() => setEditMaxDevices(v)}
                            style={[
                              s.chip,
                              {
                                backgroundColor: editMaxDevices === v ? theme.brand.primary + '20' : theme.surface.header,
                                borderColor: editMaxDevices === v ? theme.brand.primary : theme.border.subtle,
                              },
                            ]}
                          >
                            <AppText
                              variant="xs"
                              color={editMaxDevices === v ? theme.brand.primary : theme.text.muted}
                            >
                              {v === 'unlimited' ? '∞ Vô hạn' : `${v} POS`}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Input 4: Ma Trận Addons Mở Khóa */}
                    <View style={{ gap: 6 }}>
                      <AppText variant="xs" weight="medium" color={theme.text.muted}>
                        TÍNH NĂNG MỞ KHÓA:
                      </AppText>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {SAAS_ADDON_OPTIONS.map((addon) => {
                          const isChecked = editAddons.includes(addon.code);
                          return (
                            <TouchableOpacity
                              key={addon.code}
                              activeOpacity={0.7}
                              onPress={() => handleToggleEditAddon(addon.code)}
                              style={[
                                s.chip,
                                {
                                  backgroundColor: isChecked ? theme.brand.primary + '20' : theme.surface.header,
                                  borderColor: isChecked ? theme.brand.primary : theme.border.subtle,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                },
                              ]}
                            >
                              <Icon
                                name={isChecked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                                size={14}
                                color={isChecked ? theme.brand.primary : theme.text.muted}
                              />
                              <AppText
                                variant="xs"
                                color={isChecked ? theme.brand.primary : theme.text.muted}
                              >
                                {addon.name}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Footer Actions */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setEditingPlan(null)}
                        style={[
                          s.actionBtn,
                          {
                            flex: 1,
                            borderColor: theme.border.subtle,
                            backgroundColor: theme.surface.header,
                            paddingVertical: 10,
                          },
                        ]}
                      >
                        <AppText variant="xs" color={theme.text.muted}>
                          Hủy
                        </AppText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isSavingPlan}
                        onPress={() => onSavePlanConfig(planKey)}
                        style={[
                          s.actionBtn,
                          {
                            flex: 2,
                            borderColor: theme.brand.primary,
                            backgroundColor: theme.brand.primary,
                            paddingVertical: 10,
                          },
                        ]}
                      >
                        <Icon name="content-save" size={16} color={theme.text.onBrand} />
                        <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                          {isSavingPlan ? 'Đang Lưu...' : 'Lưu Gói'}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // Plan Card View Mode
              return (
                <View
                  key={planKey}
                  style={[
                    s.pricingCard,
                    {
                      width: isWide ? '49%' : '100%',
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
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="md" weight="normal" color={theme.text.primary}>
                          {p.name}
                        </AppText>
                        <View style={[s.planBadge, { backgroundColor: p.badgeColor + '20' }]}>
                          <AppText variant="xs" color={p.badgeColor} weight="medium">
                            {p.id.toUpperCase()}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                        {p.tagline}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="md" weight="normal" color={p.badgeColor} tabularNums>
                        {p.pricePerMonth > 0 ? `${p.pricePerMonth.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted}>
                        {p.pricePerMonth > 0 ? '/ tháng' : '/ 14 ngày'}
                      </AppText>
                    </View>
                  </View>

                  {/* Quota Highlights Strip */}
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      paddingVertical: 8,
                      marginTop: 6,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.border.subtle,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="source-branch" size={14} color={theme.brand.primary} />
                      <AppText variant="xs" color={theme.text.primary} tabularNums>
                        {p.maxBranches === 'unlimited' ? '∞ Chi nhánh' : `${p.maxBranches} Chi nhánh`}
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="devices" size={14} color={theme.brand.primary} />
                      <AppText variant="xs" color={theme.text.primary} tabularNums>
                        {p.maxDevices === 'unlimited' ? '∞ Máy POS' : `${p.maxDevices} Máy POS`}
                      </AppText>
                    </View>
                  </View>

                  <View style={[s.divider, { backgroundColor: theme.border.subtle }]} />

                  {/* Ma Trận Tính Năng Mở Khóa */}
                  <View style={{ gap: 6 }}>
                    <AppText variant="xs" weight="medium" color={theme.text.muted}>
                      TÍNH NĂNG TRONG GÓI:
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {SAAS_ADDON_OPTIONS.map((addon) => {
                        const isIncluded = (p.enabledAddons || []).includes(addon.code);
                        return (
                          <View
                            key={addon.code}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: isIncluded ? 'rgba(16, 185, 129, 0.08)' : theme.surface.header,
                            }}
                          >
                            <Icon
                              name={isIncluded ? 'check-circle' : 'minus-circle-outline'}
                              size={13}
                              color={isIncluded ? theme.brand.success : theme.text.muted}
                            />
                            <AppText
                              variant="xs"
                              color={isIncluded ? theme.text.primary : theme.text.muted}
                            >
                              {addon.name}
                            </AppText>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Nút Chỉnh Sửa Gói */}
                  <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onStartEditPlan(planKey)}
                      style={[
                        s.actionBtn,
                        {
                          borderColor: theme.brand.primary,
                          backgroundColor: theme.brand.primary + '10',
                          paddingVertical: 8,
                        },
                      ]}
                    >
                      <Icon name="tune" size={15} color={theme.brand.primary} />
                      <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                        Sửa Gói Cước
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 2: QUẢN LÝ LICENSE KEY (7, 15, 30 NGÀY)      */}
      {/* ---------------------------------------------------- */}
      {planSubTab === 'keys' && (
        <View style={isWide ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' } : { gap: 12 }}>
          {/* Cột Trái (40%): Generator Card + Banner */}
          <View style={isWide ? { flex: 0.85, gap: 14 } : { gap: 12 }}>
            {/* 1. Generator Card */}
            <View
              style={[
                s.pricingCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 18 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  gap: 12,
                },
              ]}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="plus-circle" size={18} color={theme.brand.primary} />
                  <AppText variant="md" weight="medium" color={theme.text.primary}>
                    Sinh License Key
                  </AppText>
                </View>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                  Tạo mã bản quyền theo ngày cấp cho quán.
                </AppText>
              </View>

              {/* Bước 1: Chọn Gói */}
              <View style={{ gap: 4 }}>
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  1. CHỌN GÓI:
                </AppText>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {(['trial', 'standard', 'pro', 'enterprise'] as SaaSPlan[]).map((pk) => {
                    const isSel = genPlan === pk;
                    const tier = (plans && plans[pk]) || SAAS_PLAN_TIERS[pk];
                    return (
                      <TouchableOpacity
                        key={pk}
                        activeOpacity={0.7}
                        onPress={() => setGenPlan(pk)}
                        style={[
                          s.chip,
                          {
                            backgroundColor: isSel ? theme.brand.primary + '20' : theme.surface.header,
                            borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight={isSel ? 'medium' : 'normal'}
                          color={isSel ? theme.brand.primary : theme.text.primary}
                        >
                          {tier.name.split(' ')[0]}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bước 2: Chọn Thời Hạn (7, 15, 30, 90, 365 Ngày) */}
              <View style={{ gap: 4 }}>
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  2. THỜI HẠN:
                </AppText>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: '7 Ngày', days: 7 },
                    { label: '15 Ngày', days: 15 },
                    { label: '30 Ngày', days: 30 },
                    { label: '90 Ngày', days: 90 },
                    { label: '365 Ngày', days: 365 },
                  ].map((d) => {
                    const isSel = genDuration === d.days;
                    return (
                      <TouchableOpacity
                        key={d.days}
                        activeOpacity={0.7}
                        onPress={() => setGenDuration(d.days)}
                        style={[
                          s.chip,
                          {
                            backgroundColor: isSel ? theme.brand.primary + '20' : theme.surface.header,
                            borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight={isSel ? 'medium' : 'normal'}
                          color={isSel ? theme.brand.primary : theme.text.primary}
                          tabularNums
                        >
                          {d.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bước 3: Ghi Chú Tùy Chọn */}
              <View style={{ gap: 4 }}>
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  3. GHI CHÚ:
                </AppText>
                <TextInput
                  value={genNote}
                  onChangeText={setGenNote}
                  placeholder="Tặng quán, khuyến mãi..."
                  placeholderTextColor={theme.text.muted}
                  style={[
                    s.formInput,
                    {
                      backgroundColor: theme.surface.header,
                      color: theme.text.primary,
                      borderColor: theme.border.subtle,
                      fontSize: 16,
                    },
                  ]}
                />
              </View>

              {/* CTA Sinh Key */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isGeneratingKey}
                onPress={onGenerateKey}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: theme.brand.primary,
                }}
              >
                <Icon name="key-plus" size={18} color={theme.text.onBrand} />
                <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                  {isGeneratingKey ? 'Đang Tạo...' : `+ Sinh Key (${genDuration} Ngày)`}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* 2. Banner Key Vừa Tạo Thành Công */}
            {lastGeneratedKey && (
              <View
                style={[
                  s.pricingCard,
                  {
                    backgroundColor: theme.brand.primary + '12',
                    borderColor: theme.brand.primary,
                    borderRadius: isWide ? 18 : 0,
                    borderWidth: 1.5,
                    gap: 8,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="check-decagram" size={18} color={theme.brand.primary} />
                    <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                      ĐÃ TẠO KEY MỚI
                    </AppText>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setLastGeneratedKey(null)}>
                    <Icon name="close" size={16} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>

                <AppText
                  variant="md"
                  weight="medium"
                  color={theme.text.primary}
                  tabularNums
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    letterSpacing: 1,
                    marginVertical: 4,
                  }}
                >
                  {lastGeneratedKey.key}
                </AppText>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="xs" color={theme.text.muted}>
                    Gói {lastGeneratedKey.plan.toUpperCase()} · {lastGeneratedKey.durationDays} Ngày
                  </AppText>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onCopyKey(lastGeneratedKey.key)}
                    style={[
                      s.miniActionBtn,
                      {
                        backgroundColor: theme.brand.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      },
                    ]}
                  >
                    <Icon name="content-copy" size={14} color={theme.text.onBrand} />
                    <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                      Sao Chép Key
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Cột Phải (60%): Filter Keys Row + Danh Sách License Keys */}
          <View style={isWide ? { flex: 1.15, gap: 12 } : { gap: 12 }}>
            {/* 3. Filter Keys Row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                marginHorizontal: isWide ? 0 : 12,
                alignItems: 'center',
              }}
            >
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginRight: 4 }}>
                LỌC KEY:
              </AppText>
              {[
                { id: 'all', label: `Tất Cả (${(licenseKeys || []).length})` },
                { id: 'unused', label: `Chưa Dùng (${(licenseKeys || []).filter((k) => !k.isUsed).length})` },
                { id: 'used', label: `Đã Nạp (${(licenseKeys || []).filter((k) => k.isUsed).length})` },
              ].map((f) => {
                const isSel = keyFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    activeOpacity={0.7}
                    onPress={() => setKeyFilter(f.id as any)}
                    style={[
                      s.chip,
                      {
                        backgroundColor: isSel ? theme.brand.primary : theme.surface.card,
                        borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSel ? 'medium' : 'normal'}
                      color={isSel ? theme.text.onBrand : theme.text.muted}
                      tabularNums
                    >
                      {f.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Danh Sách License Keys */}
            {(() => {
              const filtered = (licenseKeys || []).filter((k) => {
                if (keyFilter === 'unused') return !k.isUsed;
                if (keyFilter === 'used') return k.isUsed;
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <View
                    style={[
                      s.pricingCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 18 : 0,
                        alignItems: 'center',
                        paddingVertical: 32,
                      },
                    ]}
                  >
                    <Icon name="key-variant" size={32} color={theme.text.muted} />
                    <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 8 }}>
                      Không có license key nào trong danh sách
                    </AppText>
                  </View>
                );
              }

              return filtered.map((k) => {
                const planCfg = (plans && plans[k.plan]) || SAAS_PLAN_TIERS[k.plan];
                return (
                  <View
                    key={k.key}
                    style={[
                      s.pricingCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 18 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderTopWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        gap: 8,
                      },
                    ]}
                  >
                    {/* Row 1: Key String + Status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <AppText
                          variant="sm"
                          weight="medium"
                          color={theme.text.primary}
                          tabularNums
                          style={{
                            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                            letterSpacing: 0.5,
                          }}
                        >
                          {k.key}
                        </AppText>
                      </View>

                      <View
                        style={[
                          s.statusPill,
                          {
                            backgroundColor: k.isUsed
                              ? 'rgba(100, 116, 139, 0.12)'
                              : 'rgba(16, 185, 129, 0.12)',
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight="medium"
                          color={k.isUsed ? theme.text.muted : theme.brand.success}
                        >
                          {k.isUsed ? 'ĐÃ NẠP' : 'CHƯA DÙNG'}
                        </AppText>
                      </View>
                    </View>

                    {/* Row 2: Metadata Badges */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={[s.planBadge, { backgroundColor: planCfg.badgeColor + '20' }]}>
                        <AppText variant="xs" color={planCfg.badgeColor} weight="medium">
                          {planCfg.name.split(' ')[0]}
                        </AppText>
                      </View>
                      <AppText variant="xs" color={theme.text.muted} tabularNums>
                        Thời hạn: {k.durationDays} Ngày
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted}>
                        ·
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted} tabularNums>
                        Tạo: {new Date(k.createdAt).toLocaleDateString('vi-VN')}
                      </AppText>
                    </View>

                    {/* Row 3: Used Info */}
                    {k.isUsed && k.usedByTenantName && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="store-check" size={13} color={theme.brand.primary} />
                        <AppText variant="xs" color={theme.text.primary}>
                          Đã kích hoạt cho quán: <AppText variant="xs" weight="medium" color={theme.brand.primary}>{k.usedByTenantName}</AppText>
                        </AppText>
                      </View>
                    )}

                    {/* Row 4: Note */}
                    {k.note && (
                      <AppText variant="xs" color={theme.text.muted} style={{ fontStyle: 'italic' }}>
                        Ghi chú: {k.note}
                      </AppText>
                    )}

                    {/* Actions Row */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 8,
                        paddingTop: 6,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.border.subtle,
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onCopyKey(k.key)}
                        style={[
                          s.miniActionBtn,
                          {
                            backgroundColor: theme.surface.header,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: theme.border.subtle,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          },
                        ]}
                      >
                        <Icon name="content-copy" size={13} color={theme.text.primary} />
                        <AppText variant="xs" color={theme.text.primary}>
                          Sao Chép
                        </AppText>
                      </TouchableOpacity>

                      {!k.isUsed && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => onDeleteKey(k.key)}
                          style={[
                            s.miniActionBtn,
                            {
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            },
                          ]}
                        >
                          <Icon name="delete-outline" size={13} color={theme.brand.danger} />
                          <AppText variant="xs" color={theme.brand.danger}>
                            Xóa
                          </AppText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  pricingCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formInput: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
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
  miniActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
});
