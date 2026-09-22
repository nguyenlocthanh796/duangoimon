/**
 * 👑 OngChu Lean POS - Real Data Report & PnL Financial Engine
 * Computes 100% dynamic revenue, cost, profit and sold item rankings
 * directly from OrderHistory and CashTransactions without mock multipliers.
 */

import type { OrderHistoryItem, CashTransaction } from '../store/usePOSStore';
import type {
  DateRangeKey,
  RangeConfig,
  SoldProductRecord,
  InvoiceRecord,
} from '../../app/bao-cao-loi-nhuan/_components/types';

/**
 * Safely parse any ISO date or YYYY-MM-DD HH:mm string to a timestamp
 */
export function parseDateTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const direct = new Date(dateStr).getTime();
  if (!isNaN(direct)) return direct;

  // Handle 'YYYY-MM-DD HH:mm'
  const normalized = dateStr.replace(' ', 'T');
  const t = new Date(normalized).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Get [startTimestamp, endTimestamp] for a given DateRangeKey
 */
export function getDateRangeBounds(
  range: DateRangeKey,
  customStartDate?: string,
  customEndDate?: string,
  now = new Date()
): { start: number; end: number; label: string; dateText: string } {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const startOfToday = new Date(currentYear, currentMonth, currentDate, 0, 0, 0, 0).getTime();
  const endOfToday = new Date(currentYear, currentMonth, currentDate, 23, 59, 59, 999).getTime();

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

  switch (range) {
    case 'yesterday': {
      const yesterday = new Date(currentYear, currentMonth, currentDate - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).getTime();
      return {
        start,
        end,
        label: 'Hôm Qua',
        dateText: `Hôm Qua (${fmtDate(yesterday)})`,
      };
    }

    case 'week':
    case '7days': {
      // 7 days window ending today
      const weekStart = new Date(currentYear, currentMonth, currentDate - 6, 0, 0, 0, 0);
      return {
        start: weekStart.getTime(),
        end: endOfToday,
        label: 'Tuần Này',
        dateText: `${fmtDate(weekStart)} - ${fmtDate(now)}`,
      };
    }

    case 'month':
    case '30days':
    case 'this_month': {
      // Current month or 30 days window
      const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      return {
        start: monthStart.getTime(),
        end: endOfToday,
        label: 'Tháng Này',
        dateText: `01/${pad(currentMonth + 1)} - ${fmtDate(now)}`,
      };
    }

    case 'custom': {
      const startD = customStartDate ? new Date(customStartDate) : now;
      const endD = customEndDate ? new Date(customEndDate) : now;
      const start = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 23, 59, 59, 999).getTime();
      return {
        start,
        end,
        label: `${customStartDate || ''} -> ${customEndDate || ''}`,
        dateText: `${customStartDate || ''} - ${customEndDate || ''}`,
      };
    }

    case 'today':
    default: {
      return {
        start: startOfToday,
        end: endOfToday,
        label: 'Hôm Nay',
        dateText: `Hôm Nay (${fmtDate(now)})`,
      };
    }
  }
}

/**
 * Filter orders within date bounds, excluding voided orders by default
 */
export function filterOrdersByRange(
  orders: OrderHistoryItem[],
  start: number,
  end: number,
  includeVoided = false
): OrderHistoryItem[] {
  return orders.filter((o) => {
    if (!includeVoided && o.status === 'voided') return false;
    const t = parseDateTimestamp(o.createdAt);
    if (!t) return true; // Include if untracked timestamp
    return t >= start && t <= end;
  });
}

/**
 * Filter cash transactions within date bounds, excluding voided by default
 */
export function filterCashTransactionsByRange(
  transactions: CashTransaction[],
  start: number,
  end: number,
  includeVoided = false
): CashTransaction[] {
  return transactions.filter((tx) => {
    if (!includeVoided && tx.status === 'voided') return false;
    const t = parseDateTimestamp(tx.createdAt);
    if (!t) return true;
    return t >= start && t <= end;
  });
}

/**
 * Map OrderHistoryItem to InvoiceRecord format for Invoice Tab
 */
