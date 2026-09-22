import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText, AppModal, Button } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';
import { DateRangeKey } from './types';

interface ReportCustomDateModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRange: DateRangeKey;
  onSelectPreset: (key: DateRangeKey) => void;
  customStartDate: string;
  onSetCustomStartDate: (val: string) => void;
  customEndDate: string;
  onSetCustomEndDate: (val: string) => void;
  onApplyCustom: () => void;
}

export const ReportCustomDateModal: React.FC<ReportCustomDateModalProps> = ({
  visible,
  onClose,
  selectedRange,
  onSelectPreset,
  customStartDate,
  onSetCustomStartDate,
  customEndDate,
  onSetCustomEndDate,
  onApplyCustom,
}) => {
  const { theme } = useTheme();

  const presets: { key: DateRangeKey; label: string; icon: string }[] = [
    { key: 'today', label: 'Hôm Nay', icon: 'calendar-today' },
    { key: 'yesterday', label: 'Hôm Qua', icon: 'calendar-arrow-left' },
    { key: 'week', label: 'Tuần Này', icon: 'calendar-week' },
    { key: 'month', label: 'Tháng Này', icon: 'calendar-month' },
  ];

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Khoảng Thời Gian"
      icon={<Icon name="calendar-range" size={20} color={theme.brand.accent} />}
      width={420}
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
            style={{ flex: 1, height: 48, borderRadius: 12 }}
          />
          <Button
            size="lg"
            variant="accent"
            title="Áp Dụng"
            onPress={() => {
              playTapSound();
              onApplyCustom();
            }}
            style={{ flex: 1, height: 48, borderRadius: 12 }}
          />
        </View>
      }
    >
      <View style={{ padding: 14 }}>
        {/* Quick Presets 2x2 Grid */}
        <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 8 }}>
          Chọn Nhanh
        </AppText>
        <View style={s.presetGrid}>
          {presets.map((p) => {
            const isSel =
              selectedRange === p.key ||
              (p.key === 'week' && selectedRange === '7days') ||
              (p.key === 'month' && (selectedRange === '30days' || selectedRange === 'this_month'));
            return (
              <TouchableOpacity
                key={p.key}
                activeOpacity={0.75}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                onPress={() => {
                  playTapSound();
                  onSelectPreset(p.key);
                  onClose();
                }}
                style={[
                  s.presetBtn,
                  {
                    backgroundColor: isSel ? theme.brand.primaryBg : theme.surface.header,
                    borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <Icon
                  name={p.icon as any}
                  size={16}
                  color={isSel ? theme.brand.primary : theme.text.muted}
                />
                <AppText
                  variant="sm"
                  weight={isSel ? 'bold' : 'normal'}
                  color={isSel ? theme.brand.primary : theme.text.primary}
                >
                  {p.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Date Inputs */}
        <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 8, marginTop: 4 }}>
          Tùy Chỉnh Ngày
        </AppText>
        <View style={{ gap: 10 }}>
          <View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Từ ngày (YYYY-MM-DD):
            </AppText>
            <TextInput
              value={customStartDate}
              onChangeText={onSetCustomStartDate}
              placeholder="2026-09-01"
              placeholderTextColor={theme.text.muted}
              style={[
                s.dateInput,
                {
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                  backgroundColor: theme.surface.header,
                },
              ]}
            />
          </View>

          <View>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Đến ngày (YYYY-MM-DD):
            </AppText>
            <TextInput
              value={customEndDate}
              onChangeText={onSetCustomEndDate}
              placeholder="2026-09-02"
              placeholderTextColor={theme.text.muted}
              style={[
                s.dateInput,
                {
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                  backgroundColor: theme.surface.header,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
  },
});
