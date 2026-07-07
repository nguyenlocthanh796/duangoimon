import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };

type FormState = {
  order_id: string;
  buyer_name: string;
  buyer_tax_code: string;
  vat_rate: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function InvoiceFormContent({
  form, setForm, errors, setErrors,
  paidOrders, ordersLoading,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Errors;
  setErrors: React.Dispatch<React.SetStateAction<Errors>>;
  paidOrders: PaidOrder[];
  ordersLoading: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const selectedOrder = paidOrders.find(x => x.id === form.order_id);

  return (
    <>
      <Text style={styles.inputLabel}>Mã đơn hàng *</Text>
      <TouchableOpacity
        style={[styles.input, styles.pickerRow, errors.order_id ? styles.inputError : null]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        {ordersLoading ? (
          <ActivityIndicator size="small" color="#F97316" />
        ) : (
          <>
            <Text style={{ flex: 1, fontSize: 14, color: form.order_id ? '#1E293B' : '#94A3B8' }} numberOfLines={1}>
              {selectedOrder
                ? `${selectedOrder.table_name} · #${selectedOrder.id.slice(-6).toUpperCase()}`
                : 'Chọn đơn hàng đã thanh toán'}
            </Text>
            <Icon name="chevron-down" size={20} color="#94A3B8" />
          </>
        )}
      </TouchableOpacity>
      {errors.order_id ? <Text style={styles.errorText}>{errors.order_id}</Text> : null}

      <Modal visible={showPicker} animationType="slide" transparent statusBarTranslucent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={[styles.modal, { maxHeight: '60%' }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { fontSize: 16, marginBottom: 12 }]}>Chọn đơn hàng</Text>
          {paidOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Icon name="receipt" size={36} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13 }}>Không có đơn hàng đã thanh toán</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {paidOrders.map(o => (
                <TouchableOpacity
                  key={o.id}
                  onPress={() => {
                    setForm(f => ({ ...f, order_id: o.id }));
                    setErrors(e => ({ ...e, order_id: undefined }));
                    setShowPicker(false);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 12, paddingHorizontal: 4,
                    borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9',
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Icon name="receipt" size={18} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
                      {o.table_name || `Đơn #${o.id.slice(-6)}`}
                    </Text>
                    {o.total != null && (
                      <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                        {o.total.toLocaleString('vi-VN')}₫
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Text style={styles.inputLabel}>Tên người mua *</Text>
      <TextInput
        style={[styles.input, errors.buyer_name ? styles.inputError : null]}
        placeholder="Nhập tên người mua"
        placeholderTextColor="#94A3B8"
        value={form.buyer_name}
        onChangeText={(v) => { setForm(f => ({ ...f, buyer_name: v })); setErrors(e => ({ ...e, buyer_name: undefined })); }}
      />
      {errors.buyer_name ? <Text style={styles.errorText}>{errors.buyer_name}</Text> : null}

      <Text style={styles.inputLabel}>Mã số thuế</Text>
      <TextInput
        style={styles.input}
        placeholder="Mã số thuế (không bắt buộc)"
        placeholderTextColor="#94A3B8"
        value={form.buyer_tax_code}
        onChangeText={(v) => setForm(f => ({ ...f, buyer_tax_code: v }))}
      />

      <Text style={styles.inputLabel}>Thuế suất VAT (%)</Text>
      <TextInput
        style={[styles.input, errors.vat_rate ? styles.inputError : null]}
        placeholder="10"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        value={form.vat_rate}
        onChangeText={(v) => { setForm(f => ({ ...f, vat_rate: v })); setErrors(e => ({ ...e, vat_rate: undefined })); }}
      />
      {errors.vat_rate ? <Text style={styles.errorText}>{errors.vat_rate}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    padding: 13, fontSize: 14, color: '#1E293B',
    backgroundColor: '#F8FAFC', marginBottom: 4,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 11, color: '#EF4444', marginBottom: 8, marginLeft: 2 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 20 },
});
