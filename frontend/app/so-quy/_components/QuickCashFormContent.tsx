import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText, Button, AppNumpad, CASH_NUMPAD_LAYOUT } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';
import { formatCurrency } from '../../../lib/utils/format';

export interface CashPresetItem {
  label: string;
  defaultAmount?: number;
  isCustom?: boolean;
}

export const defaultExpensePresets: CashPresetItem[] = [
  { label: 'Mua nguyên liệu', defaultAmount: 150000 },
  { label: 'Mua đá cây', defaultAmount: 20000 },
  { label: 'Ứng lương NV', defaultAmount: 500000 },
  { label: 'Điện / Nước / Gas', defaultAmount: 300000 },
  { label: 'Ly / Bao bì / Túi', defaultAmount: 200000 },
  { label: 'Sửa chữa / Vận hành', defaultAmount: 100000 },
  { label: 'Chi khác', defaultAmount: 50000 },
];

export const defaultIncomePresets: CashPresetItem[] = [
  { label: 'Nạp thêm tiền két', defaultAmount: 1000000 },
  { label: 'Thu cọc vỏ bình', defaultAmount: 100000 },
  { label: 'Thu bán ve chai', defaultAmount: 50000 },
  { label: 'Khoản thu khác', defaultAmount: 100000 },
];

export const quickExpensePresets = defaultExpensePresets;
export const quickIncomePresets = defaultIncomePresets;
export const quickAmounts = [20000, 50000, 100000, 200000, 500000, 1000000];

export const quickIncrementSteps = [10000, 20000, 50000, 100000, 200000, 500000];

/**
 * 🌟 Thuật toán gợi ý tiền thông minh (Smart Cash Suggestions Algorithm)
 * - Khi chưa nhập số: Gợi ý 6 mệnh giá tiền mặt chuẩn VND hoặc mốc tùy chỉnh
 * - Khi đang nhập số (>0): Tự động tính toán 6 mốc làm tròn thông minh kế tiếp (tròn 10k, 50k, 100k, x2, 500k, 1M)
 */
export function getSmartCashSuggestions(currentAmount: number, baseAmounts: number[]): number[] {
  if (currentAmount <= 0) {
    return baseAmounts;
  }

  const suggestions: number[] = [];

  // 1. Tròn 10k kế tiếp
  const next10k = Math.ceil((currentAmount + 1) / 10000) * 10000;
  if (next10k > currentAmount) suggestions.push(next10k);

  // 2. Tròn 50k kế tiếp
  const next50k = Math.ceil((currentAmount + 1) / 50000) * 50000;
  if (next50k > currentAmount && !suggestions.includes(next50k)) suggestions.push(next50k);

  // 3. Tròn 100k kế tiếp
  const next100k = Math.ceil((currentAmount + 1) / 100000) * 100000;
  if (next100k > currentAmount && !suggestions.includes(next100k)) suggestions.push(next100k);

  // 4. Nhân đôi x2 nếu hợp lý (< 5 triệu)
  const doubleVal = currentAmount * 2;
  if (doubleVal <= 5000000 && !suggestions.includes(doubleVal)) suggestions.push(doubleVal);

  // 5. Tròn 500k kế tiếp
  const next500k = Math.ceil((currentAmount + 1) / 500000) * 500000;
  if (next500k > currentAmount && !suggestions.includes(next500k)) suggestions.push(next500k);

  // 6. Tròn 1M kế tiếp
  const next1M = Math.ceil((currentAmount + 1) / 1000000) * 1000000;
  if (next1M > currentAmount && !suggestions.includes(next1M)) suggestions.push(next1M);

  // Thêm các mốc base chưa có nếu danh sách chưa đủ 6
  for (const b of baseAmounts) {
    if (b > currentAmount && !suggestions.includes(b)) {
      suggestions.push(b);
    }
  }

  // Sắp xếp tăng dần và lấy tối đa 6 mốc
  const sorted = suggestions.sort((a, b) => a - b).slice(0, 6);
  return sorted.length >= 3 ? sorted : baseAmounts;
}

export const NUMPAD_LAYOUT = CASH_NUMPAD_LAYOUT;

