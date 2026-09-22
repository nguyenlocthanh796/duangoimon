import { TableCardProps } from './types';

export const areTableCardPropsEqual = (
  prev: Readonly<TableCardProps>,
  next: Readonly<TableCardProps>
): boolean => {
  if (prev === next) return true;
  if (!prev || !next || !prev.table || !next.table) return false;
  return (
    prev.selected === next.selected &&
    prev.itemCount === next.itemCount &&
    prev.width === next.width &&
    prev.table.id === next.table.id &&
    prev.table.status === next.table.status &&
    prev.table.totalAmount === next.table.totalAmount &&
    prev.table.guestCount === next.table.guestCount &&
    prev.table.name === next.table.name &&
    prev.table.area === next.table.area &&
    prev.table.capacity === next.table.capacity &&
    prev.table.itemCount === next.table.itemCount &&
    prev.table.createdAt === next.table.createdAt
  );
};
