import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// ─── Floating Label Input ────────────────────────────────────
function FloatingInput({
  label, icon, value, onChangeText, secureTextEntry, error,
  autoCapitalize,
}: {
  label: string; icon: React.ComponentProps<typeof Icon>['name'];
  value: string; onChangeText: (v: string) => void;
  secureTextEntry?: boolean; error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const focusAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate label
    Animated.timing(focusAnim, {
      toValue: focused || value.length > 0 ? 1 : 0,
      duration: 200, useNativeDriver: false,
    }).start();
    // Animate focus glow
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 250, useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = focusAnim.interpolate({
    inputRange: [0, 1], outputRange: [14, -10],
  });
  const labelScale = focusAnim.interpolate({
    inputRange: [0, 1], outputRange: [1, 0.82],
  });
  const labelColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? '#F87171' : 'rgba(255,255,255,0.4)',
      error ? '#F87171' : '#F97316',
    ],
  });
  const borderGlow = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.06)',
      error ? 'rgba(248,113,113,0.8)' : 'rgba(249,115,22,0.5)',
    ],
  });
  const iconColor = focused
    ? (error ? '#F87171' : '#F97316')
    : 'rgba(255,255,255,0.25)';

  return (
    <View style={{ marginBottom: 20 }}>
      <Animated.View style={[styles.inputWrapper, { borderColor: borderGlow }]}>
        <Icon name={icon} size={20} color={iconColor} style={{ marginRight: 10 }} />
        <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
          <Animated.Text
            style={[styles.floatingLabel, {
              top: labelTop, transform: [{ scale: labelScale }], color: labelColor,
            }]}
          >
            {label}
          </Animated.Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="transparent"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry && !showPw}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize={autoCapitalize}
          />
        </View>
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
            <Icon
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="rgba(255,255,255,0.25)"
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={12} color="#F87171" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Preset Account Pill ────────────────────────────────────
function PresetPill({
  label, selected, onPress,
}: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.presetPill, selected && styles.presetPillActive]}
    >
      {selected ? (
        <LinearGradient
          colors={['#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        />
      ) : null}
      <Text style={[styles.presetPillText, selected && styles.presetPillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Form ──────────────────────────────────────────────
export default function LoginForm({
  onLogin,
}: {
  onLogin: (u: string, p: string) => Promise<void>;
}) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  // Button scale animation
  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn = () => {
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.spring(btnScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const handleLogin = async () => {
    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = 'Vui lòng nhập tài khoản';
    if (!password.trim()) newErrors.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch {
      setErrors({ username: 'Sai tài khoản hoặc mật khẩu' });
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const presets: { label: string; user: string; pass: string }[] = [
    { label: '💼 Admin', user: 'admin', pass: 'admin123' },
    { label: '📋 Quản Lý', user: 'manager1', pass: 'mgr123' },
    { label: '💵 Thu Ngân', user: 'cashier1', pass: 'cs123' },
    { label: '📊 Kế Toán', user: 'accountant1', pass: 'acc123' },
    { label: '🍳 Bếp', user: 'kitchen1', pass: 'ktch123' },
  ];

  return (
    <View style={styles.form}>
      <Text style={styles.welcome}>Chào mừng trở lại</Text>
      <Text style={styles.subtitle}>Đăng nhập để quản lý hệ thống POS</Text>

      <FloatingInput
        label="Tài khoản"
        icon="account-outline"
        value={username}
        onChangeText={(v) => { setUsername(v); setErrors((e) => ({ ...e, username: undefined })); }}
        error={errors.username}
        autoCapitalize="none"
      />

      <FloatingInput
        label="Mật khẩu"
        icon="lock-outline"
        value={password}
        onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
        secureTextEntry
        error={errors.password}
      />

      {/* Remember + Forgot */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.rememberRow}>
          <View style={styles.checkbox}>
            <Icon name="check" size={12} color="#0F172A" />
          </View>
          <Text style={styles.rememberText}>Duy trì đăng nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Quên mật khẩu?</Text>
        </TouchableOpacity>
      </View>

      {/* Button */}
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={handleLogin}
        disabled={loading}
      >
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.loginBtn}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loginText}>Đang đăng nhập...</Text>
              </View>
            ) : (
              <Text style={styles.loginText}>Đăng nhập</Text>
            )}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Presets */}
      <Text style={styles.presetTitle}>Demo nhanh</Text>
      <View style={styles.presetRow}>
        {presets.map((p) => (
          <PresetPill
            key={p.user}
            label={p.label}
            selected={username === p.user}
            onPress={() => selectPreset(p.user, p.pass)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  form: { width: '100%' },
  welcome: {
    fontSize: 24, fontWeight: '800',
    color: '#FFFFFF', marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.4)',
    marginBottom: 28, lineHeight: 18,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    height: 56,
  },
  input: {
    flex: 1, height: '100%',
    fontSize: 15, fontWeight: '500',
    color: '#FFFFFF',
    paddingTop: 8, // room for floating label
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 15,
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 6, gap: 4,
  },
  errorText: {
    fontSize: 12, color: '#F87171', fontWeight: '500',
  },

  // Row
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: '#F97316',
    alignItems: 'center', justifyContent: 'center',
  },
  rememberText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  forgotText: { fontSize: 13, color: '#F97316', fontWeight: '600' },

  // Button
  loginBtn: {
    borderRadius: 8,
    height: 52,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  loginText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
  },

  // Presets
  presetTitle: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', marginTop: 24, marginBottom: 12,
    fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  presetRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, justifyContent: 'center',
  },
  presetPill: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    minHeight: 44,
  },
  presetPillActive: {
    borderColor: '#F97316',
  },
  presetPillText: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  presetPillTextActive: {
    color: '#FFFFFF',
  },
});
