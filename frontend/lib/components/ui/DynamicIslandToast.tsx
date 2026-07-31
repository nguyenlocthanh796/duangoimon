import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useToast, ToastType } from '../../context/ToastContext';
import AppText from './AppText';

const getToastConfig = (type: ToastType = 'success') => {
  switch (type) {
    case 'success':
      return {
        icon: 'check-circle' as const,
        iconColor: '#22C55E',
        badgeBg: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgba(34, 197, 94, 0.4)',
      };
    case 'error':
      return {
        icon: 'alert-circle' as const,
        iconColor: '#EF4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
      };
    case 'warning':
      return {
        icon: 'alert' as const,
        iconColor: '#F59E0B',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
      };
    case 'info':
    default:
      return {
        icon: 'information' as const,
        iconColor: '#3B82F6',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
      };
  }
};

export const DynamicIslandToast: React.FC = () => {
  const { toastState, hideToast } = useToast();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768;

  const translateY = useRef(new Animated.Value(-120)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.5,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
      dragY.setValue(0);
    });
  };

  useEffect(() => {
    if (toastState && toastState.visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      translateY.setValue(-100);
      scale.setValue(0.6);
      opacity.setValue(0);
      dragY.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = toastState.duration ?? 2000;
      timerRef.current = setTimeout(() => {
        dismiss();
      }, duration);
    } else {
      dismiss();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toastState?.id, toastState?.visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20) {
          dismiss();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!toastState || !toastState.visible) return null;

  const config = getToastConfig(toastState.type);
  const topInset = Platform.OS === 'web' ? 14 : Math.max(insets.top, 14);

  const combinedTranslateY = Animated.add(translateY, dragY);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        {
          top: topInset,
          alignItems: isWide ? 'center' : 'stretch',
          paddingHorizontal: isWide ? 0 : 12,
        },
      ]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            borderColor: config.borderColor,
            maxWidth: isWide ? 420 : '100%',
            transform: [{ translateY: combinedTranslateY }, { scale }],
            opacity,
          },
        ]}
      >
        {/* Dynamic Island Notch Pill Indicator */}
        <View style={styles.notchPill} />

        <View style={styles.contentRow}>
          <View style={[styles.iconBadge, { backgroundColor: config.badgeBg }]}>
            <Icon name={config.icon} size={22} color={config.iconColor} />
          </View>

          <View style={styles.textWrap}>
            <AppText variant="md" style={styles.titleText}>
              {toastState.message}
            </AppText>
            {!!toastState.subMessage && (
              <AppText variant="sm" style={styles.subText}>
                {toastState.subMessage}
              </AppText>
            )}
          </View>

          <TouchableOpacity
            onPress={dismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <Icon name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99,
  },
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  notchPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
  },
  subText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default DynamicIslandToast;