export function orderToInvoiceRecord(order: OrderHistoryItem): InvoiceRecord {
  const d = new Date(order.createdAt);
  const time = !isNaN(d.getTime())
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : '12:00';

  const items = (order.items || []).map((ci) => ({
    name: ci.item?.name || (ci as any).name || 'Món',
    qty: ci.qty || 1,
    price: ci.unitPrice || ci.item?.price || 0,
  }));

  const payMethod: 'tien_mat' | 'vietqr' =
    order.paymentMethod === 'vietqr' ? 'vietqr' : 'tien_mat';

  return {
    id: order.orderCode || order.id,
    time,
    tableName: order.tableName || 'Mang Về',
    items,
    totalAmount: order.finalTotal,
    subTotal: order.subtotal || order.finalTotal,
    discountAmount: order.discountAmount || 0,
    discountNote: order.discountNote,
    payMethod,
    cashier: order.cashierName || 'Thu Ngân',
    status: order.status === 'voided' ? 'cancelled' : 'completed',
  };
}

/**
 * Aggregate sold products grouped by product name / category
 */
export function aggregateSoldProducts(orders: OrderHistoryItem[]): SoldProductRecord[] {
  const map = new Map<string, SoldProductRecord>();

  for (const order of orders) {
    if (order.status === 'voided') continue;
    for (const ci of order.items || []) {
      const prodName = ci.item?.name || (ci as any).name || 'Món khác';
      const prodCat = (ci.item?.category || 'Món khác') as any;
      const qty = ci.qty || 1;
      const unitPrice = ci.unitPrice || ci.item?.price || 0;
      const lineRevenue = unitPrice * qty;
      const prodId = ci.item?.id || prodName;

      const existing = map.get(prodName);
      if (existing) {
        existing.qtySold += qty;
        existing.revenue += lineRevenue;
      } else {
        map.set(prodName, {
          id: prodId,
          name: prodName,
          category: prodCat,
          qtySold: qty,
          revenue: lineRevenue,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.qtySold - a.qtySold);
}

/**
 * Master Real-Data Financial Engine:
 * Computes all 3 Golden Numbers and PnL breakdown strictly from real data.
 */
export function computeRealPnLMetrics(
  orders: OrderHistoryItem[],
  cashTransactions: CashTransaction[],
  range: DateRangeKey,
  customStartDate?: string,
  customEndDate?: string,
  baseStartingCash = 0,
  branchId?: string
): {
  rangeConfig: RangeConfig;
  soldProducts: SoldProductRecord[];
  filteredOrders: OrderHistoryItem[];
  invoiceRecords: InvoiceRecord[];
} {
  const { start, end, label, dateText } = getDateRangeBounds(range, customStartDate, customEndDate);

  const branchFilteredOrders = branchId && branchId !== 'all'
    ? orders.filter((o) => !o.branchId || o.branchId === branchId)
    : orders;
  const branchFilteredCashTx = branchId && branchId !== 'all'
    ? cashTransactions.filter((tx) => !tx.branchId || tx.branchId === branchId)
    : cashTransactions;

  const matchedOrders = filterOrdersByRange(branchFilteredOrders, start, end, false);
  const allOrdersInRange = filterOrdersByRange(branchFilteredOrders, start, end, true);
  const matchedCashTx = filterCashTransactionsByRange(branchFilteredCashTx, start, end, false);

  // 1. Revenue & Payment Channel Breakdowns
  let totalRevenue = 0;
  let totalFoodCost = 0;
  let totalCashSales = 0;
  let totalVietQRSales = 0;
  let totalCardSales = 0;

  for (const order of matchedOrders) {
    totalRevenue += order.finalTotal;

    // Calculate food cost from items
    for (const ci of order.items || []) {
      const cost = ci.item?.costPrice ?? 0;
      const qty = ci.qty || 1;
      // If costPrice is defined, use it; otherwise estimate 35% of price
      totalFoodCost += cost > 0 ? cost * qty : Math.round((ci.unitPrice || ci.item?.price || 0) * 0.35 * qty);
    }

    // Split payment channels
    if (order.paymentMethod === 'tien_mat') {
      totalCashSales += order.finalTotal;
    } else if (order.paymentMethod === 'vietqr') {
      totalVietQRSales += order.finalTotal;
    } else if (order.paymentMethod === 'the') {
      totalCardSales += order.finalTotal;
    } else if (order.paymentMethod === 'hon_hop' && order.paymentDetails) {
      totalCashSales += order.paymentDetails.cashAmount || 0;
      totalVietQRSales += order.paymentDetails.vietqrAmount || 0;
    } else {
      totalCashSales += order.finalTotal;
    }
  }

  // 2. Cash Transactions (Sổ Quỹ Thu / Chi)
  // Tổng chi phí (Tất cả nguồn: tiền mặt + chuyển khoản)
  const totalExpenses = matchedCashTx
    .filter((tx) => tx.type === 'chi')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Chi hoạt động (biến phí - chi chợ, đá, rau...)
  const operatingExpenses = matchedCashTx
    .filter((tx) => tx.type === 'chi' && tx.expenseType !== 'co_dinh')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Chi cố định (định phí - mặt bằng, điện, nước...)
  const fixedExpenses = matchedCashTx
    .filter((tx) => tx.type === 'chi' && tx.expenseType === 'co_dinh')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Chi tiền mặt trực tiếp từ két
  const cashExpenses = matchedCashTx
    .filter((tx) => tx.type === 'chi' && (tx.paymentMethod === 'tien_mat' || !tx.paymentMethod))
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Thu tiền mặt trực tiếp vào két
  const cashIncome = matchedCashTx
    .filter((tx) => tx.type === 'thu' && (tx.paymentMethod === 'tien_mat' || !tx.paymentMethod))
    .reduce((sum, tx) => sum + tx.amount, 0);

  // 3. Three Golden Numbers (3 Con Số Vàng)
  // #1: Tiền mặt trong két = Bắt đầu ca + Bán tiền mặt + Thu quỹ tiền mặt - Chi quỹ tiền mặt
  const cashInDrawer = Math.max(0, baseStartingCash + totalCashSales + cashIncome - cashExpenses);

  // #2: Tiền chuyển khoản VietQR
  const vietqrTotal = totalVietQRSales;

  // #3: Lợi nhuận ròng bỏ túi = Doanh thu - Giá vốn - Tổng chi phí vận hành
  const netProfit = totalRevenue - totalFoodCost - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;
  const foodCostRatio = totalRevenue > 0 ? Number(((totalFoodCost / totalRevenue) * 100).toFixed(1)) : 0;

  // 4. Phân bổ kênh bán & Số lượng đơn
  const dineIn = matchedOrders.filter((o) => !o.orderChannel || o.orderChannel === 'tai_ban').reduce((s, o) => s + o.finalTotal, 0);
  const takeaway = matchedOrders.filter((o) => o.orderChannel === 'mang_ve').reduce((s, o) => s + o.finalTotal, 0);
  const delivery = matchedOrders.filter((o) => o.orderChannel === 'giao_hang').reduce((s, o) => s + o.finalTotal, 0);

  const dineInOrders = matchedOrders.filter((o) => !o.orderChannel || o.orderChannel === 'tai_ban').length;
  const takeawayOrders = matchedOrders.filter((o) => o.orderChannel === 'mang_ve').length;
  const deliveryOrders = matchedOrders.filter((o) => o.orderChannel === 'giao_hang').length;

  const eInvoiceCount = matchedOrders.filter((o) => Boolean(o.eInvoice)).length;

  // 5. Products & Invoices
  const soldProducts = aggregateSoldProducts(matchedOrders);
  const totalSoldQty = soldProducts.reduce((sum, p) => sum + p.qtySold, 0);
  const topProducts = soldProducts.slice(0, 5);

  const orderCount = matchedOrders.length;
  const avgTicket = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  // 6. Số lượng khách & Chỉ số hiệu suất chi tiết
  const totalGuests = matchedOrders.reduce((sum, o) => sum + (o.guestCount || (o.orderChannel === 'mang_ve' || o.orderChannel === 'giao_hang' ? 1 : 2)), 0);
  const avgSpendPerGuest = totalGuests > 0 ? Math.round(totalRevenue / totalGuests) : 0;
  const itemsPerOrder = orderCount > 0 ? Number((totalSoldQty / orderCount).toFixed(1)) : 0;

  // 7. Thống kê đơn hủy / void
  const voidOrders = allOrdersInRange.filter((o) => o.status === 'voided');
  const voidCount = voidOrders.length;
  const voidAmount = voidOrders.reduce((s, o) => s + o.finalTotal, 0);

  // 8. Tỷ trọng thanh toán & cơ cấu chi phí
  const paymentShare = {
    cashAmount: totalCashSales,
    cashPercent: totalRevenue > 0 ? Math.round((totalCashSales / totalRevenue) * 100) : 0,
    vietqrAmount: totalVietQRSales,
    vietqrPercent: totalRevenue > 0 ? Math.round((totalVietQRSales / totalRevenue) * 100) : 0,
    cardAmount: totalCardSales,
    cardPercent: totalRevenue > 0 ? Math.round((totalCardSales / totalRevenue) * 100) : 0,
  };

  const costShare = {
    foodCostPercent: totalRevenue > 0 ? Math.round((totalFoodCost / totalRevenue) * 100) : 0,
    operatingPercent: totalRevenue > 0 ? Math.round((operatingExpenses / totalRevenue) * 100) : 0,
    fixedPercent: totalRevenue > 0 ? Math.round((fixedExpenses / totalRevenue) * 100) : 0,
    netProfitPercent: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
  };

  // 9. Khung giờ cao điểm nhất
  const hourBuckets: Record<string, number> = {
    '07h-09h (Sáng sớm)': 0,
    '09h-12h (Đỉnh sáng)': 0,
    '12h-14h (Trưa)': 0,
    '14h-17h (Chiều)': 0,
    '17h-21h (Đỉnh tối)': 0,
    '21h-23h (Đêm)': 0,
  };

  for (const o of matchedOrders) {
    const d = new Date(o.createdAt);
    const h = d.getHours();
    if (h >= 7 && h < 9) hourBuckets['07h-09h (Sáng sớm)'] += o.finalTotal;
    else if (h >= 9 && h < 12) hourBuckets['09h-12h (Đỉnh sáng)'] += o.finalTotal;
    else if (h >= 12 && h < 14) hourBuckets['12h-14h (Trưa)'] += o.finalTotal;
    else if (h >= 14 && h < 17) hourBuckets['14h-17h (Chiều)'] += o.finalTotal;
    else if (h >= 17 && h < 21) hourBuckets['17h-21h (Đỉnh tối)'] += o.finalTotal;
    else hourBuckets['21h-23h (Đêm)'] += o.finalTotal;
  }

  let peakHourLabel = '17h-21h (Đỉnh tối)';
  let maxHourRev = -1;
  for (const [k, v] of Object.entries(hourBuckets)) {
    if (v > maxHourRev) {
      maxHourRev = v;
      peakHourLabel = k;
    }
  }

  const invoiceRecords = allOrdersInRange.map(orderToInvoiceRecord);

  const rangeConfig: RangeConfig = {
    label,
    dateText,
    revenue: totalRevenue,
    netProfit,
    orderCount,
    avgTicket,
    totalSoldQty,
    foodCost: totalFoodCost,
    operatingExpenses,
    fixedExpenses,
    cashExpenses,
    cashInDrawer,
    cashSales: totalCashSales,
    vietqrTotal,
    cardTotal: totalCardSales,
    topProducts,
    profitMargin,
    foodCostRatio,
    channelBreakdown: {
      dineIn,
      takeaway,
      delivery,
    },
    channelOrders: {
      dineIn: dineInOrders,
      takeaway: takeawayOrders,
      delivery: deliveryOrders,
    },
    paymentShare,
    costShare,
    totalGuests,
    avgSpendPerGuest,
    itemsPerOrder,
    voidCount,
    voidAmount,
    peakHourLabel,
    eInvoiceCount,
  };

  return {
    rangeConfig,
    soldProducts,
    filteredOrders: matchedOrders,
    invoiceRecords,
  };
}
