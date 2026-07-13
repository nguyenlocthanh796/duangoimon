import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Slide direction: 'up' (default), 'left', 'fade' */
  direction?: 'up' | 'left' | 'fade';
  /** Animation duration in ms (default 250) */
  duration?: number;
  /** Delay in ms before animation starts (default 0) */
  delay?: number;
  style?: ViewStyle;
}

const directionConfig = {
  up: { translateY: 24 },
  left: { translateX: 48 },
  fade: { opacity: 0 },
};

/**
 * Smooth page transition wrapper.
 * Wraps page content with fade + slide animation on mount.
 */
export default function PageTransition({
  children,
  direction = 'up',
  duration = 250,
  delay = 0,
  style,
}: PageTransitionProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, duration, delay]);

  const config = directionConfig[direction];
  const transforms: any[] = [];

  if ('translateY' in config) {
    transforms.push({
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [config.translateY, 0],
      }),
    });
  }
  if ('translateX' in config) {
    transforms.push({
      translateX: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [config.translateX, 0],
      }),
    });
  }

  return (
    <Animated.View
      style={[
        styles.root,
        style,
        {
          opacity: direction === 'fade' ? anim : anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
          }),
          transform: transforms,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
