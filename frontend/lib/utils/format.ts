/**
 * Format số tiền VND (hiển thị).
 * Làm tròn, thêm dấu chấm phân cách hàng nghìn + " đ".
 *
 * Ví dụ: formatPrice(15000) → "15.000 đ"
 */
export const formatPrice = (v: number): string => {
  const rounded = Math.round(v);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
};

/**
 * Alias của formatPrice (giữ tương thích code cũ).
 */
export const formatPriceFull = formatPrice;
