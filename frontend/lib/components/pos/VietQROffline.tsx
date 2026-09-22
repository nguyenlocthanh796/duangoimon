import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { playTapSound } from '../../utils/sound';
import { generateQRMatrix } from '../../utils/qrCodeGenerator';

export interface VietQROfflineProps {
  bankBin: string;
  accountNo: string;
  accountHolder?: string;
  amount: number;
  orderCode: string;
  size?: number;
  onCopyPayload?: (payload: string) => void;
  customPayload?: string;
  isSoundbox?: boolean;
  soundboxId?: string;
}

export function formatTLV(tag: string, value: string): string {
  const lenStr = value.length.toString().padStart(2, '0');
  return `${tag}${lenStr}${value}`;
}

export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generateVietQREMVCo(
  bankBin: string,
  accountNo: string,
  amount: number,
  orderCode: string
): string {
  // Tag 38 Napas 247 Account Info
  const napasGUID = formatTLV('00', 'A000000727');
  const binTLV = formatTLV('00', bankBin.trim());
  const accTLV = formatTLV('01', accountNo.trim());
  const beneficiary = formatTLV('01', binTLV + accTLV);
  const serviceCode = formatTLV('02', 'QRIBFTTA');
  const tag38Value = napasGUID + beneficiary + serviceCode;
  const tag38 = formatTLV('38', tag38Value);

  let payload = formatTLV('00', '01') + formatTLV('01', '12');
  payload += tag38;
  payload += formatTLV('53', '704');
  if (amount > 0) {
    payload += formatTLV('54', Math.round(amount).toString());
  }
  payload += formatTLV('58', 'VN');

  if (orderCode) {
    const infoClean = orderCode.trim();
    const tag62Value = formatTLV('08', `TT ${infoClean}`);
    payload += formatTLV('62', tag62Value);
  }

  const payloadForCRC = payload + '6304';
  const crc = calculateCRC16(payloadForCRC);
  return payloadForCRC + crc;
}

export const VietQROffline: React.FC<VietQROfflineProps> = ({
  bankBin,
  accountNo,
  accountHolder,
  amount,
  orderCode,
  size = 220,
  onCopyPayload,
  customPayload,
  isSoundbox = false,
  soundboxId,
}) => {
  const { theme } = useTheme();

  // 1. Generate EMVCo payload (dùng customPayload nếu có)
  const emvcoPayload = useMemo(() => {
    if (customPayload) return customPayload;
    return generateVietQREMVCo(bankBin, accountNo, amount, orderCode);
  }, [customPayload, bankBin, accountNo, amount, orderCode]);

  // 2. Generate matrix
  const matrix = useMemo(() => {
    try {
      return generateQRMatrix(emvcoPayload);
    } catch {
      return [];
    }
  }, [emvcoPayload]);

  // 3. Build SVG Path data for 60 FPS ultra-fast rendering
  const svgPathData = useMemo(() => {
    if (!matrix || matrix.length === 0) return '';
    let path = '';
    const matrixSize = matrix.length;
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c]) {
          path += `M${c},${r}h1v1h-1z `;
        }
      }
    }
    return path;
  }, [matrix]);

  const matrixDimension = matrix.length || 41;

  const handleCopy = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    if (onCopyPayload) {
      onCopyPayload(emvcoPayload);
    }
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: theme.surface.qrCanvas, // High contrast white for QR scanning
          borderColor: theme.border.default,
        },
      ]}
    >
      {/* Badge Header: VietQR + Offline hoặc Loa MB Bank */}
      <View style={s.badgeRow}>
        <View style={s.napasPill}>
          <AppText variant="xs" weight="bold" color={theme.brand.cyan}>
            VietQR
          </AppText>
        </View>
        <View
          style={[
            s.offlinePill,
            isSoundbox && { backgroundColor: theme.status.warningBg },
          ]}
        >
          <Icon
            name={isSoundbox ? 'speaker-wireless' : 'wifi-off'}
            size={12}
            color={isSoundbox ? theme.brand.accent : theme.brand.warning}
          />
          <AppText
            variant="xs"
            weight="bold"
            color={isSoundbox ? theme.brand.accent : theme.brand.warning}
          >
            {isSoundbox ? 'Loa MB Bank' : 'Offline'}
          </AppText>
        </View>
      </View>

      {/* SVG QR Code */}
      <View style={s.qrWrapper}>
        {svgPathData ? (
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${matrixDimension} ${matrixDimension}`}
          >
            <Rect x={0} y={0} width={matrixDimension} height={matrixDimension} fill={theme.surface.qrCanvas} />
            <Path d={svgPathData} fill="black" />
          </Svg>
        ) : (
          <View style={[s.fallbackBox, { width: size, height: size }]}>
            <Icon name="qrcode" size={48} color={theme.text.muted} />
            <AppText variant="xs" color={theme.text.muted}>
              Đang tạo mã QR...
            </AppText>
          </View>
        )}
      </View>

      {/* Account Info Details */}
      <View style={s.infoBox}>
        <View style={s.infoRow}>
          <AppText variant="xs" color={theme.text.muted}>
            STK:
          </AppText>
          <AppText variant="sm" weight="medium" tabularNums color={theme.text.primary}>
            {accountNo}
          </AppText>
        </View>
        {accountHolder ? (
          <View style={s.infoRow}>
            <AppText variant="xs" color={theme.text.muted}>
              Chủ TK:
            </AppText>
            <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
              {accountHolder.toUpperCase()}
            </AppText>
          </View>
        ) : null}
        <View style={s.infoRow}>
          <AppText variant="xs" color={theme.text.muted}>
            Số tiền:
          </AppText>
          <AppText variant="sm" weight="bold" tabularNums color={theme.brand.accent}>
            {amount > 0 ? `${amount.toLocaleString('vi-VN')} đ` : 'Tự nhập khi quét'}
          </AppText>
        </View>
        {soundboxId ? (
          <View style={s.infoRow}>
            <AppText variant="xs" color={theme.text.muted}>
              Mã Loa:
            </AppText>
            <AppText variant="xs" weight="bold" tabularNums color={theme.brand.accent} numberOfLines={1}>
              {soundboxId}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Copy Action Button */}
      {onCopyPayload && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Sao chép chuỗi mã VietQR"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          onPress={handleCopy}
          style={[s.copyBtn, { backgroundColor: theme.surface.header }]}
        >
          <Icon name="content-copy" size={14} color={theme.brand.accent} />
          <AppText variant="xs" weight="medium" color={theme.brand.accent}>
            Sao Chép
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    alignItems: 'center',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  napasPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  qrWrapper: {
    padding: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  infoBox: {
    width: '100%',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
});
