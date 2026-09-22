import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { AppNumpad } from '../ui/AppNumpad';
import { playTapSound } from '../../utils/sound';
import { useAuthStore } from '../../store/useAuthStore';

export interface ManagerPinModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  action?: 'void_item' | 'void_order' | 'excessive_discount' | 'reprint_bill' | string;
  onSuccess: () => void;
  onClose: () => void;
}

export const ManagerPinModal: React.FC<ManagerPinModalProps> = ({
  visible,
  title = 'XÁC THỰC QUẢN LÝ',
  subtitle = 'Nhập mã PIN 4 số của Quản lý / Chủ quán để tiếp tục',
  action = 'void_item',
  onSuccess,
  onClose,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const verifyManagerPin = useAuthStore((s) => s.verifyManagerPin);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMsg('');
      setIsVerifying(false);
    }
  }, [visible]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const handleKeyPress = (digit: string) => {
    if (isVerifying) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        handleVerify(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (isVerifying || pin.length === 0) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (isVerifying || pin.length === 0) return;
    playTapSound();
    setPin('');
    setErrorMsg('');
  };

  const handleVerify = async (codeToVerify: string) => {
    setIsVerifying(true);
    const result = await verifyManagerPin(codeToVerify, action);

    if (result.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      setIsVerifying(false);
      onSuccess();
      onClose();
    } else {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
      triggerShake();
      setErrorMsg(result.error || 'Mã PIN không chính xác!');
      setIsVerifying(false);
      setTimeout(() => {
        setPin('');
      }, 600);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          s.overlay,
          {
            backgroundColor: theme.surface.backdrop,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Animated.View
          style={[
            s.card,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.default,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[s.header, { borderBottomColor: theme.border.default }]}>
            <View style={[s.shieldBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Icon name="shield-lock-outline" size={24} color={theme.brand.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                {title}
              </AppText>
              <AppText variant="xs" color={theme.text.muted} numberOfLines={2}>
                {subtitle}
              </AppText>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                onClose();
              }}
              style={[s.closeBtn, { backgroundColor: theme.surface.header }]}
            >
              <Icon name="close" size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* PIN Indicators */}
          <View style={s.indicatorContainer}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              const hasError = !!errorMsg;
              return (
                <View
                  key={idx}
                  style={[
                    s.pinDot,
                    {
                      borderColor: hasError
                        ? theme.brand.danger
                        : isFilled
                        ? theme.brand.primary
                        : theme.border.default,
                      backgroundColor: hasError
                        ? theme.brand.danger
                        : isFilled
                        ? theme.brand.primary
                        : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          {errorMsg ? (
            <View style={s.errorContainer}>
              <Icon name="alert-circle-outline" size={16} color={theme.brand.danger} />
              <AppText variant="xs" color={theme.brand.danger} weight="medium">
                {errorMsg}
              </AppText>
            </View>
          ) : (
            <View style={s.errorPlaceholder} />
          )}

          {/* POS Numpad */}
          <View style={s.numpadContainer}>
            <AppNumpad
              layout="pin"
              disabled={isVerifying}
              onKeyPress={(key) => {
                if (key === 'C' || key === 'clear') handleClear();
                else if (key === '⌫' || key === 'backspace' || key === 'DEL') handleDelete();
                else handleKeyPress(key);
              }}
            />
          </View>

          {/* Footer Cancel */}
          <View style={[s.footer, { borderTopColor: theme.border.subtle }]}>
            <Button
              variant="outline"
              size="md"
              title="HỦY"
              accessibilityLabel="Hủy xác thực quản lý"
              style={{ width: '100%', height: 44, borderRadius: 12 }}
              onPress={() => {
                playTapSound();
                onClose();
              }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shieldBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 24,
    marginVertical: 4,
  },
  errorPlaceholder: {
    height: 24,
    marginVertical: 4,
  },
  numpadContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  numKey: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
