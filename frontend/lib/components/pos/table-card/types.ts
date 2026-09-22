export interface TableItem {
  id: string;
  name: string;
  area: string;
  capacity: number;
  status: 'trong' | 'co_khach' | 'da_dat' | 'dang_su_dung' | 'da_in_tam_tinh';
  guestCount?: number;
  totalAmount?: number;
  itemCount?: number;
  createdAt?: string; // ISO string
  note?: string;
}

export interface TableCardProps {
  table: TableItem;
  selected?: boolean;
  itemCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
  width?: number | `${number}%`;
}
