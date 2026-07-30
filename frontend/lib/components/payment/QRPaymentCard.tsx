/**
 * QR/Banking Payment Component
 * Tạo mã QR chuyển khoản thực tế qua VietQR / Napas
 * Dùng thư viện qrcode để sinh QR động.
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { colors, palette } from '../../theme/colors';
import { font } from '../../theme/typography';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { logger } from '../../logger';

// Bank info — cấu hình từ .env hoặc mặc định
const BANK_CONFIG = {
  // Mặc định: Techcombank. Có thể override qua EXPO_PUBLIC_BANK_* env
  bin: process.env.EXPO_PUBLIC_BANK_BIN || '970407',
  accountNo: process.env.EXPO_PUBLIC_BANK_ACCOUNT || '19036868568018',
  accountName: process.env.EXPO_PUBLIC_BANK_NAME || 'NGUYEN LOC THANH',
  template: 'compact',
};

interface QRPaymentCardProps {
  total: number;
  orderId?: string | null;
  note?: string;
}

/**
 * Build VietQR content string (Napas format)
 * https://vietqr.io/api/docs
 */
function buildVietQRContent(
  bin: string,
  accountNo: string,
  amount: number,
  additionalData?: string
): string {
  // Napas QR: 000201010211 + fields
  const fields: string[] = [];

  // Payload Format Indicator
  fields.push('000201');

  // Point of Initiation Method: 12 = static, 11 = dynamic
  fields.push('010211');

  // Merchant Account Information — VietQR
  const merchantInfo = [
    `00${String(BIN_GUID || 'A000000727')
      .length.toString()
      .padStart(2, '0')}${BIN_GUID || 'A000000727'}`,
    `01${String(bin).length.toString().padStart(2, '0')}${bin}`,
    `02${String(accountNo).length.toString().padStart(2, '0')}${accountNo}`,
  ].join('');

  fields.push(`29${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`);

  // Merchant Category Code
  fields.push('52040000');

  // Transaction Currency — VND (704)
  fields.push('5303704');

  // Country Code — Vietnam (VN)
  fields.push('5802VN');

  // Transaction Amount
  const amountStr = String(amount);
  fields.push(`54${amountStr.length.toString().padStart(2, '0')}${amountStr}`);

  // Additional Data (chứa nội dung chuyển khoản)
  if (additionalData) {
    fields.push(`62${additionalData.length.toString().padStart(2, '0')}${additionalData}`);
  }

  // CRC (sẽ được tính sau)
  fields.push('6304');

  return fields.join('');
}

const BIN_GUID = 'A000000727';

/**
 * Tạo nội dung chuyển khoản: Thanh toan <orderId> <note>
 */
function buildTransferContent(orderId?: string | null, note?: string): string {
  const parts: string[] = [];
  if (orderId) parts.push(`HD${orderId.replace(/[^a-zA-Z0-9]/g, '')}`);
  if (note) parts.push(note.replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, ' ').trim());
  return parts.join(' ') || 'ThanhToan';
}

/**
 * Component hiển thị QR code + thông tin chuyển khoản
 * Dùng thư viện qrcode để render SVG hoặc base64
 */
