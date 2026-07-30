import { useCallback } from 'react';
import { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 15,
  mass: 0.5,
  stiffness: 200,
};

export function useScaleSpring() {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.96, SPRING_CONFIG);
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}
