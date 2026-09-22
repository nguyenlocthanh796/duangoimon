import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Platform,
  StyleSheet,
} from 'react-native';
import { HapticsEngine, HapticType } from '../../utils/haptics';
import { playTapSound } from '../../utils/sound';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  activeScale?: number;
  haptic?: HapticType;
  playSound?: boolean;
  debounceMs?: number;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  activeScale = 0.96,
  haptic = 'tick',
  playSound = false,
  debounceMs = 300,
  containerStyle,
  style,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastPressTimeRef = useRef<number>(0);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;

    const now = Date.now();
    if (debounceMs > 0 && now - lastPressTimeRef.current < debounceMs) {
      return;
    }

    if (playSound) {
      playTapSound();
    } else if (haptic !== 'none') {
      HapticsEngine[haptic]();
    }

    const useNative = Platform.OS !== 'web';
    Animated.spring(scaleAnim, {
      toValue: activeScale,
      useNativeDriver: useNative,
      speed: 35,
      bounciness: 4,
    }).start();

    if (onPressIn) onPressIn(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    const now = Date.now();
    if (debounceMs > 0 && now - lastPressTimeRef.current < debounceMs) {
      return;
    }
    lastPressTimeRef.current = now;
    if (onPress) onPress(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;

    const useNative = Platform.OS !== 'web';
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: useNative,
      speed: 30,
      bounciness: 5,
    }).start();

    if (onPressOut) onPressOut(e);
  };

  const flatStyle = (typeof style === 'object' ? StyleSheet.flatten(style) : null) || {};
  const extractedContainerStyle: ViewStyle = {};

  if (flatStyle.flex !== undefined) extractedContainerStyle.flex = flatStyle.flex;
  if (flatStyle.flexGrow !== undefined) extractedContainerStyle.flexGrow = flatStyle.flexGrow;
  if (flatStyle.flexShrink !== undefined) extractedContainerStyle.flexShrink = flatStyle.flexShrink;
  if (flatStyle.flexBasis !== undefined) extractedContainerStyle.flexBasis = flatStyle.flexBasis;
  if (flatStyle.alignSelf !== undefined) extractedContainerStyle.alignSelf = flatStyle.alignSelf;
  if (flatStyle.width !== undefined) extractedContainerStyle.width = flatStyle.width;
  if (flatStyle.minWidth !== undefined) extractedContainerStyle.minWidth = flatStyle.minWidth;
  if (flatStyle.maxWidth !== undefined) extractedContainerStyle.maxWidth = flatStyle.maxWidth;
  if (flatStyle.height !== undefined) extractedContainerStyle.height = flatStyle.height;
  if (flatStyle.minHeight !== undefined) extractedContainerStyle.minHeight = flatStyle.minHeight;
  if (flatStyle.maxHeight !== undefined) extractedContainerStyle.maxHeight = flatStyle.maxHeight;
  if (flatStyle.margin !== undefined) extractedContainerStyle.margin = flatStyle.margin;
  if (flatStyle.marginTop !== undefined) extractedContainerStyle.marginTop = flatStyle.marginTop;
  if (flatStyle.marginBottom !== undefined) extractedContainerStyle.marginBottom = flatStyle.marginBottom;
  if (flatStyle.marginLeft !== undefined) extractedContainerStyle.marginLeft = flatStyle.marginLeft;
  if (flatStyle.marginRight !== undefined) extractedContainerStyle.marginRight = flatStyle.marginRight;
  if (flatStyle.marginHorizontal !== undefined) extractedContainerStyle.marginHorizontal = flatStyle.marginHorizontal;
  if (flatStyle.marginVertical !== undefined) extractedContainerStyle.marginVertical = flatStyle.marginVertical;
  if (flatStyle.position !== undefined) extractedContainerStyle.position = flatStyle.position;
  if (flatStyle.top !== undefined) extractedContainerStyle.top = flatStyle.top;
  if (flatStyle.bottom !== undefined) extractedContainerStyle.bottom = flatStyle.bottom;
  if (flatStyle.left !== undefined) extractedContainerStyle.left = flatStyle.left;
  if (flatStyle.right !== undefined) extractedContainerStyle.right = flatStyle.right;
  if (flatStyle.zIndex !== undefined) extractedContainerStyle.zIndex = flatStyle.zIndex;

  const shouldFillWidth = flatStyle.flex !== undefined || flatStyle.flexGrow !== undefined || flatStyle.width === '100%';
  const shouldFillHeight = flatStyle.height !== undefined || flatStyle.flex !== undefined || flatStyle.flexGrow !== undefined;

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={props.accessibilityRole || (onPress ? 'button' : undefined)}
      style={[extractedContainerStyle, containerStyle]}
      {...props}
    >
      {(state) => {
        const resolvedStyle = typeof style === 'function' ? style(state) : style;
        return (
          <Animated.View
            style={[
              resolvedStyle,
              shouldFillWidth ? { width: '100%' } : null,
              shouldFillHeight ? { height: '100%' } : null,
              (flatStyle.flex !== undefined || flatStyle.flexGrow !== undefined)
                ? { flex: 0, flexGrow: 1, flexBasis: 'auto' as const }
                : null,
              flatStyle.minHeight !== undefined ? { minHeight: flatStyle.minHeight } : null,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            {typeof children === 'function' ? children(state) : children}
          </Animated.View>
        );
      }}
    </Pressable>
  );
};
