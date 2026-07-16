import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { StyleSheet } from 'react-native';
import { colors, font } from '../../../theme';

const CATEGORIES = ['Đồ ăn', 'Đồ uống', 'Tráng miệng', 'Snack', 'Khác'];

interface MenuFormContentProps {
  form: {
    code: string;
    name: string;
    category: string;
    price: string;
    cost_price: string;
    unit: string;
    is_active: boolean;
  };
  onChange: (updates: Partial<MenuFormContentProps['form']>) => void;
}

export default function MenuFormContent({ form, onChange }: MenuFormContentProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.formRow}>
        <View style={[styles.inputWrap, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Mã món *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tự động hoặc nhập mã"
            placeholderTextColor={colors.text.muted}
            value={form.code}
            onChangeText={(v) => onChange({ code: v })}
          />
        </View>
        <View style={[styles.inputWrap, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Đơn vị</Text>
          <TextInput
            style={styles.input}
            placeholder="phần"
            placeholderTextColor={colors.text.muted}
            value={form.unit}
            onChangeText={(v) => onChange({ unit: v })}
          />
        </View>
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Tên món *</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Phở bò, Cà phê đen..."
          placeholderTextColor={colors.text.muted}
          value={form.name}
          onChangeText={(v) => onChange({ name: v })}
        />
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Danh mục</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {CATEGORIES.map((cat) => {
            const sel = form.category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  sel && {
                    backgroundColor: colors.brand.primary,
                    borderColor: colors.brand.primary,
                  },
                ]}
                onPress={() => onChange({ category: form.category === cat ? '' : cat })}
              >
                <Text style={[styles.catChipText, sel && { color: colors.text.inverse }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.inputWrap, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Giá bán *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
            value={form.price}
            onChangeText={(v) => onChange({ price: v })}
          />
        </View>
        <View style={[styles.inputWrap, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Giá vốn</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.muted}
            keyboardType="numeric"
            value={form.cost_price}
            onChangeText={(v) => onChange({ cost_price: v })}
          />
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Còn kinh doanh</Text>
          <Text style={styles.switchSub}>Tắt để ẩn món khỏi chọn món</Text>
        </View>
        <Switch
          value={form.is_active}
          onValueChange={(v) => onChange({ is_active: v })}
          trackColor={{ false: '#CBD5E1', true: colors.brand.primary + '80' }}
          thumbColor={form.is_active ? colors.brand.primary : '#F1F5F9'}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formRow: { flexDirection: 'row', gap: 10 },
  inputWrap: { marginBottom: 14 },
  inputLabel: { ...font.label, color: colors.text.primary, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...font.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.disabled,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.app,
  },
  catChipText: { ...font.bodySmall, fontWeight: '600', color: colors.text.secondary },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: 4,
  },
  switchSub: { ...font.caption, color: colors.text.secondary, marginTop: 2 },
});
