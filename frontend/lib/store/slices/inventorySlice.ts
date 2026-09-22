import type {
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionItem,
  InventoryStockOutReason,
} from '../usePOSStore';
import {
  calculateEffectiveCost,
  checkCostPriceSpike,
} from '../../constants/menuData';

export interface InventorySlice {
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];

  // Inventory Actions
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  restockInventoryItem: (
    id: string,
    qty: number,
    totalCost: number,
    paymentSource?: 'cash' | 'bank'
  ) => { isSpike: boolean; percentChange: number } | undefined;
  adjustStock: (id: string, actualStock: number, note?: string) => void;
  stockIn: (data: {
    items: { itemId: string; qty: number; costPrice: number }[];
    supplierName?: string;
    paymentMethod: 'tien_mat' | 'chuyen_khoan';
    note?: string;
    performedBy?: string;
  }) => InventoryTransaction;
  stockOut: (data: {
    items: { itemId: string; qty: number }[];
    reason: InventoryStockOutReason;
    note?: string;
    returnRefund?: number;
    performedBy?: string;
  }) => InventoryTransaction;
  performStockAudit: (
    items: { itemId: string; actualStock: number; note?: string }[],
    performedBy?: string
  ) => InventoryTransaction;
}

export const createInventorySlice = (set: any, get: any): InventorySlice => ({
  inventoryItems: [],
  inventoryTransactions: [],

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => {
    const { inventoryItems } = get();
    const yieldRate = item.yieldRate ?? 100;
    const effectiveCostPrice = calculateEffectiveCost(item.costPrice, yieldRate);
    const newItem: InventoryItem = {
      ...item,
      id: `inv_${Date.now()}`,
      yieldRate,
      effectiveCostPrice,
    };
    set({ inventoryItems: [newItem, ...inventoryItems] });
  },

  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => {
    const { inventoryItems } = get();
    set({
      inventoryItems: inventoryItems.map((i: InventoryItem) => {
        if (i.id !== id) return i;
        const merged = { ...i, ...updates };
        const yieldRate = merged.yieldRate ?? 100;
        const effectiveCostPrice = calculateEffectiveCost(merged.costPrice, yieldRate);
        return {
          ...merged,
          yieldRate,
          effectiveCostPrice,
        };
      }),
    });
  },

  deleteInventoryItem: (id: string) => {
    const { inventoryItems } = get();
    set({ inventoryItems: inventoryItems.filter((i: InventoryItem) => i.id !== id) });
  },

  restockInventoryItem: (id: string, qty: number, totalCost: number, paymentSource = 'cash') => {
    const { inventoryItems, addCashTransaction } = get();
    const target = inventoryItems.find((i: InventoryItem) => i.id === id);
    if (!target) return undefined;
    const newStock = target.currentStock + qty;
    const costPerUnit = Math.round(totalCost / Math.max(1, qty));
    const previousCostPrice = target.costPrice;
    const yieldRate = target.yieldRate ?? 100;
    const effectiveCostPrice = calculateEffectiveCost(costPerUnit, yieldRate);
    const spikeCheck = checkCostPriceSpike(costPerUnit, previousCostPrice, target.maxCostAlertThreshold || 15);

    set({
      inventoryItems: inventoryItems.map((i: InventoryItem) =>
        i.id === id
          ? {
              ...i,
              currentStock: newStock,
              costPrice: costPerUnit,
              previousCostPrice,
              yieldRate,
              effectiveCostPrice,
              lastRestockedAt: new Date().toISOString(),
            }
          : i
      ),
    });
    if (paymentSource === 'cash') {
      addCashTransaction({
        type: 'chi',
        category: 'chi_nhap_hang',
        amount: totalCost,
        description: `Nhập kho: ${target.name} (+${qty} ${target.unit})${spikeCheck.isSpike ? ` [CẢNH BÁO TĂNG GIÁ +${spikeCheck.percentChange}%]` : ''}`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        performedBy: 'Chủ Quán',
      });
    }
    return spikeCheck;
  },

  adjustStock: (id: string, actualStock: number, note?: string) => {
    const { inventoryItems } = get();
    set({
      inventoryItems: inventoryItems.map((i: InventoryItem) =>
        i.id === id
          ? {
              ...i,
              currentStock: actualStock,
              lastRestockedAt: new Date().toISOString(),
            }
          : i
      ),
    });
  },

  stockIn: (data: {
    items: { itemId: string; qty: number; costPrice: number }[];
    supplierName?: string;
    paymentMethod: 'tien_mat' | 'chuyen_khoan';
    note?: string;
    performedBy?: string;
  }) => {
    const { inventoryItems, inventoryTransactions, addCashTransaction } = get();
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `PN-${dateStr}-${rand}`;
    const performedBy = data.performedBy || 'Chủ Quán';

    let totalAmount = 0;
    const txItems: InventoryTransactionItem[] = [];
    const updatedInventory = [...inventoryItems];

    data.items.forEach((inp) => {
      const idx = updatedInventory.findIndex((i: InventoryItem) => i.id === inp.itemId);
      if (idx !== -1) {
        const item = updatedInventory[idx];
        const qty = Math.max(1, inp.qty);
        const costPrice = Math.max(0, inp.costPrice);
        const lineCost = qty * costPrice;
        totalAmount += lineCost;

        updatedInventory[idx] = {
          ...item,
          currentStock: item.currentStock + qty,
          costPrice: costPrice,
          lastRestockedAt: now.toISOString(),
          supplierName: data.supplierName || item.supplierName,
        };

        txItems.push({
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          quantity: qty,
          costPrice: costPrice,
          totalCost: lineCost,
          systemStockBefore: item.currentStock,
          actualStockAfter: item.currentStock + qty,
        });
      }
    });

    const newTx: InventoryTransaction = {
      id: `tx_in_${Date.now()}`,
      code,
      type: 'nhap_kho',
      createdAt: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`,
      performedBy,
      supplierName: data.supplierName,
      paymentMethod: data.paymentMethod,
      totalAmount,
      note: data.note,
      items: txItems,
    };

    set({
      inventoryItems: updatedInventory,
      inventoryTransactions: [newTx, ...inventoryTransactions],
    });

    // Nếu thanh toán bằng tiền mặt két -> tự động ghi nhận vào Sổ Quỹ
    if (data.paymentMethod === 'tien_mat' && totalAmount > 0) {
      addCashTransaction({
        type: 'chi',
        category: 'chi_nhap_hang',
        amount: totalAmount,
        description: `Nhập kho ${code}: ${data.supplierName || 'NCC'} (${txItems.map((i) => `${i.itemName} x${i.quantity}`).join(', ')})`,
        time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        performedBy,
        expenseType: 'hoat_dong',
        paymentMethod: 'tien_mat',
      });
    }

    return newTx;
  },

  stockOut: (data: {
    items: { itemId: string; qty: number }[];
    reason: InventoryStockOutReason;
    note?: string;
    returnRefund?: number;
    performedBy?: string;
  }) => {
    const { inventoryItems, inventoryTransactions, addCashTransaction } = get();
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `PX-${dateStr}-${rand}`;
    const performedBy = data.performedBy || 'Chủ Quán';

    let totalAmount = 0;
    const txItems: InventoryTransactionItem[] = [];
    const updatedInventory = [...inventoryItems];

    data.items.forEach((inp) => {
      const idx = updatedInventory.findIndex((i: InventoryItem) => i.id === inp.itemId);
      if (idx !== -1) {
        const item = updatedInventory[idx];
        const qty = Math.max(1, inp.qty);
        const lineCost = qty * item.costPrice;
        totalAmount += lineCost;

        updatedInventory[idx] = {
          ...item,
          currentStock: Math.max(0, item.currentStock - qty),
        };

        txItems.push({
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          quantity: qty,
          costPrice: item.costPrice,
          totalCost: lineCost,
          systemStockBefore: item.currentStock,
          actualStockAfter: Math.max(0, item.currentStock - qty),
        });
      }
    });

    const newTx: InventoryTransaction = {
      id: `tx_out_${Date.now()}`,
      code,
      type: 'xuat_kho',
      stockOutReason: data.reason,
      createdAt: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`,
      performedBy,
      totalAmount,
      note: data.note,
      items: txItems,
    };

    set({
      inventoryItems: updatedInventory,
      inventoryTransactions: [newTx, ...inventoryTransactions],
    });

    // Nếu là xuất trả NCC có hoàn tiền mặt -> hạch toán vào sổ quỹ thu tiền
    if (data.reason === 'xuat_tra_ncc' && data.returnRefund && data.returnRefund > 0) {
      addCashTransaction({
        type: 'thu',
        category: 'thu_khac',
        amount: data.returnRefund,
        description: `Hoàn tiền trả hàng NCC ${code}`,
        time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        performedBy,
        paymentMethod: 'tien_mat',
      });
    }

    return newTx;
  },

  performStockAudit: (items: { itemId: string; actualStock: number; note?: string }[], performedBy = 'Chủ Quán') => {
    const { inventoryItems, inventoryTransactions } = get();
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `PK-${dateStr}-${rand}`;

    let totalDiffCost = 0;
    const txItems: InventoryTransactionItem[] = [];
    const updatedInventory = [...inventoryItems];

    items.forEach((inp) => {
      const idx = updatedInventory.findIndex((i: InventoryItem) => i.id === inp.itemId);
      if (idx !== -1) {
        const item = updatedInventory[idx];
        const diffQty = inp.actualStock - item.currentStock;
        const lineCost = diffQty * item.costPrice;
        totalDiffCost += lineCost;

        updatedInventory[idx] = {
          ...item,
          currentStock: inp.actualStock,
          lastRestockedAt: now.toISOString(),
        };

        txItems.push({
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          quantity: diffQty,
          costPrice: item.costPrice,
          totalCost: lineCost,
          systemStockBefore: item.currentStock,
          actualStockAfter: inp.actualStock,
        });
      }
    });

    const newTx: InventoryTransaction = {
      id: `tx_audit_${Date.now()}`,
      code,
      type: 'kiem_ke',
      createdAt: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`,
      performedBy,
      totalAmount: totalDiffCost,
      note: `Cân bằng kho thực tế (${txItems.length} mặt hàng)`,
      items: txItems,
    };

    set({
      inventoryItems: updatedInventory,
      inventoryTransactions: [newTx, ...inventoryTransactions],
    });

    return newTx;
  },
});