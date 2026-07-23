import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';

export interface TransactionFormValues {
  type: 'thu' | 'chi';
  amount: string; // raw text from input
  category: string;
  note: string;
}

interface TransactionFormContentProps {
  initial?: Partial<TransactionFormValues>;
  onChange?: (v: TransactionFormValues) => void;
  onSubmit?: () => void;
}

const CATEGORIES_THU = ['Bán hàng', 'Đặt cọc', 'Thu nợ', 'Hoàn tiền', 'Khác'];
const CATEGORIES_CHI = [
  'Mua nguyên liệu',
  'Tiền lương',
  'Tiền thuê',
  'Điện nước',
  'Marketing',
  'Sửa chữa',
  'Khác',
];

export default function TransactionFormContent({
  initial,
  onChange,
  onSubmit,
}: TransactionFormContentProps) {
  const [type, setType] = useState<'thu' | 'chi'>(initial?.type ?? 'thu');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES_THU[0]);
  const [note, setNote] = useState(initial?.note ?? '');

  const cats = type === 'thu' ? CATEGORIES_THU : CATEGORIES_CHI;

  const emit = (patch: Partial<TransactionFormValues>) => {
    const next = { type, amount, category, note, ...patch };
    onChange?.(next);
  };

  const switchType = (t: 'thu' | 'chi') => {
    const defCat = t === 'thu' ? CATEGORIES_THU[0] : CATEGORIES_CHI[0];
    setType(t);
    setCategory(defCat);
    emit({ type: t, category: defCat });
  };

  return (
    <View>
      {/* Type toggle */}
      <View style={styles.seg}>
        <TouchableOpacity
          style={[styles.segBtn, type === 'thu' && styles.segBtnActiveThu]}
          onPress={() => switchType('thu')}
        >
          <Icon
            name="arrow-bottom-left"
            size={18}
            color={type === 'thu' ? '#fff' : colors.status.success}
          />
          <Text style={[styles.segText, type === 'thu' && styles.segTextActive]}>Thu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, type === 'chi' && styles.segBtnActiveChi]}
          onPress={() => switchType('chi')}
        >
          <Icon
            name="arrow-top-right"
            size={18}
            color={type === 'chi' ? '#fff' : colors.status.danger}
          />
          <Text style={[styles.segText, type === 'chi' && styles.segTextActive]}>Chi</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <Text style={styles.label}>Số tiền (₫)</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.text.muted}
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            emit({ amount: t });
          }}
        />
      </View>

      {/* Category */}
      <Text style={styles.label}>Danh mục</Text>
      <View style={styles.catWrap}>
        {cats.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, category === c && styles.catChipActive]}
            onPress={() => {
              setCategory(c);
              emit({ category: c });
            }}
          >
            <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Note */}
      <Text style={styles.label}>Ghi chú</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, { height: 72 }]}
          multiline
          placeholder="Ghi chú thêm (không bắt buộc)"
          placeholderTextColor={colors.text.muted}
          value={note}
          onChangeText={(t) => {
            setNote(t);
            emit({ note: t });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  segBtnActiveThu: { backgroundColor: colors.status.success, borderColor: colors.status.success },
  segBtnActiveChi: { backgroundColor: colors.status.danger, borderColor: colors.status.danger },
  segText: { ...font.md, fontWeight: '600', color: colors.text.primary },
  segTextActive: { color: '#fff' },
  label: { ...font.smBold, color: colors.text.secondary, marginBottom: 8, marginTop: 6 },
  inputWrap: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 14,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...font.md,
    color: colors.text.primary,
    textAlignVertical: 'top',
  },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: shape.radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  catChipActive: { backgroundColor: colors.brand.primaryBg, borderColor: colors.brand.primary },
  catText: { ...font.sm, color: colors.text.muted, fontWeight: '600' },
  catTextActive: { color: colors.brand.primary },
  submit: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0,0,0,0.12)',
  },
  submitText: { ...font.mdBold, color: '#fff', fontWeight: '600' },
});
