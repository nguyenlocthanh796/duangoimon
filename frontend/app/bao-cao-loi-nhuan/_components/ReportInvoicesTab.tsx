import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText } from '../../../lib/components/ui/AppText';
import { playTapSound } from '../../../lib/utils/sound';
import { InvoiceRecord } from './types';

interface ReportInvoicesTabProps {
  invoiceSearch: string;
  onSetInvoiceSearch: (val: string) => void;
  invoicePayFilter: 'all' | 'tien_mat' | 'vietqr';
  onSetInvoicePayFilter: (filter: 'all' | 'tien_mat' | 'vietqr') => void;
  filteredInvoices: InvoiceRecord[];
  onSelectInvoice: (inv: InvoiceRecord) => void;
  selectedInvoice?: InvoiceRecord | null;
}

export const ReportInvoicesTab: React.FC<ReportInvoicesTabProps> = ({
  invoiceSearch,
  onSetInvoiceSearch,
  invoicePayFilter,
  onSetInvoicePayFilter,
  filteredInvoices,
  onSelectInvoice,
  selectedInvoice,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();

  return (
    <View style={{ gap: isWide ? 10 : 0 }}>
      {/* THANH TÌM KIẾM HÓA ĐƠN & FILTER PHƯƠNG THỨC */}
      <View
        style={[
          s.glassSearchBar,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            paddingHorizontal: 16,
            paddingVertical: 10,
          },
        ]}
      >
        <View
          style={[
            s.searchInputRow,
            {
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
              paddingHorizontal: 12,
              height: 44,
            },
          ]}
        >
          <Icon name="magnify" size={20} color={theme.text.muted} style={{ marginRight: 8 }} />
          <TextInput
            value={invoiceSearch}
            onChangeText={onSetInvoiceSearch}
            placeholder="Tìm theo mã HĐ, bàn, thu ngân..."
            placeholderTextColor={theme.text.muted}
            style={[s.searchInput, { color: theme.text.primary }]}
          />
          {invoiceSearch ? (
            <TouchableOpacity
              onPress={() => onSetInvoiceSearch('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={18} color={theme.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Segmented Pill Track: Tất Cả | Tiền Mặt | VietQR */}
        <View style={[s.paySegmentTrack, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
          {[
            { key: 'all', label: 'Tất Cả' },
            { key: 'tien_mat', label: 'Tiền Mặt' },
            { key: 'vietqr', label: 'VietQR' },
          ].map((f) => {
            const isSel = invoicePayFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  onSetInvoicePayFilter(f.key as any);
                }}
                style={[
                  s.paySegmentItem,
                  isSel && {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderWidth: StyleSheet.hairlineWidth,
                    ...(Platform.OS === 'web'
                      ? ({ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)' } as any)
                      : { elevation: 1 }),
                  },
                ]}
              >
                <AppText
                  variant="sm"
                  weight={isSel ? 'bold' : 'medium'}
                  color={isSel ? theme.brand.primary : theme.text.muted}
                >
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* DANH SÁCH HÓA ĐƠN SQUIRCLE GLASS CARD (INLINE EXPANDABLE, ZERO POPUP) */}
      <View
        style={[
          s.glassListContainer,
          {
            backgroundColor: theme.surface.card,
            borderColor: isWide ? theme.border.glassBorder : 'transparent',
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderTopWidth: isWide ? 1 : 0,
            borderTopColor: theme.border.subtle,
            borderBottomWidth: isWide ? 1 : StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            ...(Platform.OS === 'web' && isWide
              ? ({
                  boxShadow: isDark
                    ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                    : '0 2px 10px rgba(15, 23, 42, 0.04)',
                } as any)
              : { elevation: 0 }),
          },
        ]}
      >
        {filteredInvoices.length === 0 ? (
          <View style={{ padding: 36, alignItems: 'center' }}>
            <Icon name="file-document-outline" size={40} color={theme.text.muted} />
            <AppText variant="md" color={theme.text.muted} style={{ marginTop: 8 }}>
              Không có hóa đơn nào
            </AppText>
          </View>
        ) : (
          filteredInvoices.map((inv, idx) => {
            const isLast = idx === filteredInvoices.length - 1;
            const isSelected = isWide && selectedInvoice?.id === inv.id;

            return (
              <View
                key={inv.id}
                style={[
                  !isLast && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    onSelectInvoice(inv);
                  }}
                  style={[
                    s.invoiceRow,
                    isSelected && {
                      backgroundColor: theme.status.warningBg,
                      borderLeftWidth: 4,
                      borderLeftColor: theme.brand.accent,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.invIconBox,
                      {
                        backgroundColor:
                          inv.payMethod === 'vietqr'
                            ? isDark
                              ? 'rgba(251, 146, 60, 0.18)'
                              : 'rgba(234, 88, 12, 0.12)'
                            : isDark
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(16, 185, 129, 0.12)',
                      },
                    ]}
                  >
                    <Icon
                      name={inv.payMethod === 'vietqr' ? 'qrcode-scan' : 'cash'}
                      size={18}
                      color={inv.payMethod === 'vietqr' ? theme.brand.accent : theme.brand.success}
                    />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                        {inv.id}
                      </AppText>
                      <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                        {inv.totalAmount.toLocaleString('vi-VN')} đ
                      </AppText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <AppText variant="xs" color={theme.text.muted} tabularNums>
                        {inv.tableName} · {inv.time} · {inv.cashier}
                      </AppText>
                      <AppText
                        variant="xs"
                        color={inv.payMethod === 'vietqr' ? theme.brand.accent : theme.brand.success}
                        weight="bold"
                      >
                        {inv.payMethod === 'vietqr' ? 'VietQR' : 'Tiền Mặt'}
                      </AppText>
                    </View>
                  </View>

                  <Icon name="chevron-right" size={18} color={theme.text.muted} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  glassSearchBar: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  paySegmentTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 38,
  },
  paySegmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  glassListContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  invIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
