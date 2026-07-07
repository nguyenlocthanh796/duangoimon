import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

type FormState = { type: 'thu' | 'chi'; category: string; amount: string; note: string };
type Errors = Partial<Record<keyof FormState, string>>;

export default function TransactionFormContent({
  form, setForm, errors, setErrors,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Errors;
  setErrors: React.Dispatch<React.SetStateAction<Errors>>;
}) {
  const set = (field: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [field]: v }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <>
      <Text style={styles.inputLabel}>Loại giao dịch *</Text>
      <View style={styles.typeRow}>
        {(['thu', 'chi'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setForm(f => ({ ...f, type: t }))}
            style={[styles.typeBtn, form.type === t && (t === 'thu' ? styles.typeBtnThu : styles.typeBtnChi)]}
          >
            <Icon
              name={t === 'thu' ? 'arrow-down' : 'arrow-up'}
              size={16}
              color={form.type === t ? '#fff' : (t === 'thu' ? '#10B981' : '#EF4444')}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>
              {t === 'thu' ? 'Thu' : 'Chi'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Danh mục *</Text>
      <TextInput
        style={[styles.input, errors.category ? styles.inputError : null]}
        placeholder="Điện nước, lương, bán hàng..."
        placeholderTextColor="#94A3B8"
        value={form.category}
        onChangeText={set('category')}
      />
      {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

      <Text style={styles.inputLabel}>Số tiền (₫) *</Text>
      <TextInput
        style={[styles.input, errors.amount ? styles.inputError : null]}
        placeholder="0"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        value={form.amount}
        onChangeText={set('amount')}
      />
      {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

      <Text style={styles.inputLabel}>Ghi chú</Text>
      <TextInput
        style={[styles.input, styles.noteInput]}
        placeholder="Nhập ghi chú (tùy chọn)"
        placeholderTextColor="#94A3B8"
        value={form.note}
        onChangeText={set('note')}
        multiline
        numberOfLines={2}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  typeBtnThu: { backgroundColor: '#10B981', borderColor: '#10B981' },
  typeBtnChi: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  typeBtnText: { fontWeight: '700', color: '#64748B', fontSize: 14 },
  typeBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    padding: 13, fontSize: 14, color: '#1E293B',
    backgroundColor: '#F8FAFC', marginBottom: 4,
  },
  inputError: { borderColor: '#EF4444' },
  noteInput: { height: 72, textAlignVertical: 'top' },
  errorText: { fontSize: 11, color: '#EF4444', marginBottom: 8, marginLeft: 2 },
});
