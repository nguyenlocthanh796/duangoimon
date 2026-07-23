export * from './colors';
export * from './typography';
export * from './shape';
export * from './dataText';
export * from './animations';
export * from './globalStyles';

/** Format number as VND currency */
export function formatVND(n: number): string {
  return (n || 0).toLocaleString('vi-VN') + '₫';
}

/** Format ISO date string */
export function formatDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}
