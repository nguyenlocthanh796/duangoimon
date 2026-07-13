import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { applySort, useSortState, type SortDir } from './tableUtils';

export type Align = 'left' | 'center' | 'right';

export interface Column<T> {
  key: string;
  title: string;
  align?: Align; // default 'left'
  width?: number; // fixed px for wide table
  flex?: number; // flex weight if no width
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
  headerFilter?: {
    options: { label: string; value: string }[];
    value: string | null;
    onChange: (v: string | null) => void;
  };
  render: (row: T) => React.ReactNode;
}

export interface BulkAction {
  label: string;
  icon: string;
  severity?: 'primary' | 'danger' | 'success';
  onPress: (ids: string[]) => void;
}

export interface FooterColumn {
  key: string;
  align?: Align;
  width?: number;
  flex?: number;
  content: React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  // sorting
  sortKey?: string;
  sortDir?: SortDir;
  onSortChange?: (key: string) => void;
  // selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: BulkAction[];
  // footer
  footerColumns?: FooterColumn[];
  // mobile fallback
  renderMobileCard?: (row: T, opts: { selected: boolean; onToggle: () => void }) => React.ReactNode;
  // row
  onRowPress?: (row: T) => void;
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  compact?: boolean; // NEW: dense mode for high-density tables
}

const SELECT_COL_WIDTH = 44;

