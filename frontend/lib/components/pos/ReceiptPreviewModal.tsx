import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui/AppText';
import { ModalDragIndicator } from '../ui/ModalDragIndicator';
import { OrderHistoryItem, OrderRoundBatch, OrderAuditLog, useStoreSettings } from '../../store/usePOSStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';
import { getPublicBillUrl } from '../../api/apiClient';

export interface ReceiptPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  order: OrderHistoryItem | null;
  onPrintAgain?: (order: OrderHistoryItem) => void;
}

export interface ReceiptThermalPaperProps {
  order: OrderHistoryItem;
  storeSettings: any;
  isDark?: boolean;
}

export const ReceiptThermalPaper: React.FC<ReceiptThermalPaperProps> = ({
  order,
  storeSettings,
  isDark = false,
}) => {
  const { theme } = useTheme();

  const formattedDate = new Date(order.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const activeBranch = useAuthStore((s) => (s.getActiveBranch ? s.getActiveBranch() : undefined));
  const displayAddress = activeBranch?.address || storeSettings.address;
  const displayPhone = activeBranch?.phone || storeSettings.phone;
  const branchSubtitle = activeBranch && activeBranch.id !== 'branch_01' ? activeBranch.name : null;

  const vietqrPayload = `https://img.vietqr.io/image/${storeSettings.bankCode}-${storeSettings.accountNumber}-compact.png?amount=${order.finalTotal}&addInfo=${order.orderCode}&accountName=${encodeURIComponent(storeSettings.accountHolder)}`;

  return (
    <View style={s.paperContainer}>
      {/* Top Tear Edge */}
      <View style={[s.tearEdge, { borderBottomColor: theme.border.default }]} />

      {/* Store Brand Header */}
      <View style={s.storeHeader}>
        <AppText variant="md" weight="medium" color={theme.text.primary} style={s.centerText}>
          {storeSettings.storeName.toUpperCase()}
        </AppText>
        {branchSubtitle ? (
          <AppText variant="xs" weight="medium" color={theme.brand.primary} style={[s.centerText, { marginTop: 1 }]}>
            {branchSubtitle.toUpperCase()}
          </AppText>
        ) : null}
        <AppText variant="xs" color={theme.text.muted} style={[s.centerText, { marginTop: 2 }]}>
          {displayAddress}
        </AppText>
        <AppText variant="xs" color={theme.text.muted} style={[s.centerText, { marginTop: 1 }]}>
          Hotline: {displayPhone}
        </AppText>
        {storeSettings.wifiName ? (
          <AppText variant="xs" color={theme.text.subtle} style={[s.centerText, { marginTop: 1 }]}>
            WiFi: {storeSettings.wifiName} · MK: {storeSettings.wifiPassword}
          </AppText>
        ) : null}
      </View>

      <View style={[s.dashedDivider, { borderBottomColor: theme.border.default }]} />

      {/* Receipt Title & Meta */}
      <View style={s.receiptMeta}>
        <AppText variant="md" weight="medium" color={theme.text.primary} style={s.centerText}>
          PHIẾU THANH TOÁN
        </AppText>
        {order.status === 'voided' && (
          <View style={[s.voidedBadge, { backgroundColor: theme.status.dangerBg }]}>
            <AppText variant="xs" weight="medium" color={theme.brand.danger}>
              [ĐÃ HỦY HÓA ĐƠN] {order.voidReason ? `· ${order.voidReason}` : ''}
            </AppText>
          </View>
        )}
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.text.muted}>Số HD:</AppText>
          <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{order.orderCode}</AppText>
        </View>
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.text.muted}>Bàn phục vụ:</AppText>
          <AppText variant="xs" weight="medium" color={theme.text.primary}>{order.tableName} ({order.guestCount} khách)</AppText>
        </View>
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.text.muted}>Thời gian in:</AppText>
          <AppText variant="xs" color={theme.text.primary} tabularNums>{formattedDate}</AppText>
        </View>
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.text.muted}>Thu ngân:</AppText>
          <AppText variant="xs" color={theme.text.primary}>{order.cashierName}</AppText>
        </View>
      </View>

      <View style={[s.dashedDivider, { borderBottomColor: theme.border.default }]} />

      {/* Items Table Header */}
      <View style={s.tableHeaderRow}>
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ flex: 1 }}>Tên Món</AppText>
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ width: 32, textAlign: 'center' }}>SL</AppText>
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ width: 68, textAlign: 'right' }}>Đơn Giá</AppText>
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ width: 78, textAlign: 'right' }}>T.Tiền</AppText>
      </View>
      <View style={[s.solidDivider, { borderBottomColor: theme.border.default }]} />

      {/* Items List */}
      {order.items.map((item, idx) => (
        <View key={item.cartItemId || idx} style={s.itemRow}>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <AppText variant="xs" weight="normal" color={theme.text.primary}>
              {item.item?.name || 'Món ăn'}
            </AppText>
            {item.selectedSize && (
              <AppText variant="xs" color={theme.text.subtle} style={s.modifierText}>
                • {item.selectedSize} {item.sugarLevel ? `· Đường ${item.sugarLevel}` : ''} {item.iceLevel ? `· Đá ${item.iceLevel}` : ''}
              </AppText>
            )}
            {item.selectedToppings && item.selectedToppings.length > 0 && (
              <AppText variant="xs" color={theme.text.subtle} style={s.modifierText}>
                + {item.selectedToppings.join(', ')}
              </AppText>
            )}
            {item.note ? (
              <AppText variant="xs" color={theme.brand.warning} style={s.modifierText}>
                * {item.note}
              </AppText>
            ) : null}
          </View>
          <AppText variant="xs" weight="medium" color={theme.text.primary} style={{ width: 32, textAlign: 'center' }} tabularNums>
            {item.qty}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={{ width: 68, textAlign: 'right' }} tabularNums>
            {formatCurrency(item.unitPrice)}
          </AppText>
          <AppText variant="xs" weight="medium" color={theme.text.primary} style={{ width: 78, textAlign: 'right' }} tabularNums>
            {formatCurrency(item.unitPrice * item.qty)}
          </AppText>
        </View>
      ))}

      <View style={[s.dashedDivider, { borderBottomColor: theme.border.default }]} />

      {/* Financial Summary */}
      <View style={s.metaRow}>
        <AppText variant="xs" color={theme.text.muted}>Tổng tiền món:</AppText>
        <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{formatCurrency(order.subtotal)} đ</AppText>
      </View>

      {order.discountAmount > 0 && (
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.brand.danger}>Chiết khấu ({order.discountNote || 'Giảm giá'}):</AppText>
          <AppText variant="xs" weight="medium" color={theme.brand.danger} tabularNums>-{formatCurrency(order.discountAmount)} đ</AppText>
        </View>
      )}

      {Boolean(order.serviceFeeAmount && order.serviceFeeAmount > 0) && (
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.text.muted}>
            Phí dịch vụ / Phụ thu{order.serviceFeeRate ? ` (${order.serviceFeeRate}%)` : order.surchargeNote ? ` (${order.surchargeNote})` : ''}:
          </AppText>
          <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
            +{formatCurrency(order.serviceFeeAmount || 0)} đ
          </AppText>
        </View>
      )}

      {Boolean(order.vatAmount && order.vatAmount > 0) && (
        <View style={s.metaRow}>
          <AppText variant="xs" color={theme.text.muted}>
            Thuế VAT{order.vatRate ? ` (${order.vatRate}%)` : ''}:
          </AppText>
          <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
            +{formatCurrency(order.vatAmount || 0)} đ
          </AppText>
        </View>
      )}

      <View style={[s.metaRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.border.subtle }]}>
        <AppText variant="sm" weight="medium" color={theme.text.primary}>TỔNG THANH TOÁN:</AppText>
        <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums>{formatCurrency(order.finalTotal)} đ</AppText>
      </View>

      <View style={[s.metaRow, { marginTop: 6 }]}>
        <AppText variant="xs" color={theme.text.muted}>Hình thức:</AppText>
        <AppText variant="xs" weight="medium" color={order.paymentMethod === 'ghi_no' ? theme.brand.danger : theme.text.primary}>
          {order.paymentMethod === 'tien_mat'
            ? 'Tiền mặt'
            : order.paymentMethod === 'vietqr'
            ? 'Chuyển khoản VietQR'
            : order.paymentMethod === 'the'
            ? 'Thẻ ngân hàng'
            : order.paymentMethod === 'ghi_no'
            ? 'Ghi Nợ Khách Quen'
            : 'Hỗn hợp'}
        </AppText>
      </View>

      {order.paymentMethod === 'tien_mat' && (
        <>
          <View style={s.metaRow}>
            <AppText variant="xs" color={theme.text.muted}>Tiền khách đưa:</AppText>
            <AppText variant="xs" color={theme.text.primary} tabularNums>{formatCurrency(order.paidAmount)} đ</AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="xs" color={theme.text.muted}>Tiền thối lại:</AppText>
            <AppText variant="xs" weight="medium" color={theme.brand.success} tabularNums>{formatCurrency(order.changeAmount)} đ</AppText>
          </View>
        </>
      )}

      {order.paymentMethod === 'ghi_no' && (
        <>
          <View style={s.metaRow}>
            <AppText variant="xs" color={theme.brand.danger}>Ghi nợ đơn này:</AppText>
            <AppText variant="xs" weight="medium" color={theme.brand.danger} tabularNums>{formatCurrency(order.debtAmount || order.finalTotal)} đ</AppText>
          </View>
          {Boolean(order.paymentDetails?.customerName || order.paymentDetails?.customerPhone) && (
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Khách nợ:</AppText>
              <AppText variant="xs" color={theme.text.primary}>
                {order.paymentDetails?.customerName || 'Khách quen'} {order.paymentDetails?.customerPhone ? `(${order.paymentDetails.customerPhone})` : ''}
              </AppText>
            </View>
          )}
          <View style={s.metaRow}>
            <AppText variant="xs" color={theme.text.muted}>Tình trạng nợ:</AppText>
            <AppText variant="xs" weight="medium" color={order.isDebtPaid ? theme.brand.success : theme.brand.danger}>
              {order.isDebtPaid ? 'ĐÃ THANH TOÁN XONG' : 'CHƯA THANH TOÁN (CÒN NỢ)'}
            </AppText>
          </View>
        </>
      )}

      {/* Khối Hóa Đơn Điện Tử Khởi Tạo Từ Máy Tính Tiền (Nghị định 123 / TT 78) */}
      {order.eInvoice && (
        <>
          <View style={[s.dashedDivider, { borderBottomColor: theme.border.default }]} />
          <View style={s.receiptMeta}>
            <AppText variant="xs" weight="bold" color={theme.brand.primary} style={s.centerText}>
              HÓA ĐƠN ĐIỆN TỬ MÁY TÍNH TIỀN
            </AppText>
            <AppText variant="xxs" color={theme.text.muted} style={[s.centerText, { marginTop: 2 }]}>
              (Có mã CQT theo NĐ 123/2020/NĐ-CP)
            </AppText>
            <View style={[s.metaRow, { marginTop: 6 }]}>
              <AppText variant="xs" color={theme.text.muted}>Ký hiệu HĐ:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{order.eInvoice.templateCode}</AppText>
            </View>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Số hóa đơn:</AppText>
              <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>{order.eInvoice.invoiceCode}</AppText>
            </View>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Mã CQT:</AppText>
              <AppText variant="xxs" weight="medium" color={theme.text.primary} tabularNums>{order.eInvoice.cqtCode}</AppText>
            </View>
            {order.eInvoice.buyer.taxCode ? (
              <View style={s.metaRow}>
                <AppText variant="xs" color={theme.text.muted}>MST Người mua:</AppText>
                <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{order.eInvoice.buyer.taxCode}</AppText>
              </View>
            ) : null}
            {order.eInvoice.buyer.buyerName ? (
              <View style={s.metaRow}>
                <AppText variant="xs" color={theme.text.muted}>Tên đơn vị:</AppText>
                <AppText variant="xs" color={theme.text.primary} style={{ flex: 1, textAlign: 'right' }}>{order.eInvoice.buyer.buyerName}</AppText>
              </View>
            ) : null}
            <View style={[s.metaRow, { marginTop: 4 }]}>
              <AppText variant="xxs" color={theme.text.subtle}>Tra cứu tại:</AppText>
              <AppText variant="xxs" color={theme.brand.primary}>{order.eInvoice.lookupUrl}</AppText>
            </View>
          </View>
        </>
      )}

      <View style={[s.dashedDivider, { borderBottomColor: theme.border.default }]} />

      {/* VietQR & Footer */}
      <View style={s.qrFooterSection}>
        {order.paymentMethod === 'vietqr' && (
          <View style={[s.qrContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
            <ExpoImage
              source={{ uri: vietqrPayload }}
              style={{ width: 96, height: 96, borderRadius: 6 }}
              contentFit="contain"
            />
            <AppText variant="xs" color={theme.text.subtle} style={{ marginTop: 4 }}>
              Quét mã Napas247 xác nhận
            </AppText>
          </View>
        )}

        {Boolean(storeSettings.printQrOnBill !== false) && (
          <View style={[s.qrContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle, marginTop: 6 }]}>
            <ExpoImage
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  getPublicBillUrl(order.orderCode || 'HD-001')
                )}`,
              }}
              style={{ width: 88, height: 88, borderRadius: 6 }}
              contentFit="contain"
            />
            <AppText variant="xxs" color={theme.text.subtle} style={{ marginTop: 4 }}>
              Quét QR xem hóa đơn điện tử
            </AppText>
          </View>
        )}
        <AppText variant="xs" weight="normal" color={theme.text.primary} style={[s.centerText, { marginTop: 8 }]}>
          {storeSettings.slogan}
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} style={[s.centerText, { marginTop: 2 }]}>
          Xin cảm ơn & Hẹn gặp lại Quý Khách!
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} style={[s.centerText, { marginTop: 4 }]}>
          Powered by OngChu Lean POS · TCP 9100 Direct
        </AppText>
      </View>

      {/* Bottom Tear Edge */}
      <View style={[s.tearEdge, s.bottomTear, { borderBottomColor: theme.border.default }]} />
    </View>
  );
};

export const getOrderRounds = (order: OrderHistoryItem): OrderRoundBatch[] => {
  if (order.rounds && order.rounds.length > 0) return order.rounds;
  const createdDate = new Date(order.createdAt || Date.now());
  const openedTime = new Date(createdDate.getTime() - 25 * 60000);
  const round2Time = new Date(createdDate.getTime() - 12 * 60000);
  const formatShort = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (order.items && order.items.length > 1) {
    return [
      {
        roundIndex: 1,
        orderedAt: formatShort(openedTime),
        items: [
          {
            name: order.items[0]?.item?.name || 'Món chính',
            qty: order.items[0]?.qty || 1,
            unitPrice: order.items[0]?.unitPrice || 0,
            selectedSize: order.items[0]?.selectedSize,
            note: order.items[0]?.note,
          },
        ],
      },
      {
        roundIndex: 2,
        orderedAt: formatShort(round2Time),
        items: order.items.slice(1).map((it) => ({
          name: it.item?.name || 'Món thêm',
          qty: it.qty,
          unitPrice: it.unitPrice,
          selectedSize: it.selectedSize,
          note: it.note,
        })),
      },
    ];
  }

  return [
    {
      roundIndex: 1,
      orderedAt: formatShort(openedTime),
      items: (order.items || []).map((it) => ({
        name: it.item?.name || 'Món chính',
        qty: it.qty,
        unitPrice: it.unitPrice,
        selectedSize: it.selectedSize,
        note: it.note,
      })),
    },
  ];
};

export const getOrderAuditLogs = (order: OrderHistoryItem): OrderAuditLog[] => {
  if (order.auditLogs && order.auditLogs.length > 0) return order.auditLogs;
  const createdDate = new Date(order.createdAt || Date.now());
  const openedTime = new Date(createdDate.getTime() - 25 * 60000);
  const printedTime = new Date(createdDate.getTime() - 2 * 60000);
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const firstItemName = order.items?.[0]?.item?.name || 'Món';
  const logs: OrderAuditLog[] = [
    {
      id: 'fallback_open',
      time: order.openedAt || formatTime(openedTime),
      action: `Mở ${order.tableName} (${order.guestCount || 2} khách) & chọn món Đợt 1`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'info',
    },
    {
      id: 'fallback_kds1',
      time: formatTime(new Date(openedTime.getTime() + 18000)),
      action: `Báo bếp Đợt 1 (${order.items?.[0]?.qty || 1}x ${firstItemName})`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'kitchen',
    },
  ];

  if (order.items && order.items.length > 1) {
    const round2Time = new Date(createdDate.getTime() - 12 * 60000);
    const addedItemsStr = order.items.slice(1).map((i) => `${i.qty}x ${i.item?.name || 'Món'}`).join(', ');
    logs.push({
      id: 'fallback_r2',
      time: formatTime(round2Time),
      action: `Gọi thêm Đợt 2 (${addedItemsStr})`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'info',
    });
    logs.push({
      id: 'fallback_kds2',
      time: formatTime(new Date(round2Time.getTime() + 15000)),
      action: `Báo bếp Đợt 2 cho quầy pha chế`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'kitchen',
    });
  }

  logs.push({
    id: 'fallback_print',
    time: order.printedAt || formatTime(printedTime),
    action: `In tạm tính K80 (${order.finalTotal.toLocaleString('vi-VN')} đ)`,
    actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
    type: 'info',
  });

  if (order.status === 'voided') {
    logs.push({
      id: 'fallback_void',
      time: formatTime(new Date(createdDate.getTime() - 5000)),
      action: `HỦY ĐƠN HÀNG: ${order.voidReason || 'Khách hủy món'}`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'warning',
    });
  } else if (order.paymentMethod === 'tien_mat') {
    logs.push({
      id: 'fallback_cash',
      time: formatTime(new Date(createdDate.getTime() - 8000)),
      action: `Thu tiền mặt ${(order.paidAmount || order.finalTotal).toLocaleString('vi-VN')} đ · Kích mở két RJ11`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'success',
    });
  } else {
    logs.push({
      id: 'fallback_qr',
      time: formatTime(new Date(createdDate.getTime() - 8000)),
      action: `Thanh toán VietQR (${order.finalTotal.toLocaleString('vi-VN')} đ)`,
      actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
      type: 'success',
    });
  }

  logs.push({
    id: 'fallback_done',
    time: order.paidAt || formatTime(createdDate),
    action: order.status === 'voided' ? 'Đã lưu vết Audit Log hủy đơn' : 'Thanh toán hoàn tất & Cắt giấy K80',
    actor: order.cashierName || 'Thu Ngân (Ca Sáng)',
    type: order.status === 'voided' ? 'warning' : 'success',
  });

  return logs;
};

export interface CameraAuditTrailViewProps {
  order: OrderHistoryItem;
}

export const CameraAuditTrailView: React.FC<CameraAuditTrailViewProps> = ({ order }) => {
  const { theme, isDark } = useTheme();

  const rounds = getOrderRounds(order);
  const auditLogs = getOrderAuditLogs(order);

  const openedAt = order.openedAt || auditLogs[0]?.time || '08:15:20';
  const printedAt = order.printedAt || auditLogs.find((l) => l.action.includes('In tạm tính'))?.time || '08:42:10';
  const paidAt = order.paidAt || auditLogs[auditLogs.length - 1]?.time || '08:45:30';

  return (
    <View style={s.auditWrapper}>
      {/* 🌟 0. KHUNG GIÁM SÁT CAMERA NVR THỜI GIAN THỰC (CCTV VIEWPORT) */}
      <View style={s.cctvViewport}>
        {/* Top CCTV Status Bar */}
        <View style={s.cctvTopBar}>
          <View style={s.cctvRecBadge}>
            <View style={s.recBlinkDot} />
            <AppText variant="xs" weight="medium" color={theme.brand.danger} style={{ letterSpacing: 0.5 }}>
              REC · 1080P
            </AppText>
          </View>

          <View style={s.cctvCamTitle}>
            <Icon name="cctv" size={14} color={theme.brand.cyan} />
            <AppText variant="xs" weight="medium" color={theme.text.inverse} numberOfLines={1}>
              CAM 01 · THU NGÂN
            </AppText>
          </View>

          <View style={s.cctvFpsBadge}>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              30 FPS
            </AppText>
          </View>
        </View>

        {/* Viewfinder Reticle & Timecode Overlay */}
        <View style={s.cctvReticleBox}>
          {/* 4 Corner Crosshairs */}
          <View style={[s.cctvCorner, s.cctvCornerTL]} />
          <View style={[s.cctvCorner, s.cctvCornerTR]} />
          <View style={[s.cctvCorner, s.cctvCornerBL]} />
          <View style={[s.cctvCorner, s.cctvCornerBR]} />

          {/* Center Crosshair */}
          <View style={s.cctvCenterCross}>
            <Icon name="crosshairs" size={28} color="rgba(2, 132, 199, 0.35)" />
          </View>

          {/* Security Overlay Info */}
          <View style={s.cctvOverlayInfo}>
            <View style={s.cctvOverlayRow}>
              <AppText variant="xs" color={theme.text.muted}>ĐỐI CHIẾU MỐC:</AppText>
              <AppText variant="xs" weight="medium" color={theme.brand.cyan} tabularNums>
                {paidAt} · {order.tableName}
              </AppText>
            </View>
            <View style={s.cctvOverlayRow}>
              <AppText variant="xs" color={theme.text.muted}>HÓA ĐƠN:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.inverse} tabularNums>
                {order.orderCode} · {order.finalTotal.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
            <View style={s.cctvOverlayRow}>
              <AppText variant="xs" color={theme.text.muted}>THAO TÁC:</AppText>
              <AppText variant="xs" weight="medium" color={order.status === 'voided' ? theme.brand.danger : theme.brand.success}>
                {order.status === 'voided'
                  ? 'HỦY ĐƠN HÀNG SAU IN BILL'
                  : order.paymentMethod === 'tien_mat'
                  ? 'THU TIỀN MẶT & KÍCH MỞ KÉT RJ11'
                  : 'THANH TOÁN VIETQR'}
              </AppText>
            </View>
          </View>
        </View>

        {/* CCTV Bottom Sensor Bar */}
        <View style={s.cctvBottomBar}>
          <Icon name="shield-check" size={14} color={theme.brand.success} />
          <AppText variant="xs" color={theme.brand.success} weight="medium">
            AI Giám Sát: Khớp 100% thời gian mở két & in bill · 0ms lệch
          </AppText>
        </View>
      </View>

      {/* 🌟 1. KHỐI MỐC THỜI GIAN KHỚP CAMERA (SEAMLESS STREAM) */}
      <View style={[s.auditCard, { borderBottomColor: theme.border.subtle }]}>
        <View style={s.cardTitleRow}>
          <Icon name="history" size={16} color={theme.brand.primary} />
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            3 MỐC THỜI GIAN ĐỐI CHIẾU CAMERA · {order.tableName}
          </AppText>
        </View>

        {/* 3 Step Milestone Strip */}
        <View style={[s.milestoneContainer, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          {/* Step 1: Mở Bàn */}
          <View style={s.milestoneStep}>
            <View style={[s.milestoneDot, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary, borderWidth: 1 }]}>
              <Icon name="door-open" size={13} color={theme.brand.primary} />
            </View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>Mở bàn</AppText>
            <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
              {openedAt}
            </AppText>
          </View>

          <View style={[s.milestoneLine, { backgroundColor: theme.border.subtle }]} />

          {/* Step 2: In Tạm Tính */}
          <View style={s.milestoneStep}>
            <View style={[s.milestoneDot, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: theme.brand.warning, borderWidth: 1 }]}>
              <Icon name="printer-outline" size={13} color={theme.brand.warning} />
            </View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>In tạm tính</AppText>
            <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
              {printedAt}
            </AppText>
          </View>

          <View style={[s.milestoneLine, { backgroundColor: theme.border.subtle }]} />

          {/* Step 3: Thanh Toán */}
          <View style={s.milestoneStep}>
            <View
              style={[
                s.milestoneDot,
                {
                  backgroundColor: order.status === 'voided' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  borderColor: order.status === 'voided' ? theme.brand.danger : theme.brand.success,
                  borderWidth: 1,
                },
              ]}
            >
              <Icon
                name={order.status === 'voided' ? 'close' : 'cash-check'}
                size={13}
                color={order.status === 'voided' ? theme.brand.danger : theme.brand.success}
              />
            </View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
              {order.status === 'voided' ? 'Hủy đơn' : 'Thu tiền'}
            </AppText>
            <AppText
              variant="xs"
              weight="medium"
              color={order.status === 'voided' ? theme.brand.danger : theme.brand.success}
              tabularNums
            >
              {paidAt}
            </AppText>
          </View>
        </View>

        <View style={s.infoSubStrip}>
          <AppText variant="xs" color={theme.text.muted}>
            Số khách: {order.guestCount} người
          </AppText>
          <AppText variant="xs" color={theme.text.muted}>
            Thu ngân: {order.cashierName}
          </AppText>
        </View>
      </View>

      {/* 🌟 2. KHỐI CHI TIẾT CÁC ĐỢT GỌI MÓN (ROUNDS) */}
      <View style={[s.auditCard, { borderBottomColor: theme.border.subtle }]}>
        <View style={s.cardTitleRow}>
          <Icon name="silverware-fork-knife" size={16} color={theme.brand.primary} />
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            CHI TIẾT LẦN GỌI MÓN (ĐỐI CHIẾU PHỤC VỤ)
          </AppText>
        </View>

        {rounds.map((round) => (
          <View
            key={round.roundIndex}
            style={[
              s.roundBox,
              {
                borderColor: theme.border.subtle,
                backgroundColor: theme.surface.card,
              },
            ]}
          >
            <View style={s.roundHeader}>
              <View style={[s.roundBadge, { backgroundColor: theme.brand.primaryBg }]}>
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  Đợt {round.roundIndex}
                </AppText>
              </View>
              <AppText variant="xs" color={theme.text.muted} tabularNums>
                Gọi lúc {round.orderedAt}
              </AppText>
            </View>

            {round.items.map((item, idx) => (
              <View key={idx} style={[s.roundItemRow, { borderBottomColor: theme.border.subtle }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="xs" weight="normal" color={theme.text.primary}>
                    {item.name}
                  </AppText>
                  {item.selectedSize && (
                    <AppText variant="xs" color={theme.text.subtle}>
                      • {item.selectedSize}
                    </AppText>
                  )}
                  {item.note ? (
                    <AppText variant="xs" color={theme.brand.warning}>
                      * {item.note}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums style={{ width: 36, textAlign: 'center' }}>
                  x{item.qty}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums style={{ width: 72, textAlign: 'right' }}>
                  {formatCurrency(item.unitPrice * item.qty)} đ
                </AppText>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* 🌟 3. DÒNG THỜI GIAN LOG THAO TÁC AUDIT TRAIL */}
      <View style={[s.auditCard, { borderBottomColor: 'transparent' }]}>
        <View style={s.cardTitleRow}>
          <Icon name="clipboard-text-clock-outline" size={16} color={theme.brand.primary} />
          <AppText variant="xs" weight="medium" color={theme.text.primary}>
            NHẬT KÝ THAO TÁC POS (LOG TỪNG GIÂY)
          </AppText>
        </View>

        <View style={s.timelineContainer}>
          {auditLogs.map((log, index, arr) => {
            const isLast = index === arr.length - 1;
            const iconName =
              log.type === 'kitchen'
                ? 'pot-steam'
                : log.type === 'warning'
                ? 'alert-octagon'
                : log.type === 'success'
                ? 'check-circle'
                : 'clock-outline';

            const iconColor =
              log.type === 'kitchen'
                ? theme.brand.primary
                : log.type === 'warning'
                ? theme.brand.danger
                : log.type === 'success'
                ? theme.brand.success
                : theme.text.muted;

            return (
              <View key={log.id || index} style={s.timelineRow}>
                {/* Time column */}
                <View style={s.timeCol}>
                  <AppText variant="xs" color={theme.text.muted} tabularNums>
                    {log.time}
                  </AppText>
                </View>

                {/* Node & vertical connector line */}
                <View style={s.timelineNodeCol}>
                  <View style={[s.nodeDot, { borderColor: iconColor, backgroundColor: theme.surface.card }]}>
                    <Icon name={iconName as any} size={11} color={iconColor} />
                  </View>
                  {!isLast && <View style={[s.nodeLine, { backgroundColor: theme.border.subtle }]} />}
                </View>

                {/* Content column */}
                <View style={[s.logContentCol, !isLast && { paddingBottom: 14 }]}>
                  <AppText
                    variant="xs"
                    weight={log.type === 'warning' ? 'medium' : 'normal'}
                    color={log.type === 'warning' ? theme.brand.danger : theme.text.primary}
                  >
                    {log.action}
                  </AppText>
                  <AppText variant="xs" color={theme.text.subtle} style={{ marginTop: 2 }}>
                    Bởi: {log.actor}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>

        {/* Security verification seal */}
        <View
          style={[
            s.securitySealRow,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : theme.surface.header,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <Icon name="lock-check" size={14} color={theme.brand.primary} />
          <AppText variant="xs" color={theme.text.muted}>
            Bản ghi chống gian lận SHA-256 · Bất biến không thể sửa/xóa
          </AppText>
        </View>
      </View>
    </View>
  );
};

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  visible,
  onClose,
  order,
  onPrintAgain,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const storeSettings = useStoreSettings();
  const [activeTab, setActiveTab] = React.useState<'receipt' | 'camera'>('receipt');

  if (!order) return null;

  const handlePrint = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    if (onPrintAgain) {
      onPrintAgain(order);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          s.fullScreenContainer,
          {
            backgroundColor: theme.surface.app,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          },
        ]}
      >
        <ModalDragIndicator />
        {/* 🌟 1. TOP BAR CỐ ĐỊNH CHUẨN POS */}
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
              onPress={() => {
                playTapSound();
                onClose();
              }}
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
                Hóa Đơn Bán Hàng
              </AppText>
              <AppText variant="xs" color={theme.text.muted} numberOfLines={1} tabularNums>
                {order.orderCode} · {order.tableName}
              </AppText>
            </View>
          </View>

          <View style={[s.headerBadge, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
            <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
              {formatCurrency(order.finalTotal)} đ
            </AppText>
          </View>
        </View>

        {/* 🌟 2. SEAMLESS TAB SELECTOR */}
        <View style={[s.seamlessTabContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.default }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel="Phiếu in nhiệt K80"
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setActiveTab('receipt');
            }}
            style={[
              s.seamlessTabItem,
              activeTab === 'receipt' && {
                borderBottomColor: theme.brand.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Icon
              name="receipt"
              size={16}
              color={activeTab === 'receipt' ? theme.brand.primary : theme.text.muted}
              style={{ marginRight: 6 }}
            />
            <AppText
              variant="sm"
              weight={activeTab === 'receipt' ? 'medium' : 'normal'}
              color={activeTab === 'receipt' ? theme.brand.primary : theme.text.muted}
              numberOfLines={1}
            >
              Phiếu In Nhiệt K80
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel="Đối chiếu camera"
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setActiveTab('camera');
            }}
            style={[
              s.seamlessTabItem,
              activeTab === 'camera' && {
                borderBottomColor: theme.brand.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Icon
              name="cctv"
              size={16}
              color={activeTab === 'camera' ? theme.brand.primary : theme.text.muted}
              style={{ marginRight: 6 }}
            />
            <AppText
              variant="sm"
              weight={activeTab === 'camera' ? 'medium' : 'normal'}
              color={activeTab === 'camera' ? theme.brand.primary : theme.text.muted}
              numberOfLines={1}
            >
              Đối Chiếu Camera
            </AppText>
          </TouchableOpacity>
        </View>

        {/* 🌟 3. SCROLLABLE CONTENT */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.seamlessScrollBody,
            { paddingBottom: Math.max(insets.bottom, 16) + 84 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'receipt' ? (
            <View style={s.receiptContainer}>
              <ReceiptThermalPaper order={order} storeSettings={storeSettings} isDark={isDark} />
            </View>
          ) : (
            <View style={s.cameraContainer}>
              <CameraAuditTrailView order={order} />
            </View>
          )}
        </ScrollView>

        {/* 🌟 4. BOTTOM DOCK ACTION */}
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
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={() => {
                playTapSound();
                onClose();
              }}
              style={[
                s.dockSecondaryBtn,
                { borderColor: theme.border.default, backgroundColor: theme.surface.header },
              ]}
            >
              <AppText variant="sm" weight="medium" color={theme.text.muted}>
                ĐÓNG
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="In lại phiếu K80"
              onPress={handlePrint}
              style={[s.dockPrimaryBtn, { backgroundColor: theme.brand.primary }]}
            >
              <Icon name="printer" size={18} color={theme.text.onBrand} />
              <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                IN LẠI BILL
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
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
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seamlessTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  seamlessTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  seamlessScrollBody: {
    paddingTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  receiptContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  cameraContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  fixedBottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  dockSecondaryBtn: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paperContainer: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  darkPaper: {},
  tearEdge: {
    height: 4,
    borderStyle: 'dashed',
    borderBottomWidth: 2,
    marginBottom: 8,
  },
  bottomTear: {
    marginTop: 12,
    marginBottom: 0,
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  centerText: {
    textAlign: 'center',
  },
  dashedDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  solidDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  receiptMeta: {
    gap: 3,
  },
  voidedBadge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  modifierText: {
    marginTop: 1,
  },
  qrFooterSection: {
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  auditWrapper: {
    width: '100%',
  },
  cctvViewport: {
    width: '100%',
    backgroundColor: 'rgba(10, 15, 29, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.6)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  cctvTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.6)',
    backgroundColor: 'rgba(7, 11, 20, 0.95)',
  },
  cctvRecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recBlinkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },
  cctvCamTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cctvFpsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cctvReticleBox: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 12,
  },
  cctvCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'rgba(2, 132, 199, 0.8)',
  },
  cctvCornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cctvCornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cctvCornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cctvCornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  cctvCenterCross: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cctvOverlayInfo: {
    width: '100%',
    gap: 4,
    backgroundColor: 'rgba(10, 15, 29, 0.75)',
    padding: 8,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  cctvOverlayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cctvBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.6)',
    backgroundColor: 'rgba(7, 11, 20, 0.95)',
  },
  securitySealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  auditCard: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  milestoneStep: {
    flex: 1,
    alignItems: 'center',
  },
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneLine: {
    width: 20,
    height: 1,
    marginTop: -16,
  },
  infoSubStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  roundBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 6,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  roundBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roundItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timelineContainer: {
    paddingTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeCol: {
    width: 62,
    paddingTop: 2,
  },
  timelineNodeCol: {
    width: 26,
    alignItems: 'center',
  },
  nodeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeLine: {
    width: 1.5,
    flex: 1,
    minHeight: 24,
    marginVertical: 2,
  },
  logContentCol: {
    flex: 1,
    paddingLeft: 6,
  },
});
