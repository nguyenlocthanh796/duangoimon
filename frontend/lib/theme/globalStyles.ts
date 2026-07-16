import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { shape } from './shape';
import { useResponsive } from '../hooks/useResponsive';
import { useMemo } from 'react';

/**
 * Lấy ra bộ CSS chuẩn hóa tĩnh (Nếu dùng trong component class hoặc ngoài hook)
 */
export const getGlobalStyles = (isWide: boolean) => StyleSheet.create({
  // ── 1. Layout & Vùng chứa ──────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: colors.surface.app, // Nền xám lạnh tôn vinh Cam
  },
  contentPad: {
    paddingHorizontal: isWide ? shape.spacing.lg : shape.spacing.md,
  },
  edgeToEdgeScroll: {
    paddingBottom: 40,
    // Không có padding ngang để danh sách và thẻ chạy sát lề
  },

  // ── 2. Khối Dữ liệu (SectionBlock / Cards) ─────────────────────────────────
  sectionBlock: {
    backgroundColor: colors.surface.card, // Trắng tinh khiết
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 0, // Phẳng hoàn toàn
    marginBottom: 8, // Khoảng cách giữa các section chuẩn là 8px
  },
  rowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  kpiGridSeamless: {
    padding: 12,
    gap: 8,
  },

  // ── 3. Nút bấm (Kích thước vàng: 36px cao) ──────────────────────────────────
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    borderWidth: 0,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.status.danger,
    borderWidth: 0,
  },
  btnIconOnly: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  btnHeaderRight: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.disabled,
  },

  // ── 4. Tabs & Header ───────────────────────────────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
  },
});

/**
 * Hook trả về bộ CSS đã được tự động điều chỉnh theo kích thước màn hình (iPhone vs iPad)
 */
export function useGlobalStyles() {
  const { isWide } = useResponsive();
  return useMemo(() => getGlobalStyles(isWide), [isWide]);
}
