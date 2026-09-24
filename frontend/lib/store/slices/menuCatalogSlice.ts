import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type {
  MenuItemWithModifiers,
  CategoryItem,
  ModifierOption,
  AreaItem,
  TableItem,
} from '../usePOSStore';

export type {
  MenuItemWithModifiers,
  CategoryItem,
  ModifierOption,
  AreaItem,
  TableItem,
};
import { wsClient } from '../../api/wsClient';
import { apiClient } from '../../api/apiClient';

const EMPTY_TABLE: TableItem = {
  id: '',
  name: 'Chưa Chọn Bàn',
  area: '',
  capacity: 0,
  status: 'trong',
  guestCount: 0,
  totalAmount: 0,
  itemCount: 0,
};

export interface MenuCatalogSlice {
  // Menu Products & Stock
  menuItems: MenuItemWithModifiers[];
  outOfStockProductIds: string[];
  pinnedItemIds: string[];
  categories: CategoryItem[];
  toppings: ModifierOption[];
  areas: AreaItem[];
  tables: TableItem[];
  selectedTable: TableItem;
  activeArea: string;

  // Actions
  setActiveArea: (area: string) => void;
  selectTable: (table: TableItem) => void;
  toggleOutOfStock: (productId: string) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  addProduct: (item: MenuItemWithModifiers) => void;
  updateProduct: (id: string, updates: Partial<MenuItemWithModifiers>) => void;
  deleteProduct: (id: string) => void;
  reorderProducts: (products: MenuItemWithModifiers[]) => void;
  togglePinItem: (productId: string) => void;
  populateSampleMenu: () => void;

  // Category Actions
  addCategory: (name: string, icon?: string) => void;
  updateCategory: (id: string, name: string, icon?: string) => void;
  deleteCategory: (id: string) => { success: boolean; message?: string };
  reorderCategories: (categories: CategoryItem[]) => void;

  // Topping Actions
  addTopping: (topping: { name: string; priceDelta: number }) => void;
  updateTopping: (id: string, updates: Partial<ModifierOption>) => void;
  deleteTopping: (id: string) => { success: boolean; message?: string };
  reorderToppings: (toppings: ModifierOption[]) => void;

  // Area Actions
  addArea: (name: string) => void;
  updateArea: (id: string, name: string) => void;
  deleteArea: (id: string) => { success: boolean; message?: string };
  reorderAreas: (areas: AreaItem[]) => void;

  // Table Actions
  addTable: (table: { name: string; area: string; capacity: number }) => void;
  updateTable: (id: string, updates: Partial<TableItem>) => void;
  deleteTable: (id: string) => { success: boolean; message?: string };
  reorderTables: (tables: TableItem[]) => void;
  markTablePrePrinted: (tableId: string) => void;
}

import {
  INITIAL_CATEGORIES,
  INITIAL_AREAS,
  INITIAL_TOPPINGS,
  INITIAL_MENU_ITEMS,
} from '../../constants/menuData';

