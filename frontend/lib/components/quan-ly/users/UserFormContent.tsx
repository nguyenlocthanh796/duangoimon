import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../../theme';

interface UserFormContentProps {
  form: { username: string; password: string; full_name: string; role: string; is_active: boolean };
  onChange: (updates: Partial<UserFormContentProps['form']>) => void;
  editingId: string | null;
  showPassword: boolean;
  onTogglePassword: () => void;
}

const ROLES: Array<{ key: string; label: string; color: string; bg: string; icon: string }> = [
  { key: 'admin', label: 'Admin', color: '#8B5CF6', bg: '#F5F3FF', icon: 'admin-panel-settings' },
  { key: 'manager', label: 'Quản lý', color: '#EF4444', bg: '#FEF2F2', icon: 'manage-accounts' },
  { key: 'cashier', label: 'Thu ngân', color: '#F97316', bg: '#FFF7ED', icon: 'cash-register' },
  { key: 'accountant', label: 'Kế toán', color: '#10B981', bg: '#ECFDF5', icon: 'calculate' },
  { key: 'kitchen', label: 'Bếp', color: '#F59E0B', bg: '#FEF3C7', icon: 'restaurant' },
];

export default function UserFormContent({
  form,
  onChange,
  editingId,
  showPassword,
  onTogglePassword,
}: UserFormContentProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Họ tên</Text>
        <TextInput
          style={styles.input}
          placeholder="Nguyễn Văn A"
          placeholderTextColor={colors.text.placeholder}
          value={form.full_name}
          onChangeText={(v) => onChange({ full_name: v })}
        />
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Tài khoản *</Text>
        <TextInput
          style={[styles.input, editingId ? { color: colors.text.secondary } : {}]}
          placeholder="username"
          placeholderTextColor={colors.text.placeholder}
          autoCapitalize="none"
          value={form.username}
          onChangeText={(v) => onChange({ username: v })}
          editable={!editingId}
        />
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>
          Mật khẩu {editingId ? '(để trống để giữ nguyên)' : '*'}
        </Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
            placeholder={editingId ? '••••••••' : 'Tối thiểu 6 ký tự'}
            placeholderTextColor={colors.text.placeholder}
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(v) => onChange({ password: v })}
          />
          <TouchableOpacity onPress={onTogglePassword}>
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Vai trò</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.roleCard,
                form.role === r.key && { borderColor: r.color, backgroundColor: r.bg },
              ]}
              onPress={() => onChange({ role: r.key })}
            >
              <Icon
                name={r.icon as any}
                size={20}
                color={form.role === r.key ? r.color : colors.text.secondary}
              />
              <Text style={[styles.roleCardText, form.role === r.key && { color: r.color }]}>
                {r.label}
              </Text>
              {form.role === r.key && (
                <View style={[styles.roleCheck, { backgroundColor: r.color }]}>
                  <Icon name="check" size={10} color={colors.text.inverse} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.inputLabel}>Trạng thái hoạt động</Text>
          <Text style={styles.switchSub}>
            {form.is_active ? 'Nhân viên có thể đăng nhập' : 'Tài khoản bị khóa'}
          </Text>
        </View>
        <Switch
          value={form.is_active}
          onValueChange={(v) => onChange({ is_active: v })}
          trackColor={{ false: colors.track.off, true: colors.track.on }}
          thumbColor={form.is_active ? colors.status.success : colors.text.danger}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputWrap: { marginBottom: 16 },
  inputLabel: { ...font.md, color: colors.text.body, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...font.md,
    color: colors.text.primary,
    backgroundColor: colors.surface.disabled,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.disabled,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.disabled,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  roleCardText: { ...font.sm, fontWeight: '600', color: colors.text.secondary },
  roleCheck: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  switchSub: { ...font.sm, color: colors.text.secondary, marginTop: 2 },
});
