import React, { useState } from 'react';
import { View, ScrollView, TextInput, Switch, TouchableOpacity, useWindowDimensions, Modal, Alert, DimensionValue, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape, formatVND } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import { usePOSSettings, POSSettings, BankAccountItem } from '../../lib/hooks/usePOSSettings';
import { setKitchenModuleEnabled } from '../../lib/utils/kitchenSettings';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import AppText from '../../lib/components/ui/AppText';

type TabType = 'in_an' | 'ngan_hang' | 'van_hanh' | 'tinh_nang' | 'enterprise' | 'giao_dien';
type PreviewTab = 'receipt' | 'kitchen' | 'sticker';

const BANK_LIST = [
  { id: 'MBBank', name: 'MB Bank (NHTM Cổ Phần Quân Đội)' },
  { id: 'Vietcombank', name: 'Vietcombank (Ngoại Thương Việt Nam)' },
  { id: 'Techcombank', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { id: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển)' },
  { id: 'VietinBank', name: 'VietinBank (Công Thương)' },
  { id: 'VPBank', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { id: 'ACB', name: 'ACB (Á Châu)' },
  { id: 'TPBank', name: 'TPBank (Tiên Phong)' },
];

export default function POSSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // Mobile (< 768px) vs Desktop/iPad (>= 768px)
  const { settings, updateSettings, resetToDefaults } = usePOSSettings();
  const [activeTab, setActiveTab] = useState<TabType>('in_an');
  const [localSettings, setLocalSettings] = useState<POSSettings>(settings);
  const [savedToast, setSavedToast] = useState(false);

  // Live Bill Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('receipt');

  // Bank Form State (New or Edit Bank Account)
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Partial<BankAccountItem> | null>(null);

  // Sync state when settings are loaded
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    setKitchenModuleEnabled(localSettings.enableKitchenModule);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      router.push('/ban-hang');
    }, 1200);
  };

  const updateLocal = <K extends keyof POSSettings>(key: K, val: POSSettings[K]) => {
    setLocalSettings((prev: POSSettings) => ({ ...prev, [key]: val }));
  };

  // 🔊 Speaker Voice Simulation
  const simulateSpeakerVoice = (bank: BankAccountItem) => {
    const amountStr = formatVND(125000);
    Alert.alert(
      '🔊 Giả Lập Loa Báo Có (Soundbox)',
      `[ÂM THANH PHÁT TỪ LOA ${bank.speakerName || bank.bankName}]:\n\n"MBBank: Đã nhận ${amountStr} vào tài khoản ${bank.bankAccountNo} từ NGUYEN VAN A"`
    );
  };

  // Save Bank Account Item
  const handleSaveBankItem = () => {
    if (!editingBank?.bankAccountNo || !editingBank?.bankAccountName) {
      Alert.alert('Chưa nhập đủ thông tin', 'Vui lòng nhập Số tài khoản và Tên chủ tài khoản.');
      return;
    }
    const bankId = editingBank.id || `bank-${Date.now()}`;
    const newBank: BankAccountItem = {
      id: bankId,
      bankName: editingBank.bankName || 'MBBank',
      bankAccountNo: editingBank.bankAccountNo,
      bankAccountName: editingBank.bankAccountName.toUpperCase(),
      bankBranch: editingBank.bankBranch || '',
      qrImageUrl: editingBank.qrImageUrl || '',
      isPrimary: editingBank.isPrimary || false,
      isSpeakerEnabled: editingBank.isSpeakerEnabled ?? true,
      speakerName: editingBank.speakerName || `Loa Báo Có ${editingBank.bankName || 'MBBank'}`,
    };

    let updatedList = [...(localSettings.bankAccounts || [])];
    if (editingBank.id) {
      updatedList = updatedList.map((b) => (b.id === editingBank.id ? newBank : b));
    } else {
      updatedList.push(newBank);
    }

    if (newBank.isPrimary) {
      updatedList = updatedList.map((b) => ({ ...b, isPrimary: b.id === newBank.id }));
      updateLocal('bankName', newBank.bankName);
      updateLocal('bankAccountNo', newBank.bankAccountNo);
      updateLocal('bankAccountName', newBank.bankAccountName);
    }

    updateLocal('bankAccounts', updatedList);
    setShowBankModal(false);
    setEditingBank(null);
  };

  const deleteBankItem = (id: string) => {
    const updated = (localSettings.bankAccounts || []).filter((b: BankAccountItem) => b.id !== id);
    updateLocal('bankAccounts', updated);
  };

  // Presets Quick Select
  const applyPreset = (presetType: 'cafe' | 'restaurant' | 'retail') => {
    if (presetType === 'cafe') {
      updateLocal('enableKitchenModule', true);
      updateLocal('enableTableMap', true);
      updateLocal('paperSize', 'K80');
      updateLocal('defaultServiceType', 'takeaway');
      updateLocal('defaultVatRate', 8);
      Alert.alert('Đã áp dụng Preset', 'Mô hình Quán Cafe / Trà Sữa Takeaway');
    } else if (presetType === 'restaurant') {
      updateLocal('enableKitchenModule', true);
      updateLocal('enableTableMap', true);
      updateLocal('paperSize', 'K80');
      updateLocal('defaultServiceType', 'dine_in');
      updateLocal('defaultVatRate', 10);
      updateLocal('kitchenTicketCopies', 2);
      Alert.alert('Đã áp dụng Preset', 'Mô hình Nhà Hàng Bàn Ăn F&B');
    } else if (presetType === 'retail') {
      updateLocal('enableKitchenModule', false);
      updateLocal('enableTableMap', false);
      updateLocal('paperSize', 'K57');
      updateLocal('defaultServiceType', 'takeaway');
      updateLocal('defaultVatRate', 0);
      setKitchenModuleEnabled(false);
      Alert.alert('Đã áp dụng Preset', 'Mô hình Cửa Hàng Bán Lẻ / Tạp Hóa');
    }
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'in_an', label: 'In ấn & Mẫu Hóa đơn', icon: 'printer' },
    { id: 'ngan_hang', label: 'Đa Ngân hàng & Loa QR', icon: 'qrcode-scan' },
    { id: 'van_hanh', label: 'Gọi món, Thuế & KM', icon: 'clipboard-list-outline' },
    { id: 'tinh_nang', label: 'Tùy chỉnh tính năng POS', icon: 'widgets-outline' },
    { id: 'enterprise', label: 'Vận hành Kho & Phân quyền', icon: 'shield-account-outline' },
    { id: 'giao_dien', label: 'Giao diện & Âm thanh', icon: 'tune-vertical' },
  ];

  // 🖨 Live Thermal Receipt / Kitchen Ticket / Cup Sticker Render Engine
  const renderSampleBill = (type: PreviewTab) => {
    const s = localSettings;
    const isK57 = s.paperSize === 'K57';
    const primaryBank = s.bankAccounts?.find((b: BankAccountItem) => b.isPrimary) || s.bankAccounts?.[0];

    if (type === 'kitchen') {
      return (
        <View style={styles.paperSheet}>
          <AppText variant="md" color="#050505" style={{ textAlign: 'center' }}>
            *** PHIẾU BÁO BẾP / BAR ***
          </AppText>
          <AppText variant="sm" color="#64748B" style={{ textAlign: 'center' }}>
            Bàn: BÀN 06 · Giờ: 18:45 · Bản #1/1
          </AppText>

          <View style={styles.dashedLine} />

          <View style={{ gap: 6, marginVertical: 4 }}>
            <View>
              <AppText variant="md" color="#050505">1x Cà Phê Sữa Đá</AppText>
              <AppText variant="sm" color="#E11D48">  ↳ Ghi chú: Ít đường, nhiều đá</AppText>
            </View>
            <View>
              <AppText variant="md" color="#050505">2x Trà Đào Cam Sả (Size L)</AppText>
              <AppText variant="sm" color="#475569">  ↳ Topping: Thạch Đào (+10k)</AppText>
            </View>
          </View>

          <View style={styles.dashedLine} />
          <AppText variant="sm" color="#64748B" style={{ textAlign: 'center' }}>
            Cảm ơn Đầu Bếp & Bartender!
          </AppText>
        </View>
      );
    }

    if (type === 'sticker') {
      return (
        <View style={[styles.paperSheet, { width: 220, borderStyle: 'dashed' }]}>
          <AppText variant="sm" color="#050505" style={{ textAlign: 'center' }}>
            🏷 TEM DÁN LY TRÀ SỮA (50x30mm)
          </AppText>
          <View style={styles.dashedLine} />
          <AppText variant="md" color="#050505">Trà Đào Cam Sả (Size L)</AppText>
          <AppText variant="sm" color="#050505">Đường: 50% · Đá: 70%</AppText>
          <AppText variant="sm" color="#475569">Topping: Thạch Đào</AppText>
          <AppText variant="sm" color="#64748B" style={{ marginTop: 4 }}>
            Bàn 06 · Ly 1/2 · 18:45
          </AppText>
        </View>
      );
    }

    // Customer Receipt (Default)
    return (
      <View style={styles.paperSheet}>
        <AppText variant="md" color="#050505" style={{ textAlign: 'center' }}>
          {s.receiptHeaderTitle || 'NHÀ HÀNG POS F&B'}
        </AppText>
        
        {s.receiptHeaderAddress ? (
          <AppText variant="sm" color="#475569" style={{ textAlign: 'center', marginTop: 2 }}>
            {s.receiptHeaderAddress}
          </AppText>
        ) : null}

        {s.receiptHeaderPhone ? (
          <AppText variant="sm" color="#475569" style={{ textAlign: 'center' }}>
            ĐT: {s.receiptHeaderPhone}
          </AppText>
        ) : null}

        {s.receiptHeaderTaxId ? (
          <AppText variant="sm" color="#475569" style={{ textAlign: 'center' }}>
            MST: {s.receiptHeaderTaxId}
          </AppText>
        ) : null}

        <View style={styles.dashedLine} />

        <AppText variant="md" color="#050505" style={{ textAlign: 'center', marginVertical: 2 }}>
          HÓA ĐƠN THANH TOÁN
        </AppText>
        <AppText variant="sm" color="#64748B" style={{ textAlign: 'center' }}>
          Số: HD-20260725-0088 · Bàn 06
        </AppText>

        <View style={styles.dashedLine} />

        <View style={{ gap: 4, marginVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#050505">1x Cà Phê Sữa Đá</AppText>
            <AppText variant="sm" color="#050505">35.000đ</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#050505">2x Trà Đào Cam Sả (L)</AppText>
            <AppText variant="sm" color="#050505">90.000đ</AppText>
          </View>
        </View>

        <View style={styles.dashedLine} />

        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#475569">Tạm tính:</AppText>
            <AppText variant="sm" color="#475569">125.000đ</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#475569">Thuế VAT ({s.defaultVatRate}%):</AppText>
            <AppText variant="sm" color="#475569">{formatVND(125000 * (s.defaultVatRate / 100))}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <AppText variant="md" color="#050505">TỔNG TIỀN:</AppText>
            <AppText variant="md" color="#050505">
              {formatVND(125000 * (1 + s.defaultVatRate / 100))}
            </AppText>
          </View>
        </View>

        <View style={styles.dashedLine} />

        {/* VietQR Live Preview */}
        {s.showQrOnReceipt && primaryBank ? (
          <View style={{ alignItems: 'center', marginVertical: 6, gap: 4 }}>
            <View style={styles.qrPlaceholder}>
              <Icon name="qrcode-scan" size={38} color="#050505" />
            </View>
            <AppText variant="sm" color="#050505">
              Quét VietQR chuyển khoản ({primaryBank.bankName})
            </AppText>
            <AppText variant="sm" color="#64748B">
              STK: {primaryBank.bankAccountNo} · {primaryBank.bankAccountName}
            </AppText>
          </View>
        ) : null}

        {s.receiptFooterText ? (
          <AppText variant="sm" color="#64748B" style={{ textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
            {s.receiptFooterText}
          </AppText>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView edges={isDesktop ? ['top', 'left', 'right', 'bottom'] : []} style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <UnifiedHeader
        title={isDesktop ? "Cài Đặt Bán Hàng (POS Settings)" : "Cài Đặt"}
        subtitle={isDesktop ? "Cấu hình đa tài khoản VietQR, loa báo có, mẫu bill in & bếp KDS" : undefined}
        onMenuPress={openSidebar}
        onBackPress={() => router.push('/ban-hang')}
        right={
          <TouchableOpacity
            onPress={() => setShowPreviewModal(true)}
            style={styles.floatingPreviewBtn}
            activeOpacity={0.7}
          >
            <Icon name="file-document-outline" size={16} color={colors.brand.primary} />
            <AppText variant="sm" color={colors.brand.primary}>
              {isDesktop ? '👁 Xem 3 Mẫu In' : '👁 Mẫu In'}
            </AppText>
          </TouchableOpacity>
        }
      />



      {/* Main Container: Column on Mobile (< 768px), Row on Desktop (>= 768px) */}
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {/* Navigation Tabs Bar: Horizontal Pills on Mobile, Vertical Sidebar on Desktop */}
        {isDesktop ? (
          <View style={{ width: 260, backgroundColor: colors.surface.card, paddingVertical: 14, borderRightWidth: 1, borderRightColor: colors.border.light }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8, paddingHorizontal: 12 }}>
                {TABS.map((t) => {
                  const active = activeTab === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setActiveTab(t.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderRadius: shape.radius.lg,
                        backgroundColor: active ? colors.brand.primaryBg : 'transparent',
                        borderLeftWidth: 4,
                        borderLeftColor: active ? colors.brand.primary : 'transparent',
                      }}
                    >
                      <Icon name={t.icon as any} size={22} color={active ? colors.brand.primary : colors.icon.muted} />
                      <AppText
                        variant="md"
                        weight={active ? 'bold' : 'normal'}
                        color={active ? colors.brand.primary : colors.text.primary}
                      >
                        {t.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : (
          /* Mobile Horizontal Flat Skills UI Top Tab Bar */
          <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E9F0' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 8, gap: 6 }}>
              {TABS.map((t) => {
                const active = activeTab === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setActiveTab(t.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 10,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: active ? '#EFF6FF' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: active ? '#2563EB' : '#E2E8F0',
                    }}
                  >
                    <Icon name={t.icon as any} size={15} color={active ? '#2563EB' : '#64748B'} />
                    <AppText
                      variant="sm"
                      weight={active ? 'bold' : 'normal'}
                      color={active ? '#2563EB' : '#475569'}
                    >
                      {t.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Center Main Form */}
        <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: isDesktop ? 16 : 6, paddingTop: 6, gap: 8, paddingBottom: 100 + insets.bottom }}>
            
            {/* 🖨 TAB 1: IN ẤN & MẪU HÓA ĐƠN */}
            {activeTab === 'in_an' && (
              <View style={{ gap: 16 }}>
                <View style={{ paddingBottom: 4 }}>
                  <AppText variant="md" color={colors.text.primary}>
                    Cấu Hình In Ấn & Mẫu Bill Hóa Đơn
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Tùy chỉnh thông tin nhà hàng, khổ giấy K80/K57, máy in LAN/IP và in mã VietQR trên hóa đơn
                  </AppText>
                </View>

                {/* 1. Tiêu đề & Thông tin nhà hàng */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 14 }}>
                  <AppText variant="md" color={colors.text.primary}>1. Thông tin cửa hàng trên Hóa đơn:</AppText>

                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Tên nhà hàng / Quán:</AppText>
                      <TextInput
                        value={localSettings.receiptHeaderTitle}
                        onChangeText={(val) => updateLocal('receiptHeaderTitle', val)}
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Số điện thoại hotline:</AppText>
                      <TextInput
                        value={localSettings.receiptHeaderPhone}
                        onChangeText={(val) => updateLocal('receiptHeaderPhone', val)}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={{ width: '100%' }}>
                    <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Địa chỉ cửa hàng:</AppText>
                    <TextInput
                      value={localSettings.receiptHeaderAddress}
                      onChangeText={(val) => updateLocal('receiptHeaderAddress', val)}
                      multiline={true}
                      style={[styles.input, { height: 'auto', minHeight: 48, paddingTop: 8, paddingBottom: 8 }]}
                    />
                  </View>

                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Mã số thuế (nếu có):</AppText>
                      <TextInput
                        value={localSettings.receiptHeaderTaxId}
                        onChangeText={(val) => updateLocal('receiptHeaderTaxId', val)}
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Số bản in phiếu bếp:</AppText>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[1, 2, 3].map((num) => {
                          const sel = localSettings.kitchenTicketCopies === num;
                          return (
                            <TouchableOpacity
                              key={num}
                              onPress={() => updateLocal('kitchenTicketCopies', num)}
                              style={[styles.smallPill, sel && styles.smallPillActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                {num} bản
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border.light, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color="#1E293B">Bật / Tắt Gửi Bếp (Module Bếp KDS)</AppText>
                      <AppText variant="sm" color="#64748B">Tắt nếu cửa hàng bán lẻ/café takeaway không dùng bộ phận bếp</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableKitchenModule}
                      onValueChange={(val) => {
                        updateLocal('enableKitchenModule', val);
                        setKitchenModuleEnabled(val);
                      }}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View>
                    <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Lời chúc & Wi-Fi chân bill (Footer):</AppText>
                    <TextInput
                      value={localSettings.receiptFooterText}
                      onChangeText={(val) => updateLocal('receiptFooterText', val)}
                      multiline={true}
                      style={[styles.input, { height: 64, paddingTop: 8 }]}
                    />
                  </View>
                </View>

                {/* 2. Khổ giấy & Tùy chọn hiển thị */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 14 }}>
                  <AppText variant="md" color={colors.text.primary}>2. Khổ giấy & Tùy chọn mẫu bill:</AppText>

                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Khổ giấy in bill:</AppText>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['K80', 'K57'] as const).map((paper) => {
                          const sel = localSettings.paperSize === paper;
                          return (
                            <TouchableOpacity
                              key={paper}
                              onPress={() => updateLocal('paperSize', paper)}
                              style={[styles.pillBtn, sel && styles.pillBtnActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                Khổ {paper} ({paper === 'K80' ? '80mm' : '57mm'})
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Cỡ chữ hiển thị bill:</AppText>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { id: 'normal', label: 'Bình thường' },
                          { id: 'large', label: 'Chữ To sắc nét' },
                        ].map((sz) => {
                          const sel = localSettings.receiptFontSize === sz.id;
                          return (
                            <TouchableOpacity
                              key={sz.id}
                              onPress={() => updateLocal('receiptFontSize', sz.id as 'normal' | 'large')}
                              style={[styles.pillBtn, sel && styles.pillBtnActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                {sz.label}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>In mã VietQR chuyển khoản lên chân hóa đơn</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Khách hàng có thể quét mã QR in trên bill để chuyển khoản</AppText>
                    </View>
                    <Switch
                      value={localSettings.showQrOnReceipt}
                      onValueChange={(val) => updateLocal('showQrOnReceipt', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Tự động bật cửa sổ in khi hoàn thành thanh toán</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Không cần bấm nút in thủ công sau khi thu tiền</AppText>
                    </View>
                    <Switch
                      value={localSettings.autoPrintReceipt}
                      onValueChange={(val) => updateLocal('autoPrintReceipt', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* 3. Cấu hình Máy In LAN / IP */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 14 }}>
                  <AppText variant="md" color={colors.text.primary}>3. Cấu hình kết nối Máy In chuyên nghiệp:</AppText>
                  
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>IP Máy in Thu ngân (LAN/IP):</AppText>
                      <TextInput
                        value={localSettings.cashierPrinterIp}
                        onChangeText={(val) => updateLocal('cashierPrinterIp', val)}
                        placeholder="192.168.1.200"
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>IP Máy in Bếp / Bar (LAN/IP):</AppText>
                      <TextInput
                        value={localSettings.kitchenPrinterIp}
                        onChangeText={(val) => updateLocal('kitchenPrinterIp', val)}
                        placeholder="192.168.1.201"
                        style={styles.input}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 💳 TAB 2: ĐA NGÂN HÀNG & MÃ QR LOA BÁO CÓ */}
            {activeTab === 'ngan_hang' && (
              <View style={{ gap: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppText variant="md" color={colors.text.primary}>
                      Quản Lý Đa Tài Khoản Ngân Hàng & Loa Báo Có
                    </AppText>
                    <AppText variant="sm" color={colors.text.muted}>
                      Hỗ trợ thêm nhiều tài khoản ngân hàng và mã QR Loa Báo Có Soundbox tùy chỉnh
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingBank({ bankName: 'MBBank', isPrimary: false, isSpeakerEnabled: true });
                      setShowBankModal(true);
                    }}
                    style={styles.addBankBtn}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={16} color={colors.text.inverse} />
                    <AppText variant="sm" color={colors.text.inverse}>+ Thêm TK</AppText>
                  </TouchableOpacity>
                </View>

                {/* Bank Account List */}
                <View style={{ gap: 10 }}>
                  {(localSettings.bankAccounts || []).map((bank: BankAccountItem) => (
                    <View key={bank.id} style={styles.bankCard}>
                      <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.bankBadgeIcon}>
                            <Icon name="bank" size={20} color={colors.brand.primary} />
                          </View>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <AppText variant="md" color="#050505">{bank.bankName}</AppText>
                              {bank.isPrimary && (
                                <View style={styles.primaryPill}>
                                  <AppText variant="sm" color="#059669">Tài khoản chính</AppText>
                                </View>
                              )}
                              {bank.isSpeakerEnabled && (
                                <View style={styles.speakerPill}>
                                  <AppText variant="sm" color="#2563EB">🔊 Loa Báo Có</AppText>
                                </View>
                              )}
                            </View>
                            <AppText variant="sm" color="#64748B" style={{ marginTop: 2 }}>
                              STK: <AppText variant="sm" color="#050505">{bank.bankAccountNo}</AppText> · {bank.bankAccountName}
                            </AppText>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6, alignSelf: isDesktop ? 'auto' : 'flex-end' }}>
                          {bank.isSpeakerEnabled && (
                            <TouchableOpacity
                              onPress={() => simulateSpeakerVoice(bank)}
                              style={styles.actionBtnOutline}
                              activeOpacity={0.7}
                            >
                              <Icon name="volume-high" size={14} color="#2563EB" />
                              <AppText variant="sm" color="#2563EB">Thử Loa</AppText>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              setEditingBank(bank);
                              setShowBankModal(true);
                            }}
                            style={styles.actionBtnOutline}
                            activeOpacity={0.7}
                          >
                            <Icon name="pencil" size={14} color={colors.brand.primary} />
                            <AppText variant="sm" color={colors.brand.primary}>Sửa</AppText>
                          </TouchableOpacity>
                          {!bank.isPrimary && (
                            <TouchableOpacity
                              onPress={() => deleteBankItem(bank.id)}
                              style={styles.actionBtnDanger}
                              activeOpacity={0.7}
                            >
                              <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* VietQR Dynamic Options */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật VietQR Động theo chính xác số tiền đơn hàng</AppText>
                      <AppText variant="sm" color={colors.text.muted}>
                        Tự động sinh mã VietQR có đính kèm đúng số tiền cần thanh toán của hóa đơn, giúp khách chuyển khoản nhanh không cần nhập tay.
                      </AppText>
                    </View>
                    <Switch
                      value={localSettings.enableDynamicQR}
                      onValueChange={(val) => updateLocal('enableDynamicQR', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ⚖️ TAB 3: GỌI MÓN, THUẾ & VẬN HÀNH */}
            {activeTab === 'van_hanh' && (
              <View style={{ gap: 16 }}>
                <View style={{ paddingBottom: 4 }}>
                  <AppText variant="md" color={colors.text.primary}>
                    Cài Đặt Gọi Món, Thuế VAT & Quy Tắc Vận Hành
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Cài đặt thuế GTGT, bếp/bar KDS, giảm giá và hình thức phục vụ mặc định
                  </AppText>
                </View>

                {/* 🍳 Bếp & Bar Switch */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật Phân Hệ Nhà Bếp & Bar (KDS)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>
                        Hiển thị phân hệ bếp KDS cho nhà hàng/quán cafe. Tắt switch này nếu cửa hàng bán lẻ/takeaway không có bếp.
                      </AppText>
                    </View>
                    <Switch
                      value={localSettings.enableKitchenModule}
                      onValueChange={(val) => {
                        updateLocal('enableKitchenModule', val);
                        setKitchenModuleEnabled(val);
                      }}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* Thuế VAT */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 14 }}>
                  <AppText variant="md" color={colors.text.primary}>1. Cấu hình Thuế GTGT (VAT):</AppText>
                  
                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Mức thuế VAT mặc định:</AppText>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[0, 5, 8, 10].map((rate) => {
                          const sel = localSettings.defaultVatRate === rate;
                          return (
                            <TouchableOpacity
                              key={rate}
                              onPress={() => updateLocal('defaultVatRate', rate)}
                              style={[styles.smallPill, sel && styles.smallPillActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                {rate}%
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Quy tắc tính thuế:</AppText>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { id: 'inclusive', label: 'Đã gồm VAT' },
                          { id: 'exclusive', label: 'Chưa gồm VAT' },
                        ].map((vt) => {
                          const sel = localSettings.vatType === vt.id;
                          return (
                            <TouchableOpacity
                              key={vt.id}
                              onPress={() => updateLocal('vatType', vt.id as any)}
                              style={[styles.pillBtn, sel && styles.pillBtnActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                {vt.label}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Phục vụ & Giảm giá */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 14 }}>
                  <AppText variant="md" color={colors.text.primary}>2. Hình thức phục vụ & Sửa giá:</AppText>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { id: 'dine_in', label: 'Tại bàn (Dine-in)' },
                      { id: 'takeaway', label: 'Mang về (Takeaway)' },
                    ].map((st) => {
                      const sel = localSettings.defaultServiceType === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => updateLocal('defaultServiceType', st.id as 'dine_in' | 'takeaway')}
                          style={[styles.pillBtn, sel && styles.pillBtnActive]}
                        >
                          <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                            {st.label}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Cho phép thu ngân chỉnh sửa giá món trực tiếp</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cho phép thay đổi đơn giá niêm yết khi chọn món vào giỏ hàng</AppText>
                    </View>
                    <Switch
                      value={localSettings.allowPriceEdit}
                      onValueChange={(val) => updateLocal('allowPriceEdit', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 🧩 TAB 4: TÙY CHỈNH TÍNH NĂNG POS */}
            {activeTab === 'tinh_nang' && (
              <View style={{ gap: 16 }}>
                <View style={{ paddingBottom: 4 }}>
                  <AppText variant="md" color={colors.text.primary}>
                    Tùy Chỉnh Bật / Tắt Các Phân Hệ & Tính Năng POS
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Tối ưu giao diện bán hàng theo đúng mô hình hoạt động của từng cửa hàng
                  </AppText>
                </View>

                {/* 0. Cấu Hình Nhanh Theo Mô Hình (Presets) */}
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E9F0',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderColor: '#E5E9F0',
                    }}
                  >
                    <AppText variant="md" weight="bold" color="#1E293B">
                      ⚡ CẤU HÌNH NHANH MÔ HÌNH KINH DOANH (PRESETS)
                    </AppText>
                  </View>

                  <View style={{ padding: 10, gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => applyPreset('cafe')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        borderRadius: 6,
                        backgroundColor: '#FFF7ED',
                        borderWidth: 1,
                        borderColor: '#FFEDD5',
                      }}
                    >
                      <Icon name="coffee-to-go" size={20} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <AppText variant="md" weight="bold" color="#D97706">☕ Quán Cafe & Trà Sữa Takeaway</AppText>
                        <AppText variant="xs" color="#B45309">Bật sơ đồ bàn, máy in K80, mặc định dịch vụ Mang Về, VAT 8%</AppText>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => applyPreset('restaurant')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        borderRadius: 6,
                        backgroundColor: '#EFF6FF',
                        borderWidth: 1,
                        borderColor: '#DBEAFE',
                      }}
                    >
                      <Icon name="silverware-fork-knife" size={20} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <AppText variant="md" weight="bold" color="#2563EB">🍲 Nhà Hàng Bàn Ăn F&B</AppText>
                        <AppText variant="xs" color="#1D4ED8">Bật bếp KDS, sơ đồ bàn ăn, máy in K80, 2 liên báo bếp, VAT 10%</AppText>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => applyPreset('retail')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        borderRadius: 6,
                        backgroundColor: '#ECFDF5',
                        borderWidth: 1,
                        borderColor: '#A7F3D0',
                      }}
                    >
                      <Icon name="storefront-outline" size={20} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <AppText variant="md" weight="bold" color="#050505">🛒 Cửa Hàng Bán Lẻ / Tạp Hóa</AppText>
                        <AppText variant="xs" color="#047857">Tắt báo bếp, tắt sơ đồ bàn, máy in K57, VAT 0%</AppText>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 1. Phân Hệ Bàn & Phòng */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <AppText variant="md" color={colors.text.primary}>1. Phân Hệ Sơ Đồ Bàn & Phòng:</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật Phân Hệ Sơ Đồ Bàn & Phòng Ăn</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Hiển thị sơ đồ bàn ăn. Tắt nếu cửa hàng chỉ bán mang về (Takeaway/Kiosk).</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableTableMap}
                      onValueChange={(val) => updateLocal('enableTableMap', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ gap: 8 }}>
                    <AppText variant="md" color={colors.text.primary}>Kiểu hiển thị Sơ Đồ Bàn & Phòng:</AppText>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'grid', label: '🔳 Dạng Lưới / Ô Vuông Bàn' },
                        { id: 'list', label: '📜 Dạng Danh Sách Dòng' },
                      ].map((tm) => {
                        const sel = (localSettings.tableLayoutMode || 'grid') === tm.id;
                        return (
                          <TouchableOpacity
                            key={tm.id}
                            onPress={() => updateLocal('tableLayoutMode', tm.id as any)}
                            style={[styles.pillBtn, sel && styles.pillBtnActive]}
                          >
                            <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                              {tm.label}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Cho phép Ghép Bàn & Gộp Đơn Hàng</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cho phép gộp nhiều bàn hoặc gộp 2 đơn hàng thành 1 hóa đơn thanh toán.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableMergeTables}
                      onValueChange={(val) => updateLocal('enableMergeTables', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Cho phép Tách Món & Chia Hóa Đơn</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tách một phần món ăn từ bàn hiện tại sang bàn khác hoặc tách hóa đơn lẻ.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableSplitItems}
                      onValueChange={(val) => updateLocal('enableSplitItems', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* 2. Phân Hệ Đơn Hàng & Thu Ngân */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <AppText variant="md" color={colors.text.primary}>2. Phân Hệ Đơn Hàng & Thu Ngân:</AppText>

                  <View style={{ gap: 8 }}>
                    <AppText variant="md" color={colors.text.primary}>Kiểu hiển thị Danh Sách Món Ăn (Menu):</AppText>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'grid', label: '🖼 Dạng Thẻ Có Ảnh (Grid)' },
                        { id: 'list', label: '📋 Dạng Danh Sách Dòng (List)' },
                      ].map((mm) => {
                        const sel = (localSettings.menuLayoutMode || 'grid') === mm.id;
                        return (
                          <TouchableOpacity
                            key={mm.id}
                            onPress={() => updateLocal('menuLayoutMode', mm.id as any)}
                            style={[styles.pillBtn, sel && styles.pillBtnActive]}
                          >
                            <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                              {mm.label}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Cho phép Lưu Nháp & Tạm Giữ Đơn Hàng</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cho phép lưu đơn chờ khi khách chưa thanh toán ngay để phục vụ khách khác.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableHoldOrder}
                      onValueChange={(val) => updateLocal('enableHoldOrder', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Hiển thị các Phím Tiền Mặt Nhanh (50k, 100k, 200k, 500k)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Hiển thị gợi ý phím tiền mặt tại màn hình thu ngân để tính tiền thừa nhanh.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableFastCashPills}
                      onValueChange={(val) => updateLocal('enableFastCashPills', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* 3. Phân Hệ Báo Bếp & Màn Hình KDS (Gửi Bếp) */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <AppText variant="md" color={colors.text.primary}>3. Phân Hệ Báo Bếp & Màn Hình KDS (Gửi Bếp):</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật Phân Hệ Báo Bếp / Gửi Bếp KDS</AppText>
                      <AppText variant="sm" color={colors.text.muted}>
                        Cho phép truyền đơn xuống Bếp/Bar và mở màn hình KDS Chế biến. Tắt nếu cửa hàng thanh toán bán lẻ/takeaway không có bộ phận bếp.
                      </AppText>
                    </View>
                    <Switch
                      value={localSettings.enableKitchenModule}
                      onValueChange={(val) => {
                        updateLocal('enableKitchenModule', val);
                        setKitchenModuleEnabled(val);
                      }}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* 3. Phân Hệ Khách Hàng CRM & Hóa Đơn VAT */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <AppText variant="md" color={colors.text.primary}>3. Phân Hệ CRM & Hóa Đơn Điện Tử:</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật Quản Lý Khách Thân Thiết & Tích Điểm CRM</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cho phép gán số điện thoại khách hàng vào đơn để tích điểm thưởng.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableCustomerCRM}
                      onValueChange={(val) => updateLocal('enableCustomerCRM', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật Nhập Thông Tin Xuất Hóa Đơn VAT Điện Tử</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cho phép thu ngân nhập Mã Số Thuế & Tên Công Ty của khách khi phát hành VAT.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableVatInvoice}
                      onValueChange={(val) => updateLocal('enableVatInvoice', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 🏢 TAB 5: VẬN HÀNH KHO & BẢO MẬT ENTERPRISE */}
            {activeTab === 'enterprise' && (
              <View style={{ gap: 16 }}>
                <View style={{ paddingBottom: 4 }}>
                  <AppText variant="md" color={colors.text.primary}>
                    Cấu Hình Vận Hành Kho, Bảo Mật PIN Quản Lý & Két Tiền Enterprise
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Các tính năng điều hành chuyên sâu chuẩn công nghiệp dành cho chuỗi nhà hàng & cửa hàng lớn
                  </AppText>
                </View>

                {/* 1. Trừ kho nguyên liệu tự động */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <AppText variant="md" color={colors.text.primary}>1. Quản Lý Tồn Kho Nguyên Liệu (Inventory Engine):</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật tự động trừ kho nguyên liệu thời gian thực</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự động trừ số lượng đường, sữa, hạt cà phê... ngay khi hóa đơn xuất ra.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableInventoryDeduction}
                      onValueChange={(val) => updateLocal('enableInventoryDeduction', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Cảnh báo tồn kho tối thiểu trên màn hình POS</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cảnh báo màu đỏ khi nguyên liệu hoặc món ăn sắp hết hàng.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableLowStockWarning}
                      onValueChange={(val) => updateLocal('enableLowStockWarning', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* 2. Bảo mật & Chống gian lận */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <AppText variant="md" color={colors.text.primary}>2. Phân Quyền Bảo Mật & Chống Gian Lận Thu Ngân:</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bắt buộc PIN Quản Lý khi Hủy đơn & Giảm giá &gt; 20%</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Yêu cầu mã PIN Quản lý mới cho phép hủy đơn hoặc giảm giá lớn để chống gian lận.</AppText>
                    </View>
                    <Switch
                      value={localSettings.requireManagerPinForVoid}
                      onValueChange={(val) => updateLocal('requireManagerPinForVoid', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Tự động nảy bật Két Tiền Thu Ngân (Cash Drawer)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Két tiền tự động bật nắp khi bấm hoàn thành đơn hàng thanh toán tiền mặt.</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableCashDrawerAutoOpen}
                      onValueChange={(val) => updateLocal('enableCashDrawerAutoOpen', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>In dấu "BẢN IN LẠI" khi in hóa đơn từ lần 2</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tránh nhân viên in lại hóa đơn cũ để tính tiền 2 lần cho khách khác.</AppText>
                    </View>
                    <Switch
                      value={localSettings.reprintStampEnabled}
                      onValueChange={(val) => updateLocal('reprintStampEnabled', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                {/* 3. Phụ thu ngày lễ & Làm tròn tiền */}
                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 14 }}>
                  <AppText variant="md" color={colors.text.primary}>3. Phụ Thu Ngày Lễ & Quy Tắc Làm Tròn Tiền Mặt:</AppText>

                  <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Phụ thu ngày Lễ / Tết (%):</AppText>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[0, 10, 15, 20].map((rate) => {
                          const sel = localSettings.holidaySurchargePercent === rate;
                          return (
                            <TouchableOpacity
                              key={rate}
                              onPress={() => updateLocal('holidaySurchargePercent', rate)}
                              style={[styles.smallPill, sel && styles.smallPillActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                +{rate}%
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Quy tắc làm tròn tiền lẻ:</AppText>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[
                          { id: 'none', label: 'Chính xác' },
                          { id: 'round_1000_down', label: 'Làm tròn 1k' },
                        ].map((rule) => {
                          const sel = localSettings.cashRoundingRule === rule.id;
                          return (
                            <TouchableOpacity
                              key={rule.id}
                              onPress={() => updateLocal('cashRoundingRule', rule.id as any)}
                              style={[styles.pillBtn, sel && styles.pillBtnActive]}
                            >
                              <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                                {rule.label}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 🖥 TAB 6: GIAO DIỆN & ÂM THANH */}
            {activeTab === 'giao_dien' && (
              <View style={{ gap: 16 }}>
                <View style={{ paddingBottom: 4 }}>
                  <AppText variant="md" color={colors.text.primary}>
                    Cài Đặt Giao Diện & Hiệu Ứng Phản Hồi
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Tùy chỉnh âm thanh bíp và hiệu ứng rung Haptics
                  </AppText>
                </View>

                <View style={{ backgroundColor: colors.surface.card, padding: isDesktop ? 16 : 12, borderRadius: shape.radius.lg, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Âm thanh phản hồi bíp (Sound Effects)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Phát tiếng bíp nhẹ khi thu ngân bấm chọn món hoặc hoàn thành thanh toán</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableSoundEffects}
                      onValueChange={(val) => updateLocal('enableSoundEffects', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Hiệu ứng rung phản hồi (Haptics Feedback)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Rung nhẹ trên màn hình cảm ứng di động khi thao tác</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableHaptics}
                      onValueChange={(val) => updateLocal('enableHaptics', val)}
                      trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

          </ScrollView>
        </View>

      </View>

      {/* Modal 1: Live Preview Modal (Mobile & Tablet) */}
      {showPreviewModal && (
        <Modal visible={showPreviewModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <AppText variant="md" color="#050505">Xem Trực Quan Mẫu Bill In</AppText>
                <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                  <Icon name="close" size={22} color="#050505" />
                </TouchableOpacity>
              </View>

              <View style={[styles.previewTabStrip, { marginVertical: 10 }]}>
                {[
                  { id: 'receipt', label: 'Bill Hóa Đơn' },
                  { id: 'kitchen', label: 'Báo Bếp KDS' },
                  { id: 'sticker', label: 'Tem Dán Ly' },
                ].map((pt) => {
                  const sel = previewTab === pt.id;
                  return (
                    <TouchableOpacity
                      key={pt.id}
                      onPress={() => setPreviewTab(pt.id as any)}
                      style={[styles.previewTabItem, sel && styles.previewTabItemActive]}
                    >
                      <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                        {pt.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}>
                {renderSampleBill(previewTab)}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal 2: Add / Edit Bank Account */}
      {showBankModal && editingBank && (
        <Modal visible={showBankModal} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: (isDesktop ? 440 : '100%') as DimensionValue }]}>
              <View style={styles.modalHeader}>
                <AppText variant="md" color="#050505">
                  {editingBank.id ? 'Sửa Tài Khoản Ngân Hàng' : 'Thêm Tài Khoản Ngân Hàng'}
                </AppText>
                <TouchableOpacity onPress={() => setShowBankModal(false)}>
                  <Icon name="close" size={22} color="#050505" />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12, paddingVertical: 12 }}>
                <View>
                  <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Chọn ngân hàng:</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {BANK_LIST.map((b) => {
                      const sel = editingBank.bankName === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          onPress={() => setEditingBank({ ...editingBank, bankName: b.id })}
                          style={[styles.smallPill, sel && styles.smallPillActive]}
                        >
                          <AppText variant="sm" weight={sel ? 'bold' : 'normal'} color={sel ? colors.brand.primary : colors.text.secondary}>
                            {b.id}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View>
                  <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Số tài khoản ngân hàng:</AppText>
                  <TextInput
                    value={editingBank.bankAccountNo || ''}
                    onChangeText={(val) => setEditingBank({ ...editingBank, bankAccountNo: val })}
                    placeholder="Nhập số tài khoản..."
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                <View>
                  <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>Tên chủ tài khoản (Viết hoa):</AppText>
                  <TextInput
                    value={editingBank.bankAccountName || ''}
                    onChangeText={(val) => setEditingBank({ ...editingBank, bankAccountName: val.toUpperCase() })}
                    placeholder="NGUYEN VAN A..."
                    style={styles.input}
                  />
                </View>

                <View>
                  <AppText variant="sm" color={colors.text.secondary} style={{ marginBottom: 6 }}>URL Ảnh QR Loa Báo Có / Soundbox Custom (nếu có):</AppText>
                  <TextInput
                    value={editingBank.qrImageUrl || ''}
                    onChangeText={(val) => setEditingBank({ ...editingBank, qrImageUrl: val })}
                    placeholder="https://link-to-soundbox-qr.png"
                    style={styles.input}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <AppText variant="sm" color={colors.text.primary}>Đặt làm tài khoản nhận tiền chính</AppText>
                  <Switch
                    value={editingBank.isPrimary || false}
                    onValueChange={(val) => setEditingBank({ ...editingBank, isPrimary: val })}
                    trackColor={{ false: colors.surface.app, true: colors.brand.primary }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setShowBankModal(false)} style={styles.cancelBtn}>
                  <AppText variant="sm" color={colors.text.secondary}>Hủy</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveBankItem} style={styles.saveBtn}>
                  <AppText variant="sm" color={colors.text.inverse}>Lưu tài khoản</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Borderless Action Footer */}
      <View style={[styles.footerBar, { paddingBottom: Platform.OS === 'web' ? 6 : Math.max(Math.floor(insets.bottom * 0.5), 6) }]}>
        <TouchableOpacity onPress={resetToDefaults} style={styles.resetBtn}>
          <AppText variant="sm" color={colors.status.danger}>
            {isDesktop ? 'Khôi phục mặc định' : 'Mặc định'}
          </AppText>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/ban-hang')} style={styles.exitBtn}>
            <AppText variant="sm" color={colors.text.secondary}>Thoát</AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.submitBtn}>
            <AppText variant="sm" color={colors.text.inverse}>
              {savedToast ? 'Đã Lưu ✓' : 'Lưu Cài Đặt'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  floatingPreviewBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  presetBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  presetBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 42,
    ...font.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%' as DimensionValue,
    maxWidth: '100%' as DimensionValue,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.app,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillBtnActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: colors.border.brand,
  },
  smallPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.app,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallPillActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: colors.border.brand,
  },
  previewTabStrip: {
    flexDirection: 'row' as const,
    gap: 6,
    width: '100%' as DimensionValue,
    marginBottom: 10,
  },
  previewTabItem: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center' as const,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewTabItemActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: colors.border.brand,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    width: 280,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed' as const,
    marginVertical: 6,
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#050505',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F8FAFC',
  },
  addBankBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primary,
  },
  bankCard: {
    backgroundColor: colors.surface.card,
    padding: 14,
    borderRadius: shape.radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  speakerPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  actionBtnOutline: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnDanger: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  footerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E9F0',
  },
  resetBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  exitBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  submitBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#F97316',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
  },
  modalContent: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%' as DimensionValue,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cancelBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  saveBtn: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
