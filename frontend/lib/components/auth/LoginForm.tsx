import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';

export default function LoginForm({ onLogin }: { onLogin: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'user' | 'pass' | null>(null);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const handleLogin = async () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) newErrors.username = 'Vui lòng nhập tên đăng nhập';
    if (!password.trim()) newErrors.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.message || 'Sai tên đăng nhập hoặc mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Chào mừng trở lại</Text>
      <Text style={styles.subtitle}>Đăng nhập để quản lý và vận hành hệ thống POS</Text>

      <Text style={styles.label}>Tài khoản</Text>
      <View style={[styles.inputWrapper, focusedInput === 'user' && styles.inputWrapperFocused, errors.username ? styles.inputWrapperError : null]}>
        <Icon name="account" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.input}
          placeholder="Nhập tên đăng nhập"
          placeholderTextColor={colors.text.secondary}
          value={username}
          onChangeText={(v) => { setUsername(v); setErrors((e) => ({ ...e, username: undefined })); }}
          autoCapitalize="none"
          onFocus={() => setFocusedInput('user')}
          onBlur={() => setFocusedInput(null)}
        />
      </View>
      {errors.username ? <Text style={styles.inlineError}>{errors.username}</Text> : null}

      <Text style={styles.label}>Mật khẩu</Text>
      <View style={[styles.inputWrapper, focusedInput === 'pass' && styles.inputWrapperFocused, errors.password ? styles.inputWrapperError : null]}>
        <Icon name="lock-outline" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor={colors.text.secondary}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
          onFocus={() => setFocusedInput('pass')}
          onBlur={() => setFocusedInput(null)}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      {errors.password ? <Text style={styles.inlineError}>{errors.password}</Text> : null}

      <View style={styles.row}>
        <TouchableOpacity style={styles.checkboxContainer}>
          <View style={styles.checkboxChecked} />
          <Text style={styles.checkboxLabel}>Duy trì đăng nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Quên mật khẩu?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
        {loading ? <ActivityIndicator color={colors.text.inverse} size="small" /> : <Text style={styles.loginText}>Đăng nhập</Text>}
      </TouchableOpacity>

      <Text style={styles.presetTitle}>Tài khoản Demo nhanh</Text>
      <View style={styles.presetContainer}>
        {[
          ['admin', 'admin123', '💼 Admin'],
          ['manager1', 'mgr123', '📋 Quản Lý'],
          ['cashier1', 'cs123', '💵 Thu Ngân'],
          ['accountant1', 'acc123', '📊 Kế Toán'],
          ['kitchen1', 'ktch123', '🍳 Bếp'],
        ].map(([u, p, label]) => (
          <TouchableOpacity
            key={u}
            style={[styles.presetBtn, username === u && styles.presetBtnActive]}
            onPress={() => selectPreset(u, p)}
          >
            <Text style={[styles.presetText, username === u && styles.presetTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: { width: '100%' },
  title: { ...font.h1, color: colors.text.primary, marginBottom: 4 },
  subtitle: { ...font.bodySmall, color: colors.text.secondary, marginBottom: 28 },
  label: { ...font.label, color: colors.text.primary, marginBottom: 6, marginTop: 12 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 2,
    borderRadius: 4, borderWidth: 1.5, borderColor: colors.border.default,
    backgroundColor: colors.surface.input,
  },
  inputWrapperFocused: { borderColor: colors.brand.primary },
  inputWrapperError: { borderColor: colors.status.danger },
  input: { flex: 1, height: 44, ...font.body, color: colors.text.primary },
  eyeBtn: { padding: 4 },
  inlineError: { ...font.caption, color: colors.status.danger, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxChecked: {
    width: 18, height: 18, borderRadius: 3,
    backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center',
  },
  checkboxLabel: { ...font.bodySmall, color: colors.text.primary },
  forgotText: { ...font.bodySmall, color: colors.brand.primary, fontWeight: '600' },
  loginBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 4,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 24,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginText: { ...font.button, color: colors.text.inverse },
  presetTitle: { ...font.label, color: colors.text.secondary, marginTop: 28, marginBottom: 10, textAlign: 'center' },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  presetBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4,
    borderWidth: 1, borderColor: colors.border.default,
  },
  presetBtnActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg },
  presetText: { ...font.bodySmall, color: colors.text.secondary },
  presetTextActive: { color: colors.brand.primary, fontWeight: '700' },
});