export default function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    getRowId,
    loading,
    onRefresh,
    refreshing,
    sortKey,
    sortDir,
    onSortChange,
    selectable,
    selectedIds,
    onSelectionChange,
    bulkActions,
    footerColumns,
    renderMobileCard,
    onRowPress,
    emptyIcon = 'table',
    emptyTitle = 'Chua co du lieu',
    emptySubtitle = '',
    compact = false,
  } = props;

  const { isWide } = useResponsive();

  const sorted = sortKey ? applySort(data, sortKey, sortDir ?? 'asc', columns) : data;

  const allIds = data.map(getRowId);
  const selSet = new Set(selectedIds ?? []);
  const allSelected = selectable && allIds.length > 0 && allIds.every((id) => selSet.has(id));

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  };
  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : allIds);
  };

  // column layout
  const baseCols = selectable
    ? [{ key: '__sel', width: SELECT_COL_WIDTH, flex: 0 } as Column<T>, ...columns]
    : columns;
  const totalFixed = baseCols.reduce((s, c) => s + (c.width ?? 0), 0);
  const totalFlex = baseCols.reduce((s, c) => s + (c.flex ?? (c.width ? 0 : 1)), 0);

  // ---------- MOBILE ----------
  if (!isWide) {
    if (loading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      );
    }
    if (data.length === 0) {
      return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />;
    }
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.mobileList}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.brand.primary}
                colors={[colors.brand.primary]}
              />
            ) : undefined
          }
        >
          {sorted.map((row) => {
            const id = getRowId(row);
            const selected = selSet.has(id);
            return (
              <View key={id}>
                {selectable && (
                  <TouchableOpacity
                    style={styles.mobileSelRow}
                    onPress={() => toggleRow(id)}
                    activeOpacity={0.7}
                  >
                    <CheckCircle selected={selected} />
                    <Text style={styles.mobileSelText}>Chon dong nay</Text>
                  </TouchableOpacity>
                )}
                {renderMobileCard ? (
                  renderMobileCard(row, { selected, onToggle: () => toggleRow(id) })
                ) : (
                  <DefaultMobileCard columns={columns} row={row} compact={compact} />
                )}
              </View>
            );
          })}
        </ScrollView>
        {selectable && selSet.size > 0 && (
          <BulkBar
            actions={bulkActions ?? []}
            count={selSet.size}
            onClear={() => onSelectionChange?.([])}
          />
        )}
      </View>
    );
  }

  // ---------- WIDE TABLE ----------
  const renderHeaderCell = (col: Column<T>, isSelect: boolean) => {
    if (isSelect) {
      return (
        <TouchableOpacity
          key="__sel"
          style={[styles.headCell, { width: SELECT_COL_WIDTH, alignItems: 'center' }]}
          onPress={toggleAll}
          activeOpacity={0.7}
        >
          <CheckCircle selected={!!allSelected} />
        </TouchableOpacity>
      );
    }
    const align = col.align ?? 'left';
    const active = sortKey === col.key;
    return (
      <View
        key={col.key}
        style={[
          styles.headCell,
          compact && styles.cellCompact,
          active && styles.headCellActive,
          col.width ? { width: col.width } : { flex: col.flex ?? 1 },
          align === 'center' && { alignItems: 'center' },
          align === 'right' && { alignItems: 'flex-end' },
        ]}
      >
        <View style={styles.headInner}>
          <Text style={[styles.headText, active && styles.headTextActive, compact && styles.headTextCompact]} numberOfLines={1}>
            {col.title}
          </Text>
          {col.sortable && (
            <Icon
              name={
                active
                  ? sortDir === 'asc'
                    ? 'chevron-up'
                    : 'chevron-down'
                  : 'unfold-more-horizontal'
              }
              size={14}
              color={active ? colors.brand.primary : colors.text.muted}
            />
          )}
        </View>
        {col.headerFilter && (
          <FilterPill
            options={col.headerFilter.options}
            value={col.headerFilter.value}
            onChange={col.headerFilter.onChange}
          />
        )}
      </View>
    );
  };

  const cellWidthStyle = (col: Column<T>, isSelect: boolean) =>
    isSelect
      ? { width: SELECT_COL_WIDTH, alignItems: 'center' as const }
      : col.width
        ? { width: col.width }
        : { flex: col.flex ?? 1 };

  const renderRowCells = (row: T) => (
    <>
      {selectable && (
        <TouchableOpacity
          style={[styles.cell, compact && styles.cellCompact, { width: SELECT_COL_WIDTH, alignItems: 'center' }]}
          onPress={() => toggleRow(getRowId(row))}
          activeOpacity={0.7}
        >
          <CheckCircle selected={selSet.has(getRowId(row))} />
        </TouchableOpacity>
      )}
      {columns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.cell,
            compact && styles.cellCompact,
            cellWidthStyle(col, false),
            (col.align ?? 'left') === 'right' && { alignItems: 'flex-end' },
            (col.align ?? 'left') === 'center' && { alignItems: 'center' },
          ]}
        >
          {safeRender(col.render(row))}
        </View>
      ))}
    </>
  );

  const minWidth = totalFixed + totalFlex * 120;
  const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 100 : 800;
  const tableWidth = Math.max(minWidth, Math.min(minWidth, availableWidth));

  const isWiderThanScreen = minWidth > availableWidth;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal={isWiderThanScreen}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
      >
        <View style={{
          minWidth: isWiderThanScreen ? minWidth : undefined,
          width: isWiderThanScreen ? undefined : '100%',
        }}>
          {/* Header */}
          <View style={styles.headRow}>
            {baseCols.map((col, i) => renderHeaderCell(col as Column<T>, !!selectable && i === 0))}
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : sorted.length === 0 ? (
            <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              nestedScrollEnabled
              refreshControl={
                onRefresh ? (
                  <RefreshControl
                    refreshing={!!refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.brand.primary}
                    colors={[colors.brand.primary]}
                  />
                ) : undefined
              }
            >
              {sorted.map((row, idx) => {
                const id = getRowId(row);
                if (!onRowPress) {
                  return (
                    <View key={id} style={[styles.bodyRow, compact && styles.bodyRowCompact, idx % 2 === 1 && styles.bodyRowAlt]}>
                      {renderRowCells(row)}
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.bodyRow,
                      compact && styles.bodyRowCompact,
                      idx % 2 === 1 && styles.bodyRowAlt,
                      styles.bodyRowClickable,
                    ]}
                    onPress={() => onRowPress(row)}
                    activeOpacity={0.6}
                  >
                    {renderRowCells(row)}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Footer */}
          {footerColumns && footerColumns.length > 0 && (
            <View style={styles.footerRow}>
              {footerColumns.map((fc) => (
                <View
                  key={fc.key}
                  style={[
                    styles.footCell,
                    fc.width ? { width: fc.width } : { flex: fc.flex ?? 1 },
                    (fc.align ?? 'left') === 'right' && { alignItems: 'flex-end' },
                    (fc.align ?? 'left') === 'center' && { alignItems: 'center' },
                  ]}
                >
                  {fc.content}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {selectable && selSet.size > 0 && (
        <BulkBar
          actions={bulkActions ?? []}
          count={selSet.size}
          onClear={() => onSelectionChange?.([])}
        />
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function CheckCircle({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.check, selected && styles.checkActive]}>
      {selected && <Icon name="check" size={14} color="#fff" />}
    </View>
  );
}

function FilterPill({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={styles.filterWrap}>
      <TouchableOpacity
        style={[styles.filterBtn, !!value && styles.filterBtnActive]}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Icon
          name={value ? 'filter' : 'filter-outline'}
          size={12}
          color={value ? '#fff' : colors.text.muted}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.filterMenu}>
          <TouchableOpacity
            style={styles.filterItem}
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <Text style={[styles.filterItemText, !value && styles.filterItemTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          {options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={styles.filterItem}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <Text
                style={[styles.filterItemText, value === o.value && styles.filterItemTextActive]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function BulkBar({
  actions,
  count,
  onClear,
}: {
  actions: BulkAction[];
  count: number;
  onClear: () => void;
}) {
  const sevColor = (s?: string) => {
    if (s === 'danger') return colors.status.danger;
    if (s === 'success') return colors.status.success;
    return colors.brand.primary;
  };
  return (
    <View style={styles.bulkBar}>
      <TouchableOpacity onPress={onClear} style={styles.bulkClear} activeOpacity={0.7}>
        <Icon name="close-circle" size={18} color={colors.text.muted} />
      </TouchableOpacity>
      <Text style={styles.bulkCount}>Đã chọn {count}</Text>
      <View style={{ flex: 1 }} />
      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.bulkBtn, { backgroundColor: sevColor(a.severity) }]}
          onPress={() => a.onPress([])}
          activeOpacity={0.8}
        >
          <Icon name={a.icon as any} size={16} color="#fff" />
          <Text style={styles.bulkBtnText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function safeRender(node: React.ReactNode) {
  if (React.isValidElement(node)) return node;
  return <Text style={font.body}>{node}</Text>;
}

function DefaultMobileCard<T>({ columns, row, compact }: { columns: Column<T>[]; row: T; compact?: boolean }) {
  return (
    <View style={[styles.mobileCard, compact && styles.mobileCardCompact]}>
      {columns.map((col) => (
        <View key={col.key} style={styles.mobileCardRow}>
          <Text style={styles.mobileCardLabel}>{col.title}</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>{col.render(row)}</View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyBox}>
      <Icon name={icon as any} size={48} color={colors.text.muted} /><Text style={[font.body, { color: colors.text.muted, marginTop: 8, textAlign: 'center' }]}>{title}</Text>
      {!!subtitle && <Text style={[font.caption, { color: colors.text.muted, marginTop: 4, textAlign: 'center' }]}>{subtitle}</Text>}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  // wide
  headRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface.tableHeader,
    borderBottomWidth: 2,
    borderBottomColor: colors.border.brand,
    minHeight: 44,
  },
  headCell: { paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center' },
  headCellActive: { backgroundColor: colors.brand.primaryBg },
  headInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headText: { fontSize: 12, color: colors.text.tableHeader, fontWeight: '700', letterSpacing: 0.5 },
  headTextActive: { color: colors.brand.primaryDark },
  headTextCompact: { fontSize: 11, color: colors.text.tableHeader, fontWeight: '700' },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: 48,
  },
  bodyRowCompact: {
    minHeight: 44,
  },
  bodyRowAlt: { backgroundColor: colors.surface.tableRowAlt },
  bodyRowHover: { backgroundColor: colors.surface.tableRowHover },
  bodyRowClickable: { cursor: 'pointer' },
  cell: { paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center' },
  cellCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  footerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface.tableRowAlt,
    borderTopWidth: 2,
    borderTopColor: colors.border.brand,
    minHeight: 44,
  },
  footCell: { paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center' },
  // selection
  check: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  // filter
  filterWrap: { position: 'relative' },
  filterBtn: {
    padding: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.app,
  },
  filterBtnActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  filterMenu: {
    position: 'absolute',
    top: 24,
    left: 0,
    zIndex: 50,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 4,
    minWidth: 120,
  },
  filterItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: shape.radius.sm },
  filterItemText: { ...font.caption, color: colors.text.secondary },
  filterItemTextActive: { color: colors.brand.primary, fontWeight: '700' },
  // bulk
  bulkBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface.tableRowHover,
    borderTopWidth: 2,
    borderTopColor: colors.border.brand,
  },
  bulkClear: { padding: 4 },
  bulkCount: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: shape.radius.md,
  },
  bulkBtnText: { ...font.buttonSmall, color: '#fff', fontWeight: '700' },
  // mobile
  mobileList: { padding: 12, gap: 8, paddingBottom: 100 },
  mobileCard: {
    backgroundColor: colors.surface.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderLeftWidth: 3,
    borderLeftColor: colors.border.brand,
    gap: 8,
  },
  mobileCardCompact: {
    padding: 10,
    gap: 4,
  },
  mobileCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileCardLabel: { ...font.caption, color: colors.text.muted, fontWeight: '600', minWidth: 90 },
  mobileSelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  mobileSelText: { ...font.caption, color: colors.text.muted },
});
