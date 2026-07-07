import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import type { Invoice } from '../../api';

const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_COLOR: Record<string, string> = { moi: '#F59E0B', da_xuat: '#10B981', huy: '#EF4444' };
const STATUS_BG: Record<string, string> = { moi: '#FFFBEB', da_xuat: '#ECFDF5', huy: '#FEF2F2' };

function formatAmount(n: number) { return n.toLocaleString('vi-VN') + '₫'; }
function formatDate(iso: string | null) { return iso ? iso.slice(0, 10) : ''; }

interface InvoiceCardProps {
  item: Invoice;
  exportingId: string | null;
  onExport: (id: string, invoiceNumber: string) => void;
}

export default function InvoiceCard({ item, exportingId, onExport }: InvoiceCardProps) {
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={styles.invNumber}>{item.invoice_number}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_BG[item.status] ?? '#F1F5F9' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#64748B' }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {item.buyer_name && (
          <View style={styles.metaRow}>
            <Icon name="account" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.invMeta}>{item.buyer_name}</Text>
          </View>
        )}

        <View style={styles.amountRow}>
          <View style={styles.metaRow}>
            <Icon name="receipt" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.invMeta}>Tổng: </Text>
            <Text style={styles.totalAmount}>{formatAmount(item.total_amount)}</Text>
          </View>
          {item.vat_amount != null && (
            <Text style={styles.vatText}>VAT: {formatAmount(item.vat_amount)}</Text>
          )}
        </View>

        {item.created_at && (
          <View style={styles.metaRow}>
            <Icon name="clock-time-four-outline" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.invMeta}>{formatDate(item.created_at)}</Text>
          </View>
        )}
      </View>

      {item.status === 'moi' && (
        <TouchableOpacity
          onPress={() => onExport(item.id, item.invoice_number)}
          style={[styles.exportBtn, exportingId === item.id && styles.btnDisabled]}
          disabled={exportingId === item.id}
          accessibilityLabel={`Xuất hóa đơn ${item.invoice_number}`}
        >
          {exportingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="upload" size={14} color="#fff" style={{ marginBottom: 2 }} />
              <Text style={styles.exportText}>Xuất HĐ</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface.card, marginHorizontal: 12,
    marginBottom: 8, borderRadius: 4, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  invNumber: { ...font.body, fontWeight: '700', color: colors.text.primary },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  badgeText: { ...font.badge, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  invMeta: { ...font.caption, color: colors.text.secondary },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  totalAmount: { ...font.caption, fontWeight: '700', color: colors.text.primary },
  vatText: { ...font.caption, color: colors.text.secondary },
  exportBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 2, marginLeft: 10,
  },
  btnDisabled: { opacity: 0.6 },
  exportText: { ...font.badge, fontWeight: '700', color: '#fff' },
});
