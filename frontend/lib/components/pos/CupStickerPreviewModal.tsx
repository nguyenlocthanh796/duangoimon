import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, AppModal, Button, useAppToast } from '../ui';
import { playTapSound } from '../../utils/sound';
import {
  CupStickerData,
  sendCupStickersToPrinter,
} from '../../utils/labelPrinter';
import { useStoreSettings } from '../../store/usePOSStore';

interface CupStickerPreviewModalProps {
  visible: boolean;
  stickers: CupStickerData[];
  onClose: () => void;
}

export const CupStickerPreviewModal: React.FC<CupStickerPreviewModalProps> = ({
  visible,
  stickers,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const settings = useStoreSettings();
  const { showToast } = useAppToast();
  const [isPrinting, setIsPrinting] = useState(false);

  const printerIp = settings.cupPrinterIp || '192.168.1.202';
  const printerPort = settings.cupPrinterPort || 9100;
  const labelSize = settings.cupLabelSize || '50x30';

  const handlePrintAll = async () => {
    if (stickers.length === 0) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    setIsPrinting(true);
    const result = await sendCupStickersToPrinter(
      stickers,
      printerIp,
      printerPort,
      labelSize
    );
    setIsPrinting(false);

    showToast({
      title: 'Đã In Tem Ly',
      message: result.message,
      type: 'success',
    });
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={`Tem Dán Ly (${stickers.length})`}
      subtitle={`Khổ tem ${labelSize}mm`}
      icon={<Icon name="label-outline" size={22} color={theme.brand.accent} />}
      width={480}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Button
            variant="outline"
            size="md"
            title="Đóng"
            onPress={() => {
              playTapSound();
              onClose();
            }}
            style={{ flex: 1 }}
          />
          <Button
            variant="default"
            size="md"
            title={isPrinting ? 'Đang In...' : 'In Tất Cả Tem'}
            disabled={stickers.length === 0 || isPrinting}
            leadingIcon={<Icon name="printer-pos-outline" size={18} color={theme.text.onBrand} />}
            onPress={handlePrintAll}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={s.scrollContent}>
        {stickers.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name="label-off-outline" size={56} color={theme.text.muted} />
            <AppText variant="sm" weight="medium" color={theme.text.primary} style={{ marginTop: 12 }}>
              Không có sản phẩm nào cần in tem
            </AppText>
          </View>
        ) : (
          stickers.map((stk, idx) => (
            <View key={stk.stickerId || idx} style={s.stickerWrapper}>
              {/* Nhãn phụ thứ tự tem */}
              <View style={s.stickerIndexRow}>
                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  Ly {stk.cupIndex} / {stk.totalCups}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  {stk.orderTime}
                </AppText>
              </View>

              {/* Bản in tem nhiệt dán ly 50x30mm */}
              <View style={[s.physicalSticker, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
                {/* Hàng 1: Tên Quán */}
                <AppText
                  variant="xs"
                  weight="bold"
                  color={theme.text.primary}
                  style={s.stickerStoreName}
                  numberOfLines={1}
                >
                  {stk.storeName}
                </AppText>

                {/* Hàng 2: Mã đơn · Bàn · [1/3] */}
                <View style={s.stickerMetaRow}>
                  <AppText variant="xxs" weight="medium" color={theme.text.muted} tabularNums>
                    {stk.orderCode} · {stk.tableName}
                  </AppText>
                  <View style={[s.cupCountPill, { backgroundColor: theme.surface.header }]}>
                    <AppText variant="xxs" weight="bold" color={theme.text.primary} tabularNums>
                      [{stk.cupIndex}/{stk.totalCups}]
                    </AppText>
                  </View>
                </View>

                <View style={[s.dividerDashed, { borderColor: theme.border.subtle }]} />

                {/* Hàng 3: Tên món + Size */}
                <AppText variant="sm" weight="bold" color={theme.text.primary} numberOfLines={1}>
                  {stk.itemName} {stk.selectedSize ? `(${stk.selectedSize})` : ''}
                </AppText>

                {/* Hàng 4: Tùy chọn đường / đá */}
                {(stk.sugarLevel || stk.iceLevel) && (
                  <View style={s.optionsRow}>
                    {stk.sugarLevel && stk.sugarLevel !== '100%' && (
                      <View style={[s.tagBubble, { backgroundColor: theme.surface.header }]}>
                        <AppText variant="xxs" color={theme.text.primary}>
                          {stk.sugarLevel} Đường
                        </AppText>
                      </View>
                    )}
                    {stk.iceLevel && stk.iceLevel !== '100%' && (
                      <View style={[s.tagBubble, { backgroundColor: theme.surface.header }]}>
                        <AppText variant="xxs" color={theme.text.primary}>
                          {stk.iceLevel} Đá
                        </AppText>
                      </View>
                    )}
                  </View>
                )}

                {/* Hàng 5: Topping */}
                {stk.toppings.length > 0 && (
                  <AppText variant="xxs" weight="medium" color={theme.text.primary} numberOfLines={1} style={{ marginTop: 2 }}>
                    + {stk.toppings.join(', ')}
                  </AppText>
                )}

                {/* Hàng 6: Ghi chú */}
                {stk.note ? (
                  <AppText variant="xxs" color={theme.brand.danger} numberOfLines={1} style={{ marginTop: 2 }}>
                    * {stk.note}
                  </AppText>
                ) : null}

                <View style={[s.dividerDashed, { borderColor: theme.border.subtle }]} />

                {/* Hàng 7: Đơn giá & Mã vạch mô phỏng */}
                <View style={s.stickerFooter}>
                  <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                    {stk.unitPrice.toLocaleString('vi-VN')} đ
                  </AppText>
                  <View style={s.barcodeLines}>
                    <View style={[s.bar, { width: 1.5, backgroundColor: theme.text.primary }]} />
                    <View style={[s.bar, { width: 3, backgroundColor: theme.text.primary }]} />
                    <View style={[s.bar, { width: 1, backgroundColor: theme.text.primary }]} />
                    <View style={[s.bar, { width: 2.5 }]} />
                    <View style={[s.bar, { width: 1 }]} />
                    <View style={[s.bar, { width: 4 }]} />
                    <View style={[s.bar, { width: 1.5 }]} />
                    <View style={[s.bar, { width: 2 }]} />
                    <View style={[s.bar, { width: 1 }]} />
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  stickerWrapper: {
    gap: 6,
  },
  stickerIndexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  physicalSticker: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stickerStoreName: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stickerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  cupCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dividerDashed: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  tagBubble: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  stickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 14,
  },
  bar: {
    height: 14,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
