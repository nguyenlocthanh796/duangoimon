import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_RECIPES } from '../constants/sampleRecipes';
import {
  RecipeBookItem,
  RecipeSizeVariant,
  RecipeIngredientItem,
  BatchFormula,
  ActiveBrewTimer,
} from '../types';

export interface BaristaSOPState {
  recipes: RecipeBookItem[];
  selectedCategory: string;
  searchQuery: string;
  activeTimers: ActiveBrewTimer[];

  // Actions
  setRecipes: (recipes: RecipeBookItem[]) => void;
  addRecipe: (recipe: Omit<RecipeBookItem, 'id'>) => RecipeBookItem;
  updateRecipe: (id: string, updates: Partial<RecipeBookItem>) => void;
  deleteRecipe: (id: string) => void;
  duplicateRecipe: (id: string) => RecipeBookItem | undefined;
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  getRecipeByProductId: (productId: string) => RecipeBookItem | undefined;
  calculateVariantCost: (variant: RecipeSizeVariant) => number;
  calculateProfitMargin: (sellingPrice: number, costPrice: number) => number;
  scaleIngredientsForBatch: (
    ingredients: RecipeIngredientItem[],
    multiplier: number
  ) => RecipeIngredientItem[];

  // Brew Multi-Timer Lifecycle Actions
  startBrewTimer: (batch: BatchFormula, recipe: RecipeBookItem) => ActiveBrewTimer;
  pauseBrewTimer: (timerId: string) => void;
  resumeBrewTimer: (timerId: string) => void;
  resetBrewTimer: (timerId: string) => void;
  stopBrewTimer: (timerId: string) => void;
  tickTimers: () => void;
}

export const useBaristaStore = create<BaristaSOPState>()(
  persist(
    (set, get) => ({
      recipes: [],
      selectedCategory: 'Tất cả',
      searchQuery: '',
      activeTimers: [],

      setRecipes: (recipes) => set({ recipes }),

      addRecipe: (recipeData) => {
        const newRecipe: RecipeBookItem = {
          ...recipeData,
          id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ recipes: [newRecipe, ...state.recipes] }));
        return newRecipe;
      },

      updateRecipe: (id, updates) => {
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },

      deleteRecipe: (id) => {
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
        }));
      },

      duplicateRecipe: (id) => {
        const original = get().recipes.find((r) => r.id === id);
        if (!original) return undefined;
        const cloned: RecipeBookItem = {
          ...original,
          id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          productName: `${original.productName} (Bản sao)`,
          productId: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ recipes: [cloned, ...state.recipes] }));
        return cloned;
      },

      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      getRecipeByProductId: (productId) => {
        return get().recipes.find((r) => r.productId === productId);
      },

      calculateVariantCost: (variant) => {
        if (!variant || !variant.ingredients) return 0;
        return variant.ingredients.reduce((total, ing) => {
          return total + (ing.quantity || 0) * (ing.costPrice || 0);
        }, 0);
      },

      calculateProfitMargin: (sellingPrice, costPrice) => {
        if (!sellingPrice || sellingPrice <= 0) return 0;
        const profit = sellingPrice - costPrice;
        return Math.round((profit / sellingPrice) * 100);
      },

      scaleIngredientsForBatch: (ingredients, multiplier) => {
        if (!ingredients || multiplier <= 0) return [];
        return ingredients.map((ing) => ({
          ...ing,
          quantity: Math.round(ing.quantity * multiplier * 10) / 10,
        }));
      },

      // Brew Multi-Timer Lifecycle
      startBrewTimer: (batch, recipe) => {
        const brewSeconds = batch.brewTimeSeconds || 600;
        const timerId = 'tmr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const newTimer: ActiveBrewTimer = {
          id: timerId,
          batchId: batch.id,
          recipeId: recipe.id,
          recipeName: recipe.productName,
          batchName: batch.batchName,
          teaType: batch.teaType || batch.ingredients?.[0]?.ingredientName || 'Trà Cốt',
          totalSeconds: brewSeconds,
          remainingSeconds: brewSeconds,
          isRunning: true,
          startedAt: new Date().toISOString(),
          shelfLifeHours: batch.shelfLifeHours || 4,
          stage: 'brewing',
        };
        set((state) => ({ activeTimers: [newTimer, ...state.activeTimers] }));
        return newTimer;
      },

      pauseBrewTimer: (timerId) => {
        set((state) => ({
          activeTimers: state.activeTimers.map((t) =>
            t.id === timerId ? { ...t, isRunning: false } : t
          ),
        }));
      },

      resumeBrewTimer: (timerId) => {
        set((state) => ({
          activeTimers: state.activeTimers.map((t) =>
            t.id === timerId ? { ...t, isRunning: true } : t
          ),
        }));
      },

      resetBrewTimer: (timerId) => {
        set((state) => ({
          activeTimers: state.activeTimers.map((t) =>
            t.id === timerId
              ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false, stage: 'brewing' }
              : t
          ),
        }));
      },

      stopBrewTimer: (timerId) => {
        set((state) => ({
          activeTimers: state.activeTimers.filter((t) => t.id !== timerId),
        }));
      },

      tickTimers: () => {
        set((state) => ({
          activeTimers: state.activeTimers.map((t) => {
            if (!t.isRunning || t.remainingSeconds <= 0) {
              if (t.remainingSeconds <= 0 && t.stage === 'brewing') {
                return { ...t, isRunning: false, stage: 'ready' };
              }
              return t;
            }
            const nextRemain = t.remainingSeconds - 1;
            return {
              ...t,
              remainingSeconds: nextRemain,
              isRunning: nextRemain > 0,
              stage: nextRemain <= 0 ? 'ready' : 'brewing',
            };
          }),
        }));
      },
    }),
    {
      name: 'ongchu_recipe_book_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recipes: state.recipes,
      }),
    }
  )
);

// Backward compatibility alias
export const useRecipeBookStore = useBaristaStore;
