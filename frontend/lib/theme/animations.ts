import { Platform } from 'react-native';

/** Animation tokens for consistent micro-interactions across the app. */
export const animations = {
  /** Spring presets */
  spring: {
    default: { tension: 50, friction: 8 } as const,
    gentle: { tension: 30, friction: 10 } as const,
    snappy: { tension: 100, friction: 5 } as const,
    soft: { tension: 20, friction: 12 } as const,
  },

  /** Timing presets (ms) */
  timing: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 450,
  } as const,

  /** Stagger delays (ms) for list animations */
  stagger: {
    fast: 30,
    normal: 50,
    slow: 80,
  } as const,
};