export default function QRPaymentCard({ total, orderId, note }: QRPaymentCardProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [qrError, setQrError] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const genRef = React.useRef(false);

  const transferNote = useMemo(() => buildTransferContent(orderId, note), [orderId, note]);

  // Build full QR content
  const qrContent = useMemo(() => {
    try {
      const raw = buildVietQRContent(BANK_CONFIG.bin, BANK_CONFIG.accountNo, total, transferNote);
      return raw;
    } catch {
      return null;
    }
  }, [total, transferNote]);

  // Generate QR code via qrcode library
  React.useEffect(() => {
    if (genRef.current || !qrContent) return;
    genRef.current = true;

    let cancelled = false;

    const generate = async () => {
      try {
        const QRCode = require('qrcode');
        if (Platform.OS === 'web') {
          // Web: use toDataURL
          const dataUrl = await QRCode.toDataURL(qrContent, {
            width: 400,
            margin: 2,
            color: { dark: palette.slate[900], light: '#FFFFFF' },
          });
          if (!cancelled) setQrDataUrl(dataUrl);
        } else {
          // Native: try toCanvas or use fallback
          // Fallback to showing raw QR content
          setQrError(true);
        }
      } catch (err) {
        logger.warn('qr', 'QR generation failed:', err);
        if (!cancelled) setQrError(true);
      }
    };
    generate();

    return () => {
      cancelled = true;
    };
  }, [qrContent]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(text);
      }
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
    }
  };

  const accountDisplay = `${BANK_CONFIG.accountNo.replace(/(\d{4})(?=\d)/g, '$1 ')}`;

  return (
    <View
      style={{
        backgroundColor: '#FFFDF9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.default,
        padding: 16,
        gap: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#E11D2E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bank" size={18} color="#fff" />
        </View>
        <Text style={{ ...font.md, color: colors.text.primary }}>Chuyển khoản ngân hàng</Text>
      </View>

      {/* QR Code Area */}
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR thanh toán"
            style={{ width: 200, height: 200, borderRadius: 8 }}
          />
        ) : qrError ? (
          <View
            style={{
              width: 200,
              height: 200,
              backgroundColor: colors.surface.card,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border.default,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="qrcode" size={40} color={colors.icon.muted} />
            <Text style={{ ...font.sm, color: colors.text.muted, textAlign: 'center' }}>
              QR unavailable{'\n'}Manual transfer
            </Text>
          </View>
        ) : (
          <ActivityIndicator size="large" color={colors.brand.primary} />
        )}
      </View>

      {/* Bank info */}
      <View style={{ backgroundColor: colors.surface.card, borderRadius: 8, padding: 12, gap: 8 }}>
        <Row label="Ngân hàng" value="Techcombank" />
        <Row
          label="Số tài khoản"
          value={accountDisplay}
          onCopy={() => copyToClipboard(BANK_CONFIG.accountNo, 'account')}
          copied={copied === 'account'}
        />
        <Row
          label="Chủ tài khoản"
          value={BANK_CONFIG.accountName}
          onCopy={() => copyToClipboard(BANK_CONFIG.accountName, 'name')}
          copied={copied === 'name'}
        />
        <Row label="Số tiền" value={total.toLocaleString('vi-VN') + ' đ'} bold />
        <Row
          label="Nội dung CK"
          value={transferNote}
          onCopy={() => copyToClipboard(transferNote, 'note')}
          copied={copied === 'note'}
        />
      </View>

      <TouchableOpacity
        onPress={() => {
          // Open banking app via URL scheme if possible
          const deepLink = `https://qrviettb.com/transfer?acc=${BANK_CONFIG.accountNo}&bank=${BANK_CONFIG.bin}&amount=${total}&content=${encodeURIComponent(transferNote)}`;
          if (Platform.OS === 'web') {
            window.open(deepLink, '_blank');
          }
        }}
        style={{
          backgroundColor: '#E11D2E',
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ ...font.mdBold, color: '#fff', fontWeight: '600' }}>Mở app ngân hàng</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
  bold,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ ...font.sm, color: colors.text.muted, flex: 0.4 }}>{label}</Text>
      <Text
        style={{
          ...(bold ? font.mdBold : font.md),
          color: colors.text.primary,
          flex: 0.6,
          textAlign: 'right',
        }}
        numberOfLines={1}
        selectable
      >
        {value}
      </Text>
      {onCopy && (
        <TouchableOpacity onPress={onCopy} style={{ marginLeft: 8, padding: 2 }}>
          <Icon
            name={copied ? 'check' : 'content-copy'}
            size={16}
            color={copied ? colors.status.success : colors.icon.muted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
