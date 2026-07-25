import { useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  sortKey: string | undefined;
  sortDir: SortDir;
  toggle: (key: string) => void;
}

/** Local hook to manage column sort state (asc/desc toggle). */
export function useSortState(initialKey?: string, initialDir: SortDir = 'asc'): SortState {
  const [sortKey, setSortKey] = useState<string | undefined>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const toggle = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  return { sortKey, sortDir, toggle };
}

/** Apply sort to rows using each column's optional sortValue fn. */
export function applySort<T>(
  rows: T[],
  sortKey: string | undefined,
  sortDir: SortDir,
  columns: { key: string; sortValue?: (row: T) => number | string }[]
): T[] {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!sortKey) return safeRows;
  const col = columns.find((c) => c.key === sortKey);
  if (!col) return safeRows;
  const valFn = col.sortValue;
  const sorted = [...safeRows].sort((a, b) => {
    const va = valFn ? valFn(a) : ((a as any)[sortKey] ?? '');
    const vb = valFn ? valFn(b) : ((b as any)[sortKey] ?? '');
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
  return sortDir === 'desc' ? sorted.reverse() : sorted;
}

/** Sum a numeric extractor over rows safely. */
export function sumBy<T>(rows: T[], fn: (row: T) => number): number {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows.reduce((acc, r) => acc + (Number(fn(r)) || 0), 0);
}

/** Format a number as VND. */
export function formatVND(n: number): string {
  return (n || 0).toLocaleString('vi-VN') + '₫';
}
