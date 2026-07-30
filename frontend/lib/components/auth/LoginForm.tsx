import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const Icon = MaterialCommunityIcons;
import { useTheme } from '../../context/ThemeContext';
import { palette } from '../../theme/colors';
import { font } from '../../theme/typography';
import FormWrapper from '../ui/FormWrapper';

// ─── Input ────────────────────────────────────────────────
function FormInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  error,
  icon,
  autoCapitalize = 'none',
  onSubmitEditing,
  inputRef,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  error?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput>;
  returnKeyType?: 'next' | 'done';
}) {
  const { isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isError = !!error;
  const borderClr = isError
    ? '#EF4444'
    : focused
    ? palette.orange[500]
    : isDark
    ? 'rgba(255,255,255,0.12)'
    : '#E5E7EB';

  const bgClr = isError
    ? isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2'
    : focused
    ? isDark ? 'rgba(249,115,22,0.06)' : '#FFFFFF'
    : isDark
    ? 'rgba(255,255,255,0.04)'
    : '#F9FAFB';

  const iconClr = isError
    ? '#EF4444'
    : focused
    ? palette.orange[500]
    : isDark
    ? 'rgba(255,255,255,0.25)'
    : '#9CA3AF';

  const textClr = isDark ? '#F1F5F9' : '#111827';
  const labelClr = isError
    ? '#EF4444'
    : focused
    ? palette.orange[500]
    : isDark
    ? 'rgba(255,255,255,0.5)'
    : '#6B7280';

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[s.fieldLabel, { color: labelClr }]}>
        {label}
      </Text>

      <View
        style={[
          s.inputWrap,
          {
            borderColor: borderClr,
            backgroundColor: bgClr,
          },
          focused && Platform.OS === 'web' ? { boxShadow: `0 0 0 3px rgba(249,115,22,0.12)` } : {},
        ]}
      >
        <Icon name={icon} size={18} color={iconClr} style={{ marginRight: 8 }} />

        <TextInput
          ref={inputRef}
          style={[s.input, { color: textClr }]}
          nativeID={`login_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
          placeholder={label}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : '#9CA3AF'}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPw}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType || (secureTextEntry ? 'done' : 'next')}
          blurOnSubmit={!!secureTextEntry}
          onSubmitEditing={onSubmitEditing}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPw(!showPw)}
            style={s.pwToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <Icon
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
          <Icon name="alert-circle-outline" size={12} color="#EF4444" />
          <Text style={{ ...font.sm, color: '#EF4444' }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Form ────────────────────────────────────────────
interface LoginFormProps {
  onLogin: (u: string, p: string) => Promise<void>;
  isTablet?: boolean;
}

export default function LoginForm({ onLogin, isTablet }: LoginFormProps) {
  const { isDark } = useTheme();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const pwRef = useRef<TextInput>(null) as React.RefObject<TextInput>;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    const e: typeof errors = {};
    if (!username.trim()) e.username = 'Vui lòng nhập tài khoản';
    if (!password.trim()) e.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(e).length > 0) {
      setErrors(e);
      shake();
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch {
      setErrors({ username: 'Sai tài khoản hoặc mật khẩu' });
      shake();
    } finally {
      setLoading(false);
    }
  };

  const mutedText = isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF';
  const linkText = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280';

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <FormWrapper
        onSubmit={handleLogin}
        style={{ width: '100%' }}
      >
        <FormInput
          label="Tài khoản"
          icon="account-outline"
          value={username}
          onChangeText={(v) => { setUsername(v); setErrors((e) => ({ ...e, username: undefined })); }}
          error={errors.username}
          onSubmitEditing={() => pwRef.current?.focus()}
          returnKeyType="next"
        />

        <FormInput
          label="Mật khẩu"
          icon="lock-outline"
          value={password}
          onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
          secureTextEntry
          error={errors.password}
          onSubmitEditing={handleLogin}
          inputRef={pwRef}
          returnKeyType="done"
        />

        {/* Remember me + Forgot password */}
        <View style={s.optionsRow}>
          <TouchableOpacity
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
            style={s.rememberRow}
            aria-label="Duy trì đăng nhập"
          >
            <View style={[s.checkbox, rememberMe && s.checkboxChecked]}>
              {rememberMe && <Icon name="check" size={12} color="#fff" />}
            </View>
            <Text style={[s.rememberText, { color: mutedText }]}>Duy trì đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} aria-label="Quên mật khẩu" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={[s.forgotLink, { color: linkText }]}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
          style={s.btnOuter}
          aria-label="Đăng nhập"
        >
          <View style={s.btn}>
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.btnText}>Đang đăng nhập</Text>
              </View>
            ) : (
              <Text style={s.btnText}>Đăng nhập</Text>
            )}
          </View>
        </TouchableOpacity>
      </FormWrapper>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  fieldLabel: {
    fontFamily: font.sm.fontFamily,
    fontSize: font.sm.fontSize,
    lineHeight: font.sm.lineHeight,
    color: '#64748B',
    marginBottom: 4,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    ...(Platform.OS === 'web' ? { transition: 'border-color 0.2s, background-color 0.2s' as any } : {}),
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: font.md.fontFamily,
    fontSize: font.md.fontSize,
    fontWeight: '400',
    letterSpacing: 0.2,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any, outlineWidth: 0 } : {}),
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  rememberText: {
    ...font.sm,
  },
  forgotLink: {
    ...font.mdBold,
  },
  btnOuter: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  btn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  btnText: {
    ...font.mdBold,
    color: '#FFFFFF',
  },
  pwToggle: {
    padding: 4,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
