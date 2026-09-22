import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText, AppModal } from '../../components/ui';
import {
  PayrollRecord,
  ROLE_CONFIG,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface PayrollHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  payrollHistory: PayrollRecord[];
  onSelectRecord: (record: PayrollRecord) => void;
}

export function PayrollHistoryModal({
  visible,
  onClose,
  payrollHistory,
  onSelectRecord,
}: PayrollHistoryModalProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = payrollHistory.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return r.staffName.toLowerCase().includes(q) || r.period.toLowerCase().includes(q);
  });

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Lịch Sử Chi Lương"
      subtitle={`${payrollHistory.length} phiếu đã thanh toán`}
      icon={<Icon name="history" size={20} color={theme.brand.accent} />}
      width={520}
      scrollable={false}
      footer={
        <View style={s.modalFooter}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onClose}
            style={[
              s.modalBtn,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              Đóng
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ flex: 1, padding: 14 }}>
        {/* Search bar */}
        <View
          style={[
            s.searchBar,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Icon name="magnify" size={18} color={theme.text.muted} />
          <TextInput
            placeholder="Tìm theo tên, kỳ lương..."
            placeholderTextColor={theme.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[s.searchInput, { color: theme.text.primary }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={16} color={theme.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List */}
        <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
          {filteredHistory.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Icon name="cash-remove" size={36} color={theme.text.muted} />
              <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 8 }}>
                Chưa có phiếu chi lương nào
              </AppText>
            </View>
          ) : (
            filteredHistory.map((item) => {
              const roleInfo = ROLE_CONFIG[item.role] || {
                label: 'Nhân Viên',
                color: theme.brand.primary,
              };
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    onSelectRecord(item);
                  }}
                  style={[
                    s.historyItem,
                    {
                      backgroundColor: theme.surface.card,
                      borderColor: theme.border.subtle,
                    },
                  ]}
                >
                  <View style={s.itemLeft}>
                    <View style={[s.avatarSquircle, { backgroundColor: `${roleInfo.color}18` }]}>
                      <Icon name="account" size={18} color={roleInfo.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                          {item.staffName}
                        </AppText>
                        <View style={[s.badge, { backgroundColor: `${roleInfo.color}15` }]}>
                          <AppText variant="xs" color={roleInfo.color}>
                            {roleInfo.label}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                        {item.period} · {item.paidDate} {item.paidTime}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                      {formatCurrency(item.netSalary)} đ
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                      {item.paymentMethod === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </AppModal>
  );
}

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
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 16,
  },
  modalScroll: {
    flexShrink: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  modalBtn: {
    paddingHorizontal: 20,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
});
