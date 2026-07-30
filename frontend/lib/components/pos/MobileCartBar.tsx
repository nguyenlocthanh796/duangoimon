import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatPrice } from '../../theme';
import AppText from '../../components/ui/AppText';
import { haptic } from '../../haptic';

interface MobileCartBarProps {
  itemCount: number;
  total: number;
  onPress: () => void;
  onSave: () => void;
  onPay: () => void;
  submitting: boolean;
}

export default function MobileCartBar({
  itemCount,
  total,
  onPress,
  onSave,
  onPay,
  submitting,
}: MobileCartBarProps) {
  const insets = useSafeAreaInsets();
  const hasItems = itemCount > 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }).start(() => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }).start();
      });
    }
    prevCount.current = itemCount;
  }, [itemCount, scaleAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        position: 'absolute',
        bottom: Platform.OS === 'web' ? 10 : Math.max(Math.floor(insets.bottom * 0.5), 6) + 6,
        left: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 4,
        paddingHorizontal: 4,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 9999,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 56,
          paddingHorizontal: 8,
          gap: 6,
        }}
      >
        {/* Left Block: Cart Summary (Tap to expand full Cart Sheet) */}
        <TouchableOpacity
          onPress={() => {
            haptic.impact('light');
            onPress();
          }}
          activeOpacity={0.7}
          disabled={!hasItems}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
            backgroundColor: hasItems ? '#FFF7ED' : '#F8FAFC',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: hasItems ? '#FDBA74' : '#E2E8F0',
          }}
        >
          <View
            style={{
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 4,
              backgroundColor: hasItems ? '#F97316' : '#94A3B8',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}
          >
            <AppText
              variant="xs"
              weight="bold"
              color="#FFFFFF"
            >
              {itemCount}
            </AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {hasItems ? (
              <>
                <AppText
                  variant="md"
                  weight="bold"
                  color="#0F172A"
                  numberOfLines={1}
                >
                  {formatPrice(total)}
                </AppText>
                <AppText
                  variant="xs"
                  color="#EA580C"
                  numberOfLines={1}
                  style={{ letterSpacing: -0.2 }}
                >
                  Xem giỏ hàng ▲
                </AppText>
              </>
            ) : (
              <AppText
                variant="sm"
                color="#94A3B8"
                numberOfLines={1}
              >
                Chưa có món
              </AppText>
            )}
          </View>
        </TouchableOpacity>

        {/* Middle Block: Save Order & Return to Table List */}
        <TouchableOpacity
          onPress={() => {
            haptic.impact('medium');
            onSave();
          }}
          activeOpacity={0.7}
          disabled={!hasItems || submitting}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={{
            height: 44,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: !hasItems ? '#F8FAFC' : '#FFF7ED',
            borderWidth: 1,
            borderColor: !hasItems ? '#E2E8F0' : '#FDBA74',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <Icon
            name="content-save-outline"
            size={15}
            color={!hasItems ? '#94A3B8' : '#EA580C'}
          />
          <AppText
            variant="md"
            weight="bold"
            color={!hasItems ? '#94A3B8' : '#EA580C'}
            numberOfLines={1}
          >
            Lưu HĐ
          </AppText>
        </TouchableOpacity>

        {/* Right Block: Fast Pay Primary CTA */}
        <TouchableOpacity
          onPress={() => {
            haptic.impact('heavy');
            onPay();
          }}
          activeOpacity={0.85}
          disabled={!hasItems || submitting}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={{
            height: 44,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: !hasItems ? '#E2E8F0' : '#F97316',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon
                name="credit-card-outline"
                size={16}
                color={!hasItems ? '#94A3B8' : '#FFFFFF'}
              />
              <AppText
                variant="md"
                weight="bold"
                color={!hasItems ? '#94A3B8' : '#FFFFFF'}
                numberOfLines={1}
              >
                Thanh toán
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