const INITIAL_TABLES: TableItem[] = [
  { id: 'tbl_01', name: 'Bàn 01', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_02', name: 'Bàn 02', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_03', name: 'Bàn 03', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_04', name: 'Bàn 04', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_05', name: 'Bàn 05', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_06', name: 'Bàn 06', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_07', name: 'Bàn 07', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_08', name: 'Bàn 08', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_09', name: 'Bàn 09', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'tbl_10', name: 'Bàn 10', area: 'Trong Nhà', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'mv_01', name: 'Mang Về 01', area: 'Mang Về', capacity: 1, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'mv_02', name: 'Mang Về 02', area: 'Mang Về', capacity: 1, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'mv_03', name: 'Mang Về 03', area: 'Mang Về', capacity: 1, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'mv_04', name: 'Mang Về 04', area: 'Mang Về', capacity: 1, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'mv_05', name: 'Mang Về 05', area: 'Mang Về', capacity: 1, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'a935655c-c03b-4353-bf74-fdf17fad91f5', name: 'Bàn 01', area: 'Tầng Trệt', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: '4f44d493-cd77-497d-a04f-d40e57324651', name: 'Bàn 02', area: 'Tầng Trệt', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'c6fc4e88-6b96-4b33-be32-d4bad928e8e9', name: 'Bàn 03', area: 'Tầng Trệt', capacity: 6, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'e5db47c6-5c01-4a1c-8c06-cb3ce09ce695', name: 'Bàn 04 (VIP)', area: 'Tầng Trệt', capacity: 8, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: '36b32a8c-cdbc-4992-bfcd-9e797ebce904', name: 'Bàn Lầu 1', area: 'Lầu 1 (Máy Lạnh)', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
  { id: 'e0a5e5a9-3b61-47b0-875c-d2e63de1328d', name: 'Bàn Lầu 2', area: 'Lầu 1 (Máy Lạnh)', capacity: 4, status: 'trong', guestCount: 0, totalAmount: 0, itemCount: 0 },
];

export const createMenuCatalogSlice = (set: any, get: any): MenuCatalogSlice => ({
  menuItems: INITIAL_MENU_ITEMS,
  outOfStockProductIds: [],
  pinnedItemIds: [],
  categories: INITIAL_CATEGORIES,
  toppings: INITIAL_TOPPINGS,
  areas: INITIAL_AREAS,
  tables: INITIAL_TABLES,
  selectedTable: EMPTY_TABLE,
  activeArea: 'Tất Cả',

  setActiveArea: (area: string) => set({ activeArea: area }),

  selectTable: (table: TableItem) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const isTakeaway =
      table.id.startsWith('mv-') ||
      table.name.toLowerCase().includes('mang về') ||
      table.area === 'Mang Về';
    set({
      selectedTable: table,
      viewMode: 'pos',
      orderChannel: isTakeaway ? 'takeaway' : 'dine_in',
    });
  },

  toggleOutOfStock: (productId: string) => {
    const { outOfStockProductIds } = get();
    const exists = outOfStockProductIds.includes(productId);
    const updated = exists
      ? outOfStockProductIds.filter((id: string) => id !== productId)
      : [...outOfStockProductIds, productId];

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(
          exists ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );
      } catch {}
    }

    set({ outOfStockProductIds: updated });
    wsClient.broadcastProduct86(productId);
  },

  updateProductPrice: (productId: string, newPrice: number) => {
    const { menuItems } = get();
    const cleanPrice = Math.max(0, newPrice);
    const updated = menuItems.map((item: MenuItemWithModifiers) =>
      item.id === productId ? { ...item, price: cleanPrice } : item
    );
    set({ menuItems: updated });
    wsClient.broadcastProductPrice(productId, cleanPrice);
  },

  addProduct: (newItem: MenuItemWithModifiers) => {
    const { menuItems, categories } = get();
    set({ menuItems: [newItem, ...menuItems] });
    wsClient.broadcastProductCreated(newItem);
    const cat = categories.find((c: CategoryItem) => c.name === newItem.category);
    apiClient.createProduct({
      id: newItem.id,
      name: newItem.name,
      code: newItem.code,
      category_id: cat ? cat.id : undefined,
      selling_price: newItem.price,
      cost_price: newItem.costPrice || 0,
      unit: newItem.unit || 'Phần',
      image_url: newItem.image,
      station: newItem.station || 'bar',
      sizes: newItem.sizes || [],
      toppings: newItem.toppings || [],
    }).catch(() => {});
  },

  updateProduct: (id: string, updates: Partial<MenuItemWithModifiers>) => {
    const { menuItems, categories } = get();
    const updated = menuItems.map((item: MenuItemWithModifiers) =>
      item.id === id ? { ...item, ...updates } : item
    );
    set({ menuItems: updated });
    const target = updated.find((i: MenuItemWithModifiers) => i.id === id);
    if (target) {
      wsClient.broadcastProductUpdated(target);
      const cat = categories.find((c: CategoryItem) => c.name === target.category);
      apiClient.updateProduct(id, {
        name: target.name,
        code: target.code,
        category_id: cat ? cat.id : undefined,
        selling_price: target.price,
        cost_price: target.costPrice || 0,
        unit: target.unit || 'Phần',
        image_url: target.image,
        station: target.station || 'bar',
        is_pinned: target.isPinned,
        sizes: target.sizes || [],
        toppings: target.toppings || [],
      }).catch(() => {});
    }
  },

  deleteProduct: (id: string) => {
    const { menuItems, pinnedItemIds, outOfStockProductIds } = get();
    set({
      menuItems: menuItems.filter((i: MenuItemWithModifiers) => i.id !== id),
      pinnedItemIds: pinnedItemIds.filter((p: string) => p !== id),
      outOfStockProductIds: outOfStockProductIds.filter((o: string) => o !== id),
    });
    wsClient.broadcastProductDeleted(id);
    apiClient.deleteProduct(id).catch(() => {});
  },

  reorderProducts: (newProducts: MenuItemWithModifiers[]) => {
    set({ menuItems: newProducts });
    const ids = newProducts.map((p) => p.id);
    apiClient.reorderProducts(ids).catch(() => {});
    wsClient.broadcastProductsReordered(ids);
  },

  togglePinItem: (productId: string) => {
    const { pinnedItemIds } = get();
    const isPinned = pinnedItemIds.includes(productId);
    const updated = isPinned
      ? pinnedItemIds.filter((id: string) => id !== productId)
      : [...pinnedItemIds, productId];
    set({ pinnedItemIds: updated });
    wsClient.broadcastProductPin(productId);
  },

  populateSampleMenu: () => {
    set({
      categories: INITIAL_CATEGORIES,
      areas: INITIAL_AREAS,
      toppings: INITIAL_TOPPINGS,
      menuItems: INITIAL_MENU_ITEMS,
      tables: INITIAL_TABLES,
    });
  },

  // Category Actions
  addCategory: (name: string, icon?: string) => {
    const { categories } = get();
    const newCat: CategoryItem = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      icon: icon || 'tag-outline',
      displayOrder: categories.length + 1,
    };
    set({ categories: [...categories, newCat] });
    wsClient.broadcastCategoryCreated(newCat);
    apiClient.createCategory({
      id: newCat.id,
      name: newCat.name,
      icon: newCat.icon,
    }).catch(() => {});
  },

  updateCategory: (id: string, name: string, icon?: string) => {
    const { categories, menuItems } = get();
    const oldCat = categories.find((c: CategoryItem) => c.id === id);
    const updatedCategories = categories.map((c: CategoryItem) =>
      c.id === id ? { ...c, name: name.trim(), ...(icon ? { icon } : {}) } : c
    );
    const updatedMenu = oldCat
      ? menuItems.map((m: MenuItemWithModifiers) =>
          m.category === oldCat.name ? { ...m, category: name.trim() } : m
        )
      : menuItems;
    set({ categories: updatedCategories, menuItems: updatedMenu });
    const target = updatedCategories.find((c: CategoryItem) => c.id === id);
    if (target) {
      wsClient.broadcastCategoryUpdated(target);
      apiClient.updateCategory(id, { name: target.name, icon: target.icon }).catch(() => {});
    }
  },

  deleteCategory: (id: string) => {
    const { categories, menuItems } = get();
    const catToDelete = categories.find((c: CategoryItem) => c.id === id);
    if (!catToDelete) return { success: false, message: 'Danh mục không tồn tại' };
    const count = menuItems.filter((m: MenuItemWithModifiers) => m.category === catToDelete.name).length;
    if (count > 0) {
      return { success: false, message: `Danh mục đang có ${count} món, không thể xóa` };
    }
    set({ categories: categories.filter((c: CategoryItem) => c.id !== id) });
    wsClient.broadcastCategoryDeleted(id);
    apiClient.deleteCategory(id).catch(() => {});
    return { success: true };
  },

  reorderCategories: (newCats: CategoryItem[]) => {
    set({ categories: newCats });
    const ids = newCats.map((c) => c.id);
    apiClient.reorderCategories(ids).catch(() => {});
    wsClient.broadcastCategoriesReordered(ids);
  },

  // Topping Actions
  addTopping: (topping: { name: string; priceDelta: number }) => {
    const { toppings } = get();
    const newTop: ModifierOption = {
      id: `top_${Date.now()}`,
      name: topping.name.trim(),
      priceDelta: topping.priceDelta || 0,
    };
    set({ toppings: [...toppings, newTop] });
    wsClient.broadcastToppingCreated(newTop);
    apiClient.createTopping({
      id: newTop.id,
      name: newTop.name,
      price_delta: newTop.priceDelta,
    }).catch(() => {});
  },

  updateTopping: (id: string, updates: Partial<ModifierOption>) => {
    const { toppings } = get();
    const updated = toppings.map((t: ModifierOption) => (t.id === id ? { ...t, ...updates } : t));
    set({ toppings: updated });
    const target = updated.find((t: ModifierOption) => t.id === id);
    if (target) {
      wsClient.broadcastToppingUpdated(target);
      apiClient.updateTopping(id, {
        name: target.name,
        price_delta: target.priceDelta,
      }).catch(() => {});
    }
  },

  deleteTopping: (id: string) => {
    const { toppings } = get();
    set({ toppings: toppings.filter((t: ModifierOption) => t.id !== id) });
    wsClient.broadcastToppingDeleted(id);
    apiClient.deleteTopping(id).catch(() => {});
    return { success: true };
  },

  reorderToppings: (newToppings: ModifierOption[]) => {
    set({ toppings: newToppings });
    const ids = newToppings.map((t) => t.id);
    apiClient.reorderToppings(ids).catch(() => {});
  },

  // Area Actions
  addArea: (name: string) => {
    const { areas } = get();
    const newArea: AreaItem = {
      id: `area_${Date.now()}`,
      name: name.trim(),
      displayOrder: areas.length + 1,
    };
    set({ areas: [...areas, newArea] });
    wsClient.broadcastAreaCreated(newArea);
    apiClient.createArea(newArea.name).catch(() => {});
  },

  updateArea: (id: string, name: string) => {
    const { areas, tables } = get();
    const oldArea = areas.find((a: AreaItem) => a.id === id);
    const updatedAreas = areas.map((a: AreaItem) =>
      a.id === id ? { ...a, name: name.trim() } : a
    );
    const updatedTables = oldArea
      ? tables.map((t: TableItem) =>
          t.area === oldArea.name ? { ...t, area: name.trim() } : t
        )
      : tables;
    set({ areas: updatedAreas, tables: updatedTables });
    const target = updatedAreas.find((a: AreaItem) => a.id === id);
    if (target) {
      wsClient.broadcastAreaUpdated(target);
      apiClient.updateArea(id, target.name).catch(() => {});
    }
  },

  deleteArea: (id: string) => {
    const { areas, tables } = get();
    const areaToDelete = areas.find((a: AreaItem) => a.id === id);
    if (!areaToDelete) return { success: false, message: 'Khu vực không tồn tại' };
    const count = tables.filter((t: TableItem) => t.area === areaToDelete.name).length;
    if (count > 0) {
      return { success: false, message: `Khu vực đang có ${count} bàn, không thể xóa` };
    }
    set({ areas: areas.filter((a: AreaItem) => a.id !== id) });
    wsClient.broadcastAreaDeleted(id);
    apiClient.deleteArea(id).catch(() => {});
    return { success: true };
  },

  reorderAreas: (newAreas: AreaItem[]) => {
    set({ areas: newAreas });
    const ids = newAreas.map((a) => a.id);
    apiClient.reorderAreas(ids).catch(() => {});
    wsClient.send({ type: 'areas_reordered', ids, area_ids: ids });
  },

  // Table Actions
  addTable: ({ name, area, capacity }: { name: string; area: string; capacity: number }) => {
    const { tables } = get();
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const newTable: TableItem = {
      id: `t_${Date.now()}_${uniqueSuffix}`,
      name: name.trim(),
      area: area.trim(),
      capacity: capacity || 4,
      status: 'trong',
      guestCount: 0,
      totalAmount: 0,
      itemCount: 0,
    };
    set({ tables: [...tables, newTable] });
    wsClient.broadcastTableCreated(newTable);
    apiClient.createTable({
      id: newTable.id,
      name: newTable.name,
      area_name: newTable.area,
      capacity: newTable.capacity,
    }).catch(() => {});
  },

  updateTable: (id: string, updates: Partial<TableItem>) => {
    const { tables, selectedTable } = get();
    const updated = tables.map((t: TableItem) =>
      t.id === id ? { ...t, ...updates } : t
    );
    const newSelected = selectedTable.id === id ? { ...selectedTable, ...updates } : selectedTable;
    set({
      tables: updated,
      selectedTable: newSelected,
    });
    const target = updated.find((t: TableItem) => t.id === id);
    if (target) {
      wsClient.broadcastTableUpdated(target);
      apiClient.updateTable(id, {
        name: target.name,
        area_name: target.area,
        capacity: target.capacity,
        status: target.status,
      }).catch(() => {});
    }
  },

  deleteTable: (id: string) => {
    const { tables, tableCarts, selectedTable } = get();
    const tableToDelete = tables.find((t: TableItem) => t.id === id);
    if (!tableToDelete) return { success: false, message: 'Bàn không tồn tại' };
    if (tableToDelete.status === 'co_khach' || (tableCarts[id] && tableCarts[id].length > 0)) {
      return { success: false, message: 'Bàn đang có khách hoặc món, không thể xóa' };
    }
    const updatedTables = tables.filter((t: TableItem) => t.id !== id);
    set({
      tables: updatedTables,
      selectedTable: selectedTable.id === id ? (updatedTables[0] || selectedTable) : selectedTable,
    });
    wsClient.broadcastTableDeleted(id);
    apiClient.delete(`/api/v1/tables/${id}`).catch(() => {});
    return { success: true };
  },

  reorderTables: (newTables: TableItem[]) => {
    set({ tables: newTables });
    const ids = newTables.map((t) => t.id);
    apiClient.reorderTables(ids).catch(() => {});
    wsClient.send({ type: 'tables_reordered', ids, table_ids: ids });
  },

  markTablePrePrinted: (tableId: string) => {
    const { tables, selectedTable } = get();
    set({
      tables: tables.map((t: TableItem) =>
        t.id === tableId ? { ...t, status: 'da_in_tam_tinh' } : t
      ),
      selectedTable:
        selectedTable.id === tableId
          ? { ...selectedTable, status: 'da_in_tam_tinh' }
          : selectedTable,
    });
    wsClient.broadcastTablePrePrinted(tableId);
  },
});