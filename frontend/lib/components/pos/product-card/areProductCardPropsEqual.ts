import { ProductCardProps } from './types';

// 🌟 Strict areEqual comparator: Triệt tiêu 100% re-render thừa
export const areProductCardPropsEqual = (
  prev: Readonly<ProductCardProps>,
  next: Readonly<ProductCardProps>
): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    (prev.cartQty ?? 0) === (next.cartQty ?? 0) &&
    (prev.layoutMode || 'list') === (next.layoutMode || 'list') &&
    Boolean(prev.isOutOfStock) === Boolean(next.isOutOfStock) &&
    prev.name === next.name &&
    prev.price === next.price &&
    prev.image === next.image &&
    prev.code === next.code &&
    prev.category === next.category &&
    prev.width === next.width &&
    prev.sizes === next.sizes &&
    Boolean(prev.onAddSize) === Boolean(next.onAddSize) &&
    Boolean(prev.onDecrement) === Boolean(next.onDecrement) &&
    Boolean(prev.onCustomize) === Boolean(next.onCustomize) &&
    Boolean(prev.onLongPress) === Boolean(next.onLongPress)
  );
};
