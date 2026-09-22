import { lightTheme } from '../../../theme/colors';
import { ModifierOption } from '../ModifierSheet';

export interface ProductCardProps {
  cartQty?: number;
  name: string;
  price: number;
  code?: string;
  category?: string;
  image?: string;
  layoutMode?: 'grid' | 'list';
  isOutOfStock?: boolean;
  sizes?: ModifierOption[];
  onPress: () => void;
  onAddSize?: (size: ModifierOption) => void;
  onDecrement?: () => void;
  onCustomize?: () => void;
  onLongPress?: () => void;
  width?: any;
}

export interface CategoryVisual {
  icon: any;
  bg: string;
  iconColor: string;
}

export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'Trà Sữa': { icon: 'cup-water' as const, bg: lightTheme.status.dangerBg, iconColor: lightTheme.brand.danger },
  'Cà Phê': { icon: 'coffee' as const, bg: lightTheme.status.pendingBg, iconColor: lightTheme.status.pendingText },
  'Ăn Vặt': { icon: 'food-drumstick' as const, bg: lightTheme.status.warningBg, iconColor: lightTheme.brand.accent },
  'Nước Ép': { icon: 'fruit-cherries' as const, bg: lightTheme.status.readyBg, iconColor: lightTheme.brand.success },
};

export const DEFAULT_VISUAL: CategoryVisual = {
  icon: 'silverware-fork-knife' as const,
  bg: lightTheme.surface.app,
  iconColor: lightTheme.brand.primary,
};

export const getCategoryVisuals = (category?: string): CategoryVisual =>
  (category && CATEGORY_VISUALS[category]) || DEFAULT_VISUAL;
