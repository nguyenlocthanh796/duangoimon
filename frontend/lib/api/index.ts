// ─── Re-export helpers and types ─────────────────────────────────────────────
export { getToken, setToken, clearToken, request } from './client';
export type { Transaction, Invoice, Product, Table, User, Dashboard, SalesReport } from './client';
export type { Branch } from './management';

// ─── Re-export domain functions ─────────────────────────────────────────────
export * as auth from './auth';
export * as orders from './orders';
export * as payments from './payments';
export * as products from './products';
export * as tables from './tables';
export * as management from './management';
export * as thue from './thue';

// ─── Re-apply all domain methods on a flat `api` object ─────────────────────
// This preserves the original `api.method(...)` import pattern.
import { request } from './client';
import * as authFns from './auth';
import * as ordersFns from './orders';
import * as paymentsFns from './payments';
import * as productsFns from './products';
import * as tablesFns from './tables';
import * as mgmtFns from './management';
import * as thueFns from './thue';

/**
 * Legacy flat API object. All methods are also available as named exports
 * from their domain modules (e.g. `import { createOrder } from './api/orders'`).
 */
export const api = {
  // Generic HTTP helpers
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // ── Auth ──
  login: authFns.login,
  logout: authFns.logout,

  // ── Orders ──
  getOrders: ordersFns.getOrders,
  getOrder: ordersFns.getOrder,
  getActiveOrderForTable: ordersFns.getActiveOrderForTable,
  createOrder: ordersFns.createOrder,
  updateOrder: ordersFns.updateOrder,
  updateOrderStatus: ordersFns.updateOrderStatus,
  splitOrder: ordersFns.splitOrder,
  splitTable: ordersFns.splitTable,
  mergeOrders: ordersFns.mergeOrders,
  moveTable: ordersFns.moveTable,
  cancelOrderItem: ordersFns.cancelOrderItem,

  // ── Payments ──
  processPayment: paymentsFns.processPayment,
  getTransactions: paymentsFns.getTransactions,
  createTransaction: paymentsFns.createTransaction,
  updateTransaction: paymentsFns.updateTransaction,
  getInvoices: paymentsFns.getInvoices,
  createInvoice: paymentsFns.createInvoice,
  exportInvoice: paymentsFns.exportInvoice,
  deleteInvoice: paymentsFns.deleteInvoice,
  getPaidOrders: paymentsFns.getPaidOrders,
  exportInvoicesCsv: paymentsFns.exportInvoicesCsv,
  bulkDeleteTransactions: paymentsFns.bulkDeleteTransactions,
  bulkExportInvoices: paymentsFns.bulkExportInvoices,

  // ── Ke-Toan Dashboard ──
  getKeToanDashboard: paymentsFns.getKeToanDashboard,

  // ── Products ──
  getProducts: productsFns.getProducts,
  getQuanLyProducts: productsFns.getQuanLyProducts,
  createProduct: productsFns.createProduct,
  updateProduct: productsFns.updateProduct,
  deleteProduct: productsFns.deleteProduct,

  // ── Tables ──
  getTables: tablesFns.getTables,
  getQuanLyTables: tablesFns.getQuanLyTables,
  createTable: tablesFns.createTable,
  updateTable: tablesFns.updateTable,
  deleteTable: tablesFns.deleteTable,

  // ── Management ──
  getDashboard: mgmtFns.getDashboard,
  getUsers: mgmtFns.getUsers,
  createUser: mgmtFns.createUser,
  updateUser: mgmtFns.updateUser,
  getSalesReport: mgmtFns.getSalesReport,
  getBranches: mgmtFns.getBranches,

  // ── Tax (HKD 2026) ──
  getTaxProfiles: thueFns.getProfiles,
  getTaxProfileStatus: thueFns.getProfileStatus,
  createTaxProfile: thueFns.createProfile,
  patchTaxProfile: thueFns.patchProfile,
  getTaxBankAccounts: thueFns.getBankAccounts,
  createTaxBankAccount: thueFns.createBankAccount,
  getTaxDeadlines: thueFns.getDeadlines,
  exportTaxReport: thueFns.exportTaxReport,
  getTaxDeclarationXml: thueFns.getDeclarationXml,
  getTaxReport: thueFns.getTaxReport,
  getTaxLegacyChecklist: thueFns.getLegacyChecklist,
  bulkSubmitDeadlines: thueFns.bulkSubmitDeadlines,
};
