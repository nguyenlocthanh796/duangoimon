import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { colors, font, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '../../haptic';
import AppText from '../ui/AppText';
import { usePOSSettings } from '../../hooks/usePOSSettings';

const SPRING = { damping: 15, mass: 0.5, stiffness: 200 };

function PressScale({ children, onPress, style, disabled }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], width: '100%' }));
  return (
    <Animated.View style={[animStyle, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        onPressIn={() => { scale.value = withSpring(0.97, SPRING); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING); }}
        style={{ width: '100%' }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface CartMainActionsProps {
  hasUnsentItems: boolean;
  submitting: boolean;
  canBulkToggle: boolean;
  onSendToKitchen: () => void;
  onSaveTable: () => void;
  onPay: () => void;
  onPrintTemporary?: () => void;
  onBulkToggle: () => void;
  bulkToggleLabel: string;
  total?: number;
}

export default function CartMainActions({
  hasUnsentItems,
  submitting,
  canBulkToggle,
  onSendToKitchen,
  onSaveTable,
  onPay,
  onPrintTemporary,
  onBulkToggle,
  bulkToggleLabel,
  total,
}: CartMainActionsProps) {
  const { settings } = usePOSSettings();
  const enableKitchen = settings?.enableKitchenModule ?? true;

  return (
    <View style={{ gap: 8 }}>
      {/* Row 1: Auxiliary Tools */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {onPrintTemporary && (
          <TouchableOpacity
            onPress={onPrintTemporary}
            activeOpacity={0.7}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 6,
              backgroundColor: '#F5F3FF',
              borderWidth: 1,
              borderColor: '#DDD6FE',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
            }}
          >
            <MaterialCommunityIcons name="printer" size={15} color="#7C3AED" />
            <AppText variant="md" weight="normal" color="#7C3AED">
              In nháp
            </AppText>
          </TouchableOpacity>
        )}

        {enableKitchen && (
          <TouchableOpacity
            onPress={() => {
              haptic.impact('light');
              onSendToKitchen();
            }}
            activeOpacity={0.7}
            disabled={!hasUnsentItems || submitting}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 6,
              backgroundColor: hasUnsentItems ? '#F0F9FF' : '#F8FAFC',
              borderWidth: 1,
              borderColor: hasUnsentItems ? '#BAE6FD' : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
            }}
          >
            <MaterialCommunityIcons
              name="chef-hat"
              size={15}
              color={hasUnsentItems ? '#0284C7' : '#94A3B8'}
            />
            <AppText
              variant="md"
              weight="normal"
              color={hasUnsentItems ? '#0284C7' : '#94A3B8'}
            >
              Gửi bếp
            </AppText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            haptic.impact('light');
            onSaveTable();
          }}
          activeOpacity={0.7}
          disabled={submitting}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 6,
            backgroundColor: '#F0FDF4',
            borderWidth: 1,
            borderColor: '#86EFAC',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <MaterialCommunityIcons name="content-save-outline" size={15} color="#0D9488" />
          <AppText variant="md" weight="normal" color="#0D9488">
            Lưu HĐ
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Row 2: Primary Main CTA Button (52px Full-width) */}
      <TouchableOpacity
        onPress={() => {
          haptic.impact('medium');
          onPay();
        }}
        activeOpacity={0.85}
        disabled={submitting}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 8,
          backgroundColor: colors.brand.primary,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row',
          paddingHorizontal: 16,
        }}
      >
        {submitting ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : (
          <>
            {/* Left Action Label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="cash-register" size={20} color="#FFFFFF" />
              <AppText variant="md" weight="normal" color="#FFFFFF">
                Thanh toán
              </AppText>
            </View>

            {/* Right Total Amount Badge */}
            {total !== undefined && total > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                }}
              >
                <AppText variant="md" weight="bold" color="#FFFFFF">
                  {formatPrice(total)}
                </AppText>
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
