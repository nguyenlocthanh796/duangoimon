import type {
  CustomerLoyalty,
  ParkedOrder,
  OrderHistoryItem,
} from '../usePOSStore';

export const DEFAULT_CUSTOMERS_LIST: CustomerLoyalty[] = [];

export interface CRMSlice {
  customers: CustomerLoyalty[];
  parkedOrders: ParkedOrder[];

  // CRM & Customer Debt Actions
  addCustomer: (cust: Omit<CustomerLoyalty, 'id'>) => CustomerLoyalty;
  updateCustomer: (id: string, updates: Partial<CustomerLoyalty>) => void;
  deleteCustomer: (id: string) => void;
  settleCustomerDebt: (
    customerId: string,
    amount: number,
    method: 'tien_mat' | 'vietqr',
    note?: string,
    orderId?: string
  ) => void;

  // Parked / Held Order Actions
  parkCurrentOrder: (
    note?: string,
    customerName?: string,
    customerPhone?: string
  ) => { success: boolean; parkedOrder?: ParkedOrder };
  restoreParkedOrder: (parkedOrderId: string, targetTableId?: string) => boolean;
  deleteParkedOrder: (parkedOrderId: string) => void;
  clearAllParkedOrders: () => void;
}

export const createCRMSlice = (set: any, get: any): CRMSlice => ({
  customers: [],
  parkedOrders: [],

  addCustomer: (cust: Omit<CustomerLoyalty, 'id'>) => {
    const { customers } = get();
    const newCust: CustomerLoyalty = {
      ...cust,
      id: `cust_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set({ customers: [newCust, ...customers] });
    return newCust;
  },

  updateCustomer: (id: string, updates: Partial<CustomerLoyalty>) => {
    const { customers } = get();
    set({
      customers: customers.map((c: CustomerLoyalty) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },

  deleteCustomer: (id: string) => {
    const { customers } = get();
    set({ customers: customers.filter((c: CustomerLoyalty) => c.id !== id) });
  },

  settleCustomerDebt: (customerId: string, amount: number, method: 'tien_mat' | 'vietqr', note?: string, orderId?: string) => {
    const { customers, orderHistory, addCashTransaction } = get();
    const customer = customers.find((c: CustomerLoyalty) => c.id === customerId || c.phone === customerId);
    if (!customer || amount <= 0) return;

    const updatedDebt = Math.max(0, customer.debtBalance - amount);
    const updatedCustomers = customers.map((c: CustomerLoyalty) =>
      c.id === customer.id ? { ...c, debtBalance: updatedDebt } : c
    );

    const nowIso = new Date().toISOString();
    let remainingPaid = amount;
    const updatedOrderHistory = orderHistory.map((order: OrderHistoryItem) => {
      if (orderId && order.id === orderId) {
        return {
          ...order,
          isDebtPaid: true,
          debtPaidAt: nowIso,
          debtPaidMethod: method,
        };
      }
      if (!orderId && order.paymentMethod === 'ghi_no' && !order.isDebtPaid) {
        const orderPhone = order.paymentDetails?.customerPhone;
        const orderName = order.paymentDetails?.customerName;
        if ((orderPhone && orderPhone === customer.phone) || (orderName && orderName === customer.name)) {
          const debtOnOrder = order.debtAmount || order.finalTotal;
          if (remainingPaid >= debtOnOrder) {
            remainingPaid -= debtOnOrder;
            return {
              ...order,
              isDebtPaid: true,
              debtPaidAt: nowIso,
              debtPaidMethod: method,
            };
          }
        }
      }
      return order;
    });

    if (method === 'tien_mat') {
      addCashTransaction({
        type: 'thu',
        category: 'Thu nợ khách',
        amount,
        description: note || `Thu nợ khách hàng ${customer.name} (${customer.phone})`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        performedBy: 'Thu Ngân',
        paymentMethod: 'tien_mat',
      });
    } else {
      addCashTransaction({
        type: 'thu',
        category: 'Thu nợ VietQR',
        amount,
        description: note || `Thu nợ VietQR khách hàng ${customer.name} (${customer.phone})`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        performedBy: 'Thu Ngân',
        paymentMethod: 'chuyen_khoan',
      });
    }

    set({
      customers: updatedCustomers,
      orderHistory: updatedOrderHistory,
    });
  },

  parkCurrentOrder: (note?: string, customerName?: string, customerPhone?: string) => {
    const { selectedTable, tableCarts, tableDiscounts, parkedOrders = [] } = get();
    const currentCart = tableCarts[selectedTable.id] || [];
    if (currentCart.length === 0) {
      return { success: false };
    }

    const currentDiscount = tableDiscounts[selectedTable.id];
    const subTotal = currentCart.reduce((sum: number, item: any) => sum + item.unitPrice * item.qty, 0);
    let discountAmount = 0;
    if (currentDiscount) {
      discountAmount =
        currentDiscount.type === 'percent'
          ? Math.round((subTotal * currentDiscount.value) / 100)
          : Math.min(currentDiscount.value, subTotal);
    }
    const totalAmount = Math.max(0, subTotal - discountAmount);
    const itemCount = currentCart.reduce((sum: number, item: any) => sum + item.qty, 0);

    const padIndex = String(parkedOrders.length + 1).padStart(2, '0');
    const newParkedOrder: ParkedOrder = {
      id: `park_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: `CHỜ-${padIndex}`,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      items: [...currentCart],
      discount: currentDiscount,
      totalAmount,
      itemCount,
      customerName,
      customerPhone,
      note,
      parkedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      parkedBy: 'Thu Ngân',
    };

    const updatedCarts = { ...tableCarts };
    delete updatedCarts[selectedTable.id];
    const updatedDiscounts = { ...tableDiscounts };
    delete updatedDiscounts[selectedTable.id];

    // Cập nhật lại số lượng và trạng thái bàn nếu không phải unassigned
    const updatedTables = get().tables.map((t: any) =>
      t.id === selectedTable.id
        ? { ...t, status: 'trong' as const, itemCount: 0, totalAmount: 0 }
        : t
    );

    set({
      parkedOrders: [newParkedOrder, ...parkedOrders],
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tables: updatedTables,
      selectedTable:
        selectedTable.id === 'unassigned'
          ? selectedTable
          : { ...selectedTable, status: 'trong' as const, itemCount: 0, totalAmount: 0 },
    });

    return { success: true, parkedOrder: newParkedOrder };
  },

  restoreParkedOrder: (parkedOrderId: string, targetTableId?: string) => {
    const { parkedOrders = [], tableCarts, tableDiscounts, tables, selectedTable } = get();
    const orderToRestore = parkedOrders.find((p: ParkedOrder) => p.id === parkedOrderId);
    if (!orderToRestore) return false;

    const destTableId = targetTableId || orderToRestore.tableId || selectedTable.id;
    const destTable = tables.find((t: any) => t.id === destTableId) || selectedTable;

    const updatedCarts = {
      ...tableCarts,
      [destTableId]: [...orderToRestore.items],
    };
    const updatedDiscounts = {
      ...tableDiscounts,
      [destTableId]: orderToRestore.discount,
    };

    const remainingParked = parkedOrders.filter((p: ParkedOrder) => p.id !== parkedOrderId);
    const updatedTables = tables.map((t: any) =>
      t.id === destTableId
        ? {
            ...t,
            status: 'co_khach' as const,
            itemCount: orderToRestore.itemCount,
            totalAmount: orderToRestore.totalAmount,
          }
        : t
    );

    set({
      parkedOrders: remainingParked,
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tables: updatedTables,
      selectedTable: {
        ...destTable,
        status: 'co_khach' as const,
        itemCount: orderToRestore.itemCount,
        totalAmount: orderToRestore.totalAmount,
      },
    });

    return true;
  },

  deleteParkedOrder: (parkedOrderId: string) => {
    const { parkedOrders = [] } = get();
    set({
      parkedOrders: parkedOrders.filter((p: ParkedOrder) => p.id !== parkedOrderId),
    });
  },

  clearAllParkedOrders: () => {
    set({ parkedOrders: [] });
  },
});