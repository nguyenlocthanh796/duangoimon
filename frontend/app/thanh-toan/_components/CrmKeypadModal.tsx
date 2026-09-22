import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText, AppNumpad } from '../../../lib/components/ui';
import { ModalDragIndicator } from '../../../lib/components/ui/ModalDragIndicator';
import { useTheme } from '../../../lib/theme';
import { playTapSound } from '../../../lib/utils/sound';
import { CustomerLoyalty, useCustomers } from '../../../lib/store/usePOSStore';

interface CrmKeypadModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCustomer: (cust: CustomerLoyalty) => void;
  currentCustomer?: CustomerLoyalty | null;
  onRemoveCustomer?: () => void;
}

export function CrmKeypadModal({
  visible,
  onClose,
  onSelectCustomer,
  currentCustomer,
  onRemoveCustomer,
}: CrmKeypadModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const customers = useCustomers();
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (visible) {
      setPhone(currentCustomer?.phone || '');
    }
  }, [visible, currentCustomer]);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(style);
      } catch {}
    }
  };

  const handleKeyPress = (char: string) => {
    triggerHaptic();
    if (phone.length < 11) {
      setPhone((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    triggerHaptic();
    setPhone((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setPhone('');
  };

  const handleConfirm = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (!cleaned) {
      onClose();
      return;
    }

    const found = customers.find((c) => c.phone === cleaned);
    if (found) {
      onSelectCustomer(found);
    } else {
      // Tự động tạo khách mới theo SĐT
      onSelectCustomer({
        id: `cust_${cleaned}`,
        name: `Khách mới (${cleaned.slice(-4)})`,
        phone: cleaned,
        rewardPoints: 0,
        totalSpend: 0,
        debtBalance: 0,
      });
    }
    onClose();
  };

  const handleSelectPreset = (cust: CustomerLoyalty) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setPhone(cust.phone);
    onSelectCustomer(cust);
    onClose();
  };

  // Format số điện thoại ngắt quãng: 0901 234 567
  const formatPhone = (raw: string) => {
    if (raw.length <= 4) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
    return `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`;
  };

  const cleanedPhone = phone.replace(/[^0-9]/g, '');
  const matchedCustomer = customers.find((c) => c.phone === cleanedPhone);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[s.fullScreenRoot, { backgroundColor: theme.surface.app, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }]}>
        <ModalDragIndicator />
        {/* 🌟 1. TOP HEADER TOÀN MÀN HÌNH CHUẨN POS */}
        <View
          style={[
            s.topBar,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.default,
              paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 16),
              height: 60 + Math.max(insets.top, Platform.OS === 'android' ? 12 : 16),
            },
          ]}
        >
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                s.navBtn,
                { backgroundColor: theme.surface.header, borderColor: theme.border.default },
              ]}
            >
              <Icon name="arrow-left" size={20} color={theme.text.primary} />
            </TouchableOpacity>

            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                CRM · Khách Hàng Thân Thiết
              </AppText>
              <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                Tích lũy & đổi điểm thành viên
              </AppText>
            </View>
          </View>

          {matchedCustomer ? (
            <View style={[s.headerBadge, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
              <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                {Math.round(matchedCustomer.rewardPoints / 1000)}k đ
              </AppText>
            </View>
          ) : currentCustomer ? (
            <View style={[s.headerBadge, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
              <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                {Math.round(currentCustomer.rewardPoints / 1000)}k đ
              </AppText>
            </View>
          ) : (
            <View style={[s.headerBadge, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
              <AppText variant="xs" color={theme.text.muted}>
                Khách lẻ
              </AppText>
            </View>
          )}
        </View>

        {/* 🌟 2. NỘI DUNG CUỘN TOÀN MÀN HÌNH */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ô hiển thị số điện thoại (In-App Display - Không dùng TextInput bàn phím ảo) */}
          <View
            style={[
              s.displayBox,
              {
                backgroundColor: theme.surface.card,
                borderColor: matchedCustomer ? theme.brand.primary : theme.border.default,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
              {phone.length > 0 ? (
                <AppText
                  variant="xl"
                  weight="medium"
                  color={theme.brand.primary}
                  tabularNums
                  style={{ letterSpacing: 2 }}
                >
                  {formatPhone(phone)}
                </AppText>
              ) : (
                <AppText variant="sm" color={theme.text.muted}>
                  Chạm phím số để nhập SĐT khách hàng
                </AppText>
              )}
            </View>

            {phone.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Xóa số điện thoại"
                onPress={handleClearAll}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={s.clearDisplayBtn}
              >
                <Icon name="close-circle" size={20} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Card Nhận Diện Khách Hàng */}
          {matchedCustomer ? (
            <View
              style={[
                s.matchedCard,
                {
                  backgroundColor: theme.brand.primaryBg,
                  borderColor: theme.brand.primary,
                },
              ]}
            >
              <View style={[s.customerAvatar, { backgroundColor: theme.brand.primary }]}>
                <Icon name="crown" size={20} color={theme.text.onBrand} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="md" weight="medium" color={theme.text.primary}>
                  {matchedCustomer.name}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                  SĐT: {matchedCustomer.phone} · Chi tiêu: {matchedCustomer.totalSpend.toLocaleString('vi-VN')} đ
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="xs" color={theme.text.muted}>Điểm khả dụng</AppText>
                <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums style={{ marginTop: 2 }}>
                  {matchedCustomer.rewardPoints.toLocaleString('vi-VN')} đ
                </AppText>
              </View>
            </View>
          ) : cleanedPhone.length >= 10 ? (
            <View
              style={[
                s.matchedCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <View style={[s.customerAvatar, { backgroundColor: theme.surface.header }]}>
                <Icon name="account-plus" size={20} color={theme.brand.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Khách Hàng Mới
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                  SĐT: {cleanedPhone} · Tích điểm đơn đầu tiên
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Dãy Tab Chip Khách Quen CRM 1-Chạm (Quick Select Chip Strip) */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeaderRow}>
              <Icon name="account-star" size={16} color={theme.brand.primary} />
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                CRM KHÁCH QUEN (1-CHẠM):
              </AppText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.presetChipRow}
            >
              {customers.map((cust) => {
                const isSelected = cleanedPhone === cust.phone;
                const isVip = cust.name.includes('VIP');
                return (
                  <TouchableOpacity
                    key={cust.id}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn khách hàng ${cust.name}`}
                    onPress={() => handleSelectPreset(cust)}
                    style={[
                      s.presetChip,
                      {
                        backgroundColor: isSelected
                          ? theme.brand.primaryBg
                          : (isDark ? theme.surface.header : theme.surface.card),
                        borderColor: isSelected
                          ? theme.brand.primary
                          : theme.border.default,
                      },
                    ]}
                  >
                    <Icon
                      name={isVip ? 'crown' : isSelected ? 'account-check' : 'account-outline'}
                      size={16}
                      color={isSelected ? theme.brand.primary : (isVip ? theme.brand.warning : theme.text.muted)}
                    />
                    <AppText
                      variant="xs"
                      weight={isSelected ? 'medium' : 'normal'}
                      color={isSelected ? theme.brand.primary : theme.text.primary}
                      numberOfLines={1}
                    >
                      {cust.name.replace(/\s*\(.*?\)\s*/g, '').trim()}
                    </AppText>
                    <View
                      style={[
                        s.pointsBadge,
                        {
                          backgroundColor: isSelected
                            ? theme.brand.primary
                            : (isDark ? 'rgba(255,255,255,0.08)' : theme.surface.header),
                        },
                      ]}
                    >
                      <AppText
                        variant="xs"
                        weight="medium"
                        tabularNums
                        color={isSelected ? theme.text.onBrand : theme.brand.primary}
                      >
                        {Math.round(cust.rewardPoints / 1000)}k
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Bàn phím số cảm ứng In-App (Tactile Keypad 3x4) */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeaderRow}>
              <Icon name="dialpad" size={16} color={theme.brand.primary} />
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                BÀN PHÍM SỐ CẢM ỨNG:
              </AppText>
            </View>

            <AppNumpad
              layout="crm"
              onKeyPress={(key) => {
                if (key === 'C' || key === 'clear') {
                  handleClearAll();
                } else if (key === '⌫' || key === 'backspace') {
                  handleBackspace();
                } else {
                  handleKeyPress(key);
                }
              }}
            />
          </View>
        </ScrollView>

        {/* 🌟 3. DOCK CHỐT ĐÁY CỐ ĐỊNH CHUẨN DISCOUNT MODAL */}
        <View
          style={[
            s.fixedBottomDock,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.default,
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {currentCustomer ? (
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Bỏ chọn khách hàng"
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  setPhone('');
                  if (onRemoveCustomer) onRemoveCustomer();
                  onClose();
                }}
                style={[
                  s.dockSecondaryBtn,
                  {
                    borderColor: theme.brand.danger,
                    backgroundColor: theme.status.dangerBg,
                  },
                ]}
              >
                <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                  BỎ CHỌN
                </AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={onClose}
                style={[
                  s.dockSecondaryBtn,
                  {
                    borderColor: theme.border.default,
                    backgroundColor: theme.surface.header,
                  },
                ]}
              >
                <AppText variant="sm" weight="medium" color={theme.text.muted}>
                  ĐÓNG
                </AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Xác nhận khách hàng"
              onPress={handleConfirm}
              style={[
                s.dockPrimaryBtn,
                {
                  backgroundColor: theme.brand.primary,
                  opacity: cleanedPhone.length > 0 ? 1 : 0.7,
                },
              ]}
            >
              <Icon name="check" size={18} color={theme.text.onBrand} />
              <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                {matchedCustomer
                  ? `ÁP DỤNG (${matchedCustomer.name.replace(/\s*\(.*?\)\s*/g, '').trim()})`
                  : cleanedPhone.length > 0
                  ? `ÁP DỤNG (${cleanedPhone.slice(-4)})`
                  : 'XÁC NHẬN SĐT'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 88,
  },
  displayBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    justifyContent: 'center',
  },
  clearDisplayBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  matchedCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBlock: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  presetChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  keypadGrid: {
    gap: 8,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyBtn: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedBottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 10,
  },
  dockSecondaryBtn: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default CrmKeypadModal;