export interface QuickCashFormContentProps {
  txType: 'thu' | 'chi';
  setTxType: (type: 'thu' | 'chi') => void;
  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;
  customDescription: string;
  setCustomDescription: (desc: string) => void;
  amountStr: string;
  setAmountStr: (amount: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isWide?: boolean;
  currentDrawerCash?: number;
  hideActionButtons?: boolean;
  showTopTabs?: boolean;
  paymentMethod?: 'tien_mat' | 'chuyen_khoan';
  setPaymentMethod?: (pm: 'tien_mat' | 'chuyen_khoan') => void;
  expenseType?: 'hoat_dong' | 'co_dinh';
  setExpenseType?: (et: 'hoat_dong' | 'co_dinh') => void;
}

export const QuickCashFormContent: React.FC<QuickCashFormContentProps> = ({
  txType,
  setTxType,
  selectedPreset,
  setSelectedPreset,
  customDescription,
  setCustomDescription,
  amountStr,
  setAmountStr,
  onSubmit,
  onCancel,
  isWide = false,
  currentDrawerCash = 1500000,
  hideActionButtons = false,
  showTopTabs = false,
  paymentMethod = 'tien_mat',
  setPaymentMethod,
  expenseType = 'hoat_dong',
  setExpenseType,
}) => {
  const { theme, isDark } = useTheme();

  // Internal fallback state if parent doesn't manage paymentMethod / expenseType
  const [localPaymentMethod, setLocalPaymentMethod] = useState<'tien_mat' | 'chuyen_khoan'>(paymentMethod);
  const [localExpenseType, setLocalExpenseType] = useState<'hoat_dong' | 'co_dinh'>(expenseType);

  const activePaymentMethod = setPaymentMethod ? paymentMethod : localPaymentMethod;
  const activeExpenseType = setExpenseType ? expenseType : localExpenseType;

  const handleSelectPaymentMethod = (pm: 'tien_mat' | 'chuyen_khoan') => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (setPaymentMethod) {
      setPaymentMethod(pm);
    } else {
      setLocalPaymentMethod(pm);
    }
  };

