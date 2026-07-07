// Shared domain types
export interface Table {
  id: string;
  name: string;
  status: 'trong' | 'co_khach' | 'da_dat' | 'dang_don';
  area?: string;
  capacity: number;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
}
