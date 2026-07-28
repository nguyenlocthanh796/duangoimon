'use client';
import { useState, useEffect, useCallback } from 'react';

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
  bgColor?: string;
  bg?: string;
  isActive: boolean;
}

export interface OptionChoice {
  id: string;
  name: string;
  price: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'size' | 'topping' | 'single' | 'multiple';
  required: boolean;
  choices: OptionChoice[];
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'do-an', name: 'Đồ ăn', icon: 'food', color: '#D97706', bgColor: '#FEF3C7', isActive: true },
  { id: 'do-uong', name: 'Đồ uống', icon: 'cup-water', color: '#2563EB', bgColor: '#EFF6FF', isActive: true },
  { id: 'trang-mieng', name: 'Tráng miệng', icon: 'ice-cream', color: '#DB2777', bgColor: '#FCE7F3', isActive: true },
  { id: 'snack', name: 'Snack', icon: 'candy', color: '#16A34A', bgColor: '#ECFDF5', isActive: true },
  { id: 'khac', name: 'Khác', icon: 'dots-horizontal', color: '#737373', bgColor: '#F1F5F9', isActive: true },
];

const DEFAULT_OPTION_GROUPS: OptionGroup[] = [
  {
    id: 'grp_size',
    name: 'Kích cỡ (Size)',
    type: 'size',
    required: true,
    choices: [
      { id: 'sz_s', name: 'Size S', price: 0 },
      { id: 'sz_m', name: 'Size M', price: 5000 },
      { id: 'sz_l', name: 'Size L', price: 10000 },
      { id: 'sz_xl', name: 'Size XL', price: 15000 },
    ],
  },
  {
    id: 'grp_topping',
    name: 'Topping & Món kèm',
    type: 'topping',
    required: false,
    choices: [
      { id: 'tp_tc_den', name: 'Trân châu đen', price: 5000 },
      { id: 'tp_tc_trang', name: 'Trân châu trắng', price: 7000 },
      { id: 'tp_thach_dua', name: 'Thạch dừa', price: 5000 },
      { id: 'tp_pudding', name: 'Pudding trứng', price: 8000 },
      { id: 'tp_pho_mai', name: 'Phô mai tươi', price: 10000 },
      { id: 'tp_hat_sen', name: 'Hạt sen thơm', price: 12000 },
    ],
  },
  {
    id: 'grp_sugar',
    name: 'Mức đường',
    type: 'single',
    required: false,
    choices: [
      { id: 'sugar_100', name: '100% Đường', price: 0 },
      { id: 'sugar_70', name: '70% Đường', price: 0 },
      { id: 'sugar_50', name: '50% Đường', price: 0 },
      { id: 'sugar_30', name: '30% Đường', price: 0 },
      { id: 'sugar_0', name: 'Không đường (0%)', price: 0 },
    ],
  },
  {
    id: 'grp_ice',
    name: 'Mức đá',
    type: 'single',
    required: false,
    choices: [
      { id: 'ice_100', name: '100% Đá', price: 0 },
      { id: 'ice_50', name: '50% Đá', price: 0 },
      { id: 'ice_30', name: '30% Đá', price: 0 },
      { id: 'ice_0', name: 'Không đá', price: 0 },
    ],
  },
];

const STORAGE_CAT_KEY = '@pos_custom_categories_v1';
const STORAGE_OPT_KEY = '@pos_custom_option_groups_v1';

export function useCategoryOptionSettings() {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(DEFAULT_OPTION_GROUPS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    (async () => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const catStr = localStorage.getItem(STORAGE_CAT_KEY);
          if (catStr) {
            const parsedCat = JSON.parse(catStr);
            if (Array.isArray(parsedCat) && parsedCat.length > 0) {
              setCategories(parsedCat);
            }
          }
          const optStr = localStorage.getItem(STORAGE_OPT_KEY);
          if (optStr) {
            const parsedOpt = JSON.parse(optStr);
            if (Array.isArray(parsedOpt) && parsedOpt.length > 0) {
              setOptionGroups(parsedOpt);
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Save Categories helper
  const saveCategories = useCallback((newCats: CategoryItem[]) => {
    setCategories(newCats);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(newCats));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save Option Groups helper
  const saveOptionGroups = useCallback((newGroups: OptionGroup[]) => {
    setOptionGroups(newGroups);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_OPT_KEY, JSON.stringify(newGroups));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Category CRUD
  const addCategory = useCallback(
    (name: string, icon = 'tag-outline', color = '#2563EB', bgColor = '#EFF6FF') => {
      if (!name.trim()) return;
      const slug = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '-');
      const newCat: CategoryItem = {
        id: `cat_${slug}_${Date.now()}`,
        name: name.trim(),
        icon,
        color,
        bgColor,
        isActive: true,
      };
      saveCategories([...categories, newCat]);
    },
    [categories, saveCategories]
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<CategoryItem>) => {
      const updated = categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveCategories(updated);
    },
    [categories, saveCategories]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const filtered = categories.filter((c) => c.id !== id);
      saveCategories(filtered);
    },
    [categories, saveCategories]
  );

  // Option Group CRUD
  const addOptionGroup = useCallback(
    (groupName: string, type: 'size' | 'topping' | 'single' | 'multiple', choices: OptionChoice[]) => {
      if (!groupName.trim()) return;
      const newGroup: OptionGroup = {
        id: `grp_${Date.now()}`,
        name: groupName.trim(),
        type,
        required: type === 'size',
        choices,
      };
      saveOptionGroups([...optionGroups, newGroup]);
    },
    [optionGroups, saveOptionGroups]
  );

  const updateOptionGroup = useCallback(
    (id: string, updates: Partial<OptionGroup>) => {
      const updated = optionGroups.map((g) => (g.id === id ? { ...g, ...updates } : g));
      saveOptionGroups(updated);
    },
    [optionGroups, saveOptionGroups]
  );

  const deleteOptionGroup = useCallback(
    (id: string) => {
      const filtered = optionGroups.filter((g) => g.id !== id);
      saveOptionGroups(filtered);
    },
    [optionGroups, saveOptionGroups]
  );

  // Add Choice to Option Group
  const addChoiceToGroup = useCallback(
    (groupId: string, choiceName: string, price: number) => {
      const updated = optionGroups.map((g) => {
        if (g.id !== groupId) return g;
        const newChoice: OptionChoice = {
          id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: choiceName.trim(),
          price: Math.max(0, price),
        };
        return { ...g, choices: [...g.choices, newChoice] };
      });
      saveOptionGroups(updated);
    },
    [optionGroups, saveOptionGroups]
  );

  const deleteChoiceFromGroup = useCallback(
    (groupId: string, choiceId: string) => {
      const updated = optionGroups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, choices: g.choices.filter((c) => c.id !== choiceId) };
      });
      saveOptionGroups(updated);
    },
    [optionGroups, saveOptionGroups]
  );

  return {
    categories,
    optionGroups,
    isLoaded,
    addCategory,
    updateCategory,
    deleteCategory,
    addOptionGroup,
    updateOptionGroup,
    deleteOptionGroup,
    addChoiceToGroup,
    deleteChoiceFromGroup,
  };
}
