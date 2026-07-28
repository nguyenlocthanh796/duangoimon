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

  // ── 3. Nút bấm (Kích thước chuẩn: 44px cao) ──────────────────────────────────
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
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
    height: 44,
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
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.status.danger,
    borderWidth: 0,
  },
  btnIconOnly: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  btnHeaderRight: {
    width: 44,
    height: 44,
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
    height: 40,
    borderRadius: 8,
  },

  // ── 5. Bottom Action Bar (dùng cho màn hình có action ở cuối) ───────────────
  bottomActionBar: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingHorizontal: shape.spacing.md,
    paddingTop: shape.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── 6. Mini Cart Bar (thanh cart dưới màn hình) ─────────────────────────────
  miniCartBar: {
    height: 44,
    backgroundColor: colors.surface.app,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingHorizontal: shape.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

/**
 * Hook trả về bộ CSS đã được tự động điều chỉnh theo kích thước màn hình (iPhone vs iPad)
 */
export function useGlobalStyles() {
  const { isWide } = useResponsive();
  return useMemo(() => getGlobalStyles(isWide), [isWide]);
}

/**
 * Shared POS Layout Styles — single source of truth.
 * Import as: import { ss } from '../../lib/theme';
 * Usage: <View style={ss.topActionBar}>
 */
export const ss = StyleSheet.create({
  // ── Top Action Bar (Search + Add Button) ──
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  mobileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },

  // ── Search Input ──
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    paddingHorizontal: 10,
    height: 32,
    gap: 6,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },

  // ── Add Button ──
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F97316',
  },

  // ── Filter Chips Bar ──
  filterChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  filterChip: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },

  // ── Mobile List Row (48px) ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  // ── Mini Action Button (32px circle) ──
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Right Detail Panel (Wide) ──
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  detailPanelEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // ── Category Section CardBox ──
  cardBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 8,
  },
  sectionWrap: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderColor: '#E5E9F0',
  },
  sectionItems: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  // ── Icon Circle (24px) ──
  iconCircleSm: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Metric Cards (Desktop & Mobile Strip) ──
  metricContainer: {
    flexDirection: 'row',
    padding: 0,
    gap: 8,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Panel Action Buttons ──
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  panelCta: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
});
