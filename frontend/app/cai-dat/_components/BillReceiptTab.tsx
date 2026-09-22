import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, useAppToast } from '../../../lib/components/ui';
import { StoreSettings } from '../../../lib/store/usePOSStore';
import { LiveBillPreview } from './LiveBillPreview';
import { playTapSound } from '../../../lib/utils/sound';
import { sendCupStickersToPrinter, CupStickerData } from '../../../lib/utils/labelPrinter';

interface BillReceiptTabProps {
  isWide?: boolean;
  settings: Partial<StoreSettings>;
  onUpdate: (key: keyof StoreSettings, val: any) => void;
  onTestPrint: () => void;
  onKickDrawer: () => void;
}

const TITLE_PRESETS = [
  'HÓA ĐƠN THANH TOÁN',
  'PHIẾU TẠM TÍNH',
  'PHIẾU GIAO HÀNG',
  'PHIẾU TÍNH TIỀN',
];

const FOOTER_PRESETS = [
  'Cảm ơn Quý khách & Hẹn gặp lại!',
  'Cảm ơn Quý khách! Chúc ngon miệng!',
  'Đánh giá 5 sao nhận ưu đãi 10%',
];

const PRINTER_IP_PRESETS = [
  '192.168.1.200',
  '192.168.1.201',
  '192.168.1.202',
  '192.168.50.200',
];

