import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
  Share,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, useAppToast, AppHeader } from '../../components/ui';
import {
  PayrollRecord,
  StaffShiftLog,
  ROLE_CONFIG,
  SHIFT_CONFIG,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

export interface PayslipDetailViewProps {
  record: PayrollRecord;
  shiftLogs?: StaffShiftLog[];
  isWide?: boolean;
  isInline?: boolean;
  onBack: () => void;
}

export function PayslipDetailView({
  record,
  shiftLogs = [],
  isWide,
  isInline,
  onBack,
}: PayslipDetailViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const roleInfo = ROLE_CONFIG[record.role] || {
    label: 'Nhân Viên',
    color: theme.brand.primary,
  };

  // Lọc danh sách ca làm việc của nhân viên
  const staffShiftLogs = shiftLogs.filter((l) => l.staffId === record.staffId);

  // Bắt phím Back vật lý Android để quay lại liền mạch
  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }
  }, [onBack]);

  const handlePrint = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    showToast({
      title: 'Đã In Phiếu K80',
      message: `Đang in phiếu lương ${record.staffName}`,
      type: 'success',
    });
  };

  const handleShare = async () => {
    playTapSound();
    const summaryText = `[PHIẾU LƯƠNG NHÂN SỰ]\n` +
      `Nhân viên: ${record.staffName} (${roleInfo.label})\n` +
      `Kỳ: ${record.period} · Ngày chi: ${record.paidDate}\n` +
      `-----------------------------\n` +
      `• Công: ${record.totalHours}h (${record.totalShifts} ca)\n` +
      `• Lương cơ bản: ${formatCurrency(record.baseSalary)} đ\n` +
      (record.otSalary > 0 ? `• Tăng ca OT: +${formatCurrency(record.otSalary)} đ\n` : '') +
      (record.allowance > 0 ? `• Phụ cấp: +${formatCurrency(record.allowance)} đ\n` : '') +
      (record.bonus > 0 ? `• Thưởng: +${formatCurrency(record.bonus)} đ\n` : '') +
      (record.deduction > 0 ? `• Khấu trừ: -${formatCurrency(record.deduction)} đ\n` : '') +
      (record.advancePaid > 0 ? `• Đã tạm ứng: -${formatCurrency(record.advancePaid)} đ\n` : '') +
      `-----------------------------\n` +
      `=> THỰC LĨNH: ${formatCurrency(record.netSalary)} đ (${record.paymentMethod === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'})\n` +
      `Mã phiếu: ${record.id.slice(-8).toUpperCase()}\n` +
      `ONGCHU LEAN POS`;

    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(summaryText);
          showToast({
            title: 'Đã Sao Chép',
            message: 'Đã lưu tóm tắt phiếu lương vào bộ nhớ tạm',
            type: 'success',
          });
        }
      } else {
        await Share.share({
          message: summaryText,
          title: `Phiếu lương ${record.staffName}`,
        });
      }
    } catch {}
  };

  const regularHours = Math.max(0, record.totalHours - record.totalOtHours);

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 1. App Header chuẩn, liền màu 100% Status Bar */}
      <AppHeader
        showBack={!isInline}
        showHamburger={false}
        onBack={() => {
          playTapSound();
          onBack();
        }}
        title="Phiếu Lương"
        subtitle={`${record.staffName} · ${record.period}`}
        rightCustom={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleShare}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                borderWidth: StyleSheet.hairlineWidth,
              }}
            >
              <Icon name="share-variant-outline" size={15} color={theme.text.primary} />
              <AppText variant="sm" weight="medium" color={theme.text.primary}>
                Chia Sẻ
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handlePrint}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: theme.brand.accent,
              }}
            >
              <Icon name="printer-outline" size={15} color={theme.text.onBrand} />
              <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                In K80
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 2. Cuộn nội dung phiếu in thermal K80 De-boxed */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          isWide && { maxWidth: 680, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.receiptContainer,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
              borderWidth: isWide ? 1 : 0,
              borderRadius: isWide ? 16 : 0,
            },
          ]}
        >
          {/* Header Quán & Tiêu đề phiếu */}
          <View style={[s.receiptHeader, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary} style={{ letterSpacing: 0.5 }}>
              ONGCHU LEAN POS
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
              HỆ THỐNG QUẢN LÝ F&B VỊ CHỦ QUÁN
            </AppText>
            <View style={[s.dashedLine, { borderColor: theme.border.subtle }]} />
            <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginTop: 2 }}>
              PHIẾU LƯƠNG NHÂN SỰ
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
              Kỳ: {record.period} · Ngày chi: {record.paidDate} {record.paidTime}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
              Mã phiếu: {record.id.slice(-8).toUpperCase()}
            </AppText>
          </View>

          {/* Thông tin nhân viên */}
          <View style={[s.sectionWrapper, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.metaRow}>
              <AppText variant="md" color={theme.text.muted}>Nhân viên:</AppText>
              <AppText variant="md" weight="medium" color={theme.text.primary}>{record.staffName}</AppText>
            </View>
            <View style={s.metaRow}>
              <AppText variant="md" color={theme.text.muted}>Chức vụ:</AppText>
              <View style={[s.roleBadge, { backgroundColor: `${roleInfo.color}15` }]}>
                <AppText variant="xs" weight="medium" color={roleInfo.color}>{roleInfo.label}</AppText>
              </View>
            </View>
            <View style={s.metaRow}>
              <AppText variant="md" color={theme.text.muted}>Hình thức trả:</AppText>
              <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                {record.wageType === 'hourly'
                  ? `Theo giờ (${formatCurrency(record.wageRate)} đ/h)`
                  : record.wageType === 'per_shift'
                  ? `Theo ca (${formatCurrency(record.wageRate)} đ/ca)`
                  : `Cố định (${formatCurrency(record.wageRate)} đ/tháng)`}
              </AppText>
            </View>
          </View>

          {/* 3. CHI TIẾT CHẤM CÔNG KỲ NÀY */}
          <View style={[s.sectionWrapper, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.sectionTitleRow}>
              <AppText variant="xs" weight="bold" color={theme.brand.primary} style={{ letterSpacing: 0.5 }}>
                1. CHI TIẾT CHẤM CÔNG KỲ NÀY
              </AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>
                {record.totalShifts} ca làm
              </AppText>
            </View>

            {/* Thống kê giờ công */}
            <View style={[s.summaryPillsRow, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              <View style={s.summaryPillCol}>
                <AppText variant="xs" color={theme.text.muted}>Tổng công</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                  {record.totalHours}h
                </AppText>
              </View>
              <View style={[s.summaryPillDivider, { backgroundColor: theme.border.subtle }]} />
              <View style={s.summaryPillCol}>
                <AppText variant="xs" color={theme.text.muted}>Giờ chuẩn</AppText>
                <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                  {regularHours}h
                </AppText>
              </View>
              <View style={[s.summaryPillDivider, { backgroundColor: theme.border.subtle }]} />
              <View style={s.summaryPillCol}>
                <AppText variant="xs" color={theme.text.muted}>Tăng ca (OT)</AppText>
                <AppText variant="md" weight="medium" color={record.totalOtHours > 0 ? theme.brand.success : theme.text.muted} tabularNums>
                  {record.totalOtHours}h
                </AppText>
              </View>
              <View style={[s.summaryPillDivider, { backgroundColor: theme.border.subtle }]} />
              <View style={s.summaryPillCol}>
                <AppText variant="xs" color={theme.text.muted}>Tổng ca</AppText>
                <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                  {record.totalShifts} ca
                </AppText>
              </View>
            </View>

            {/* Bảng kê chi tiết từng ca làm việc */}
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginTop: 12, marginBottom: 4 }}>
              DANH SÁCH CA LÀM THỰC TẾ
            </AppText>

            {staffShiftLogs.length === 0 ? (
              <View style={s.emptyLogsBox}>
                <AppText variant="xs" color={theme.text.muted}>
                  Dữ liệu chấm công gộp: {record.totalHours} giờ làm ({record.totalShifts} ca)
                </AppText>
              </View>
            ) : (
              staffShiftLogs.map((log) => {
                const shiftCfg = SHIFT_CONFIG[log.shiftType] || {
                  label: log.shiftType,
                  icon: 'clock-outline',
                };
                return (
                  <View key={log.id} style={[s.shiftLogRow, { borderBottomColor: theme.border.subtle }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Icon name={shiftCfg.icon as any} size={16} color={theme.brand.primary} />
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="sm" weight="medium" color={theme.text.primary}>
                            {shiftCfg.label}
                          </AppText>
                          <AppText variant="xs" color={theme.text.muted} tabularNums>
                            {log.date}
                          </AppText>
                        </View>
                        <AppText variant="xs" color={theme.text.muted} tabularNums>
                          {log.startTime && log.endTime ? `${log.startTime} - ${log.endTime}` : 'Ca ghi nhận'}
                          {log.note ? ` · ${log.note}` : ''}
                        </AppText>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                        {log.hours}h
                      </AppText>
                      {log.otHours && log.otHours > 0 ? (
                        <AppText variant="xs" color={theme.brand.success} tabularNums>
                          +{log.otHours}h OT
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* 4. BẢNG KÊ THU NHẬP & KHẤU TRỪ */}
          <View style={[s.sectionWrapper, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="xs" weight="bold" color={theme.brand.primary} style={{ letterSpacing: 0.5, marginBottom: 8 }}>
              2. BẢNG KÊ THU NHẬP & KHẤU TRỪ
            </AppText>

            <View style={s.calcRow}>
              <AppText variant="md" color={theme.text.muted}>1. Lương cơ bản:</AppText>
              <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                {formatCurrency(record.baseSalary)} đ
              </AppText>
            </View>

            {record.otSalary > 0 && (
              <View style={s.calcRow}>
                <AppText variant="md" color={theme.text.muted}>
                  2. Tăng ca OT ({record.totalOtHours}h × 1.5):
                </AppText>
                <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                  +{formatCurrency(record.otSalary)} đ
                </AppText>
              </View>
            )}

            {record.allowance > 0 && (
              <View style={s.calcRow}>
                <AppText variant="md" color={theme.text.muted}>3. Phụ cấp:</AppText>
                <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                  +{formatCurrency(record.allowance)} đ
                </AppText>
              </View>
            )}

            {record.bonus > 0 && (
              <View style={s.calcRow}>
                <AppText variant="md" color={theme.text.muted}>4. Thưởng hiệu suất:</AppText>
                <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                  +{formatCurrency(record.bonus)} đ
                </AppText>
              </View>
            )}

            {record.deduction > 0 && (
              <View style={s.calcRow}>
                <AppText variant="md" color={theme.text.muted}>5. Khấu trừ vi phạm:</AppText>
                <AppText variant="md" weight="medium" color={theme.brand.danger} tabularNums>
                  -{formatCurrency(record.deduction)} đ
                </AppText>
              </View>
            )}

            {record.advancePaid > 0 && (
              <View style={s.calcRow}>
                <AppText variant="md" color={theme.text.muted}>6. Đã tạm ứng trong kỳ:</AppText>
                <AppText variant="md" weight="medium" color={theme.brand.warning} tabularNums>
                  -{formatCurrency(record.advancePaid)} đ
                </AppText>
              </View>
            )}
          </View>

          {/* 5. THỰC LĨNH BỎ TÚI */}
          <View style={[s.sectionWrapper, { borderBottomColor: theme.border.subtle }]}>
            <View style={[s.metaRow, { alignItems: 'center' }]}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                THỰC LĨNH:
              </AppText>
              <AppText variant="display" weight="bold" color={theme.brand.success} tabularNums>
                {formatCurrency(record.netSalary)} đ
              </AppText>
            </View>

            <View style={[s.metaRow, { marginTop: 6 }]}>
              <AppText variant="md" color={theme.text.muted}>Hình thức chi trả:</AppText>
              <AppText variant="md" weight="medium" color={theme.brand.primary}>
                {record.paymentMethod === 'tien_mat' ? 'Tiền Mặt (Chi Két)' : 'Chuyển Khoản'}
              </AppText>
            </View>

            {record.note ? (
              <View style={[s.metaRow, { marginTop: 4 }]}>
                <AppText variant="md" color={theme.text.muted}>Ghi chú:</AppText>
                <AppText variant="md" color={theme.text.primary} style={{ flex: 1, textAlign: 'right' }}>
                  {record.note}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Chữ ký xác nhận */}
          <View style={s.signaturesRow}>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="xs" color={theme.text.muted}>Người Lập Phiếu</AppText>
              <AppText variant="md" weight="medium" color={theme.text.primary} style={{ marginTop: 24 }}>
                Chủ Quán
              </AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="xs" color={theme.text.muted}>Người Nhận Lương</AppText>
              <AppText variant="md" weight="medium" color={theme.text.primary} style={{ marginTop: 24 }}>
                {record.staffName}
              </AppText>
            </View>
          </View>
        </View>

        {/* Đệm đáy tránh che bởi thanh docked bar */}
        <View style={{ height: 72 }} />
      </ScrollView>

      {/* 6. Docked Bottom Action Bar */}
      <View
        style={[
          s.dockedActionBar,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.subtle,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
          },
        ]}
      >
        <View style={[s.actionGrid, isWide && { maxWidth: 680, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              onBack();
            }}
            style={[
              s.actionBtn,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                flex: 1,
              },
            ]}
          >
            <Icon name="arrow-left" size={18} color={theme.text.primary} />
            <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
              Quay Lại
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handlePrint}
            style={[
              s.actionBtn,
              {
                backgroundColor: theme.brand.accent,
                borderColor: theme.brand.accent,
                flex: 1.5,
              },
            ]}
          >
            <Icon name="printer-outline" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
              In Phiếu K80
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  receiptContainer: {
    width: '100%',
  },
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dashedLine: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  sectionWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summaryPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  summaryPillCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryPillDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  shiftLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyLogsBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dockedActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