  const handleSelectExpenseType = (et: 'hoat_dong' | 'co_dinh') => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (setExpenseType) {
      setExpenseType(et);
    } else {
      setLocalExpenseType(et);
    }
  };

  // Chế độ nhập số tiền: 'numpad' (Bàn phím số cảm ứng POS) hoặc 'presets' (Mệnh giá gợi ý thông minh)
  const [amountInputMode, setAmountInputMode] = useState<'numpad' | 'presets'>('numpad');

  // State danh mục chi phí & nguồn thu linh hoạt (cho phép thêm thủ công)
  const [expenseList, setExpenseList] = useState<CashPresetItem[]>(defaultExpensePresets);
  const [incomeList, setIncomeList] = useState<CashPresetItem[]>(defaultIncomePresets);

  // State mệnh giá tiền mặt tùy biến của quán
  const [customAmountList, setCustomAmountList] = useState<number[]>(quickAmounts);

  // State toggle mở ô tạo nhanh
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');

  const [isAddingAmount, setIsAddingAmount] = useState(false);
  const [newAmountInput, setNewAmountInput] = useState('');

  const numAmount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
  const isCashPayment = activePaymentMethod === 'tien_mat';
  const isOverdraft = txType === 'chi' && isCashPayment && numAmount > currentDrawerCash;
  const overdraftAmount = numAmount - currentDrawerCash;

  const forecastedDrawerCash =
    txType === 'chi'
      ? Math.max(0, currentDrawerCash - numAmount)
      : currentDrawerCash + numAmount;

  // Danh mục hiện tại theo Tab Chi / Thu
  const currentCategories = txType === 'chi' ? expenseList : incomeList;

  // Thuật toán sinh danh sách gợi ý tiền thông minh 6 mốc
  const smartSuggestions = useMemo(() => {
    return getSmartCashSuggestions(numAmount, customAmountList);
  }, [numAmount, customAmountList]);

  // Handler bàn phím số Numpad nhập thủ công
  const handleNumpadKey = (key: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const current = amountStr ? amountStr.replace(/\D/g, '') : '';
    if (key === '⌫') {
      setAmountStr(current.length > 1 ? current.slice(0, -1) : '');
    } else if (key === '000') {
      if (!current || current === '0') return;
      setAmountStr(`${current}000`);
    } else {
      if (!current || current === '0') {
        setAmountStr(key);
      } else {
        setAmountStr(`${current}${key}`);
      }
    }
  };

  // Handler thêm hạng mục mới
  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    const defaultAmt = parseInt(newCatAmount.replace(/\D/g, ''), 10) || undefined;
    const newItem: CashPresetItem = {
      label: trimmed,
      defaultAmount: defaultAmt,
      isCustom: true,
    };

    if (txType === 'chi') {
      setExpenseList((prev) => [newItem, ...prev]);
    } else {
      setIncomeList((prev) => [newItem, ...prev]);
    }

    // Tự động active hạng mục vừa tạo
    setSelectedPreset(trimmed);
    setCustomDescription(trimmed);
    if (defaultAmt && !amountStr) {
      setAmountStr(defaultAmt.toString());
    }

    // Reset & đóng form
    setNewCatName('');
    setNewCatAmount('');
    setIsAddingCategory(false);
  };

  // Handler thêm mệnh giá tùy chỉnh mới
  const handleAddCustomAmount = () => {
    const val = parseInt(newAmountInput.replace(/\D/g, ''), 10);
    if (!val || val <= 0) return;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    if (!customAmountList.includes(val)) {
      setCustomAmountList((prev) => [...prev, val].sort((a, b) => a - b));
    }
    setAmountStr(val.toString());
    setNewAmountInput('');
    setIsAddingAmount(false);
  };

  // Handler cộng dồn gia số (+10k, +20k, +50k...)
  const handleIncrementAmount = (delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const nextVal = numAmount + delta;
    setAmountStr(nextVal.toString());
  };

  return (
    <View style={{ gap: 0, backgroundColor: theme.surface.card }}>
      {/* 1. SEAMLESS TAB SWITCHER (NẾU ĐƯỢC BẬT TRÊN WIDE) */}
      {showTopTabs && (
        <View
          style={[
            s.seamlessTabContainer,
            {
              backgroundColor: theme.status.warningBg,
              borderColor: theme.border.subtle,
              margin: 16,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setTxType('chi');
              setSelectedPreset(expenseList[0]?.label || 'Mua nguyên liệu');
              setCustomDescription(expenseList[0]?.label || 'Mua nguyên liệu');
              setAmountStr((expenseList[0]?.defaultAmount || 20000).toString());
            }}
            style={[
              s.seamlessTabItem,
              txType === 'chi' && {
                backgroundColor: theme.surface.card,
                shadowColor: 'black',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <AppText
              variant="md"
              weight={txType === 'chi' ? 'bold' : 'normal'}
              color={txType === 'chi' ? theme.brand.danger : theme.text.muted}
            >
              Chi Tiền (-)
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setTxType('thu');
              setSelectedPreset(incomeList[0]?.label || 'Nạp thêm tiền két');
              setCustomDescription(incomeList[0]?.label || 'Nạp thêm tiền két');
              setAmountStr((incomeList[0]?.defaultAmount || 1000000).toString());
            }}
            style={[
              s.seamlessTabItem,
              txType === 'thu' && {
                backgroundColor: theme.surface.card,
                shadowColor: 'black',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <AppText
              variant="md"
              weight={txType === 'thu' ? 'bold' : 'normal'}
              color={txType === 'thu' ? theme.brand.success : theme.text.muted}
            >
              Thu Tiền (+)
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. HERO AMOUNT DISPLAY SECTION (PHẲNG TRÀN VIỀN) */}
      <View
        style={[
          s.heroAmountSection,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="xs" weight="medium" color={theme.text.muted}>
            SỐ TIỀN {txType === 'chi' ? 'CHI RA' : 'THU VÀO'}
          </AppText>
          {numAmount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                setAmountStr('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                Xóa Về 0
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <AppText
            variant="xl"
            weight="bold"
            color={txType === 'chi' ? theme.brand.danger : theme.brand.success}
            style={{ marginRight: 4 }}
          >
            {txType === 'chi' ? '-' : '+'}
          </AppText>
          <TextInput
            value={amountStr ? parseInt(amountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
            onChangeText={(text) => {
              const clean = text.replace(/\D/g, '');
              setAmountStr(clean);
            }}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.text.muted}
            style={[
              s.heroAmountInput,
              {
                color: txType === 'chi' ? theme.brand.danger : theme.brand.success,
              },
            ]}
          />
          <AppText
            variant="xl"
            weight="bold"
            color={txType === 'chi' ? theme.brand.danger : theme.brand.success}
          >
            đ
          </AppText>
        </View>

        {/* Live Drawer Cash Forecast */}
        <View style={[s.forecastStrip, { backgroundColor: theme.surface.header, borderTopColor: theme.border.subtle }]}>
          <AppText variant="xs" color={theme.text.muted}>
            Két hiện tại: <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{formatCurrency(currentDrawerCash)} đ</AppText>
          </AppText>
          <AppText variant="xs" color={theme.text.muted}>
            {isCashPayment ? (
              <>→ Sau ghi: <AppText variant="xs" weight="medium" color={txType === 'chi' ? (isOverdraft ? theme.brand.danger : theme.brand.accent) : theme.brand.success} tabularNums>{formatCurrency(forecastedDrawerCash)} đ</AppText></>
            ) : (
              <AppText variant="xs" weight="medium" color={theme.brand.accent}>Chuyển khoản (Không đổi két)</AppText>
            )}
          </AppText>
        </View>

        {/* ⚠️ CẢNH BÁO CHI ÂM KÉT (OVERDRAFT PROTECTION) */}
        {isOverdraft && (
          <View
            style={[
              s.overdraftAlertBox,
              {
                backgroundColor: theme.status.dangerBg,
                borderColor: theme.brand.danger,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="alert-circle" size={18} color={theme.brand.danger} />
              <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                CHI VƯỢT TIỀN KÉT ({formatCurrency(overdraftAmount)} đ)
              </AppText>
            </View>
            <AppText variant="xs" color={theme.brand.danger} style={{ marginTop: 4 }}>
              Két chỉ còn {formatCurrency(currentDrawerCash)} đ. Hãy đổi nguồn sang Chuyển Khoản nếu không chi tiền mặt.
            </AppText>
          </View>
        )}
      </View>

      {/* 3. NGUỒN TIỀN THỰC CHIẾN (1-CHẠM: KÉT TIỀN MẶT VS CHUYỂN KHOẢN) */}
      <View
        style={[
          s.sectionBlock,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <AppText variant="xs" color={theme.text.muted} weight="medium">
            NGUỒN TIỀN
          </AppText>
          <AppText variant="xxs" color={theme.text.muted}>
            {isCashPayment ? 'Cộng/trừ két giao ca' : 'Tài khoản ngân hàng'}
          </AppText>
        </View>

        <View style={s.paymentMethodRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectPaymentMethod('tien_mat')}
            style={[
              s.paymentMethodBtn,
              {
                backgroundColor: isCashPayment ? theme.brand.primary : theme.surface.header,
                borderColor: isCashPayment ? theme.brand.primary : theme.border.subtle,
              },
            ]}
          >
            <Icon
              name="cash"
              size={20}
              color={isCashPayment ? theme.text.onBrand : theme.text.primary}
            />
            <View style={{ alignItems: 'flex-start' }}>
              <AppText
                variant="md"
                weight={isCashPayment ? 'bold' : 'medium'}
                color={isCashPayment ? theme.text.onBrand : theme.text.primary}
              >
                Két Tiền Mặt
              </AppText>
              <AppText
                variant="xxs"
                color={isCashPayment ? theme.text.onBrand : theme.text.muted}
              >
                Tiền trong két
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectPaymentMethod('chuyen_khoan')}
            style={[
              s.paymentMethodBtn,
              {
                backgroundColor: !isCashPayment ? theme.brand.primary : theme.surface.header,
                borderColor: !isCashPayment ? theme.brand.primary : theme.border.subtle,
              },
            ]}
          >
            <Icon
              name="bank-transfer"
              size={22}
              color={!isCashPayment ? theme.text.onBrand : theme.text.primary}
            />
            <View style={{ alignItems: 'flex-start' }}>
              <AppText
                variant="md"
                weight={!isCashPayment ? 'bold' : 'medium'}
                color={!isCashPayment ? theme.text.onBrand : theme.text.primary}
              >
                Chuyển Khoản
              </AppText>
              <AppText
                variant="xxs"
                color={!isCashPayment ? theme.text.onBrand : theme.text.muted}
              >
                Tài khoản ngân hàng
              </AppText>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. PHÂN LOẠI CHI PHÍ P&L (KHI LẬP PHIẾU CHI) */}
      {txType === 'chi' && (
        <View
          style={[
            s.sectionBlock,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.subtle,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <AppText variant="xs" color={theme.text.muted} weight="medium">
              PHÂN LOẠI CHI PHÍ
            </AppText>
            <AppText variant="xxs" color={theme.text.muted}>
              {activeExpenseType === 'hoat_dong' ? 'Biến phí ngày' : 'Định phí kỳ'}
            </AppText>
          </View>

          <View style={s.expenseTypeRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectExpenseType('hoat_dong')}
              style={[
                s.expenseTypeBtn,
                {
                  backgroundColor: activeExpenseType === 'hoat_dong' ? theme.brand.accent : theme.surface.header,
                  borderColor: activeExpenseType === 'hoat_dong' ? theme.brand.accent : theme.border.subtle,
                },
              ]}
            >
              <Icon
                name="cart-outline"
                size={16}
                color={activeExpenseType === 'hoat_dong' ? theme.text.onBrand : theme.text.primary}
              />
              <AppText
                variant="sm"
                weight={activeExpenseType === 'hoat_dong' ? 'bold' : 'medium'}
                color={activeExpenseType === 'hoat_dong' ? theme.text.onBrand : theme.text.primary}
              >
                Chi Hoạt Động
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectExpenseType('co_dinh')}
              style={[
                s.expenseTypeBtn,
                {
                  backgroundColor: activeExpenseType === 'co_dinh' ? theme.brand.accent : theme.surface.header,
                  borderColor: activeExpenseType === 'co_dinh' ? theme.brand.accent : theme.border.subtle,
                },
              ]}
            >
              <Icon
                name="domain"
                size={16}
                color={activeExpenseType === 'co_dinh' ? theme.text.onBrand : theme.text.primary}
              />
              <AppText
                variant="sm"
                weight={activeExpenseType === 'co_dinh' ? 'bold' : 'medium'}
                color={activeExpenseType === 'co_dinh' ? theme.text.onBrand : theme.text.primary}
              >
                Chi Cố Định
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. PHÍM CỘNG DỒN GIA SỐ NHANH 1-CHẠM (+10k, +20k, +50k, +100k, +200k, +500k) */}
      <View
        style={[
          s.sectionBlock,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
            paddingVertical: 10,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <AppText variant="xs" color={theme.text.muted} weight="medium">
            CỘNG NHANH (+)
          </AppText>
          <AppText variant="xxs" color={theme.text.muted}>
            Cộng vào tiền
          </AppText>
        </View>
        <View style={s.incrementRow}>
          {quickIncrementSteps.map((step) => (
            <TouchableOpacity
              key={step}
              activeOpacity={0.75}
              onPress={() => handleIncrementAmount(step)}
              style={[
                s.incrementBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                },
              ]}
            >
              <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
                +{Math.round(step / 1000)}k
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 6. CHẾ ĐỘ NHẬP SỐ TIỀN: BÀN PHÍM SỐ NUMPAD (NHẬP TAY) & MỆNH GIÁ GỢI Ý */}
      <View
        style={[
          s.sectionBlock,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        {/* Switcher Bàn Phím Số vs Mệnh Giá */}
        <View style={s.modeSwitcherRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setAmountInputMode('numpad');
            }}
            style={[
              s.modeSwitcherBtn,
              {
                backgroundColor: amountInputMode === 'numpad' ? theme.brand.primary : theme.surface.header,
                borderColor: amountInputMode === 'numpad' ? theme.brand.primary : theme.border.subtle,
              },
            ]}
          >
            <Icon
              name="dialpad"
              size={15}
              color={amountInputMode === 'numpad' ? theme.text.onBrand : theme.text.muted}
            />
            <AppText
              variant="xs"
              weight={amountInputMode === 'numpad' ? 'bold' : 'normal'}
              color={amountInputMode === 'numpad' ? theme.text.onBrand : theme.text.primary}
            >
              Bàn Phím Số
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setAmountInputMode('presets');
            }}
            style={[
              s.modeSwitcherBtn,
              {
                backgroundColor: amountInputMode === 'presets' ? theme.brand.primary : theme.surface.header,
                borderColor: amountInputMode === 'presets' ? theme.brand.primary : theme.border.subtle,
              },
            ]}
          >
            <Icon
              name="cash-multiple"
              size={15}
              color={amountInputMode === 'presets' ? theme.text.onBrand : theme.text.muted}
            />
            <AppText
              variant="xs"
              weight={amountInputMode === 'presets' ? 'bold' : 'normal'}
              color={amountInputMode === 'presets' ? theme.text.onBrand : theme.text.primary}
            >
              Gợi Ý Mệnh Giá
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Chế độ A: Bàn phím số Numpad POS 1-chạm */}
        {amountInputMode === 'numpad' ? (
          <AppNumpad onKeyPress={handleNumpadKey} />
        ) : (
          /* Chế độ B: Mệnh Giá Nhanh & Làm Tròn Thông Minh */
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <AppText variant="xs" color={theme.text.muted} weight="medium">
                {numAmount > 0 ? 'GỢI Ý LÀM TRÒN' : 'MỆNH GIÁ MẪU'}
              </AppText>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setIsAddingAmount(!isAddingAmount);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <AppText variant="xs" weight="medium" color={theme.brand.accent}>
                  {isAddingAmount ? 'Đóng' : '+ Thêm Mức'}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Inline form thêm mệnh giá tùy chỉnh */}
            {isAddingAmount && (
              <View style={[s.inlineAddBox, { backgroundColor: theme.surface.header, borderColor: theme.brand.accent }]}>
                <TextInput
                  value={newAmountInput ? parseInt(newAmountInput.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                  onChangeText={(t) => setNewAmountInput(t.replace(/\D/g, ''))}
                  placeholder="Nhập mức tiền mới (vd: 35.000)..."
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                  style={[s.inlineInput, { color: theme.text.primary }]}
                  autoFocus
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAddCustomAmount}
                  style={[s.inlineAddBtn, { backgroundColor: theme.brand.primary }]}
                >
                  <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                    Lưu
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.quickAmountsGrid}>
              {smartSuggestions.map((amt) => {
                const isSelected = amountStr === amt.toString();
                return (
                  <TouchableOpacity
                    key={amt}
                    activeOpacity={0.75}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      setAmountStr(amt.toString());
                    }}
                    style={[
                      s.quickAmountCell,
                      {
                        backgroundColor: isSelected
                          ? txType === 'chi'
                            ? theme.status.dangerBg
                            : theme.status.readyBg
                          : theme.surface.header,
                        borderColor: isSelected
                          ? txType === 'chi'
                            ? theme.brand.danger
                            : theme.brand.success
                          : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="md"
                      weight={isSelected ? 'bold' : 'normal'}
                      color={
                        isSelected
                          ? txType === 'chi'
                            ? theme.brand.danger
                            : theme.brand.success
                          : theme.text.primary
                      }
                      tabularNums
                    >
                      {amt >= 1000000 ? `${(amt / 1000000).toFixed(amt % 1000000 === 0 ? 0 : 1)}tr` : `${Math.round(amt / 1000)}k`}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* 7. HẠNG MỤC SỔ QUỸ (DANH MỤC ĐA DỤNG + NÚT THÊM THỦ CÔNG) */}
      <View
        style={[
          s.sectionBlock,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AppText variant="xs" color={theme.text.muted} weight="medium">
            HẠNG MỤC {txType === 'chi' ? 'CHI PHÍ' : 'NGUỒN THU'}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setIsAddingCategory(!isAddingCategory);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <AppText variant="xs" weight="medium" color={theme.brand.accent}>
              {isAddingCategory ? 'Đóng' : '+ Thêm Nhóm'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Inline form tạo hạng mục mới */}
        {isAddingCategory && (
          <View style={[s.inlineCatBox, { backgroundColor: theme.surface.header, borderColor: theme.brand.accent }]}>
            <TextInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder={`Tên hạng mục ${txType === 'chi' ? 'chi' : 'thu'} mới...`}
              placeholderTextColor={theme.text.muted}
              style={[s.inlineInput, { color: theme.text.primary, marginBottom: 8 }]}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                value={newCatAmount ? parseInt(newCatAmount.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                onChangeText={(t) => setNewCatAmount(t.replace(/\D/g, ''))}
                placeholder="Số tiền mặc định..."
                placeholderTextColor={theme.text.muted}
                keyboardType="numeric"
                style={[s.inlineInput, { flex: 1, color: theme.text.primary }]}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddCategory}
                style={[s.inlineAddBtn, { backgroundColor: theme.brand.primary }]}
              >
                <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                  + Thêm
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.presetsRow}>
          {currentCategories.map((p) => {
            const isSelected = selectedPreset === p.label;
            return (
              <TouchableOpacity
                key={p.label}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  setSelectedPreset(p.label);
                  setCustomDescription(p.label);
                  if (p.defaultAmount && !amountStr) {
                    setAmountStr(p.defaultAmount.toString());
                  }
                }}
                style={[
                  s.presetChip,
                  {
                    backgroundColor: isSelected
                      ? theme.brand.primary
                      : theme.surface.header,
                    borderColor: isSelected
                      ? theme.brand.primary
                      : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="sm"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? theme.text.onBrand : theme.text.primary}
                >
                  {p.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 8. FORM CHI TIẾT & GHI CHÚ */}
      <View
        style={[
          s.glassFormCard,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        {/* Row 1: Nội dung chi tiết */}
        <View style={[s.formRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 110 }}>
            Nội dung:
          </AppText>
          <TextInput
            value={customDescription}
            onChangeText={setCustomDescription}
            placeholder="Ghi chú chi tiết khoản tiền..."
            placeholderTextColor={theme.text.muted}
            style={[s.formInput, { color: theme.text.primary, fontSize: 18 }]}
          />
        </View>

        {/* Row 2: Nguồn tiền */}
        <View style={[s.formRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 110 }}>
            Nguồn tiền:
          </AppText>
          <AppText variant="md" weight="medium" color={theme.text.primary}>
            {isCashPayment ? '💵 Tiền mặt trong két' : '🏦 Chuyển khoản ngân hàng'}
          </AppText>
        </View>

        {/* Row 3: Phân loại chi phí */}
        {txType === 'chi' && (
          <View style={[s.formRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 110 }}>
              Phân loại:
            </AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              {activeExpenseType === 'hoat_dong' ? '🛒 Chi hoạt động (Chi chợ)' : '🏢 Chi cố định (Mặt bằng/Điện)'}
            </AppText>
          </View>
        )}

        {/* Row 4: Người lập */}
        <View style={s.formRow}>
          <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 110 }}>
            Người lập:
          </AppText>
          <AppText variant="md" weight="medium" color={theme.text.primary}>
            Chủ Quán (Ca CA-01)
          </AppText>
        </View>
      </View>

      {/* 9. ACTIONS ON WIDE SCREEN (DESKTOP / TABLET) */}
      {isWide && !hideActionButtons && (
        <View style={{ padding: 16 }}>
          <Button
            variant="default"
            title={txType === 'chi' ? 'Lưu Chi' : 'Lưu Thu'}
            style={{ height: 48, borderRadius: 12, backgroundColor: theme.brand.primary }}
            onPress={onSubmit}
          />
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  seamlessTabContainer: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
  },
  seamlessTabItem: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmountSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroAmountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    padding: 0,
    margin: 0,
  },
  forecastStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  overdraftAlertBox: {
    marginHorizontal: -16,
    marginTop: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  expenseTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expenseTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  sectionBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  incrementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  incrementBtn: {
    flex: 1,
    minWidth: '15%',
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  numpadContainer: {
    gap: 8,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numpadKey: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  inlineCatBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  inlineInput: {
    flex: 1,
    height: 38,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  inlineAddBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountCell: {
    width: '31.5%',
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFormCard: {
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
  },
  formInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'normal',
    padding: 0,
    margin: 0,
  },
});
