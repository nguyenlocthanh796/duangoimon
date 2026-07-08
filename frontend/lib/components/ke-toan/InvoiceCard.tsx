import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, font } from '../../theme';
import { shape } from '../../theme/shape';
import type { Invoice } from '../../api';

const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_COLOR: Record<string, string> = { moi: colors.status.warning, da_xuat: colors.status.success, huy: colors.status.danger };
const STATUS_BG: Record<string, string> = { moi: colors.status.warningBg, da_xuat: colors.status.successBg, huy: colors.status.dangerBg };

const formatAmount = (n: number) => n.toLocaleString('vi-VN') + '₫';
const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

interface InvoiceCardProps {
  item: Invoice;
  exportingId: string | null;
  onExport: (id: string, invoiceNumber: string) => void;
  isWide?: boolean;
}

export default function InvoiceCard({ item, exportingId, onExport, isWide = false }: InvoiceCardProps) {
  const isExporting = exportingId === item.id;
  const beforeTax = item.total_amount - (item.vat_amount || 0);

  if (isWide) {
    return (
      <View style={styles.tableRow}>
        <Text style={[styles.colText, { flex: 1.2, fontWeight: '700' }]} numberOfLines={1}>
          {item.invoice_number}
        </Text>
        <Text style={[styles.colText, { flex: 1 }]} numberOfLines={1}>
          {item.invoice_symbol || '1K26TLO'}
        </Text>
        <View style={{ flex: 2 }}>
          <Text style={styles.colTextPrimary} numberOfLines={1}>
            {item.buyer_name || 'Khách vãng lai'}
          </Text>
          {item.buyer_tax_code ? (
            <Text style={styles.colTextSub} numberOfLines={1}>
              MST: {item.buyer_tax_code}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.colText, { flex: 1.2, textAlign: 'right' }]}>
          {formatAmount(beforeTax)}
        </Text>
        <Text style={[styles.colText, { flex: 0.8, textAlign: 'center' }]}>
          {item.vat_rate}%
        </Text>
        <Text style={[styles.colText, { flex: 1, textAlign: 'right', color: colors.text.muted }]}>
          {formatAmount(item.vat_amount || 0)}
        </Text>
        <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', fontWeight: '800', color: colors.text.primary }]}>
          {formatAmount(item.total_amount)}
        </Text>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] ?? colors.surface.disabled }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? colors.text.muted }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {item.status === 'moi' ? (
            <TouchableOpacity
              onPress={() => onExport(item.id, item.invoice_number)}
              style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.exportText}>Xuất</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.colTextSub}>{formatDate(item.exported_at || item.created_at)}</Text>
          )}
        </View>
      </View>
    );
  }

  // Mobile layout: Compact 3 columns
  return (
    <View style={styles.tableRow}>
      <View style={{ flex: 2 }}>
        <Text style={styles.colTextPrimary} numberOfLines={1}>
          {item.invoice_number}
        </Text>
        <Text style={styles.colTextSub} numberOfLines={1}>
          {item.buyer_name || 'Khách vãng lai'}
        </Text>
      </View>
      <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', fontWeight: '800', color: colors.text.primary }]}>
        {formatAmount(item.total_amount)}
      </Text>
      <View style={{ flex: 1.2, alignItems: 'flex-end', justifyContent: 'center' }}>
        {item.status === 'moi' ? (
          <TouchableOpacity
            onPress={() => onExport(item.id, item.invoice_number)}
            style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.exportText}>Xuất</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] ?? colors.surface.disabled }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? colors.text.muted }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: shape.radius.sm,
  },
  badgeText: {
    ...font.badge,
    fontWeight: '700',
  },
  colText: {
    ...font.bodySmall,
    color: colors.text.primary,
  },
  colTextPrimary: {
    ...font.bodySmall,
    fontWeight: '600',
    color: colors.text.primary,
  },
  colTextSub: {
    ...font.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  exportBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: shape.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportText: {
    ...font.badge,
    fontWeight: '700',
    color: colors.text.inverse,
  },
});
