/**
 * Google Material Design 3 (M3) Official Shape System & Touch Target Standards
 */

export const m3Shapes = {
  none: 0,
  extraSmall: 4,  // Badge, checkbox, modifier chip nhỏ
  small: 8,       // Input fields, nút phụ
  medium: 12,     // Table card, Product tile (Gạch xúc giác POS)
  large: 16,      // Card tổng kết, Bottom sheet modal
  extraLarge: 28, // Nút FAB, Dock thanh toán nổi
  full: 9999,     // Pill tròn cạnh (Chips lọc danh mục)
};

export const m3TouchTarget = {
  minSize: 48, // Chuẩn công thái học Google M3: Tối thiểu 48dp x 48dp
  minSpacing: 8, // Khoảng cách an toàn giữa 2 tâm nút bấm
};

export type M3ShapeToken = keyof typeof m3Shapes;
