import type {
  CashTransaction,
  ShiftRecord,
  ActiveShift,
  RecurringExpense,
} from '../usePOSStore';
import { wsClient } from '../../api/wsClient';

export interface ShiftAccountingSlice {
  cashTransactions: CashTransaction[];
  shiftHistory: ShiftRecord[];
  activeShift: ActiveShift | null;
  recurringExpenses: RecurringExpense[];

  // Cash Flow Actions
  addCashTransaction: (tx: Omit<CashTransaction, 'id' | 'createdAt'>) => void;
  voidCashTransaction: (id: string, reason: string, voidedBy?: string) => void;
  deleteCashTransaction: (id: string) => void;
  addShiftRecord: (record: ShiftRecord) => void;

  // Shift Lifecycle Actions
  openShift: (data: {
    shiftName: string;
    cashierName: string;
    startingCash: number;
    note?: string;
    denomCounts?: Record<number, number>;
  }) => void;
  closeShift: (data: {
    actualEndingCash: number;
    differenceAmount: number;
    note?: string;
    denomCounts?: Record<number, number>;
    cashToKeepForNextShift?: number;
    cashToRemitToOwner?: number;
    totalCashSales?: number;
    totalVietQRSales?: number;
    totalCashIn?: number;
    totalCashOut?: number;
    expectedEndingCash?: number;
    orderCount?: number;
  }) => ShiftRecord;

  // Recurring Expenses Actions
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => void;
  deleteRecurringExpense: (id: string) => void;
  applyRecurringExpense: (id: string) => void;

  // Expense Transaction
  addExpenseTransaction: (data: {
    type: 'co_dinh' | 'hoat_dong';
    category: string;
    amount: number;
    description: string;
    paymentMethod: 'tien_mat' | 'chuyen_khoan';
    performedBy?: string;
  }) => void;
}

