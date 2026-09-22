export type DateRangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | '7days' | '30days' | 'this_month';

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface InvoiceRecord {
  id: string;
  time: string;
  tableName: string;
  items: InvoiceItem[];
  totalAmount: number;
  subTotal: number;
  discountAmount: number;
  discountNote?: string;
  payMethod: 'tien_mat' | 'vietqr';
  cashier: string;
  status: 'completed' | 'cancelled';
  orderChannel?: 'tai_ban' | 'mang_ve' | 'giao_hang';
  eInvoiceCode?: string;
}

export interface SoldProductRecord {
  id: string;
  name: string;
  category: 'Chè' | 'Trà Sữa' | 'Ăn Vặt' | 'Cà Phê' | 'Topping' | string;
  qtySold: number;
  revenue: number;
}

export interface ChannelBreakdown {
  dineIn: number;
  takeaway: number;
  delivery: number;
}

export interface ChannelOrders {
  dineIn: number;
  takeaway: number;
  delivery: number;
}

export interface PaymentShare {
  cashAmount: number;
  cashPercent: number;
  vietqrAmount: number;
  vietqrPercent: number;
  cardAmount: number;
  cardPercent: number;
}

export interface CostShare {
  foodCostPercent: number;
  operatingPercent: number;
  fixedPercent: number;
  netProfitPercent: number;
}

export interface RangeConfig {
  label: string;
  dateText: string;
  revenue: number;
  netProfit: number;
  orderCount: number;
  avgTicket: number;
  totalSoldQty: number;
  foodCost: number;
  operatingExpenses: number; // Chi hoạt động (chi chợ, đá, rau...)
  fixedExpenses: number;     // Chi cố định (mặt bằng, điện, nước...)
  cashExpenses: number;      // Tổng chi tiền mặt tại két
  cashInDrawer: number;      // Tiền mặt trong két thực tế
  cashSales?: number;        // Doanh thu tiền mặt
  vietqrTotal: number;       // Doanh thu VietQR
  cardTotal: number;         // Doanh thu thẻ
  topProducts: SoldProductRecord[];
  profitMargin: number;      // % Biên lợi nhuận ròng
  foodCostRatio: number;     // % Định mức Food Cost
  channelBreakdown?: ChannelBreakdown; // Phân bổ doanh thu theo kênh bán
  channelOrders?: ChannelOrders;       // Phân bổ số lượng đơn theo kênh bán
  paymentShare?: PaymentShare;         // Tỷ trọng phương thức thanh toán
  costShare?: CostShare;               // Tỷ trọng cơ cấu chi phí & lợi nhuận
  totalGuests?: number;                // Tổng số lượt khách phục vụ
  avgSpendPerGuest?: number;           // Chi tiêu trung bình / khách
  itemsPerOrder?: number;              // Số món trung bình / đơn
  voidCount?: number;                  // Số lượng hóa đơn hủy
  voidAmount?: number;                 // Tổng tiền hóa đơn hủy
  peakHourLabel?: string;              // Khung giờ cao điểm nhất
  eInvoiceCount?: number;              // Số hóa đơn điện tử đã xuất
}
