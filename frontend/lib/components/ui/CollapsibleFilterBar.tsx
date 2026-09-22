import React, { useRef, useMemo } from 'react';
import { Animated, View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme';

export interface CollapsibleFilterBarProps {
  scrollY: Animated.Value;
  barHeight?: number;
  collapseHeight?: number;
  pinnedHeight?: number;
  topOffset?: number;
  backgroundColor?: string;
  children: React.ReactNode;
  pinnedChildren?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 👑 CollapsibleFilterBar - Thanh Lọc Nổi Tự Ẩn/Hiện Chuẩn Vị Chủ Quán
 * - Hỗ trợ 2 chế độ:
 *   1. Toàn bộ thanh trượt ẩn khi cuộn (truyền thống qua children).
 *   2. Phần công cụ trượt ẩn (children), phần tab ghim dính cố định ở đỉnh (pinnedChildren).
 * - Sử dụng Animated.diffClamp kết hợp useNativeDriver: true (100% GPU RenderThread, 0% JS lag)
 */
export const CollapsibleFilterBar: React.FC<CollapsibleFilterBarProps> = ({
  scrollY,
  barHeight = 46,
  collapseHeight,
  pinnedHeight,
  topOffset = 0,
  backgroundColor,
  children,
  pinnedChildren,
  disabled = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const bg = backgroundColor || theme.surface.app;

  const hasPinned = Boolean(pinnedChildren && collapseHeight);
  const collapseDist = hasPinned ? (collapseHeight || 0) : barHeight;

  // 🍎 Fix triệt để iOS Rubber-banding / Overscroll (kéo quá lố lên đỉnh hoặc xuống đáy)
  // Khi scrollY < 0 trên iPhone, ép giá trị về 0 để thanh tìm kiếm LUÔN mở 100% đầy đủ, không bị kẹt lố
  const safeScrollY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [-1000, 0, 100000],
        outputRange: [0, 0, 100000],
        extrapolate: 'clamp',
      }),
    [scrollY]
  );

  const clampedScroll = useMemo(
    () => Animated.diffClamp(safeScrollY, 0, collapseDist),
    [safeScrollY, collapseDist]
  );

  const translateY = useMemo(
    () =>
      clampedScroll.interpolate({
        inputRange: [0, collapseDist],
        outputRange: [0, -collapseDist],
        extrapolate: 'clamp',
      }),
    [clampedScroll, collapseDist]
  );

  const totalInitialHeight = (collapseHeight || 0) + (pinnedHeight || 0);

  if (hasPinned && collapseHeight) {
    return (
      <View
        pointerEvents="box-none"
        style={[
          s.pinnedContainer,
          {
            top: topOffset,
            height: totalInitialHeight,
          },
          style,
        ]}
      >
        {/* 1. Phần trượt ẩn (Collapsible Tool/Banner Section) */}
        <Animated.View
          style={[
            s.collapsibleSection,
            {
              height: collapseHeight,
              transform: disabled ? [] : [{ translateY }],
              backgroundColor: bg,
            },
          ]}
        >
          {children}
        </Animated.View>

        {/* 2. Phần ghim dính cố định (Sticky Pinned Tab Section) */}
        <Animated.View
          style={[
            s.pinnedSection,
            {
              top: collapseHeight,
              height: pinnedHeight,
              transform: disabled ? [] : [{ translateY }],
              backgroundColor: bg,
              borderBottomColor: theme.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
              ...(Platform.OS === 'web'
                ? ({
                    boxShadow: isDark
                      ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                      : '0 2px 8px rgba(15, 23, 42, 0.04)',
                  } as any)
                : { elevation: 2 }),
            },
          ]}
        >
          {pinnedChildren}
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        s.container,
        {
          top: topOffset,
          height: barHeight,
          backgroundColor: bg,
          borderBottomColor: theme.border.subtle,
          transform: disabled ? [] : [{ translateY }],
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: isDark
                  ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                  : '0 2px 8px rgba(15, 23, 42, 0.04)',
              } as any)
            : { elevation: 2 }),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Hook tiện ích chuẩn Ponytail: Khởi tạo scrollY và onScroll native event
 */
export function useNativeCollapsible(collapseDist = 46) {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: Platform.OS !== 'web', listener: () => {} }
      ),
    [scrollY]
  );

  return { scrollY, onScroll, collapseDist };
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  pinnedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  collapsibleSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  pinnedSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    justifyContent: 'center',
  },
});
