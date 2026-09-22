/**
 * 👑 OngChu Lean POS - e-Invoice Engine (Nghị Định 123/2020/NĐ-CP & Thông Tư 78/2021/TT-BTC)
 * Chuẩn hóa phát hành Hóa Đơn Điện Tử Khởi Tạo Từ Máy Tính Tiền có mã của Cơ quan Thuế.
 */

export interface BuyerTaxInfo {
  taxCode: string;
  buyerName: string;
  buyerAddress?: string;
  buyerEmail?: string;
  companyName?: string;
  address?: string;
  email?: string;
}

export interface EInvoiceItem {
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
  vatRate: number;
}

export interface EInvoiceData {
  id: string;
  orderCode: string;
  invoiceCode: string;
  templateCode: string;
  symbol?: string;
  invoiceNumber?: string;
  cqtCode: string;
  issuedAt: string;
  sellerTaxCode: string;
  sellerName: string;
  sellerAddress?: string;
  buyer: BuyerTaxInfo;
  buyerTaxCode?: string;
  buyerCompanyName?: string;
  items: EInvoiceItem[];
  totalAmount: number;
  vatAmount: number;
  finalAmount: number;
  status: 'issued' | 'cancelled' | 'cqt_da_cap_ma';
  lookupUrl: string;
  qrData: string;
}

/**
  * Thuật toán phân bổ số tiền nguyên chuẩn xác (Largest Remainder Method / Hare-Niemeyer).
  * Đảm bảo tổng các phần phân bổ sau khi làm tròn luôn luôn bằng CHÍNH XÁC 100% tổng tiền mục tiêu,
  * triệt tiêu hoàn toàn lỗi lệch 1 đồng khi tính thuế VAT hoặc phân bổ chiết khấu trên hóa đơn.
  */
export function allocateProportionalAmounts(totalToAllocate: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sumWeights = weights.reduce((s, w) => s + w, 0);
  if (sumWeights === 0 || totalToAllocate === 0) {
    return weights.map(() => 0);
  }

  const exactValues = weights.map((w) => (w * totalToAllocate) / sumWeights);
  const floors = exactValues.map((v) => Math.floor(v));
  const currentSum = floors.reduce((s, v) => s + v, 0);
  let remainder = totalToAllocate - currentSum;

  const fractions = exactValues.map((v, index) => ({
    fraction: v - floors[index],
    index,
  }));

  // Sắp xếp phần thập phân giảm dần để cộng 1 đồng cho phần có sai số lớn nhất
  fractions.sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i++) {
    floors[fractions[i].index] += 1;
  }

  return floors;
}

/**
 * Kiểm tra tính hợp lệ của Mã Số Thuế Việt Nam (10 số doanh nghiệp hoặc 13 số chi nhánh)
 */
export function validateTaxCode(taxCode: string): boolean {
  const clean = (taxCode || '').replace(/[\s-]/g, '').trim();
  if (!clean) return false;
  return /^\d{10}$/.test(clean) || /^\d{13}$/.test(clean);
}

/**
 * Tạo mã CQT mô phỏng theo chuẩn ký hiệu Nghị định 123
 * Mẫu máy tính tiền: M[loại]-[năm]-[MST 10 số]-[số HĐ 8 số]-[chuỗi ngẫu nhiên 2 ký tự]
 */
export function generateCqtCode(sellerTaxCode: string, invoiceNum: string, yearStr?: string): string {
  const year = yearStr || new Date().getFullYear().toString().slice(2);
  const cleanTax = (sellerTaxCode || '0316892345').replace(/[^0-9]/g, '').slice(0, 10).padEnd(10, '0');
  const padNum = String(invoiceNum || '1').padStart(8, '0');
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const salt = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
  return 'M1-' + year + '-' + cleanTax + '-' + padNum + '-' + salt;
}

export interface IssueEInvoiceParams {
  orderCode: string;
  sellerTaxCode: string;
  sellerName: string;
  sellerAddress?: string;
  templateCode?: string;
  buyer: BuyerTaxInfo;
  items: EInvoiceItem[];
  totalAmount: number;
  vatAmount: number;
  finalAmount: number;
  paymentMethod?: string;
}

let invoiceCounter = 120;

/**
 * Phát hành Hóa Đơn Điện Tử Khởi Tạo Từ Máy Tính Tiền
 */
export function issueEInvoiceRecord(params: IssueEInvoiceParams): EInvoiceData {
  invoiceCounter += 1;
  const invoiceCode = String(invoiceCounter).padStart(8, '0');
  const templateCode = params.templateCode || '1C26TAA';
  const cqtCode = generateCqtCode(params.sellerTaxCode, invoiceCode);
  const lookupUrl = 'https://hoadondientu.gdt.gov.vn';
  const qrData = lookupUrl + '?mst=' + params.sellerTaxCode + '&shd=' + invoiceCode + '&cqt=' + cqtCode;

  const buyerNormalized: BuyerTaxInfo = {
    taxCode: params.buyer.taxCode.trim(),
    buyerName: (params.buyer.buyerName || params.buyer.companyName || 'Người mua').trim(),
    buyerAddress: (params.buyer.buyerAddress || params.buyer.address || '').trim() || undefined,
    buyerEmail: (params.buyer.buyerEmail || params.buyer.email || '').trim() || undefined,
    companyName: (params.buyer.buyerName || params.buyer.companyName || 'Người mua').trim(),
    address: (params.buyer.buyerAddress || params.buyer.address || '').trim() || undefined,
    email: (params.buyer.buyerEmail || params.buyer.email || '').trim() || undefined,
  };

  return {
    id: 'einv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    orderCode: params.orderCode,
    invoiceCode,
    invoiceNumber: invoiceCode,
    templateCode,
    symbol: templateCode,
    cqtCode,
    issuedAt: new Date().toISOString(),
    sellerTaxCode: params.sellerTaxCode,
    sellerName: params.sellerName,
    sellerAddress: params.sellerAddress,
    buyer: buyerNormalized,
    buyerTaxCode: buyerNormalized.taxCode,
    buyerCompanyName: buyerNormalized.buyerName,
    items: params.items,
    totalAmount: params.totalAmount,
    vatAmount: params.vatAmount,
    finalAmount: params.finalAmount,
    status: 'issued',
    lookupUrl,
    qrData,
  };
}
