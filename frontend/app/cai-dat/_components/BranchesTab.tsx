import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, useAppToast } from '../../../lib/components/ui';
import { useAuthStore, Branch } from '../../../lib/store/useAuthStore';
import { playTapSound } from '../../../lib/utils/sound';

interface BranchesTabProps {
  isWide?: boolean;
}

export function BranchesTab({ isWide: propIsWide }: BranchesTabProps) {
  const { theme, isDark } = useTheme();
  const { isWide: responsiveWide } = useResponsive();
  const isWide = propIsWide ?? responsiveWide;
  const { showToast } = useAppToast();

  const branches = useAuthStore((s) => s.branches);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const currentRole = useAuthStore((s) => s.currentRole);
  const isOwner = currentRole === 'owner' || currentRole === 'super_admin';
  const deviceBinding = useAuthStore((s) => s.deviceBinding);
  const addBranch = useAuthStore((s) => s.addBranch);
  const updateBranch = useAuthStore((s) => s.updateBranch);
  const switchBranch = useAuthStore((s) => s.switchBranch);
  const getBranchQuota = useAuthStore((s) => s.getBranchQuota);

  const quota = typeof getBranchQuota === 'function' ? getBranchQuota() : {
    currentCount: branches.length,
    maxBranches: 3 as number | 'unlimited',
    maxBranchesNum: 3,
    isAtLimit: branches.length >= 3,
    planName: 'Pro',
  };

  // 🌟 INLINE SUB-SCREEN BRANCHING (Invariant 3.4.2: Zero-Modal Detail)
  const [showFormScreen, setShowFormScreen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formManager, setFormManager] = useState('');

  // Tự động tạo gợi ý mã chi nhánh từ tên
  const handleNameChange = (text: string) => {
    setFormName(text);
    if (modalMode === 'add') {
      const words = text.trim().split(/\s+/);
      if (words.length >= 2) {
        const initials = words
          .slice(-2)
          .map((w) => w.charAt(0).toUpperCase())
          .join('');
        setFormCode(`CN-${initials}`);
      }
    }
  };

  const handleOpenAdd = () => {
    playTapSound();
    if (quota.isAtLimit) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
      showToast({
        title: 'Hạn Mức Chi Nhánh',
        message: `Gói ${quota.planName} tối đa ${quota.maxBranches} chi nhánh. Liên hệ để nâng cấp Enterprise!`,
        type: 'warning',
      });
      return;
    }
    const nextIdx = branches.length + 1;
    setFormName(`Chi Nhánh ${nextIdx}`);
    setFormCode(`CN-0${nextIdx}`);
    setFormAddress('');
    setFormPhone('');
    setFormManager('');
    setEditingId(null);
    setModalMode('add');
    setShowFormScreen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setFormName(branch.name);
    setFormCode(branch.code);
    setFormAddress(branch.address || '');
    setFormPhone(branch.phone || '');
    setFormManager(branch.managerName || '');
    setEditingId(branch.id);
    setModalMode('edit');
    setShowFormScreen(true);
  };

  const handleSave = () => {
    playTapSound();
    const cleanName = formName.trim();
    const cleanCode = formCode.trim();

    if (!cleanName) {
      showToast({
        title: 'Thiếu thông tin',
        message: 'Cần nhập tên chi nhánh!',
        type: 'warning',
      });
      return;
    }

    if (modalMode === 'add') {
      const res = addBranch({
        name: cleanName,
        code: cleanCode || `CN-${branches.length + 1}`,
        address: formAddress.trim(),
        phone: formPhone.trim(),
        managerName: formManager.trim() || undefined,
      });

      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        showToast({
          title: 'Thêm Chi Nhánh',
          message: `Đã thêm ${cleanName} vào chuỗi!`,
          type: 'success',
        });
        setShowFormScreen(false);
      } else {
        showToast({
          title: 'Thao tác thất bại',
          message: res.error || 'Không thể thêm chi nhánh',
          type: 'danger',
        });
      }
    } else if (modalMode === 'edit' && editingId) {
      const res = updateBranch(editingId, {
        name: cleanName,
        code: cleanCode,
        address: formAddress.trim(),
        phone: formPhone.trim(),
        managerName: formManager.trim() || undefined,
      });

      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        showToast({
          title: 'Cập Nhật Chi Nhánh',
          message: `Đã lưu thông tin ${cleanName}!`,
          type: 'success',
        });
        setShowFormScreen(false);
      } else {
        showToast({
          title: 'Lỗi Cập Nhật',
          message: res.error || 'Cập nhật thất bại',
          type: 'danger',
        });
      }
    }
  };

  const handleSwitch = (branch: Branch) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    switchBranch(branch.id);
    showToast({
      title: 'Đổi Chi Nhánh',
      message: `Đang vận hành: ${branch.name}`,
      type: 'info',
    });
  };

  const handleBindDeviceToBranch = (branch: Branch) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    useAuthStore.setState({
      deviceBinding: {
        ...deviceBinding,
        branchId: branch.id,
        branchName: branch.name,
      },
    });
    showToast({
      title: 'Gán Máy POS',
      message: `Đã gắn thiết bị vào ${branch.name}`,
      type: 'success',
    });
  };

  const handleCopyText = (text: string, label: string) => {
    playTapSound();
    showToast({
      title: `Đã sao chép ${label}`,
      message: text,
      type: 'info',
    });
  };

  // 🌟 1. PHÂN NHÁNH SUB-SCREEN: FORM THÊM / SỬA CHI NHÁNH TOÀN MÀN HÌNH
  if (showFormScreen) {
    return (
      <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
        {/* Sub-Header tinh gọn với nút Quay lại */}
        <View
          style={[
            s.formSubHeader,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setShowFormScreen(false);
            }}
            style={s.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-left" size={22} color={theme.text.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              {modalMode === 'add' ? 'Thêm Chi Nhánh Mới' : `Cập Nhật: ${formName || 'Chi Nhánh'}`}
            </AppText>
          </View>
        </View>

        {/* Khối Form Nhập Liệu Chuẩn Phẳng Mobile */}
        <View
          style={[
            s.formSectionCard,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
              borderRadius: isWide ? 14 : 0,
              borderWidth: isWide ? 1 : 0,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.border.subtle,
              paddingHorizontal: 16,
              paddingVertical: 16,
            },
          ]}
        >
          {/* Tên chi nhánh */}
          <View style={s.formField}>
            <View style={s.labelRow}>
              <Icon name="storefront-outline" size={16} color={theme.brand.accent} />
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Tên chi nhánh *
              </AppText>
            </View>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
              value={formName}
              onChangeText={handleNameChange}
              placeholder="VD: Chi Nhánh 4 (Bình Thạnh)"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          {/* Mã chi nhánh */}
          <View style={s.formField}>
            <View style={s.labelRow}>
              <Icon name="barcode-scan" size={16} color={theme.brand.accent} />
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Mã chi nhánh *
              </AppText>
              {modalMode === 'add' && formName.trim().length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    const words = formName.trim().split(/\s+/);
                    const initials = words.slice(-2).map((w) => w.charAt(0).toUpperCase()).join('');
                    setFormCode(`CN-${initials || 'NEW'}`);
                  }}
                  style={[s.suggestChip, { backgroundColor: theme.status.readyBg, borderColor: theme.brand.accent }]}
                >
                  <AppText variant="xxs" weight="medium" color={theme.brand.accent}>
                    Gợi ý mã
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
              value={formCode}
              onChangeText={setFormCode}
              placeholder="VD: CN-BT"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="characters"
            />
          </View>

          {/* Địa chỉ */}
          <View style={s.formField}>
            <View style={s.labelRow}>
              <Icon name="map-marker-outline" size={16} color={theme.brand.accent} />
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Địa chỉ chi nhánh *
              </AppText>
            </View>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
              value={formAddress}
              onChangeText={setFormAddress}
              placeholder="VD: 45 Ung Văn Khiêm, P.25, Q. Bình Thạnh"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          {/* Hotline */}
          <View style={s.formField}>
            <View style={s.labelRow}>
              <Icon name="phone-outline" size={16} color={theme.brand.accent} />
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Số điện thoại hotline *
              </AppText>
            </View>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
              value={formPhone}
              onChangeText={setFormPhone}
              placeholder="VD: 028 3512 8899"
              placeholderTextColor={theme.text.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Quản lý / Trưởng ca */}
          <View style={s.formField}>
            <View style={s.labelRow}>
              <Icon name="account-tie-outline" size={16} color={theme.brand.accent} />
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Quản lý / Trưởng ca phụ trách
              </AppText>
            </View>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
              value={formManager}
              onChangeText={setFormManager}
              placeholder="VD: Nguyễn Văn A (Tùy chọn)"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          {/* Bottom Dock Action Buttons */}
          <View style={s.formBottomRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setShowFormScreen(false);
              }}
              style={[
                s.btnFormCancel,
                { borderColor: theme.border.subtle, backgroundColor: theme.surface.header },
              ]}
            >
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Hủy
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              style={[s.btnFormSave, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="content-save-outline" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                {modalMode === 'add' ? 'Lưu Chi Nhánh' : 'Lưu Thay Đổi'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 🌟 2. PHÂN NHÁNH CHÍNH: DANH SÁCH CHI NHÁNH
  return (
    <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
      {/* 1. Hạn Mức Gói Cước SaaS Quota Banner */}
      <View
        style={[
          s.card,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 14 : 0,
            borderWidth: isWide ? 1 : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            paddingHorizontal: 16,
            paddingVertical: 14,
          },
        ]}
      >
        <View style={s.quotaHeaderRow}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="source-branch" size={20} color={theme.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={s.quotaTitleRow}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ flexShrink: 1 }}>
                Hạn Mức Chi Nhánh
              </AppText>
              <View
                style={[
                  s.planBadge,
                  {
                    backgroundColor: quota.isAtLimit
                      ? theme.status.readyBg
                      : theme.brand.primaryBg,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight="medium"
                  color={quota.isAtLimit ? theme.brand.success : theme.brand.primary}
                  tabularNums
                >
                  Gói {quota.planName} ({quota.currentCount}/{quota.maxBranchesNum})
                </AppText>
              </View>
            </View>
            <AppText variant="xs" color={theme.text.muted}>
              Đang kích hoạt{' '}
              <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
                {quota.currentCount}
              </AppText>
              /
              <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
                {quota.maxBranches === 'unlimited' ? '∞' : quota.maxBranches}
              </AppText>{' '}
              chi nhánh trong chuỗi
            </AppText>
          </View>
        </View>

        {/* Quota Progress Bar */}
        <View
          style={[
            s.progressBarBg,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.surface.switchTrack },
          ]}
        >
          <View
            style={[
              s.progressBarFill,
              {
                backgroundColor: quota.isAtLimit ? theme.brand.accent : theme.brand.primary,
                width:
                  quota.maxBranches === 'unlimited'
                    ? '30%'
                    : `${Math.min(100, Math.round((quota.currentCount / quota.maxBranchesNum) * 100))}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* 2. Tiêu Đề Danh Sách & Nút Thêm */}
      <View style={s.listHeaderRow}>
        <AppText variant="md" weight="bold" color={theme.text.primary}>
          Danh Sách Chi Nhánh ({branches.length})
        </AppText>

        {isOwner && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenAdd}
            style={[
              s.btnAddPill,
              {
                backgroundColor: quota.isAtLimit ? theme.surface.header : theme.brand.accent,
                borderColor: quota.isAtLimit ? theme.border.subtle : theme.brand.accent,
              },
            ]}
          >
            <Icon
              name={quota.isAtLimit ? 'crown-outline' : 'plus'}
              size={14}
              color={quota.isAtLimit ? theme.brand.warning : theme.text.onBrand}
            />
            <AppText
              variant="xs"
              weight="bold"
              color={quota.isAtLimit ? theme.brand.warning : theme.text.onBrand}
            >
              {quota.isAtLimit ? 'Mở Rộng Gói Chuỗi' : 'Thêm Chi Nhánh'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Danh Sách Thẻ Chi Nhánh */}
      {branches.map((b) => {
        const isActive = b.id === activeBranchId;
        const isDeviceBoundHere = deviceBinding?.branchId === b.id;

        return (
          <View
            key={b.id}
            style={[
              s.card,
              {
                backgroundColor: theme.surface.card,
                borderColor: isActive ? theme.brand.accent : theme.border.subtle,
                borderRadius: isWide ? 14 : 0,
                borderWidth: isWide ? 1.5 : 0,
                borderLeftWidth: isWide ? 1.5 : (isActive ? 4 : 0),
                borderLeftColor: isActive ? theme.brand.accent : theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border.subtle,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginTop: isWide ? 0 : 8,
              },
            ]}
          >
            {/* Header Thẻ: Icon + Tên CN + Mã + Nút Sửa */}
            <View style={s.branchHeaderRow}>
              <View
                style={[
                  s.branchIconBox,
                  {
                    backgroundColor: isActive
                      ? theme.brand.accent
                      : theme.surface.header,
                  },
                ]}
              >
                <Icon
                  name="storefront-outline"
                  size={20}
                  color={isActive ? theme.text.onBrand : theme.text.primary}
                />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.branchTitleRow}>
                  <AppText
                    variant="md"
                    weight="bold"
                    color={theme.text.primary}
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}
                  >
                    {b.name}
                  </AppText>

                  <View
                    style={[
                      s.codeBadge,
                      {
                        backgroundColor: isActive
                          ? theme.brand.primaryBg
                          : theme.surface.header,
                      },
                    ]}
                  >
                    <AppText
                      variant="xxs"
                      weight="medium"
                      color={isActive ? theme.brand.primary : theme.text.muted}
                      tabularNums
                    >
                      {b.code}
                    </AppText>
                  </View>
                </View>

                {/* Subtitle / Status quick text */}
                {isActive && (
                  <AppText variant="xxs" weight="medium" color={theme.brand.accent}>
                    ● Đang chọn vận hành
                  </AppText>
                )}
              </View>

              {isOwner && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleOpenEdit(b)}
                  style={[
                    s.btnEditQuick,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="pencil-outline" size={16} color={theme.text.primary} />
                  <AppText variant="xs" weight="medium" color={theme.text.primary}>
                    Sửa
                  </AppText>
                </TouchableOpacity>
              )}
            </View>

            {/* Chi tiết Địa chỉ, Hotline, Quản lý */}
            <View style={s.branchDetailsBox}>
              {b.address ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleCopyText(b.address || '', 'địa chỉ')}
                  style={s.metaRow}
                >
                  <Icon name="map-marker-outline" size={16} color={theme.brand.accent} style={{ marginTop: 2 }} />
                  <AppText
                    variant="xs"
                    color={theme.text.muted}
                    numberOfLines={2}
                    style={{ flex: 1, lineHeight: 18 }}
                  >
                    {b.address}
                  </AppText>
                  <Icon name="content-copy" size={14} color={theme.text.muted} />
                </TouchableOpacity>
              ) : null}

              {b.phone ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleCopyText(b.phone || '', 'hotline')}
                  style={s.metaRow}
                >
                  <Icon name="phone-outline" size={16} color={theme.brand.accent} />
                  <AppText
                    variant="xs"
                    color={theme.text.muted}
                    tabularNums
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {b.phone}
                  </AppText>
                  <Icon name="phone" size={14} color={theme.brand.success} />
                </TouchableOpacity>
              ) : null}

              {b.managerName ? (
                <View style={s.metaRow}>
                  <Icon name="account-tie-outline" size={16} color={theme.brand.accent} />
                  <AppText
                    variant="xs"
                    color={theme.text.primary}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    Quản lý: {b.managerName}
                  </AppText>
                </View>
              ) : null}

              {/* Status Badges */}
              {isDeviceBoundHere && (
                <View style={s.badgesRow}>
                  <View
                    style={[
                      s.statusChip,
                      {
                        backgroundColor: isDark
                          ? 'rgba(34, 197, 94, 0.2)'
                          : theme.status.readyBg,
                      },
                    ]}
                  >
                    <Icon name="cellphone-link" size={14} color={theme.brand.success} />
                    <AppText variant="xs" weight="medium" color={theme.brand.success}>
                      Máy POS này đang gán vào chi nhánh này
                    </AppText>
                  </View>
                </View>
              )}
            </View>

            {/* Hàng Action Buttons Chuẩn 44pt Ergonomics */}
            {isOwner && (!isActive || !isDeviceBoundHere) && (
              <View
                style={[
                  s.branchActionsRow,
                  {
                    borderTopColor: theme.border.subtle,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {!isDeviceBoundHere && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleBindDeviceToBranch(b)}
                    style={[
                      s.actionBtn44,
                      {
                        flex: isActive ? 1 : 1,
                        borderColor: theme.border.default,
                        backgroundColor: theme.surface.header,
                      },
                    ]}
                  >
                    <Icon name="cellphone-arrow-down" size={16} color={theme.brand.primary} />
                    <AppText variant="sm" weight="medium" color={theme.brand.primary}>
                      Gán Máy POS
                    </AppText>
                  </TouchableOpacity>
                )}

                {!isActive && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSwitch(b)}
                    style={[
                      s.actionBtnPrimary44,
                      {
                        flex: isDeviceBoundHere ? 1 : 1.2,
                        backgroundColor: theme.brand.accent,
                      },
                    ]}
                  >
                    <Icon name="swap-horizontal" size={18} color={theme.text.onBrand} />
                    <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                      Vào Vận Hành
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 16,
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quotaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  formSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSectionCard: {
    gap: 14,
  },
  formField: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestChip: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  formBottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnFormCancel: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFormSave: {
    flex: 1.4,
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  btnAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  branchIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  btnEditQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  branchDetailsBox: {
    gap: 8,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  branchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    marginTop: 12,
  },
  actionBtn44: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnPrimary44: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
  },
});

