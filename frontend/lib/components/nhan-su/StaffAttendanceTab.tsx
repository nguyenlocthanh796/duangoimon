import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, useAppToast, EmptyState } from '../../components/ui';
import {
  StaffMember,
  StaffShiftLog,
  ROLE_CONFIG,
  SHIFT_CONFIG,
} from '../../store/useStaffStore';
import { playTapSound } from '../../utils/sound';

interface StaffAttendanceTabProps {
  staffList: StaffMember[];
  shiftLogs: StaffShiftLog[];
  isWide: boolean;
  isDesktopLarge?: boolean;
  onOpenAdd?: () => void;
  onClockIn: (staff: StaffMember) => void;
  onClockOut: (staff: StaffMember) => void;
  onQuickLog: (staff?: StaffMember) => void;
  onDeleteLog: (logId: string) => void;
}

export function StaffAttendanceTab({
  staffList,
  shiftLogs,
  isWide,
  isDesktopLarge,
  onOpenAdd,
  onClockIn,
  onClockOut,
  onQuickLog,
  onDeleteLog,
}: StaffAttendanceTabProps) {
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();
  const [logFilter, setLogFilter] = useState<'today' | 'all'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  // Thống kê hôm nay
  const workingCount = staffList.filter((s) => s.isWorking).length;
  const offCount = staffList.length - workingCount;

  const todayLogs = shiftLogs.filter((l) => l.date === todayStr);
  const todayTotalHours = todayLogs.reduce((sum, l) => sum + l.hours, 0);

  const displayedLogs = logFilter === 'today' ? todayLogs : shiftLogs;

  const handleDeleteLog = (log: StaffShiftLog) => {
    playTapSound();
    const executeDelete = () => {
      onDeleteLog(log.id);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({ title: 'Đã Xóa Ca', message: `Đã hủy ca làm của ${log.staffName}`, type: 'success' });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Xác nhận xóa ca làm ${log.hours}h của ${log.staffName}? Giờ công sẽ được hoàn lại.`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Xóa Ca',
        `Xóa ca làm ${log.hours}h của ${log.staffName}?\nGiờ công đã tính sẽ được hoàn lại.`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa Ca', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        s.container,
        { padding: isWide ? 16 : 0, paddingBottom: 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {staffList.length === 0 ? (
        <EmptyState
          style={{ paddingVertical: 40 }}
          icon="account-clock-outline"
          message="Chưa có nhân sự để điểm danh"
          description="Thêm nhân viên để bắt đầu quản lý ca làm việc và giờ công"
          actionText="+ Thêm Nhân Viên"
          onAction={onOpenAdd}
        />
      ) : (
        <>
          {/* 1. Quick Stats Header (Dãy 2 Metric Strip 46px) */}
          <View
            style={[
              s.statStrip,
              isWide && {
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border.subtle,
                marginHorizontal: 16,
                marginTop: 12,
                paddingVertical: 14,
                paddingHorizontal: 20,
                maxWidth: 1200,
                alignSelf: 'center',
                width: '100%',
              },
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={s.statItem}>
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                Đang Trực Ca
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <View style={[s.liveDot, { backgroundColor: theme.brand.success }]} />
                <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                  {workingCount} người
                </AppText>
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.statItem}>
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                Chưa Vào Ca
              </AppText>
              <AppText variant="md" weight="bold" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                {offCount} người
              </AppText>
            </View>

            <View style={[s.divider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.statItem}>
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                Công Hôm Nay
              </AppText>
              <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums style={{ marginTop: 2 }}>
                {todayTotalHours} giờ
              </AppText>
            </View>
          </View>

      {/* 2. Danh sách nhân viên điểm danh (Flat Seamless Canvas) */}
      <View
        style={[
          s.staffListWrapper,
          isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
        ]}
      >
        {staffList.map((staff) => {
          const roleInfo = ROLE_CONFIG[staff.role];

          return (
            <View
              key={staff.id}
              style={[
                s.attendanceCard,
                isWide && { width: isDesktopLarge ? '32.4%' : '49.2%', borderRadius: 12, borderWidth: 1 },
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderBottomColor: theme.border.subtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={s.cardLeft}>
                <View style={s.avatarWrapper}>
                  <View style={[s.avatarCircle, { backgroundColor: `${roleInfo.color}18` }]}>
                    <Icon name="account" size={20} color={roleInfo.color} />
                  </View>
                  {staff.isWorking && (
                    <View
                      style={[
                        s.onlineDot,
                        {
                          backgroundColor: theme.brand.success,
                          borderColor: theme.surface.card,
                        },
                      ]}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={1}>
                      {staff.name}
                    </AppText>
                    <View style={[s.roleBadge, { backgroundColor: `${roleInfo.color}15` }]}>
                      <AppText variant="xs" color={roleInfo.color}>{roleInfo.label}</AppText>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {staff.isWorking ? (
                      <AppText variant="sm" color={theme.brand.success} tabularNums>
                        ● {staff.activeShiftType ? SHIFT_CONFIG[staff.activeShiftType]?.label : 'Ca Sáng'} · Vào {staff.activeShiftStartTime || '08:00'}
                      </AppText>
                    ) : (
                      <AppText variant="sm" color={theme.text.muted} tabularNums>
                        Tháng này: {staff.currentMonthHours}h · {staff.currentMonthShifts} ca
                      </AppText>
                    )}
                  </View>
                </View>
              </View>

              {/* Nút hành động Vào Ca / Ra Ca 1-chạm DUY NHẤT to rõ */}
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                {staff.isWorking ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } catch {}
                      }
                      onClockOut(staff);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={[s.actionBtn, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent }]}
                  >
                    <Icon name="clock-out" size={16} color={theme.text.onBrand} />
                    <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                      Ra Ca
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      onClockIn(staff);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={[s.actionBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                  >
                    <Icon name="clock-in" size={16} color={theme.text.primary} />
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Vào Ca
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* 4. Phân đoạn: Nhật Ký Ca Làm Việc */}
      <View style={[s.sectionHeader, { backgroundColor: theme.surface.app, marginTop: 14 }]}>
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ letterSpacing: 0.5 }}>
          NHẬT KÝ CA
        </AppText>
        <View style={[s.segmentedContainer, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setLogFilter('today');
            }}
            hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
            style={[
              s.segmentedPill,
              {
                backgroundColor: logFilter === 'today' ? theme.brand.primary : 'transparent',
              },
            ]}
          >
            <AppText
              variant="sm"
              weight={logFilter === 'today' ? 'medium' : 'normal'}
              color={logFilter === 'today' ? theme.text.onBrand : theme.text.muted}
              tabularNums
            >
              Hôm Nay ({todayLogs.length})
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setLogFilter('all');
            }}
            hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
            style={[
              s.segmentedPill,
              {
                backgroundColor: logFilter === 'all' ? theme.brand.primary : 'transparent',
              },
            ]}
          >
            <AppText
              variant="sm"
              weight={logFilter === 'all' ? 'medium' : 'normal'}
              color={logFilter === 'all' ? theme.text.onBrand : theme.text.muted}
              tabularNums
            >
              Tất Cả ({shiftLogs.length})
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Danh sách nhật ký */}
      <View style={[s.logListWrapper, isWide && { paddingHorizontal: 16 }]}>
        {displayedLogs.length === 0 ? (
          <View style={[s.emptyBox, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle, width: '100%', alignItems: 'center' }]}>
            <Icon name="calendar-blank-outline" size={36} color={theme.text.muted} />
            <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 6 }}>
              Chưa có ca làm việc
            </AppText>
            {staffList.length > 0 && onQuickLog && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onQuickLog()}
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: theme.brand.accent,
                }}
              >
                <Icon name="clock-plus-outline" size={16} color={theme.text.onBrand} />
                <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                  + Chấm Công Nhanh
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayedLogs.map((log) => {
            const shiftCfg = SHIFT_CONFIG[log.shiftType];
            return (
              <View
                key={log.id}
                style={[
                  s.logItem,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderBottomColor: theme.border.subtle,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText variant="md" weight="normal" color={theme.text.primary}>
                      {log.staffName}
                    </AppText>
                    <View style={[s.shiftTag, { backgroundColor: theme.surface.header }]}>
                      <Icon name={(shiftCfg?.icon || 'clock-outline') as any} size={12} color={theme.text.muted} />
                      <AppText variant="xs" color={theme.text.muted}>
                        {shiftCfg?.label || log.shiftType}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <AppText variant="sm" color={theme.text.muted} tabularNums>
                      {log.date} ({log.startTime || ''} - {log.endTime || ''})
                    </AppText>
                    {log.note ? (
                      <AppText variant="sm" color={theme.text.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
                        · "{log.note}"
                      </AppText>
                    ) : null}
                  </View>
                </View>

                {/* Giờ công & Nút xóa 44x44pt */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                    <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums>
                      +{log.hours}h
                    </AppText>
                    {log.otHours && log.otHours > 0 ? (
                      <AppText variant="xs" color={theme.brand.warning} tabularNums>
                        +{log.otHours}h OT
                      </AppText>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleDeleteLog(log)}
                    style={s.deleteBtn}
                  >
                    <Icon name="trash-can-outline" size={18} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  staffListWrapper: {
    width: '100%',
  },
  attendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 40,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  segmentedPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logListWrapper: {
    width: '100%',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 52,
  },
  shiftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
