import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };
type FormState = { order_id: string; buyer_name: string; buyer_tax_code: string; vat_rate: string };
type Errors = Partial<Record<keyof FormState, string>>;

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Errors;
  setErrors: React.Dispatch<React.SetStateAction<Errors>>;
  paidOrders: PaidOrder[];
  ordersLoading: boolean;
}

export default function InvoiceFormContent({
  form,
  setForm,
  errors,
  setErrors,
  paidOrders,
  ordersLoading,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedOrder = paidOrders.find((x) => x.id === form.order_id);

  return (
    <>
      <Text style={styles.label}>Mã đơn hàng *</Text>
      <TouchableOpacity
        style={[styles.input, styles.pickerRow, errors.order_id && styles.inputError]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        {ordersLoading ? (
          <ActivityIndicator size="small" color={colors.brand.primary} />
        ) : (
          <>
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                color: form.order_id ? colors.text.primary : colors.text.placeholder,
              }}
              numberOfLines={1}
            >
              {selectedOrder
                ? `${selectedOrder.table_name} · #${selectedOrder.id.slice(-6).toUpperCase()}`
                : 'Chọn đơn hàng đã thanh toán'}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.icon.muted} />
          </>
        )}
      </TouchableOpacity>
      {!!errors.order_id && <Text style={styles.errorText}>{errors.order_id}</Text>}

      {/* Order picker modal */}
      <Modal visible={showPicker} animationType="slide" transparent statusBarTranslucent>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Chọn đơn hàng</Text>
          {paidOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Icon name="receipt" size={36} color={colors.border.default} />
              <Text style={{ color: colors.text.muted, fontSize: 13 }}>
                Không có đơn hàng đã thanh toán
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {paidOrders.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={styles.orderRow}
                  onPress={() => {
                    setForm((f) => ({ ...f, order_id: o.id }));
                    setErrors((e) => ({ ...e, order_id: undefined }));
                    setShowPicker(false);
                  }}
                >
                  <View style={styles.orderDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderName}>{o.table_name || `Đơn #${o.id.slice(-6)}`}</Text>
                    {o.total != null && (
                      <Text style={styles.orderTotal}>{o.total.toLocaleString('vi-VN')}₫</Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.border.default} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Text style={styles.label}>Tên người mua *</Text>
      <TextInput
        style={[styles.input, errors.buyer_name && styles.inputError]}
        placeholder="Nhập tên người mua"
        placeholderTextColor={colors.text.placeholder}
        value={form.buyer_name}
        onChangeText={(v) => {
          setForm((f) => ({ ...f, buyer_name: v }));
          setErrors((e) => ({ ...e, buyer_name: undefined }));
        }}
      />
      {!!errors.buyer_name && <Text style={styles.errorText}>{errors.buyer_name}</Text>}

      <Text style={styles.label}>Mã số thuế</Text>
      <TextInput
        style={styles.input}
        placeholder="Mã số thuế (không bắt buộc)"
        placeholderTextColor={colors.text.placeholder}
        value={form.buyer_tax_code}
        onChangeText={(v) => setForm((f) => ({ ...f, buyer_tax_code: v }))}
      />

      <Text style={styles.label}>Thuế suất VAT (%)</Text>
      <TextInput
        style={[styles.input, errors.vat_rate && styles.inputError]}
        placeholder="10"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="numeric"
        value={form.vat_rate}
        onChangeText={(v) => {
          setForm((f) => ({ ...f, vat_rate: v }));
          setErrors((e) => ({ ...e, vat_rate: undefined }));
        }}
      />
      {!!errors.vat_rate && <Text style={styles.errorText}>{errors.vat_rate}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: shape.radius.md,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 44,
    backgroundColor: colors.surface.disabled,
    marginBottom: 4,
  },
  inputError: { borderColor: colors.status.danger },
  errorText: { fontSize: 11, color: colors.status.danger, marginBottom: 8, marginLeft: 2 },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: colors.surface.overlay },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { ...font.sectionTitle, color: colors.text.primary, marginBottom: 16 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  orderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
    marginRight: 12,
  },
  orderName: { ...font.bodySmall, fontWeight: '600', color: colors.text.primary },
  orderTotal: { ...font.caption, color: colors.text.muted, marginTop: 1 },
});
