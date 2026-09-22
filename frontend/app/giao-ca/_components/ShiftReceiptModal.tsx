import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, AppModal, Button } from '../../../lib/components/ui';
import { useStoreSettings, ShiftRecord } from '../../../lib/store/usePOSStore';
import { formatCurrency } from '../../../lib/utils/format';
import { playTapSound } from '../../../lib/utils/sound';

export interface ShiftReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  shift: ShiftRecord | null;
  onPrint?: (shift: ShiftRecord) => void;
}

export const ShiftReceiptModal: React.FC<ShiftReceiptModalProps> = ({
  visible,
  onClose,
  shift,
  onPrint,
}) => {
  const { theme, isDark } = useTheme();
  const storeSettings = useStoreSettings();

  if (!shift) return null;

  const handlePrint = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    if (onPrint) {
      onPrint(shift);
    }
  };

  const isMatch = shift.differenceAmount === 0;
  const isOver = shift.differenceAmount > 0;
  const diffAbs = Math.abs(shift.differenceAmount);

  // Mặc định phân bổ nếu chưa có
  const keepNext = shift.cashToKeepForNextShift !== undefined ? shift.cashToKeepForNextShift : shift.startingCash;
  const remitOwner = shift.cashToRemitToOwner !== undefined ? shift.cashToRemitToOwner : Math.max(0, shift.actualEndingCash - keepNext);

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Phiếu Giao Ca"
      subtitle={`Mã ca: ${shift.id}`}
      icon={<Icon name="printer-pos" size={20} color={theme.brand.accent} />}
      width={460}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Button
            size="lg"
            variant="outline"
            title="Đóng"
            onPress={() => {
              playTapSound();
              onClose();
            }}
            style={s.footerBtn}
          />
          <Button
            size="lg"
            title="In K80"
            leadingIcon={<Icon name="printer" size={18} color={theme.text.onBrand} />}
            onPress={handlePrint}
            style={[s.footerBtn, { backgroundColor: theme.brand.accent }]}
          />
        </View>
      }
    >
      <View style={s.paperContainer}>
        {/* Store Branding Header */}
        <View style={s.centerBlock}>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={s.textCenter}>
            {storeSettings.storeName.toUpperCase()}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={[s.textCenter, { marginTop: 2 }]}>
            {storeSettings.address}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={s.textCenter}>
            Hotline: {storeSettings.phone}
          </AppText>
        </View>

        <View style={[s.dashedLine, { borderBottomColor: theme.border.subtle }]} />

        {/* Receipt Title */}
        <View style={s.centerBlock}>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={s.textCenter}>
            PHIẾU BÀN GIAO CA BÁN HÀNG
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={[s.textCenter, { marginTop: 2 }]}>
            Mã ca: {shift.id}
          </AppText>
        </View>

        {/* Shift Meta */}
        <View style={s.metaTable}>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Ca làm việc:
            </AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              {shift.shiftName}
            </AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Thu ngân:
            </AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              {shift.cashierName}
            </AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Giờ mở ca:
            </AppText>
            <AppText variant="md" color={theme.text.primary} tabularNums>
              {shift.openedAt}
            </AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Giờ chốt ca:
            </AppText>
            <AppText variant="md" color={theme.text.primary} tabularNums>
              {shift.closedAt}
            </AppText>
          </View>
        </View>

        <View style={[s.dashedLine, { borderBottomColor: theme.border.subtle }]} />

        {/* 1. DOANH THU BÁN HÀNG */}
        <View style={s.sectionBlock}>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={s.sectionHeaderTitle}>
            DOANH THU BÁN HÀNG
          </AppText>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Tiền mặt bán:
            </AppText>
            <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
              +{formatCurrency(shift.totalCashSales)} đ
            </AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Chuyển khoản VietQR:
            </AppText>
            <AppText variant="md" color={theme.text.primary} tabularNums>
              {formatCurrency(shift.totalVietQRSales)} đ
            </AppText>
          </View>
          <View style={[s.metaRow, s.subTotalRow, { borderTopColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tổng Doanh Thu:
            </AppText>
            <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
              {formatCurrency(shift.totalCashSales + shift.totalVietQRSales + (shift.totalCardSales || 0))} đ
            </AppText>
          </View>
        </View>

        <View style={[s.dashedLine, { borderBottomColor: theme.border.subtle }]} />

        {/* 2. DÒNG TIỀN KÉT & ĐỐI SOÁT */}
        <View style={s.sectionBlock}>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={s.sectionHeaderTitle}>
            KẾ TOÁN KÉT TIỀN MẶT
          </AppText>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Tiền lẻ đầu ca:
            </AppText>
            <AppText variant="md" color={theme.text.primary} tabularNums>
              {formatCurrency(shift.startingCash)} đ
            </AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              (+) Tiền mặt bán:
            </AppText>
            <AppText variant="md" color={theme.brand.success} tabularNums>
              +{formatCurrency(shift.totalCashSales)} đ
            </AppText>
          </View>
          {shift.totalCashIn > 0 && (
            <View style={s.metaRow}>
              <AppText variant="sm" color={theme.text.muted}>
                (+) Thu ngoài ca:
              </AppText>
              <AppText variant="md" color={theme.brand.success} tabularNums>
                +{formatCurrency(shift.totalCashIn)} đ
              </AppText>
            </View>
          )}
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              (-) Chi ngoài (Chi chợ):
            </AppText>
            <AppText variant="md" color={theme.brand.danger} tabularNums>
              -{formatCurrency(shift.totalCashOut)} đ
            </AppText>
          </View>

          <View style={[s.metaRow, s.subTotalRow, { borderTopColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Két Lý Thuyết:
            </AppText>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
              {formatCurrency(shift.expectedEndingCash)} đ
            </AppText>
          </View>

          <View style={s.metaRow}>
            <AppText variant="md" weight="bold" color={theme.brand.primary}>
              Thực Đếm:
            </AppText>
            <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
              {formatCurrency(shift.actualEndingCash)} đ
            </AppText>
          </View>

          <View style={[s.diffBadgeRow, {
            backgroundColor: isMatch
              ? (isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)')
              : isOver
              ? (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)')
              : (isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)'),
            borderColor: isMatch ? theme.brand.success : isOver ? theme.brand.warning : theme.brand.danger,
          }]}>
            <Icon
              name={isMatch ? 'check-circle' : isOver ? 'alert-circle' : 'alert-octagon'}
              size={16}
              color={isMatch ? theme.brand.success : isOver ? theme.brand.warning : theme.brand.danger}
            />
            <AppText
              variant="sm"
              weight="bold"
              tabularNums
              color={isMatch ? theme.brand.success : isOver ? theme.brand.warning : theme.brand.danger}
            >
              {isMatch ? 'KHỚP KÉT 100%' : isOver ? `THỪA KÉT: +${formatCurrency(diffAbs)} đ` : `THIẾU KÉT: -${formatCurrency(diffAbs)} đ`}
            </AppText>
          </View>
        </View>

        <View style={[s.dashedLine, { borderBottomColor: theme.border.subtle }]} />

        {/* 3. PHÂN BỔ TIỀN KÉT */}
        <View style={s.sectionBlock}>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={s.sectionHeaderTitle}>
            PHÂN BỔ TIỀN KÉT
          </AppText>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Để lại ca sau:
            </AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
              {formatCurrency(keepNext)} đ
            </AppText>
          </View>
          <View style={s.metaRow}>
            <AppText variant="sm" color={theme.text.muted}>
              Rút nộp Chủ Quán:
            </AppText>
            <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
              {formatCurrency(remitOwner)} đ
            </AppText>
          </View>
        </View>

        {/* 4. GHI CHÚ NẾU CÓ */}
        {shift.note ? (
          <>
            <View style={[s.dashedLine, { borderBottomColor: theme.border.subtle }]} />
            <View style={s.sectionBlock}>
              <AppText variant="xs" color={theme.text.muted} weight="bold">
                GHI CHÚ:
              </AppText>
              <AppText variant="sm" color={theme.text.primary} style={{ marginTop: 2 }}>
                {shift.note}
              </AppText>
            </View>
          </>
        ) : null}

        <View style={[s.dashedLine, { borderBottomColor: theme.border.subtle }]} />

        {/* Chữ Ký Bàn Giao */}
        <View style={s.signatureRow}>
          <View style={s.signatureCol}>
            <AppText variant="xs" weight="bold" color={theme.text.primary}>
              NGƯỜI GIAO CA
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
              (Ký, ghi rõ họ tên)
            </AppText>
            <View style={{ height: 44 }} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              {shift.cashierName}
            </AppText>
          </View>

          <View style={s.signatureCol}>
            <AppText variant="xs" weight="bold" color={theme.text.primary}>
              NGƯỜI NHẬN CA
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
              (Ký, ghi rõ họ tên)
            </AppText>
            <View style={{ height: 44 }} />
            <AppText variant="sm" color={theme.text.muted}>
              ........................
            </AppText>
          </View>
        </View>

        <AppText variant="xs" color={theme.text.muted} style={[s.textCenter, { marginTop: 14 }]}>
          Hệ thống POS Vị Chủ Quán — OngChu Lean POS
        </AppText>
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flexGrow: 1,
  },
  paperContainer: {
    padding: 18,
    gap: 10,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  dashedLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  metaTable: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subTotalRow: {
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeaderTitle: {
    marginBottom: 2,
  },
  diffBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
  },
});
