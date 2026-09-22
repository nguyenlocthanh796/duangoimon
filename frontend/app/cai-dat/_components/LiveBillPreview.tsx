import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../lib/theme';
import { AppText, ReceiptLayout } from '../../../lib/components/ui';
import { StoreSettings } from '../../../lib/store/usePOSStore';

interface LiveBillPreviewProps {
  settings: Partial<StoreSettings>;
}

export function LiveBillPreview({ settings }: LiveBillPreviewProps) {
  const { theme } = useTheme();

  const isK58 = settings.paperSize === 'K58';
  const storeName = settings.storeName || 'QUÁN CHÈ BƯỞI';
  const address = settings.address || 'Trụ sở chính';
  const phone = settings.phone || '0392387165';
  const receiptTitle = settings.receiptTitle || 'HÓA ĐƠN THANH TOÁN';
  const footerText = settings.receiptFooterText || 'Cảm ơn Quý khách & Hẹn gặp lại!';
  const wifiName = settings.wifiName || 'OngChu_WiFi';
  const wifiPassword = settings.wifiPassword || 'chebuoian giang';
  const bankCode = settings.bankCode || 'MB';
  const accountNumber = settings.accountNumber || '0392387165';
  const accountHolder = settings.accountHolder || 'QUANQUAN';

  const subtotal = 125000;
  const discount = 0;
  const serviceFee = settings.serviceFeeRate ? Math.round((subtotal * settings.serviceFeeRate) / 100) : 0;
  const vatAmount = settings.vatRate ? Math.round(((subtotal + serviceFee) * settings.vatRate) / 100) : 0;
  const finalTotal = subtotal + serviceFee + vatAmount - discount;

  return (
    <View style={s.container}>
      {/* Label Indicator */}
      <View style={s.badgeRow}>
        <View style={[s.paperBadge, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
          <AppText variant="xs" weight="medium" color={theme.brand.primary}>
            {isK58 ? 'MẪU K58 (58MM)' : 'MẪU K80 (80MM)'}
          </AppText>
        </View>
        <AppText variant="xs" color={theme.text.muted}>
          Tự đồng bộ
        </AppText>
      </View>

      {/* Bill Sheet using ReceiptLayout */}
      <View
        style={[
          s.billSheet,
          isK58 ? s.billSheetK58 : s.billSheetK80,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
          },
        ]}
      >
        <ReceiptLayout
          paperSize={isK58 ? 'K58' : 'K80'}
          storeInfo={{
            storeName,
            address,
            phone,
            wifiName: settings.printWifiOnBill !== false ? wifiName : undefined,
            wifiPassword: settings.printWifiOnBill !== false ? wifiPassword : undefined,
            openingHours: settings.openingHours,
            slogan: footerText,
          }}
          orderMeta={{
            orderCode: 'HD-260906-001',
            tableName: 'Bàn 03',
            cashierName: settings.printCashierOnBill !== false ? 'Nguyễn Văn An' : undefined,
            receiptTitle,
          }}
          items={[
            {
              name: 'Trà Sữa Oolong Nướng',
              qty: 2,
              unitPrice: 45000,
              note: settings.printItemNoteOnBill ? 'Trân Châu Đen · 50% đường' : undefined,
            },
            {
              name: 'Cà Phê Muối Huế',
              qty: 1,
              unitPrice: 35000,
            },
          ]}
          totals={{
            subtotal,
            discountAmount: discount,
            serviceFeeAmount: serviceFee,
            serviceFeeRate: settings.serviceFeeRate,
            vatAmount,
            vatRate: settings.vatRate,
            finalTotal,
            paymentMethod: settings.printQrOnBill !== false ? 'vietqr' : 'tien_mat',
          }}
          vietqr={{
            bankCode,
            accountNumber,
            accountHolder,
            showQr: settings.printQrOnBill !== false,
          }}
          showTearEdges={true}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paperBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  billSheet: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  billSheetK80: {
    width: 320,
  },
  billSheetK58: {
    width: 260,
    padding: 10,
  },
  centerSection: {
    alignItems: 'center',
  },
  dashedLine: {
    width: '100%',
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    marginVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  qrImageContainer: {
    padding: 6,
    borderRadius: 8,
    marginVertical: 4,
  },
  wifiBox: {
    marginTop: 8,
    paddingVertical: 4,
  },
  barcodeBox: {
    alignItems: 'center',
    marginTop: 8,
  },
  fakeBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tearLine: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    overflow: 'hidden',
  },
  tearTooth: {
    width: 12,
    height: 6,
    borderTopWidth: 2,
    marginHorizontal: 1,
  },
});
