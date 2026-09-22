import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { lightTheme } from '../../theme/colors';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { ModalDragIndicator } from '../ui/ModalDragIndicator';
import { playTapSound } from '../../utils/sound';
import {
  useSelectedTable,
  useTableCart,
  useTableDiscount,
  usePOSActions,
} from '../../store/usePOSStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ManagerPinModal } from './ManagerPinModal';

export interface DiscountModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface PromotionCampaign {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderAmount?: number;
  tag: string;
  icon: keyof typeof Icon.glyphMap;
  iconBg: string;
  iconColor: string;
  isVoucher?: boolean;
}

// 🌟 DANH MỤC CHƯƠNG TRÌNH KHUYẾN MÃI CỦA HỆ THỐNG (TEXT TINH GỌN, CHỐNG TRÀN DÒNG)
const SYSTEM_CAMPAIGNS: PromotionCampaign[] = [
  {
    id: 'camp_happy_hour',
    code: 'HAPPYHOUR',
    name: 'Giờ Vàng (14h - 17h)',
    description: 'Giảm 15% tổng đơn khung giờ vàng',
    type: 'percent',
    value: 15,
    tag: 'Giờ Vàng',
    icon: 'clock-time-four-outline',
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconColor: lightTheme.brand.warning,
  },
  {
    id: 'camp_don_300k',
    code: 'DON300K',
    name: 'Đơn Lớn từ 300k',
    description: 'Giảm ngay 50.000 đ cho đơn từ 300k',
    type: 'fixed',
    value: 50000,
    minOrderAmount: 300000,
    tag: 'Đơn Lớn',
    icon: 'shopping-outline',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconColor: lightTheme.brand.success,
  },
  {
    id: 'camp_don_500k',
    code: 'DON500K',
    name: 'Tiệc Nhóm từ 500k',
    description: 'Giảm ngay 100.000 đ cho đơn từ 500k',
    type: 'fixed',
    value: 100000,
    minOrderAmount: 500000,
    tag: 'Tiệc Nhóm',
    icon: 'account-group-outline',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: lightTheme.brand.primary,
  },
  {
    id: 'camp_vip_gold',
    code: 'VIPGOLD',
    name: 'Khách VIP Gold',
    description: 'Chiết khấu 10% đặc quyền hội viên',
    type: 'percent',
    value: 10,
    tag: 'VIP',
    icon: 'crown-outline',
    iconBg: 'rgba(139, 92, 246, 0.12)',
    iconColor: lightTheme.brand.accent,
  },
  {
    id: 'voucher_summer',
    code: 'SUMMER2026',
    name: 'Voucher SUMMER2026',
    description: 'Giảm 20.000 đ cho đơn từ 100k',
    type: 'fixed',
    value: 20000,
    minOrderAmount: 100000,
    tag: 'Voucher',
    icon: 'ticket-percent-outline',
    iconBg: 'rgba(236, 72, 153, 0.12)',
    iconColor: lightTheme.brand.accent,
    isVoucher: true,
  },
  {
    id: 'voucher_chaoban',
    code: 'CHAOBANMOI',
    name: 'Voucher Bạn Mới',
    description: 'Giảm 20% đơn đầu tiên tại quán',
    type: 'percent',
    value: 20,
    tag: 'Voucher',
    icon: 'gift-outline',
    iconBg: 'rgba(14, 165, 233, 0.12)',
    iconColor: lightTheme.brand.primary,
    isVoucher: true,
  },
];

const percentPresets = [5, 10, 15, 20, 50];
const amountPresets = [10000, 20000, 50000, 100000];

const QUICK_REASONS = [
  'Khách VIP',
  'Chủ duyệt',
  'Bù lỗi món',
  'Sự kiện',
  'Nội bộ',
];

