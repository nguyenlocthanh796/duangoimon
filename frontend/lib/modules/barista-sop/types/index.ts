export interface RecipeStep {
  stepNumber: number;
  title: string;
  description: string;
  durationSeconds?: number;
  temperature?: string;
  tip?: string;
}

export interface RecipeIngredientItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPrice: number; // Đơn giá vốn trên mỗi đơn vị (VND/g hoặc VND/ml)
}

export interface RecipeSizeVariant {
  sizeName: string; // e.g. "Size Vừa (M)", "Size Lớn (L)"
  ingredients: RecipeIngredientItem[];
}

export interface BatchFormula {
  id: string;
  batchName: string; // e.g. "Nấu bình 5 Lít", "Ủ 1 mẻ cốt trà 3L"
  yieldServings: number; // e.g. 20 ly
  teaType?: string; // e.g. "Trà Xanh Hoa Nhài Lộc Phát", "Trà Đen Số 9"
  teaQuantityGrams?: number; // e.g. 120g
  waterVolumeMl?: number; // e.g. 5000ml (5 Lít)
  waterTempCelsius?: number; // e.g. 85°C, 95°C
  brewTimeSeconds?: number; // e.g. 600s = 10 phút
  iceShockGrams?: number; // e.g. 800g đá bi sốc nhiệt
  shelfLifeHours?: number; // e.g. 4 giờ, 8 giờ, 24 giờ
  ingredients: {
    ingredientId?: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    costPrice?: number;
  }[];
  instructions: string[];
}

export interface RecipeBookItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  sellingPrice: number;
  prepTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  variants: RecipeSizeVariant[];
  steps: RecipeStep[];
  batchFormulas?: BatchFormula[];
  tags?: string[];
  imageUrl?: string;
  updatedAt?: string;
}

export interface ActiveBrewTimer {
  id: string;
  batchId: string;
  recipeId: string;
  recipeName: string;
  batchName: string;
  teaType?: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt: string;
  shelfLifeHours: number;
  stage: 'brewing' | 'cooling' | 'ready';
}

export type BaristaSubAppTab = 'recipes' | 'brewing' | 'focus';