export const createShiftAccountingSlice = (set: any, get: any): ShiftAccountingSlice => ({
  cashTransactions: [],
  shiftHistory: [],
  activeShift: null,
  recurringExpenses: [],

  openShift: (data) => {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newShift: ActiveShift = {
      id: `shift_${Date.now()}`,
      shiftName: data.shiftName,
      cashierName: data.cashierName,
      openedAt: `${dateStr} ${timeStr}`,
      startingCash: data.startingCash,
      status: 'open',
      note: data.note,
    };
    set({ activeShift: newShift });
    wsClient.broadcastShiftOpened(newShift);
  },

  closeShift: (data) => {
    const { activeShift, shiftHistory } = get();
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const shiftName = activeShift?.shiftName || 'Ca Sáng (07:00 - 14:30)';
    const cashierName = activeShift?.cashierName || 'Thu Ngân';
    const openedAt = activeShift?.openedAt || `${dateStr} 07:00`;
    const startingCash = activeShift?.startingCash || 500000;
    const closedAt = `${dateStr} ${timeStr}`;

    const record: ShiftRecord = {
      id: activeShift?.id || `shift_${Date.now()}`,
      shiftName,
      cashierName,
      openedAt,
      closedAt,
      startingCash,
      totalCashSales: data.totalCashSales || 0,
      totalVietQRSales: data.totalVietQRSales || 0,
      totalCardSales: 0,
      totalCashIn: data.totalCashIn || 0,
      totalCashOut: data.totalCashOut || 0,
      expectedEndingCash: data.expectedEndingCash || (startingCash + (data.totalCashSales || 0) + (data.totalCashIn || 0) - (data.totalCashOut || 0)),
      actualEndingCash: data.actualEndingCash,
      differenceAmount: data.differenceAmount,
      status: 'closed',
      note: data.note,
      denomCounts: data.denomCounts,
      cashToKeepForNextShift: data.cashToKeepForNextShift,
      cashToRemitToOwner: data.cashToRemitToOwner,
      orderCount: data.orderCount,
    };

    set({
      shiftHistory: [record, ...shiftHistory],
      activeShift: {
        ...activeShift,
        id: record.id,
        shiftName,
        cashierName,
        openedAt,
        startingCash,
        status: 'closed',
        closedAt,
        actualEndingCash: data.actualEndingCash,
        differenceAmount: data.differenceAmount,
        cashToKeepForNextShift: data.cashToKeepForNextShift,
        cashToRemitToOwner: data.cashToRemitToOwner,
        note: data.note,
      },
    });

    wsClient.broadcastShiftClosed(record);
    return record;
  },

  addCashTransaction: (tx: Omit<CashTransaction, 'id' | 'createdAt'>) => {
    const { cashTransactions } = get();
    let branchId = tx.branchId;
    if (!branchId) {
      try {
        branchId = require('../useAuthStore').useAuthStore.getState().activeBranchId || 'branch_01';
      } catch (_) {
        branchId = 'branch_01';
      }
    }
    const newTx: CashTransaction = {
      ...tx,
      id: `tx_${Date.now()}`,
      createdAt: new Date().toISOString(),
      branchId,
      status: tx.status || 'completed',
      paymentMethod: tx.paymentMethod || 'tien_mat',
      expenseType: tx.expenseType || (tx.type === 'chi' ? 'hoat_dong' : undefined),
    };
    set({ cashTransactions: [newTx, ...cashTransactions] });
    wsClient.broadcastCashTxCreated(newTx);
  },

  voidCashTransaction: (id: string, reason: string, voidedBy?: string) => {
    const { cashTransactions } = get();
    const now = new Date().toISOString();
    set({
      cashTransactions: cashTransactions.map((tx: CashTransaction) =>
        tx.id === id
          ? {
              ...tx,
              status: 'voided',
              voidReason: reason || 'Chủ quán hủy phiếu',
              voidedAt: now,
              voidedBy: voidedBy || 'Chủ Quán',
            }
          : tx
      ),
    });
    wsClient.broadcastCashTxVoided(id, reason, voidedBy);
  },

  deleteCashTransaction: (id: string) => {
    const { cashTransactions } = get();
    set({ cashTransactions: cashTransactions.filter((tx: CashTransaction) => tx.id !== id) });
    wsClient.broadcastCashTxDeleted(id);
  },

  addShiftRecord: (record: ShiftRecord) => {
    const { shiftHistory } = get();
    set({ shiftHistory: [record, ...shiftHistory] });
  },

  addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => {
    const { recurringExpenses } = get();
    const newRec: RecurringExpense = {
      ...expense,
      id: `rec_${Date.now()}`,
    };
    set({ recurringExpenses: [...recurringExpenses, newRec] });
  },

  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => {
    const { recurringExpenses } = get();
    set({
      recurringExpenses: recurringExpenses.map((r: RecurringExpense) => (r.id === id ? { ...r, ...updates } : r)),
    });
  },

  deleteRecurringExpense: (id: string) => {
    const { recurringExpenses } = get();
    set({
      recurringExpenses: recurringExpenses.filter((r: RecurringExpense) => r.id !== id),
    });
  },

  applyRecurringExpense: (id: string) => {
    const { recurringExpenses, addCashTransaction } = get();
    const target = recurringExpenses.find((r: RecurringExpense) => r.id === id);
    if (!target) return;

    const now = new Date();
    const nowStr = now.toISOString().slice(0, 10);

    set({
      recurringExpenses: recurringExpenses.map((r: RecurringExpense) => (r.id === id ? { ...r, lastAppliedAt: nowStr } : r)),
    });

    addCashTransaction({
      type: 'chi',
      category: target.category,
      amount: target.amount,
      description: `Chi định kỳ: ${target.name}`,
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      performedBy: 'Chủ Quán',
      expenseType: target.expenseType,
      paymentMethod: target.paymentMethod,
    });
  },

  addExpenseTransaction: (data: {
    type: 'co_dinh' | 'hoat_dong';
    category: string;
    amount: number;
    description: string;
    paymentMethod: 'tien_mat' | 'chuyen_khoan';
    performedBy?: string;
  }) => {
    const { addCashTransaction } = get();
    const now = new Date();
    addCashTransaction({
      type: 'chi',
      category: data.category,
      amount: data.amount,
      description: data.description,
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      performedBy: data.performedBy || 'Chủ Quán',
      expenseType: data.type,
      paymentMethod: data.paymentMethod,
    });
  },
});