export const DiscountModal: React.FC<DiscountModalProps> = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const selectedTable = useSelectedTable();
  const selectedTableId = selectedTable?.id;
  const cart = useTableCart(selectedTableId);
  const currentDiscount = useTableDiscount(selectedTableId);
  const { applyDiscount, clearDiscount } = usePOSActions();

  // Tính tạm tính ban đầu
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const subTotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);

  // Tab chính: 'campaigns' (Chương Trình & Voucher) | 'manual' (Tự Nhập)
  const [activeTab, setActiveTab] = useState<'campaigns' | 'manual'>('campaigns');

  // State cho Tự Nhập
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(
    currentDiscount?.type || 'percent'
  );
  const [valStr, setValStr] = useState(
    currentDiscount ? currentDiscount.value.toString() : '10'
  );
  const [note, setNote] = useState(currentDiscount?.note || '');

  // State cho Chương Trình & Voucher
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherSuccessMsg, setVoucherSuccessMsg] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const requiresApproval = useAuthStore((s) => s.requiresManagerApproval);

  // Khởi tạo state khi mở modal
  useEffect(() => {
    if (visible) {
      const disc = currentDiscount;
      if (disc) {
        // Kiểm tra xem có trùng với campaign nào không
        const matched = SYSTEM_CAMPAIGNS.find(
          (c) => disc.note?.includes(c.name) || disc.note?.includes(c.code)
        );
        if (matched) {
          setSelectedCampaignId(matched.id);
          setActiveTab('campaigns');
        } else {
          setActiveTab('manual');
        }
        setDiscountType(disc.type);
        setValStr(disc.value.toString());
        setNote(disc.note);
      } else {
        setActiveTab('campaigns');
        setSelectedCampaignId(null);
        setDiscountType('percent');
        setValStr('10');
        setNote('');
      }
      setVoucherInput('');
      setVoucherSuccessMsg(null);
    }
  }, [visible, currentDiscount]);

  // 🏷️ Tính toán chiết khấu thời gian thực (Live Preview)
  const activeDiscountVal = parseFloat(valStr) || 0;
  const discountAmount = useMemo(() => {
    if (activeDiscountVal <= 0) return 0;
    if (discountType === 'percent') {
      return Math.round((subTotal * activeDiscountVal) / 100);
    }
    return Math.min(subTotal, activeDiscountVal);
  }, [subTotal, activeDiscountVal, discountType]);

  const discountPercentage = useMemo(() => {
    if (subTotal <= 0) return 0;
    if (discountType === 'percent') return activeDiscountVal;
    return Math.round((discountAmount / subTotal) * 100);
  }, [subTotal, discountType, activeDiscountVal, discountAmount]);

  const isExcessiveDiscount = discountPercentage > 20;

  const finalTotal = Math.max(0, subTotal - discountAmount);

  // Xử lý chọn một Chương Trình Khuyến Mãi Hệ Thống
  const handleSelectCampaign = (camp: PromotionCampaign) => {
    playTapSound();
    if (camp.minOrderAmount && subTotal < camp.minOrderAmount) {
      const diff = camp.minOrderAmount - subTotal;
      Alert.alert(
        'Chưa Đủ Điều Kiện',
        `Chương trình [${camp.name}] áp dụng cho đơn từ ${camp.minOrderAmount.toLocaleString('vi-VN')} đ trở lên.\n\nBàn hiện có: ${subTotal.toLocaleString('vi-VN')} đ (cần thêm ${diff.toLocaleString('vi-VN')} đ).`
      );
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    setSelectedCampaignId(camp.id);
    setDiscountType(camp.type);
    setValStr(camp.value.toString());
    setNote(`[${camp.tag}] ${camp.name}`);
  };

  // Xử lý Kiểm tra & Áp dụng Mã Voucher
  const handleCheckVoucher = () => {
    playTapSound();
    const cleanCode = voucherInput.trim().toUpperCase();
    if (!cleanCode) {
      Alert.alert('Nhập Mã', 'Nhập mã voucher khuyến mãi.');
      return;
    }

    const found = SYSTEM_CAMPAIGNS.find(
      (c) => c.code.toUpperCase() === cleanCode
    );

    if (!found) {
      Alert.alert('Không Hợp Lệ', `Mã voucher [${cleanCode}] không tồn tại hoặc đã hết hạn.`);
      return;
    }

    if (found.minOrderAmount && subTotal < found.minOrderAmount) {
      const diff = found.minOrderAmount - subTotal;
      Alert.alert(
        'Chưa Đủ Điều Kiện',
        `Mã [${found.code}] yêu cầu đơn từ ${found.minOrderAmount.toLocaleString('vi-VN')} đ (còn thiếu ${diff.toLocaleString('vi-VN')} đ).`
      );
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    setSelectedCampaignId(found.id);
    setDiscountType(found.type);
    setValStr(found.value.toString());
    setNote(`[Voucher] ${found.name} (${found.code})`);
    setVoucherSuccessMsg(`Đã áp dụng: ${found.name}`);
    setTimeout(() => setVoucherSuccessMsg(null), 3500);
  };

  const executeApplyExcessiveDiscount = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    const auditNote = note.trim().startsWith('[ANTI-FRAUD AUDIT >20%]')
      ? note.trim()
      : `[ANTI-FRAUD AUDIT >20%] ${note.trim()}`;
    applyDiscount(discountType, activeDiscountVal, auditNote);
    onClose();
  };

  // Áp dụng chiết khấu vào bàn
  const handleApply = () => {
    playTapSound();
    if (activeDiscountVal <= 0) {
      onClose();
      return;
    }

    // 🚨 ANTI-FRAUD GUARD (> 20% DISCOUNT)
    if (isExcessiveDiscount) {
      if (!note.trim()) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
        }
        Alert.alert(
          'CẦN GHI LÝ DO',
          `Mức chiết khấu đạt ${discountPercentage}% (> 20% ngưỡng an toàn).\n\nChọn hoặc nhập lý do chiết khấu để lưu vết cho Chủ Quán.`
        );
        return;
      }

      if (requiresApproval('excessive_discount')) {
        setShowPinModal(true);
        return;
      }

      Alert.alert(
        'XÁC NHẬN CHIẾT KHẤU CAO',
        `• Tạm tính ban đầu: ${subTotal.toLocaleString('vi-VN')} đ\n• Mức giảm: ${discountType === 'percent' ? `${activeDiscountVal}%` : `${activeDiscountVal.toLocaleString('vi-VN')} đ`} (-${discountAmount.toLocaleString('vi-VN')} đ)\n• Cần thu sau giảm: ${finalTotal.toLocaleString('vi-VN')} đ\n• Lý do: "${note.trim()}"\n\nThao tác này sẽ ghi nhận vào Sổ Kiểm Soát và thông báo tới Chủ Quán!`,
        [
          { text: 'HỦY', style: 'cancel' },
          {
            text: 'ĐỒNG Ý GIẢM',
            style: 'destructive',
            onPress: () => executeApplyExcessiveDiscount(),
          },
        ]
      );
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    applyDiscount(
      discountType,
      activeDiscountVal,
      note || (discountType === 'percent' ? `Giảm ${activeDiscountVal}%` : `Giảm ${activeDiscountVal.toLocaleString('vi-VN')} đ`)
    );
    onClose();
  };

  // Xóa chiết khấu
  const handleRemove = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    clearDiscount();
    onClose();
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          s.fullScreenRoot,
          {
            backgroundColor: theme.surface.app,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          },
        ]}
      >
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
              style={[s.navBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            >
              <Icon name="arrow-left" size={20} color={theme.text.primary} />
            </TouchableOpacity>

            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                Khuyến Mãi · {selectedTable?.name || 'Bàn 01'}
              </AppText>
              <AppText variant="xs" color={theme.text.muted} numberOfLines={1} tabularNums>
                Tạm tính: {subTotal.toLocaleString('vi-VN')} đ ({totalQty} món)
              </AppText>
            </View>
          </View>

          <View style={[s.headerBadge, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
            <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
              {finalTotal.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        </View>

        {/* 🌟 2. SEAMLESS TAB SELECTOR (LIỀN MẠCH, KHÔNG ĐÓNG KHUNG HỘP) */}
        <View style={[s.seamlessTabContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.default }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={`Chương trình khuyến mãi, ${SYSTEM_CAMPAIGNS.length} chương trình`}
            onPress={() => {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setActiveTab('campaigns');
            }}
            style={[
              s.seamlessTabItem,
              activeTab === 'campaigns' && {
                borderBottomColor: theme.brand.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Icon
              name="ticket-percent-outline"
              size={16}
              color={activeTab === 'campaigns' ? theme.brand.primary : theme.text.muted}
              style={{ marginRight: 6 }}
            />
            <AppText
              variant="sm"
              weight={activeTab === 'campaigns' ? 'medium' : 'normal'}
              color={activeTab === 'campaigns' ? theme.brand.primary : theme.text.muted}
              numberOfLines={1}
            >
              Chương Trình ({SYSTEM_CAMPAIGNS.length})
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel="Chiết khấu tự nhập"
            onPress={() => {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setActiveTab('manual');
            }}
            style={[
              s.seamlessTabItem,
              activeTab === 'manual' && {
                borderBottomColor: theme.brand.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Icon
              name="tune-variant"
              size={16}
              color={activeTab === 'manual' ? theme.brand.primary : theme.text.muted}
              style={{ marginRight: 6 }}
            />
            <AppText
              variant="sm"
              weight={activeTab === 'manual' ? 'medium' : 'normal'}
              color={activeTab === 'manual' ? theme.brand.primary : theme.text.muted}
              numberOfLines={1}
            >
              Tự Nhập
            </AppText>
          </TouchableOpacity>
        </View>

        {/* 🌟 3. BODY CUỘN LIỀN MẠCH PHẲNG TRÊN NỀN CANVAS (SEAMLESS FLOW) */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.seamlessScrollBody,
            { paddingBottom: Math.max(insets.bottom, 16) + 88 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DANH SÁCH CHƯƠNG TRÌNH KHUYẾN MÃI HỆ THỐNG & VOUCHER        */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'campaigns' ? (
            <View>
              {/* THANH NHẬP VOUCHER PHẲNG LIỀN MẠCH (KHÔNG ĐÓNG KHUNG NỔI) */}
              <View style={[s.seamlessVoucherRow, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.default }]}>
                <Icon name="barcode-scan" size={20} color={theme.brand.primary} style={{ marginRight: 8 }} />
                <TextInput
                  value={voucherInput}
                  onChangeText={setVoucherInput}
                  placeholder="Nhập mã voucher (VD: SUMMER2026)..."
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[s.seamlessVoucherInput, { color: theme.text.primary }]}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Áp dụng mã voucher"
                  onPress={handleCheckVoucher}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[s.seamlessVoucherApplyBtn, { backgroundColor: theme.brand.primary }]}
                >
                  <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                    ÁP DỤNG
                  </AppText>
                </TouchableOpacity>
              </View>

              {voucherSuccessMsg ? (
                <View style={[s.voucherSuccessBanner, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Icon name="check-circle" size={15} color={theme.brand.success} style={{ marginRight: 6 }} />
                  <AppText variant="xs" weight="medium" color={theme.brand.success}>
                    {voucherSuccessMsg}
                  </AppText>
                </View>
              ) : null}

              {/* DANH SÁCH CHƯƠNG TRÌNH LIỀN MẠCH (SEAMLESS BORDERLESS LIST) */}
              <View style={[s.seamlessListContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.default, borderTopColor: theme.border.default }]}>
                {SYSTEM_CAMPAIGNS.map((camp, idx) => {
                  const isSelected = selectedCampaignId === camp.id;
                  const isEligible = !camp.minOrderAmount || subTotal >= camp.minOrderAmount;
                  const isLast = idx === SYSTEM_CAMPAIGNS.length - 1;

                  return (
                    <TouchableOpacity
                      key={camp.id}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Chọn chương trình ${camp.name}, giảm ${camp.type === 'percent' ? `${camp.value}%` : `${camp.value.toLocaleString('vi-VN')} đồng`}`}
                      onPress={() => handleSelectCampaign(camp)}
                      style={[
                        s.seamlessRow,
                        !isLast && { borderBottomColor: theme.border.default, borderBottomWidth: StyleSheet.hairlineWidth },
                        isSelected && {
                          backgroundColor: theme.brand.primaryBg,
                        },
                        !isEligible && {
                          opacity: 0.65,
                        },
                      ]}
                    >
                      {/* Squircle Icon Badge */}
                      <View style={[s.campIconBadge, { backgroundColor: camp.iconBg }]}>
                        <Icon name={camp.icon} size={20} color={camp.iconColor} />
                      </View>

                      {/* Chi tiết chương trình */}
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        {/* Dòng 1: Tên chương trình + Badge mức giảm */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <AppText
                            variant="sm"
                            weight={isSelected ? 'medium' : 'normal'}
                            color={isSelected ? theme.brand.primary : theme.text.primary}
                            numberOfLines={1}
                            style={{ flex: 1 }}
                          >
                            {camp.name}
                          </AppText>
                          <View style={[s.tagBadge, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
                            <AppText variant="xs" weight="medium" color={camp.iconColor} tabularNums>
                              {camp.type === 'percent' ? `-${camp.value}%` : `-${(camp.value / 1000).toLocaleString('vi-VN')}k`}
                            </AppText>
                          </View>
                        </View>

                        {/* Dòng 2: Mô tả ngắn gọn */}
                        <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }} numberOfLines={1}>
                          {camp.description}
                        </AppText>

                        {/* Dòng 3: Điều kiện đơn hàng (Text tinh gọn, không rớt chữ) */}
                        {camp.minOrderAmount ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }}>
                            <Icon
                              name={isEligible ? 'check-circle' : 'alert-circle'}
                              size={12}
                              color={isEligible ? theme.brand.success : theme.brand.warning}
                            />
                            <AppText
                              variant="xs"
                              color={isEligible ? theme.brand.success : theme.brand.warning}
                              numberOfLines={1}
                              tabularNums
                            >
                              {isEligible
                                ? `Đủ điều kiện (đơn từ ${(camp.minOrderAmount / 1000).toLocaleString('vi-VN')}k)`
                                : `Cần thêm ${((camp.minOrderAmount - subTotal) / 1000).toLocaleString('vi-VN')}k (đơn từ ${(camp.minOrderAmount / 1000).toLocaleString('vi-VN')}k)`}
                            </AppText>
                          </View>
                        ) : null}
                      </View>

                      {/* Nút Trạng Thái / Radio */}
                      <View
                        style={[
                          s.selectRadio,
                          {
                            borderColor: isSelected ? theme.brand.primary : theme.border.default,
                            backgroundColor: isSelected ? theme.brand.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Icon name="check" size={13} color={theme.text.onBrand} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* ═══════════════════════════════════════════════════════════════════ */
            /* TAB 2: GIẢM GIÁ THỦ CÔNG TÙY BIẾN                                  */
            /* ═══════════════════════════════════════════════════════════════════ */
            <View style={{ gap: 14 }}>
              {/* 1. Switch % vs Tiền mặt phẳng trên Card */}
              <View style={[s.seamlessSwitchContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.default, borderTopColor: theme.border.default }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    setSelectedCampaignId(null);
                    setDiscountType('percent');
                    setValStr('10');
                  }}
                  style={[
                    s.seamlessSwitchBtn,
                    discountType === 'percent' && {
                      borderBottomColor: theme.brand.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={discountType === 'percent' ? 'medium' : 'normal'}
                    color={discountType === 'percent' ? theme.brand.primary : theme.text.muted}
                  >
                    Theo Phần Trăm (%)
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    setSelectedCampaignId(null);
                    setDiscountType('fixed');
                    setValStr('20000');
                  }}
                  style={[
                    s.seamlessSwitchBtn,
                    discountType === 'fixed' && {
                      borderBottomColor: theme.brand.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={discountType === 'fixed' ? 'medium' : 'normal'}
                    color={discountType === 'fixed' ? theme.brand.primary : theme.text.muted}
                  >
                    Theo Tiền Mặt (đ)
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* 2. Dải Preset Pills */}
              <View style={{ paddingHorizontal: 16 }}>
                <AppText variant="xs" color={theme.text.muted} weight="normal" style={{ marginBottom: 8 }}>
                  MỨC GIẢM NHANH:
                </AppText>
                <View style={s.presetsRow}>
                  {discountType === 'percent'
                    ? percentPresets.map((p) => {
                        const isSelected = valStr === p.toString() && !selectedCampaignId;
                        return (
                          <TouchableOpacity
                            key={p}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityLabel={`Giảm ${p}%`}
                            onPress={() => {
                              setSelectedCampaignId(null);
                              setValStr(p.toString());
                            }}
                            style={[
                              s.presetChip,
                              {
                                backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.card,
                                borderColor: isSelected ? theme.brand.primary : theme.border.default,
                              },
                            ]}
                          >
                            <AppText
                              variant="sm"
                              weight={isSelected ? 'medium' : 'normal'}
                              color={isSelected ? theme.brand.primary : theme.text.primary}
                              tabularNums
                            >
                              -{p}%
                            </AppText>
                          </TouchableOpacity>
                        );
                      })
                    : amountPresets.map((a) => {
                        const isSelected = valStr === a.toString() && !selectedCampaignId;
                        return (
                          <TouchableOpacity
                            key={a}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityLabel={`Giảm ${(a / 1000).toLocaleString('vi-VN')} nghìn đồng`}
                            onPress={() => {
                              setSelectedCampaignId(null);
                              setValStr(a.toString());
                            }}
                            style={[
                              s.presetChip,
                              {
                                backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.card,
                                borderColor: isSelected ? theme.brand.primary : theme.border.default,
                              },
                            ]}
                          >
                            <AppText
                              variant="sm"
                              weight={isSelected ? 'medium' : 'normal'}
                              color={isSelected ? theme.brand.primary : theme.text.primary}
                              tabularNums
                            >
                              -{(a / 1000).toLocaleString('vi-VN')}k
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                </View>
              </View>

              {/* 3. Form nhập liệu liền mạch */}
              <View style={[s.seamlessListContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.default, borderTopColor: theme.border.default }]}>
                {/* Row 1: Mức giảm */}
                <View style={[s.formRow, { borderBottomColor: theme.border.default, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted} style={{ width: 120 }}>
                    {discountType === 'percent' ? 'Mức giảm (%):' : 'Số tiền (đ):'}
                  </AppText>
                  <TextInput
                    value={valStr}
                    onChangeText={(t) => {
                      setSelectedCampaignId(null);
                      setValStr(t);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.text.muted}
                    style={[s.formInput, { color: theme.brand.primary }]}
                  />
                </View>

                {/* Row 2: Lý do / Ghi chú */}
                <View style={s.formRow}>
                  <AppText variant="sm" color={theme.text.muted} style={{ width: 120 }}>
                    Lý do / Note:
                  </AppText>
                  <TextInput
                    value={note}
                    onChangeText={(t) => {
                      setSelectedCampaignId(null);
                      setNote(t);
                    }}
                    placeholder="VD: Khách VIP, Khai trương..."
                    placeholderTextColor={theme.text.muted}
                    style={[s.formInput, { color: theme.text.primary, fontWeight: 'normal' }]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* 🚨 ANTI-FRAUD GUARD BANNER & QUICK REASONS (> 20% DISCOUNT) */}
          {isExcessiveDiscount && (
            <View style={[s.antiFraudWarningBox, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Icon name="shield-alert-outline" size={24} color={theme.brand.danger} />
                <View style={{ flex: 1 }}>
                  <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                    CẢNH BÁO CHIẾT KHẤU CAO ({discountPercentage}%)
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                    Mức giảm vượt quá 20% yêu cầu bắt buộc ghi rõ lý do để lưu vết Audit Log và gửi cảnh báo tới Chủ Quán.
                  </AppText>
                </View>
              </View>

              {/* Quick Reason Chips */}
              <View style={{ marginTop: 10 }}>
                <AppText variant="xs" color={theme.text.muted} weight="normal" style={{ marginBottom: 6 }}>
                  Chọn nhanh lý do đối soát:
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {QUICK_REASONS.map((r) => {
                    const isChosen = note.includes(r);
                    return (
                      <TouchableOpacity
                        key={r}
                        activeOpacity={0.75}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch {}
                          }
                          setNote(r);
                        }}
                        style={[
                          s.quickReasonChip,
                          {
                            backgroundColor: isChosen ? theme.brand.danger : theme.surface.card,
                            borderColor: isChosen ? theme.brand.danger : theme.border.default,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight={isChosen ? 'medium' : 'normal'}
                          color={isChosen ? theme.text.onBrand : theme.text.primary}
                        >
                          {r}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* 🌟 4. LIVE DISCOUNT PREVIEW STRIP (BẢNG ĐỐI SOÁT PHẲNG LIỀN MẠCH TRÊN CANVAS) */}
          <View style={[s.seamlessCalculationSection, { backgroundColor: theme.surface.card, borderTopColor: theme.border.default, borderBottomColor: theme.border.default, marginTop: 14 }]}>
            <View style={s.calcRow}>
              <AppText variant="sm" color={theme.text.muted}>
                Tạm tính ban đầu:
              </AppText>
              <AppText variant="sm" tabularNums color={theme.text.primary}>
                {subTotal.toLocaleString('vi-VN')} đ
              </AppText>
            </View>

            <View style={[s.calcRow, { marginTop: 6 }]}>
              <AppText variant="sm" color={theme.brand.primary}>
                Số tiền được giảm:
              </AppText>
              <AppText variant="sm" weight="medium" tabularNums color={theme.brand.primary}>
                -{discountAmount.toLocaleString('vi-VN')} đ
              </AppText>
            </View>

            <View style={[s.dividerHairline, { borderTopColor: theme.border.default }]} />

            <View style={[s.calcRow, { alignItems: 'center' }]}>
              <AppText variant="sm" weight="medium" color={theme.text.primary}>
                CẦN THU SAU GIẢM:
              </AppText>
              <AppText variant="xl" weight="medium" color={theme.brand.primary} tabularNums>
                {finalTotal.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
          </View>
        </ScrollView>

        {/* 🌟 4. STICKY BOTTOM ACTION DOCK CỐ ĐỊNH Ở ĐÁY */}
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
            {currentDiscount && (
              <Button
                variant="destructive"
                title="XÓA"
                style={{ flex: 1, height: 52, borderRadius: 14 }}
                onPress={handleRemove}
              />
            )}
            <Button
              variant="success"
              title={`ÁP DỤNG (${finalTotal.toLocaleString('vi-VN')} đ)`}
              style={{ flex: currentDiscount ? 2.5 : 1, height: 52, borderRadius: 14 }}
              leadingIcon={<Icon name="check" size={18} color={theme.text.onBrand} />}
              onPress={handleApply}
            />
          </View>
        </View>
      </View>
    </Modal>

    <ManagerPinModal
      visible={showPinModal}
      title="Xác Thực Giảm"
      subtitle={`Chiết khấu ${discountPercentage}% (> 20%) yêu cầu mã PIN Quản lý`}
      action="excessive_discount"
      onSuccess={executeApplyExcessiveDiscount}
      onClose={() => setShowPinModal(false)}
    />
    </>
  );
};

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
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seamlessTabContainer: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  seamlessTabItem: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  seamlessScrollBody: {
    paddingTop: 0,
  },
  seamlessVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  seamlessVoucherInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  seamlessVoucherApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  voucherSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seamlessListContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  seamlessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  campIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  selectRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seamlessSwitchContainer: {
    flexDirection: 'row',
    height: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  seamlessSwitchBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
  seamlessCalculationSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dividerHairline: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  fixedBottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  antiFraudWarningBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 14,
  },
  quickReasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
