import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { StyleSheet } from 'react-native';
import { colors, font, ss } from '../../../theme';
import { useCategoryOptionSettings } from '../../../hooks/useCategoryOptionSettings';

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
  const { categories } = useCategoryOptionSettings();

  // Combine default categories with any custom categories saved in settings
  const categoryNames = categories.map((c) => c.name);

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={ss.sectionWrap}>
        <View style={ss.sectionHeader}>
          <Text style={{ ...font.smBold, color: '#1E293B', letterSpacing: 0.5 }}>
            THÔNG TIN MÓN ĂN
          </Text>
        </View>

        <View style={{ padding: 12 }}>
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
              <Text style={styles.inputLabel}>Đơn vị tính</Text>
              <TextInput
                style={styles.input}
                placeholder="phần, ly, tô, dĩa..."
                placeholderTextColor={colors.text.muted}
                value={form.unit}
                onChangeText={(v) => onChange({ unit: v })}
              />
            </View>
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Tên món ăn / Đồ uống *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Phở bò đặc biệt, Trà sữa Oolong Lài..."
              placeholderTextColor={colors.text.muted}
              value={form.name}
              onChangeText={(v) => onChange({ name: v })}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Danh mục món ăn</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {categoryNames.map((cat) => {
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
              <Text style={styles.inputLabel}>Giá vốn nguyên liệu</Text>
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
              <Text style={styles.switchSub}>Tắt để ẩn món khỏi màn hình chọn món Bán Hàng POS</Text>
            </View>
            <Switch
              value={form.is_active}
              onValueChange={(v) => onChange({ is_active: v })}
              trackColor={{ false: '#CBD5E1', true: colors.brand.primary + '80' }}
              thumbColor={form.is_active ? colors.brand.primary : '#F1F5F9'}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formRow: { flexDirection: 'row', gap: 10 },
  inputWrap: { marginBottom: 14 },
  inputLabel: { ...font.smBold, color: '#0F172A', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    ...font.md,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  catChip: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catChipText: { ...font.sm, fontWeight: '600', color: '#475569' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: 4,
  },
  switchSub: { ...font.sm, color: colors.text.secondary, marginTop: 2 },
});
