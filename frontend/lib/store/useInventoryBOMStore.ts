import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPrice: number;
}

export interface RecipeItem {
  productId: string;
  ingredientId: string;
  quantityUsed: number;
  unit: string;
}

export interface InventoryBOMState {
  ingredients: Ingredient[];
  recipes: Record<string, RecipeItem[]>;
  lastDeductedOrderTime: string | null;

  // Actions
  setIngredients: (ingredients: Ingredient[]) => void;
  updateStock: (ingredientId: string, newStock: number) => void;
  restockIngredient: (ingredientId: string, quantityToAdd: number) => void;
  setRecipes: (recipes: Record<string, RecipeItem[]>) => void;
  addRecipeItem: (recipe: RecipeItem) => void;
  deductForOrder: (
    items: Array<{ productId: string; quantity: number }>
  ) => { deductedCount: number; lowStockAlerts: Ingredient[] };
  getLowStockIngredients: () => Ingredient[];
  isProductLowStock: (productId: string) => boolean;
}

export const INITIAL_INGREDIENTS: Ingredient[] = [];

export const INITIAL_RECIPES: Record<string, RecipeItem[]> = {};

export const useInventoryBOMStore = create<InventoryBOMState>()(
  persist(
    (set, get) => ({
      ingredients: INITIAL_INGREDIENTS,
      recipes: INITIAL_RECIPES,
      lastDeductedOrderTime: null,

      setIngredients: (ingredients) => set({ ingredients }),

      updateStock: (ingredientId, newStock) => {
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === ingredientId ? { ...ing, currentStock: Math.max(0, newStock) } : ing
          ),
        }));
      },

      restockIngredient: (ingredientId, quantityToAdd) => {
        set((state) => ({
          ingredients: state.ingredients.map((ing) =>
            ing.id === ingredientId
              ? { ...ing, currentStock: ing.currentStock + quantityToAdd }
              : ing
          ),
        }));
      },

      setRecipes: (recipes) => set({ recipes }),

      addRecipeItem: (recipe) => {
        set((state) => {
          const current = state.recipes[recipe.productId] || [];
          return {
            recipes: {
              ...state.recipes,
              [recipe.productId]: [...current, recipe],
            },
          };
        });
      },

      deductForOrder: (items) => {
        const { ingredients, recipes } = get();
        const stockDeductions: Record<string, number> = {};
        let totalDeductions = 0;

        // Aggregate required quantities from recipes
        for (const orderItem of items) {
          const productRecipes = recipes[orderItem.productId] || [];
          for (const recipe of productRecipes) {
            const needed = recipe.quantityUsed * orderItem.quantity;
            stockDeductions[recipe.ingredientId] =
              (stockDeductions[recipe.ingredientId] || 0) + needed;
            totalDeductions += needed;
          }
        }

        // Apply deductions to stock
        const updatedIngredients = ingredients.map((ing) => {
          const deduction = stockDeductions[ing.id] || 0;
          if (deduction > 0) {
            return {
              ...ing,
              currentStock: Math.max(0, ing.currentStock - deduction),
            };
          }
          return ing;
        });

        // Check for new low-stock items
        const lowStockAlerts = updatedIngredients.filter(
          (ing) => ing.currentStock <= ing.minStock
        );

        set({
          ingredients: updatedIngredients,
          lastDeductedOrderTime: new Date().toISOString(),
        });

        return {
          deductedCount: totalDeductions,
          lowStockAlerts,
        };
      },

      getLowStockIngredients: () => {
        const { ingredients } = get();
        return ingredients.filter((ing) => ing.currentStock <= ing.minStock);
      },

      isProductLowStock: (productId) => {
        const { ingredients, recipes } = get();
        const productRecipes = recipes[productId] || [];
        if (productRecipes.length === 0) return false;

        const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
        for (const r of productRecipes) {
          const ing = ingredientMap.get(r.ingredientId);
          if (ing && ing.currentStock <= ing.minStock) {
            return true;
          }
        }
        return false;
      },
    }),
    {
      name: 'ongchu_inventory_bom_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ingredients: state.ingredients,
        recipes: state.recipes,
        lastDeductedOrderTime: state.lastDeductedOrderTime,
      }),
    }
  )
);
