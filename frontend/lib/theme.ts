// Design tokens – re-export from color system
export { colors, palette, COLORS } from './theme/colors';
export { font } from './theme/typography';

export const formatPrice = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}đ`;

export const formatPriceFull = (v: number) => {
  const rounded = Math.round(v);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
};
