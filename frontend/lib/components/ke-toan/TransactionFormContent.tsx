import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

type FormState = { type: 'thu' | 'chi'; category: string; amount: string; note: string };
type Errors = Partial<Record<keyof FormState, string>>;

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Errors;
  setErrors: React.Dispatch<React.SetStateAction<Errors>>;
}

export default function TransactionFormContent({ form, setForm, errors, setErrors }: Props) {
  const set = (field: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [field]: v }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <>
      {/* Type picker */}
      <Text style={styles.label}>Loại giao dịch *</Text>
      <View style={styles.typeRow}>
        {(['thu', 'chi'] as const).map(t => {
          const active = form.type === t;
          return (
            <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, type: t }))}
              style={[styles.typeBtn, active && (t === 'thu' ? styles.typeThuActive : styles.typeChiActive)]}>
              <Icon name={t === 'thu' ? 'arrow-down' : 'arrow-up'} size={16}
                color={active ? '#fff' : (t === 'thu' ? colors.status.success : colors.status.danger)}
                style={{ marginRight: 4 }} />
              <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
                {t === 'thu' ? 'Thu' : 'Chi'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fields */}
      <Text style={styles.label}>Danh mục *</Text>
      <TextInput style={[styles.input, errors.category && styles.inputError]}
        placeholder="Điện nước, lương, bán hàng..." placeholderTextColor={colors.text.placeholder}
        value={form.category} onChangeText={set('category')} />
      {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

      <Text style={styles.label}>Số tiền (₫) *</Text>
      <TextInput style={[styles.input, errors.amount && styles.inputError]}
        placeholder="0" placeholderTextColor={colors.text.placeholder}
        keyboardType="numeric" value={form.amount} onChangeText={set('amount')} />
      {!!errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

      <Text style={styles.label}>Ghi chú</Text>
      <TextInput style={[styles.input, styles.noteInput]}
        placeholder="Nhập ghi chú (tùy chọn)" placeholderTextColor={colors.text.placeholder}
        value={form.note} onChangeText={set('note')} multiline numberOfLines={2} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: shape.radius.md, minHeight: 44,
    borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.surface.disabled,
  },
  typeThuActive: { backgroundColor: colors.status.success, borderColor: colors.status.success },
  typeChiActive: { backgroundColor: colors.status.danger, borderColor: colors.status.danger },
  typeBtnText: { ...font.button, color: colors.text.muted },
  typeBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1, borderColor: colors.border.default, borderRadius: shape.radius.md,
    padding: 12, fontSize: 15, color: colors.text.primary, minHeight: 44,
    backgroundColor: colors.surface.disabled, marginBottom: 4,
  },
  inputError: { borderColor: colors.status.danger },
  noteInput: { height: 80, textAlignVertical: 'top' },
  errorText: { fontSize: 11, color: colors.status.danger, marginBottom: 8, marginLeft: 2 },
});