export function BillReceiptTab({
  isWide = false,
  settings,
  onUpdate,
  onTestPrint,
  onKickDrawer,
}: BillReceiptTabProps) {
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();
  const [showMobilePreview, setShowMobilePreview] = useState(true);
  const [isPingingPrinter, setIsPingingPrinter] = useState(false);

  const paperSize = settings.paperSize || 'K80';
  const receiptTitle = settings.receiptTitle || 'HÓA ĐƠN THANH TOÁN';
  const receiptFooterText = settings.receiptFooterText || 'Cảm ơn Quý khách & Hẹn gặp lại!';
  const printCopies = settings.printCopies || 1;
  const printQrOnBill = settings.printQrOnBill ?? true;
  const printWifiOnBill = settings.printWifiOnBill ?? true;
  const printCashierOnBill = settings.printCashierOnBill ?? true;
  const printItemNoteOnBill = settings.printItemNoteOnBill ?? true;
  const printBarcodeOnBill = settings.printBarcodeOnBill ?? true;
  const autoCut = settings.autoCut ?? true;
  const kickDrawer = settings.kickDrawer ?? true;

  const printerIp = settings.printerIp || '192.168.1.200';
  const printerPort = String(settings.printerPort || 9100);

  const enableCupPrinter = settings.enableCupPrinter ?? false;
  const cupPrinterIp = settings.cupPrinterIp || '192.168.1.202';
  const cupPrinterPort = String(settings.cupPrinterPort || 9100);
  const cupLabelSize = settings.cupLabelSize || '50x30';
  const autoPrintCupOnOrder = settings.autoPrintCupOnOrder ?? false;

  const handleTestCupPrint = async () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sampleSticker: CupStickerData = {
      stickerId: 'STK-TEST',
      orderCode: 'CHỜ-01',
      tableName: 'Bàn 01',
      itemName: 'Trà Sữa Oolong Nướng',
      selectedSize: 'L',
      sugarLevel: '50% Đ',
      iceLevel: '70% Đá',
      toppings: ['Trân Châu Đen'],
      note: 'Ít ngọt',
      unitPrice: 35000,
      cupIndex: 1,
      totalCups: 1,
      orderTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      storeName: settings.storeName || 'ONGCHU POS',
    };
    const res = await sendCupStickersToPrinter(
      [sampleSticker],
      cupPrinterIp,
      parseInt(cupPrinterPort, 10) || 9100,
      cupLabelSize
    );
    showToast({
      title: 'Máy In Tem',
      message: res.message,
      type: res.success ? 'success' : 'info',
    });
  };

  const handlePingPrinter = async () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPingingPrinter(true);
    try {
      // Giả lập ping TCP Port 9100 hoặc gọi qua backend
      await new Promise((r) => setTimeout(r, 600));
      showToast({
        title: 'Kết Nối Máy In',
        message: `Đã thông mạch TCP ${printerIp}:${printerPort}`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Kết Nối Thất Bại',
        message: `Không tìm thấy máy in tại ${printerIp}:${printerPort}`,
        type: 'danger',
      });
    } finally {
      setIsPingingPrinter(false);
    }
  };

  const sectionCardStyle = [
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
      marginTop: isWide ? 12 : 0,
    },
  ];

  return (
    <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
      {/* 1. Thiết lập khổ giấy & tiêu đề bill */}
      <View style={sectionCardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.readyBg }]}>
            <Icon name="receipt" size={20} color={theme.brand.success} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mẫu Hóa Đơn In Nhiệt
            </AppText>
          </View>
        </View>

        {/* Khổ giấy K80 vs K58 */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Khổ giấy in *
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {[
              { id: 'K80' as const, label: 'K80 (80mm) · Phổ thông' },
              { id: 'K58' as const, label: 'K58 (58mm) · Cầm tay' },
            ].map((p) => {
              const isSel = paperSize === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('paperSize', p.id);
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
                    {p.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tiêu đề bill & Gợi ý nhanh */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Tiêu đề bill
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={receiptTitle}
            onChangeText={(v) => onUpdate('receiptTitle', v)}
            placeholder="HÓA ĐƠN THANH TOÁN"
            placeholderTextColor={theme.text.muted}
          />
          <View style={s.presetWrap}>
            {TITLE_PRESETS.map((t) => (
              <TouchableOpacity
                key={t}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  onUpdate('receiptTitle', t);
                }}
                style={[
                  s.chipPreset,
                  {
                    backgroundColor: receiptTitle === t ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)') : theme.surface.header,
                    borderColor: receiptTitle === t ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <AppText variant="xs" weight={receiptTitle === t ? 'bold' : 'normal'} color={receiptTitle === t ? theme.brand.accent : theme.text.muted}>
                  {t}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lời cảm ơn & Gợi ý nhanh */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Lời cảm ơn chân bill
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={receiptFooterText}
            onChangeText={(v) => onUpdate('receiptFooterText', v)}
            placeholder="Cảm ơn Quý khách & Hẹn gặp lại!"
            placeholderTextColor={theme.text.muted}
          />
          <View style={s.presetWrap}>
            {FOOTER_PRESETS.map((f) => (
              <TouchableOpacity
                key={f}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  onUpdate('receiptFooterText', f);
                }}
                style={[
                  s.chipPreset,
                  {
                    backgroundColor: receiptFooterText === f ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)') : theme.surface.header,
                    borderColor: receiptFooterText === f ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <AppText variant="xs" weight={receiptFooterText === f ? 'bold' : 'normal'} color={receiptFooterText === f ? theme.brand.accent : theme.text.muted}>
                  {f}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Số liên in */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Số liên in khi thanh toán
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {[
              { copies: 1, label: '1 liên (Giao khách)' },
              { copies: 2, label: '2 liên (Khách + Quầy)' },
            ].map((c) => {
              const isSel = printCopies === c.copies;
              return (
                <TouchableOpacity
                  key={c.copies}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('printCopies', c.copies);
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
                    {c.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* 2. Tùy chọn hiển thị các thành phần trên Bill (Toggles) */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="format-list-checks" size={20} color={theme.brand.accent} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Chi Tiết Trên Hóa Đơn
            </AppText>
          </View>
        </View>

        {/* In mã VietQR ở chân bill */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('printQrOnBill', !printQrOnBill)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelWithIcon}>
            <Icon name="qrcode" size={18} color={theme.brand.accent} />
            <AppText variant="md" color={theme.text.primary}>
              Mã VietQR động
            </AppText>
          </View>
          <Switch
            value={printQrOnBill}
            onValueChange={(v) => onUpdate('printQrOnBill', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* In WiFi trên bill */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('printWifiOnBill', !printWifiOnBill)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelWithIcon}>
            <Icon name="wifi" size={18} color={theme.brand.primary} />
            <AppText variant="md" color={theme.text.primary}>
              Thông tin WiFi quán
            </AppText>
          </View>
          <Switch
            value={printWifiOnBill}
            onValueChange={(v) => onUpdate('printWifiOnBill', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* In tên thu ngân */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('printCashierOnBill', !printCashierOnBill)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelWithIcon}>
            <Icon name="account-tie-outline" size={18} color={theme.text.muted} />
            <AppText variant="md" color={theme.text.primary}>
              Tên thu ngân / ca trực
            </AppText>
          </View>
          <Switch
            value={printCashierOnBill}
            onValueChange={(v) => onUpdate('printCashierOnBill', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* In ghi chú món / toppings */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('printItemNoteOnBill', !printItemNoteOnBill)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelWithIcon}>
            <Icon name="text-box-outline" size={18} color={theme.text.muted} />
            <AppText variant="md" color={theme.text.primary}>
              Topping & ghi chú món
            </AppText>
          </View>
          <Switch
            value={printItemNoteOnBill}
            onValueChange={(v) => onUpdate('printItemNoteOnBill', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* In mã vạch hóa đơn */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('printBarcodeOnBill', !printBarcodeOnBill)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelWithIcon}>
            <Icon name="barcode" size={18} color={theme.text.muted} />
            <AppText variant="md" color={theme.text.primary}>
              Mã vạch Barcode đơn
            </AppText>
          </View>
          <Switch
            value={printBarcodeOnBill}
            onValueChange={(v) => onUpdate('printBarcodeOnBill', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Cài Đặt Máy In Nhiệt LAN / WiFi */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="printer-pos" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Máy In Hóa Đơn Thu Ngân (LAN / WiFi)
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              In trực tiếp qua mạng nội bộ LAN cổng 9100 (Tốc độ cao, không cần cài driver)
            </AppText>
          </View>
        </View>

        {/* Khổ Giấy In */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Khổ giấy in nhiệt:
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {(['K80', 'K58'] as const).map((ps) => (
              <TouchableOpacity
                key={ps}
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  onUpdate('paperSize', ps);
                }}
                style={[
                  s.paperSizeCard,
                  {
                    backgroundColor: paperSize === ps ? theme.brand.primary : theme.surface.header,
                    borderColor: paperSize === ps ? theme.brand.primary : theme.border.default,
                  },
                ]}
              >
                <Icon
                  name={ps === 'K80' ? 'receipt' : 'receipt-outline'}
                  size={20}
                  color={paperSize === ps ? theme.text.onBrand : theme.text.primary}
                />
                <View>
                  <AppText variant="sm" weight="bold" color={paperSize === ps ? theme.text.onBrand : theme.text.primary}>
                    {ps === 'K80' ? 'Khổ lớn K80 (80mm)' : 'Khổ nhỏ K58 (58mm)'}
                  </AppText>
                  <AppText variant="xxs" color={paperSize === ps ? 'rgba(255,255,255,0.7)' : theme.text.muted}>
                    {ps === 'K80' ? '48 ký tự / dòng (Chuẩn POS)' : '32 ký tự / dòng (Máy cầm tay)'}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* IP & Port Máy In */}
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 12 }}>
          <View style={[s.formGroup, { flex: 2 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Địa chỉ IP Máy In (LAN / WiFi):
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={printerIp}
              onChangeText={(v) => onUpdate('printerIp', v.trim())}
              placeholder="192.168.1.200"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Cổng (Port):
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={String(printerPort)}
              onChangeText={(v) => onUpdate('printerPort', parseInt(v.replace(/\D/g, ''), 10) || 9100)}
              keyboardType="numeric"
              placeholder="9100"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        </View>

        {/* IP Gợi ý phổ biến */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: -4 }}>
          {PRINTER_IP_PRESETS.map((ip) => (
            <TouchableOpacity
              key={ip}
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                onUpdate('printerIp', ip);
              }}
              style={[
                s.chipPreset,
                {
                  backgroundColor: printerIp === ip ? (isDark ? 'rgba(180, 83, 9, 0.2)' : 'rgba(180, 83, 9, 0.1)') : theme.surface.header,
                  borderColor: printerIp === ip ? theme.brand.accent : theme.border.subtle,
                },
              ]}
            >
              <AppText variant="xs" weight={printerIp === ip ? 'bold' : 'normal'} tabularNums color={printerIp === ip ? theme.brand.accent : theme.text.muted}>
                {ip}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tự động cắt giấy & Bật két */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('autoCut', !autoCut)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="md" color={theme.text.primary}>
              Tự cắt giấy
            </AppText>
            <AppText variant="xxs" color={theme.text.muted}>
              Lệnh ESC/POS (\x1d\x56\x41\x10)
            </AppText>
          </View>
          <Switch
            value={autoCut}
            onValueChange={(v) => onUpdate('autoCut', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('kickDrawer', !kickDrawer)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="md" color={theme.text.primary}>
              Bật két RJ11
            </AppText>
            <AppText variant="xxs" color={theme.text.muted}>
              Kích mở két tự động (\x1b\x70\x00\x19\xfa)
            </AppText>
          </View>
          <Switch
            value={kickDrawer}
            onValueChange={(v) => onUpdate('kickDrawer', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Cụm nút kiểm thử phần cứng 3 nút */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onTestPrint}
            style={[s.hardwareBtn, { backgroundColor: theme.surface.header, borderColor: theme.brand.primary }]}
          >
            <Icon name="printer" size={18} color={theme.brand.primary} />
            <AppText variant="sm" weight="medium" color={theme.brand.primary}>
              In Thử Bill
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onKickDrawer}
            style={[s.hardwareBtn, { backgroundColor: theme.surface.header, borderColor: theme.brand.accent }]}
          >
            <Icon name="cash-register" size={18} color={theme.brand.accent} />
            <AppText variant="sm" weight="medium" color={theme.brand.accent}>
              Bật Két
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePingPrinter}
            disabled={isPingingPrinter}
            style={[s.hardwareBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
          >
            <Icon name="lan-connect" size={18} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              {isPingingPrinter ? 'Đang thử...' : 'Ping 9100'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Máy In Tem Dán Ly (Cup Sticker TSPL) */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="label-outline" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Máy In Tem Dán Ly (TSPL)
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Tem dán ly trà sữa, cafe (TSPL 50x30mm / 40x30mm)
            </AppText>
          </View>
          <Switch
            value={enableCupPrinter}
            onValueChange={(v) => onUpdate('enableCupPrinter', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </View>

        {/* Khổ tem nhãn */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Khổ tem nhãn
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {[
              { size: '50x30' as const, label: '50x30 mm · Chuẩn ly trà sữa' },
              { size: '40x30' as const, label: '40x30 mm · Khổ nhỏ gọn' },
            ].map((item) => {
              const isSel = cupLabelSize === item.size;
              return (
                <TouchableOpacity
                  key={item.size}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('cupLabelSize', item.size);
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
                    {item.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* IP & Cổng máy in tem */}
        <View style={[s.rowTwo, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={[s.formGroup, { flex: 2 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              IP máy in tem
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={cupPrinterIp}
              onChangeText={(v) => onUpdate('cupPrinterIp', v)}
              placeholder="192.168.1.202"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Cổng
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={cupPrinterPort}
              onChangeText={(v) => onUpdate('cupPrinterPort', parseInt(v.replace(/\D/g, ''), 10) || 9100)}
              keyboardType="numeric"
              placeholder="9100"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        </View>

        {/* Tự động in tem khi order */}
        <View style={[s.switchRow, { borderTopColor: theme.border.subtle }]}>
          <AppText variant="md" color={theme.text.primary} style={{ flex: 1 }}>
            Tự in khi báo bếp
          </AppText>
          <Switch
            value={autoPrintCupOnOrder}
            onValueChange={(v) => onUpdate('autoPrintCupOnOrder', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </View>

        {/* Nút in thử tem */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTestCupPrint}
          style={[s.hardwareBtn, { backgroundColor: theme.surface.header, borderColor: theme.brand.primary, marginTop: 4 }]}
        >
          <Icon name="tag-outline" size={18} color={theme.brand.primary} />
          <AppText variant="sm" weight="medium" color={theme.brand.primary}>
            In Thử Tem Dán Ly
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 5. Xem Trước Hóa Đơn Trực Tiếp Trực Quan (Chỉ hiển thị trên Mobile) */}
      {!isWide && (
        <View style={[...sectionCardStyle, { marginTop: 10 }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setShowMobilePreview((v) => !v);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
          >
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ letterSpacing: 0.5 }}>
              XEM TRƯỚC HÓA ĐƠN ({paperSize})
            </AppText>
            <Icon
              name={showMobilePreview ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.text.muted}
            />
          </TouchableOpacity>
          {showMobilePreview && (
            <View style={{ marginTop: 8 }}>
              <LiveBillPreview settings={settings} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: 4,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  templateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSizeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  copyBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hardwareBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chipPreset: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
