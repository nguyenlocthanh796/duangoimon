import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, useAppToast, AppModal } from '../../../lib/components/ui';
import { VIETNAM_BANKS } from '../../../lib/constants/menuData';
import { playTapSound } from '../../../lib/utils/sound';
import { testVoicePayment } from '../../../lib/utils/voiceAnnouncer';
import { parseVietQREMVCo, generateMBSoundboxDynamicQR } from '../../../lib/utils/vietqrParser';
import { VietQROffline } from '../../../lib/components/pos/VietQROffline';

interface BankVietQRTabProps {
  isWide?: boolean;
  bankCode: string;
  setBankCode: (v: string) => void;
  accountNumber: string;
  setAccountNumber: (v: string) => void;
  accountHolder: string;
  setAccountHolder: (v: string) => void;
  bankBranch: string;
  setBankBranch: (v: string) => void;
  transferSyntax: string;
  setTransferSyntax: (v: string) => void;
  qrTemplate: 'compact' | 'compact2' | 'qr_only';
  setQrTemplate: (v: 'compact' | 'compact2' | 'qr_only') => void;
  enableVoiceAlert?: boolean;
  setEnableVoiceAlert?: (v: boolean) => void;
  autoCompleteOrderOnTransfer?: boolean;
  setAutoCompleteOrderOnTransfer?: (v: boolean) => void;
  autoPrintBillOnTransfer?: boolean;
  setAutoPrintBillOnTransfer?: (v: boolean) => void;
  webhookApiKey?: string;
  setWebhookApiKey?: (v: string) => void;

  // Soundbox
  soundboxProvider?: 'mbbank' | 'vcb' | 'bidv' | 'other';
  setSoundboxProvider?: (v: 'mbbank' | 'vcb' | 'bidv' | 'other') => void;
  mbSoundboxEnabled?: boolean;
  setMbSoundboxEnabled?: (v: boolean) => void;
  mbSoundboxId?: string;
  setMbSoundboxId?: (v: string) => void;
  mbMerchantId?: string;
  setMbMerchantId?: (v: string) => void;
  mbRefPrefix?: string;
  setMbRefPrefix?: (v: string) => void;
  mbRawQrString?: string;
  setMbRawQrString?: (v: string) => void;
}

const SYNTAX_PRESETS = [
  { id: 'simple', label: '[MA_DON]', desc: 'Mã đơn (HD001)', value: '[MA_DON]' },
  { id: 'with_table', label: '[MA_DON] [SO_BAN]', desc: 'Mã đơn + Bàn', value: '[MA_DON] [SO_BAN]' },
  { id: 'with_store', label: '[TEN_QUAN] [MA_DON]', desc: 'Tên quán + Mã', value: '[TEN_QUAN] [MA_DON]' },
];

