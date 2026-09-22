import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';
import { useStoreSettings } from '../../../lib/store/usePOSStore';
import { VietQROffline } from '../../../lib/components/pos/VietQROffline';
import { playTapSound } from '../../../lib/utils/sound';
import { generateMBSoundboxDynamicQR } from '../../../lib/utils/vietqrParser';

interface VietQRPaymentPaneProps {
  qrImageUrl: string;
  qrError: boolean;
  onSetQrError: (err: boolean) => void;
  onOpenZoom: () => void;
  tableName: string;
  expandBankDetails: boolean;
  onToggleBankDetails: () => void;
  onCopyText: (text: string, label: string) => void;
  isWide: boolean;
  amount?: number;
}

export const VietQRPaymentPane: React.FC<VietQRPaymentPaneProps> = ({
  qrImageUrl,
  qrError,
  onSetQrError,
  onOpenZoom,
  tableName,
  expandBankDetails,
  onToggleBankDetails,
  onCopyText,
  isWide,
  amount = 0,
}) => {
  const { theme, isDark } = useTheme();
  const storeSettings = useStoreSettings();

  const isSoundboxActive = Boolean(
    storeSettings.mbSoundboxEnabled && (storeSettings.mbMerchantId || storeSettings.mbSoundboxId)
  );
  const [userSelectedMode, setUserSelectedMode] = useState<'soundbox' | 'standard' | null>('standard');
  const [useOfflineMode, setUseOfflineMode] = useState(false);

  const useSoundboxMode = userSelectedMode === 'soundbox';

  const bankBin = storeSettings.bankCode || '970422';
  const bankName = storeSettings.bankName || 'Ngân Hàng';
  const accountNo = storeSettings.accountNumber || '';
  const accountHolder = storeSettings.accountHolder || storeSettings.storeName || '';

  const mbSoundboxPayload = useMemo(() => {
    if (!isSoundboxActive) return '';
    return generateMBSoundboxDynamicQR({
      merchantId: storeSettings.mbMerchantId,
      accountNo: accountNo,
      bankBin: bankBin,
      soundboxId: storeSettings.mbSoundboxId,
      refPrefix: storeSettings.mbRefPrefix || 'HD',
      amount,
      orderCode: tableName || 'Ban01',
      isDynamic: true,
    });
  }, [isSoundboxActive, storeSettings.mbMerchantId, accountNo, bankBin, storeSettings.mbSoundboxId, storeSettings.mbRefPrefix, amount, tableName]);

  const showSoundboxQR = isSoundboxActive && useSoundboxMode;
  const showOfflineQR = !showSoundboxQR && (qrError || useOfflineMode);

  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 2 }}>
      {/* Mode toggle pills */}
      {isSoundboxActive ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Chọn mã QR Loa MB Bank"
            onPress={() => {
              playTapSound();
              setUserSelectedMode('soundbox');
              setUseOfflineMode(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 14,
              backgroundColor: showSoundboxQR ? theme.status.warningBg : theme.surface.header,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: showSoundboxQR ? theme.brand.accent : theme.border.subtle,
            }}
          >
            <Icon
              name="speaker-wireless"
              size={13}
              color={showSoundboxQR ? theme.brand.accent : theme.text.muted}
            />
            <AppText
              variant="xs"
              weight={showSoundboxQR ? 'bold' : 'normal'}
              color={showSoundboxQR ? theme.brand.accent : theme.text.muted}
            >
              Loa MB Bank
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Chọn mã QR tiêu chuẩn"
            onPress={() => {
              playTapSound();
              setUserSelectedMode('standard');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 14,
              backgroundColor: !showSoundboxQR ? theme.status.warningBg : theme.surface.header,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: !showSoundboxQR ? theme.brand.primary : theme.border.subtle,
            }}
          >
            <Icon
              name="qrcode-scan"
              size={13}
              color={!showSoundboxQR ? theme.brand.primary : theme.text.muted}
            />
            <AppText
              variant="xs"
              weight={!showSoundboxQR ? 'bold' : 'normal'}
              color={!showSoundboxQR ? theme.brand.primary : theme.text.muted}
            >
              QR Chuẩn
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={showOfflineQR ? 'Chuyển sang chế độ VietQR online' : 'Chuyển sang chế độ VietQR offline'}
          onPress={() => {
            playTapSound();
            setUseOfflineMode(!useOfflineMode);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 14,
            backgroundColor: showOfflineQR ? theme.status.warningBg : theme.surface.header,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: showOfflineQR ? theme.brand.warning : theme.border.subtle,
          }}
        >
          <Icon
            name={showOfflineQR ? 'wifi-off' : 'wifi'}
            size={13}
            color={showOfflineQR ? theme.brand.warning : theme.brand.primary}
          />
          <AppText
            variant="xs"
            weight="medium"
            color={showOfflineQR ? theme.brand.warning : theme.text.primary}
          >
            {showOfflineQR ? 'Mã QR Ngoại tuyến' : 'Mã QR Trực tuyến'}
          </AppText>
        </TouchableOpacity>
      )}

      {showSoundboxQR ? (
        <VietQROffline
          bankBin={bankBin}
          accountNo={accountNo || storeSettings.mbMerchantId || ''}
          accountHolder={accountHolder}
          amount={amount}
          orderCode={storeSettings.mbRefPrefix || 'HD'}
          customPayload={mbSoundboxPayload}
          isSoundbox={true}
          soundboxId={storeSettings.mbSoundboxId}
          size={isWide ? 280 : 250}
          onCopyPayload={(p) => onCopyText(p, 'Đã sao chép mã QR Loa MB')}
        />
      ) : showOfflineQR ? (
        <VietQROffline
          bankBin={bankBin}
          accountNo={accountNo}
          accountHolder={accountHolder}
          amount={amount}
          orderCode={tableName || 'Ban01'}
          size={isWide ? 280 : 250}
          onCopyPayload={(p) => onCopyText(p, 'Đã sao chép mã VietQR')}
        />
      ) : (
        <View style={s.seamlessQrContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Chạm để phóng to mã VietQR"
            onPress={() => {
              playTapSound();
              onOpenZoom();
            }}
            style={[s.qrWrapper, { borderColor: theme.border.default, backgroundColor: theme.surface.qrCanvas, width: isWide ? 300 : 270, height: isWide ? 300 : 270 }]}
          >
            <ExpoImage
              source={{ uri: qrImageUrl }}
              style={s.qrImage}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
              onError={() => onSetQrError(true)}
            />
            <View style={[s.qrZoomOverlayBadge, { backgroundColor: 'rgba(28, 25, 23, 0.75)' }]}>
              <Icon name="magnify-plus-outline" size={12} color={theme.text.onBrand} />
              <AppText variant="xxs" weight="medium" color={theme.text.onBrand}>
                Chạm để phóng to
              </AppText>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {showSoundboxQR && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.brand.success }} />
          <AppText variant="xxs" color={theme.text.muted}>
            Quét chuyển khoản, Loa MB tại quầy sẽ đọc to số tiền ngay tức thì
          </AppText>
        </View>
      )}

      {/* Bảng Thông Tin Ngân Hàng Tinh Gọn 1-Chạm (Zero-Scroll Compact Bank Card) */}
      <View style={[s.seamlessTransferBox, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon name="bank" size={16} color={theme.brand.accent} />
            <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
              {bankName}
            </AppText>
            <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums numberOfLines={1}>
              · {accountNo}
            </AppText>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sao chép số tài khoản"
            onPress={() => onCopyText(accountNo, 'Đã sao chép Số tài khoản')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[s.copyQuickBtn, { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent }]}
          >
            <Icon name="content-copy" size={13} color={theme.brand.accent} />
            <AppText variant="xs" weight="medium" color={theme.brand.accent}>
              Sao chép STK
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
            Chủ TK: <AppText variant="xs" weight="medium" color={theme.text.primary}>{accountHolder}</AppText>
          </AppText>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sao chép cú pháp chuyển khoản"
            onPress={() => onCopyText(`TT ${tableName || 'Ban01'}`, 'Đã sao chép Cú pháp chuyển khoản')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <AppText variant="xs" color={theme.text.muted}>Cú pháp:</AppText>
            <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
              TT {tableName || 'Ban01'}
            </AppText>
            <Icon name="content-copy" size={12} color={theme.brand.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  seamlessQrContainer: {
    alignItems: 'center',
    marginVertical: 2,
  },
  qrWrapper: {
    width: 240,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrZoomOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  seamlessTransferBox: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copyQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default VietQRPaymentPane;