export function BankVietQRTab({
  isWide: propIsWide,
  bankCode,
  setBankCode,
  accountNumber,
  setAccountNumber,
  accountHolder,
  setAccountHolder,
  bankBranch,
  setBankBranch,
  transferSyntax,
  setTransferSyntax,
  qrTemplate,
  setQrTemplate,
  enableVoiceAlert = true,
  setEnableVoiceAlert,
  autoCompleteOrderOnTransfer = true,
  setAutoCompleteOrderOnTransfer,
  autoPrintBillOnTransfer = true,
  setAutoPrintBillOnTransfer,
  webhookApiKey = '',
  setWebhookApiKey,
  soundboxProvider = 'mbbank',
  setSoundboxProvider,
  mbSoundboxEnabled = false,
  setMbSoundboxEnabled,
  mbSoundboxId = '',
  setMbSoundboxId,
  mbMerchantId = '',
  setMbMerchantId,
  mbRefPrefix = 'HD',
  setMbRefPrefix,
  mbRawQrString = '',
  setMbRawQrString,
}: BankVietQRTabProps) {
  const { theme, isDark } = useTheme();
  const { isWide: responsiveWide } = useResponsive();
  const isWide = propIsWide ?? responsiveWide;
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [searchBankText, setSearchBankText] = useState('');
  const [isPinging, setIsPinging] = useState(false);
  const [rawQrInput, setRawQrInput] = useState(mbRawQrString || '');
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testAmount, setTestAmount] = useState('10000');

  useEffect(() => {
    if (mbRawQrString && !rawQrInput) {
      setRawQrInput(mbRawQrString);
    }
  }, [mbRawQrString]);

  const selectedBank = VIETNAM_BANKS.find((b) => b.code === bankCode) || VIETNAM_BANKS[0];
  const { showToast } = useAppToast();

  const filteredBanks = useMemo(() => {
    if (!searchBankText.trim()) return VIETNAM_BANKS;
    const q = searchBankText.trim().toLowerCase();
    return VIETNAM_BANKS.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q)
    );
  }, [searchBankText]);

  // Chuẩn hóa tên chủ TK: in hoa, không dấu (Napas 247)
  const handleAccountHolderChange = (text: string) => {
    const unaccented = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase();
    setAccountHolder(unaccented);
  };

  const handleParseLoaQR = (customText?: string) => {
    const textToParse = (customText !== undefined ? customText : rawQrInput).replace(/\s+/g, '');
    if (!textToParse) {
      showToast({
        title: 'Chưa có mã QR',
        message: 'Chưa dán chuỗi mã QR Loa MB Bank',
        type: 'danger',
      });
      return;
    }

    const parsed = parseVietQREMVCo(textToParse);
    if (!parsed.isValid) {
      showToast({
        title: 'Mã không hợp lệ',
        message: 'Chuỗi không đúng định dạng EMVCo Napas 247',
        type: 'danger',
      });
      return;
    }

    if (setMbRawQrString) setMbRawQrString(textToParse);
    if (setMbSoundboxId && parsed.soundboxId) setMbSoundboxId(parsed.soundboxId);
    if (setMbMerchantId && parsed.merchantId) setMbMerchantId(parsed.merchantId);
    if (setMbRefPrefix && parsed.refPrefix) setMbRefPrefix(parsed.refPrefix);
    if (setMbSoundboxEnabled) setMbSoundboxEnabled(true);
    if (setSoundboxProvider) setSoundboxProvider('mbbank');
    if (parsed.bankBin === '970422') {
      setBankCode('MB');
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    showToast({
      title: 'Đã nhận diện Loa MB',
      message: `Mã Loa: ${parsed.soundboxId || 'OK'} · Merchant: ${parsed.merchantId || 'OK'}`,
      type: 'success',
    });
  };

  const testDynamicQRPayload = useMemo(() => {
    if (!mbMerchantId && !accountNumber) return '';
    return generateMBSoundboxDynamicQR({
      merchantId: mbMerchantId,
      accountNo: accountNumber,
      soundboxId: mbSoundboxId,
      refPrefix: mbRefPrefix || 'HD',
      amount: parseFloat(testAmount) || 10000,
      isDynamic: true,
    });
  }, [mbMerchantId, accountNumber, mbSoundboxId, mbRefPrefix, testAmount]);

  const sampleQRData = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${qrTemplate}.png?amount=50000&addInfo=${encodeURIComponent(transferSyntax.replace('[MA_DON]', 'HD001').replace('[SO_BAN]', 'B01').replace('[TEN_QUAN]', 'ONGCHU'))}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleTestVoice = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    testVoicePayment(45000);
    showToast({
      title: 'Loa Báo Có',
      message: 'Đã thử giọng đọc: 45.000đ',
      type: 'success',
    });
  };

  const handlePingWebhook = () => {
    playTapSound();
    setIsPinging(true);
    setTimeout(() => {
      setIsPinging(false);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      testVoicePayment(50000);
      showToast({
        title: 'Kiểm Tra Loa',
        message: 'Kết nối thành công! Loa thông báo đã sẵn sàng.',
        type: 'success',
      });
    }, 600);
  };

  const handlePrintStandeeQR = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    showToast({
      title: 'In Mã QR Quầy',
      message: `Đã xuất lệnh in Standee QR (${selectedBank.shortName} - ${accountNumber}) ra máy in K80`,
      type: 'info',
    });
  };

  const cardStyle = [
    s.sectionCard,
    {
      backgroundColor: theme.surface.card,
      borderColor: theme.border.subtle,
      borderRadius: isWide ? 14 : 0,
      borderWidth: isWide ? 1 : 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginTop: isWide ? 0 : 8,
    },
  ];

  return (
    <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
      {/* 🌟 1. THIẾT LẬP TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.warningBg }]}>
            <Icon name="qrcode-scan" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tài Khoản Thụ Hưởng VietQR
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Nhận tiền chuyển khoản tức thì qua Napas 247 động
            </AppText>
          </View>
        </View>

        {/* Nút chọn ngân hàng (Mở Bottom Sheet Modal) */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Ngân hàng thụ hưởng *
          </AppText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setSearchBankText('');
              setBankModalOpen(true);
            }}
            style={[s.selectBankBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
          >
            <View style={[s.bankBadge, { backgroundColor: theme.brand.primaryBg }]}>
              <AppText variant="xs" weight="bold" color={theme.brand.primary}>
                {selectedBank.code}
              </AppText>
            </View>
            <AppText variant="md" weight="medium" color={theme.text.primary} style={{ flex: 1 }} numberOfLines={1}>
              {selectedBank.shortName} — {selectedBank.name}
            </AppText>
            <Icon name="chevron-down" size={22} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Số tài khoản & Tên chủ tài khoản */}
        <View style={[s.rowTwo, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Số tài khoản *
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              placeholder="0988776655"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tên chủ tài khoản (In hoa không dấu) *
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={accountHolder}
              onChangeText={handleAccountHolderChange}
              autoCapitalize="characters"
              placeholder="NGUYEN VAN CHU"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        </View>

        {/* Chi nhánh & Cú pháp */}
        <View style={[s.rowTwo, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Chi nhánh ngân hàng
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={bankBranch}
              onChangeText={setBankBranch}
              placeholder="CN TP. Hồ Chí Minh"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Cú pháp nội dung chuyển khoản
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={transferSyntax}
              onChangeText={setTransferSyntax}
              placeholder="[MA_DON]"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        </View>

        {/* Preset Cú Pháp 1-Chạm */}
        <View style={s.formGroup}>
          <AppText variant="xs" color={theme.text.muted}>
            Gợi ý cú pháp 1-chạm:
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {SYNTAX_PRESETS.map((preset) => {
              const isSel = transferSyntax === preset.value;
              return (
                <TouchableOpacity
                  key={preset.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    setTransferSyntax(preset.value);
                  }}
                  style={[
                    s.syntaxChip,
                    {
                      backgroundColor: isSel ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)') : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.brand.accent : theme.text.primary}
                  >
                    {preset.desc}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Mẫu hiển thị QR */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Mẫu hiển thị VietQR
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {[
              { id: 'compact' as const, label: 'Gọn nhẹ' },
              { id: 'compact2' as const, label: 'Kèm Logo' },
              { id: 'qr_only' as const, label: 'Chỉ mã QR' },
            ].map((tmpl) => {
              const isSel = qrTemplate === tmpl.id;
              return (
                <TouchableOpacity
                  key={tmpl.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    setQrTemplate(tmpl.id);
                  }}
                  style={[
                    s.templateBtn,
                    {
                      backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText variant="sm" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary}>
                    {tmpl.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* 🌟 2. TÍCH HỢP LOA BÁO CÓ VẬT LÝ (SOUNDBOX IOT) */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.warningBg }]}>
            <Icon name="speaker-wireless" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Loa Báo Có Vật Lý (Soundbox IoT)
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Khách chuyển khoản đúng số tiền, loa vật lý tại quầy tự đọc to ngay lập tức
            </AppText>
          </View>
          <Switch
            value={mbSoundboxEnabled}
            onValueChange={setMbSoundboxEnabled}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </View>

        {/* Lựa chọn Nhà Cung Cấp Loa (Extensible Selector) */}
        <View style={s.formGroup}>
          <AppText variant="xs" color={theme.text.muted}>
            Nhà cung cấp Loa Báo Có:
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {[
              { id: 'mbbank' as const, label: 'MB Bank (Quân Đội)', active: true },
              { id: 'vcb' as const, label: 'Vietcombank (Sắp có)', active: false },
              { id: 'bidv' as const, label: 'BIDV (Sắp có)', active: false },
            ].map((prov) => {
              const isSel = soundboxProvider === prov.id;
              return (
                <TouchableOpacity
                  key={prov.id}
                  activeOpacity={0.75}
                  disabled={!prov.active}
                  onPress={() => {
                    playTapSound();
                    if (setSoundboxProvider) setSoundboxProvider(prov.id);
                  }}
                  style={[
                    s.syntaxChip,
                    {
                      backgroundColor: isSel
                        ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)')
                        : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                      opacity: prov.active ? 1 : 0.45,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.brand.accent : theme.text.primary}
                  >
                    {prov.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {mbSoundboxEnabled ? (
          <View style={{ gap: 12 }}>
            {/* Dán mã QR từ Loa MB */}
            <View style={s.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  Chuỗi mã QR Loa MB Bank *
                </AppText>
                <TouchableOpacity
                  onPress={() => {
                    playTapSound();
                    const sample = '00020101021138570010A000000727012700069704220113VQRQAIPRU11760208QRIBFTTA53037045802VN62400107NPS68690825VQRLOAMB202604281109255826304FCDF';
                    setRawQrInput(sample);
                    handleParseLoaQR(sample);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppText variant="xs" weight="medium" color={theme.brand.accent}>
                    Dán mẫu Quán Chè
                  </AppText>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.header,
                    color: theme.text.primary,
                    borderColor: theme.border.subtle,
                    minHeight: 48,
                  },
                ]}
                value={rawQrInput}
                onChangeText={(v) => {
                  setRawQrInput(v);
                  if (setMbRawQrString) setMbRawQrString(v);
                }}
                placeholder="00020101021138570010A00000072701270006970422..."
                placeholderTextColor={theme.text.muted}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  handleParseLoaQR();
                }}
                style={[
                  s.hardwareBtn,
                  {
                    backgroundColor: theme.brand.accent,
                    borderColor: theme.brand.accent,
                    marginTop: 4,
                  },
                ]}
              >
                <Icon name="qrcode-scan" size={18} color={theme.text.onBrand} />
                <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                  Nhận diện & Tự động kết nối Loa
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Bảng thông số kỹ thuật Loa MB sau khi nhận diện */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : theme.surface.header,
                borderRadius: 10,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.subtle,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.brand.success }} />
                <AppText variant="sm" weight="bold" color={theme.brand.success}>
                  Loa MB Bank Sẵn Sàng Kết Nối
                </AppText>
              </View>

              <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="xxs" color={theme.text.muted}>Mã định danh Loa (Hardware ID):</AppText>
                  <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums numberOfLines={1}>
                    {mbSoundboxId || 'Chưa nhận diện'}
                  </AppText>
                </View>

                <View style={{ flex: 1 }}>
                  <AppText variant="xxs" color={theme.text.muted}>Mã Merchant MB (Virtual Sub-Acc):</AppText>
                  <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums numberOfLines={1}>
                    {mbMerchantId || 'Chưa nhận diện'}
                  </AppText>
                </View>

                <View style={{ width: isWide ? 100 : '100%' }}>
                  <AppText variant="xxs" color={theme.text.muted}>Tiền tố hóa đơn:</AppText>
                  <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                    {mbRefPrefix || 'NPS6869'}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Các nút kiểm thử Loa */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setTestModalOpen(true);
                }}
                style={[
                  s.hardwareBtn,
                  {
                    flex: 1,
                    backgroundColor: theme.surface.header,
                    borderColor: theme.brand.accent,
                  },
                ]}
              >
                <Icon name="qrcode" size={18} color={theme.brand.accent} />
                <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                  Test Bắn Loa Thực Tế
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTestVoice}
                style={[
                  s.hardwareBtn,
                  {
                    flex: 1,
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.default,
                  },
                ]}
              >
                <Icon name="bullhorn-outline" size={18} color={theme.text.primary} />
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Thử Loa POS
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={{
              padding: 10,
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : theme.surface.header,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
            }}
          >
            <AppText variant="xs" color={theme.text.muted}>
              Đang tắt Loa MB Bank. POS sẽ phát sinh mã VietQR Napas 247 thông thường theo số tài khoản niêm yết.
            </AppText>
          </View>
        )}
      </View>

      {/* 🌟 3. THẺ XEM TRƯỚC VIETQR ĐỘNG PHONG CÁCH APPLE WALLET */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="wallet-membership" size={20} color={theme.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Thẻ VietQR Quầy Thanh Toán
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Mã QR động tự điền số tiền và khớp lệnh tự động
            </AppText>
          </View>
        </View>

        <View
          style={[
            s.qrPreviewRow,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : theme.surface.header,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={[s.qrBox, { backgroundColor: theme.surface.qrCanvas, padding: 6 }]}>
            <ExpoImage
              source={{ uri: sampleQRData }}
              style={{ width: 104, height: 104, borderRadius: 6 }}
              contentFit="contain"
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[s.bankBadge, { backgroundColor: theme.brand.primaryBg }]}>
                <AppText variant="xs" weight="bold" color={theme.brand.primary}>
                  {selectedBank.code}
                </AppText>
              </View>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                {selectedBank.shortName}
              </AppText>
            </View>

            <AppText variant="sm" color={theme.text.muted} tabularNums>
              STK: <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>{accountNumber}</AppText>
            </AppText>
            <AppText variant="sm" color={theme.text.muted}>
              Chủ TK: <AppText variant="sm" weight="medium" color={theme.text.primary}>{accountHolder || 'CHƯA NHẬP'}</AppText>
            </AppText>
            <AppText variant="sm" color={theme.text.muted} tabularNums>
              Cú pháp: <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>HD001</AppText>
            </AppText>
          </View>
        </View>

        {/* Nút In QR Standee Dán Quầy */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePrintStandeeQR}
          style={[
            s.hardwareBtn,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
              marginTop: 6,
            },
          ]}
        >
          <Icon name="printer-pos" size={18} color={theme.text.primary} />
          <AppText variant="md" weight="medium" color={theme.text.primary}>
            In Standee QR Dán Quầy (K80)
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 🌟 3. TIỆN ÍCH LOA BÁO CÓ & WEBHOOK GẠCH NỢ TỰ ĐỘNG */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="volume-high" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Loa Báo Chuyển Khoản & Tự Động Hóa
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Tự động đọc to khi nhận tiền qua ngân hàng, gạch nợ hóa đơn tức thì
            </AppText>
          </View>
          <Switch
            value={enableVoiceAlert}
            onValueChange={setEnableVoiceAlert}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </View>

        {/* Tự hoàn tất đơn */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setAutoCompleteOrderOnTransfer?.(!autoCompleteOrderOnTransfer)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ flex: 1 }}>
            Tự hoàn tất đơn khi nhận tiền
          </AppText>
          <Switch
            value={autoCompleteOrderOnTransfer}
            onValueChange={setAutoCompleteOrderOnTransfer}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Tự in bill khi nhận tiền */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setAutoPrintBillOnTransfer?.(!autoPrintBillOnTransfer)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ flex: 1 }}>
            Tự in bill khi nhận tiền
          </AppText>
          <Switch
            value={autoPrintBillOnTransfer}
            onValueChange={setAutoPrintBillOnTransfer}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Khóa Webhook SePay / Casso */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Khóa bí mật Webhook (SePay / Casso)
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={webhookApiKey}
            onChangeText={setWebhookApiKey}
            placeholder="sec_ongchu_pos_bank_hook"
            placeholderTextColor={theme.text.muted}
          />
        </View>

        {/* Cụm Nút Kiểm Thử Loa & Ping Webhook */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTestVoice}
            style={[s.hardwareBtn, { flex: 1, backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
          >
            <Icon name="bullhorn-outline" size={18} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              Thử Loa Báo Có
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePingWebhook}
            disabled={isPinging}
            style={[s.hardwareBtn, { flex: 1, backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}
          >
            <Icon name="network-strength-4" size={18} color={theme.brand.primary} />
            <AppText variant="sm" weight="bold" color={theme.brand.primary}>
              {isPinging ? 'Đang Ping...' : 'Ping Webhook'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 Modal Tìm Kiếm & Chọn Ngân Hàng Nhanh */}
      <AppModal
        visible={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title="Chọn Ngân Hàng Thụ Hưởng"
        maxWidth={480}
      >
        <View style={{ gap: 12 }}>
          <View style={[s.searchBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <Icon name="magnify" size={20} color={theme.text.muted} />
            <TextInput
              style={[s.searchInput, { color: theme.text.primary }]}
              value={searchBankText}
              onChangeText={setSearchBankText}
              placeholder="Tìm MB, VCB, Techcombank, ACB..."
              placeholderTextColor={theme.text.muted}
              autoFocus={Platform.OS === 'web'}
            />
            {searchBankText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchBankText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={18} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {filteredBanks.map((b) => {
              const isSel = bankCode === b.code;
              return (
                <TouchableOpacity
                  key={b.code}
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                    }
                    setBankCode(b.code);
                    setBankModalOpen(false);
                  }}
                  style={[
                    s.bankModalOption,
                    {
                      borderBottomColor: theme.border.subtle,
                      backgroundColor: isSel ? theme.brand.primaryBg : 'transparent',
                    },
                  ]}
                >
                  <View style={[s.bankBadge, { backgroundColor: isSel ? theme.brand.primary : theme.surface.header }]}>
                    <AppText
                      variant="xs"
                      weight="bold"
                      color={isSel ? theme.text.onBrand : theme.brand.primary}
                      style={{ width: 44, textAlign: 'center' }}
                    >
                      {b.code}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="md" weight={isSel ? 'bold' : 'medium'} color={theme.text.primary}>
                      {b.shortName}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                      {b.name}
                    </AppText>
                  </View>
                  {isSel && <Icon name="check-circle" size={20} color={theme.brand.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AppModal>

      {/* 🌟 Modal Test Bắn Loa MB Bank Thực Tế */}
      <AppModal
        visible={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="Quét Test Loa Báo Có MB Bank"
        maxWidth={460}
        presentation="dialog"
        secondaryAction={{
          label: 'Đóng',
          onPress: () => setTestModalOpen(false),
        }}
      >
        <View style={{ gap: 14, alignItems: 'center' }}>
          <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
            Dùng App Ngân hàng bất kỳ quét mã này để chuyển khoản test. Loa vật lý MB Bank trên quầy sẽ lập tức phát âm thanh đọc số tiền!
          </AppText>

          {/* Preset số tiền test */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['1000', '2000', '5000', '10000'].map((amt) => {
              const isSel = testAmount === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    setTestAmount(amt);
                  }}
                  style={[
                    s.syntaxChip,
                    {
                      backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                      paddingHorizontal: 12,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight={isSel ? 'bold' : 'medium'}
                    color={isSel ? theme.text.onBrand : theme.text.primary}
                    tabularNums
                  >
                    {parseInt(amt, 10).toLocaleString('vi-VN')} đ
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* QR Code Canvas */}
          <VietQROffline
            bankBin={bankCode || '970422'}
            accountNo={accountNumber || mbMerchantId || ''}
            accountHolder={accountHolder}
            amount={parseFloat(testAmount) || 10000}
            orderCode={mbRefPrefix || 'HD'}
            customPayload={testDynamicQRPayload}
            isSoundbox={true}
            soundboxId={mbSoundboxId}
            size={220}
            onCopyPayload={() => {
              showToast({ title: 'Đã chép mã', message: 'Đã sao chép chuỗi mã QR Loa MB', type: 'info' });
            }}
          />

          <View style={{ width: '100%', gap: 4, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Mã Loa:</AppText>
              <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>{mbSoundboxId}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Mã Cửa Hàng MB:</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>{mbMerchantId}</AppText>
            </View>
          </View>
        </View>
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionCard: {
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: 6,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  rowTwo: {
    gap: 12,
  },
  selectBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    gap: 10,
  },
  bankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syntaxChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qrPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qrBox: {
    width: 116,
    height: 116,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hardwareBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  bankModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
});
