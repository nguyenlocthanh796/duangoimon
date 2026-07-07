const API_URL = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'pos_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const cleanPath = path.startsWith('/api/v1') ? path.substring(7) : path;
    const res = await fetch(`${API_URL}${cleanPath}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      if (res.status === 401) { clearToken(); window.location.href = '/login'; throw new Error('Unauthorized'); }
      if (res.status === 403) { clearToken(); window.location.href = '/login'; throw new Error('Forbidden'); }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('Request timeout');
    throw e;
  }
}

export { request };

/**
 * Types sync with backend Python models.
 * Manually maintained — matches `backend/app/models/*.py` + `backend/app/schemas/*.py`
 */

export type Transaction = {
  id: string;
  type: string;
  category: string | null;
  amount: number;
  ref_id: string | null;
  note: string | null;
  created_at: string | null;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  order_id: string;
  buyer_name: string | null;
  buyer_tax_code?: string | null;
  total_amount: number;
  vat_amount: number | null;
  vat_rate?: number;
  status: string;
  exported_at: string | null;
  created_at: string | null;
};

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string | null;
  price: number;
  cost_price: number;
  unit: string;
  is_active: boolean;
  options: any[];
  created_at: string | null;
}

export interface Table {
  id: string;
  name: string;
  area: string | null;
  capacity: number;
  status: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export interface Dashboard {
  today_revenue: number;
  total_orders: number;
  table_stats: { trong: number; co_khach: number; da_dat: number };
  top_products: { name: string; quantity: number }[];
}

export interface SalesReport {
  daily: { date: string; orders: number; revenue: number }[];
  top_products: { name: string; quantity: number; total: number }[];
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  branch_id: string | null;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  guest_count: number;
  table_id: string | null;
  note: string | null;
  status: string; // pending | confirmed | cancelled | arrived
  booked_at: string;
  created_at: string;
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  branch_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  total_spent: number;
  visit_count: number;
  last_visit: string | null;
  tags: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

// ─── Marketing ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  branch_id: string | null;
  name: string;
  type: string; // email | sms | both
  trigger: string; // birthday | loyalty | promo | scheduled
  segment_filters: Record<string, any>;
  template: Record<string, any>;
  scheduled_at: string | null;
  sent_count: number;
  is_active: boolean;
  created_at: string;
}

export interface MessageLog {
  id: string;
  campaign_id: string | null;
  customer_id: string;
  type: string;
  status: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

// ─── Membership / Loyalty ─────────────────────────────────────────────────────

export interface MembershipTier {
  id: string;
  name: string;
  min_spent: number;
  discount_rate: number;
  multiplier: number;
  color: string | null;
  created_at: string;
}

export interface LoyaltyPoint {
  id: string;
  customer_id: string;
  order_id: string | null;
  points: number;
  type: string; // earn | redeem
  note: string | null;
  created_at: string;
}

// ─── Promo / Voucher ──────────────────────────────────────────────────────────

export interface Voucher {
  id: string;
  branch_id: string | null;
  code: string;
  name: string;
  type: string; // percent | fixed
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromoRule {
  id: string;
  branch_id: string | null;
  name: string;
  type: string; // buy_x_get_y | combo | time_discount
  conditions: Record<string, any>;
  benefits: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

// ─── Station ──────────────────────────────────────────────────────────────────

export interface Station {
  id: string;
  branch_id: string | null;
  name: string;
  code: string;
  categories: string[] | null;
  printer_name: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Branch ───────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Shift ────────────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  branch_id: string | null;
  shift_code: string;
  cashier_id: string | null;
  opening_balance: number;
  cash_end: number | null;
  expense_total: number | null;
  total_revenue: number | null;
  difference: number | null;
  note: string | null;
  status: string; // dang_lam | da_ket_thuc
  start_at: string;
  end_at: string | null;
  created_at: string;
}

// ─── Raw Material / Recipe ─────────────────────────────────────────────────────

export interface RawMaterial {
  id: string;
  branch_id: string | null;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  default_cost: number;
  current_stock: number;
  min_stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Recipe {
  id: string;
  branch_id: string | null;
  product_id: string;
  name: string;
  yield_qty: number;
  yield_unit: string;
  cost_price: number;
  instructions: string | null;
  wastage_percent: number;
  is_active: boolean;
  created_at: string;
  items: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity: number;
  unit: string;
  cost: number;
  note: string | null;
}

// ─── Supplier / Purchase Order ────────────────────────────────────────────────

export interface Supplier {
  id: string;
  branch_id: string | null;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_code: string | null;
  payment_terms: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  branch_id: string | null;
  po_number: string;
  supplier_id: string | null;
  status: string; // draft | pending | received | cancelled
  total_amount: number;
  note: string | null;
  expected_date: string | null;
  received_date: string | null;
  created_at: string;
  items: PurchaseOrderItem[];
  supplier?: Supplier;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  raw_material_id: string | null;
  raw_material_name: string | null;
  quantity: number;
  unit_price: number;
  received_quantity: number;
  total: number;
}

// ─── Order (from ban_hang) ────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  options: Record<string, any>;
  note: string | null;
  status: string;
  service_type: string;
  order_round: number;
}

export interface Order {
  id: string;
  table_id: string | null;
  cashier_id: string | null;
  status: string;
  note: string | null;
  total_amount: number;
  discount: number;
  tax_amount: number;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  items: OrderItem[];
}

// ─── Menu Engineering ─────────────────────────────────────────────────────────

export interface MenuEngMatrix {
  product_id: string;
  name: string;
  category: string | null;
  price: number;
  cost_price: number;
  food_cost_pct: number;
  quantity: number;
  revenue: number;
  profit: number;
  quadrant: string; // star | plowhorse | puzzle | dog
}

export interface TopBottomItem {
  product_id: string;
  name: string;
  quantity: number;
  revenue: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface RevenueReport {
  date: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
}

export interface FoodCostReport {
  period: string;
  total_food_cost: number;
  total_revenue: number;
  food_cost_pct: number;
}

// ─── Dashboard (quan-ly + exec) ───────────────────────────────────────────────

export interface ExecDashboard {
  total_revenue: number;
  revenue_change: number;
  total_orders: number;
  order_change: number;
  avg_order: number;
  avg_change: number;
  active_tables: number;
  table_occupancy: number;
  revenue_by_branch: { branch: string; revenue: number }[];
  daily_revenue: { date: string; revenue: number }[];
  top_branches: { branch: string; revenue: number }[];
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface DemandForecast {
  product_id: string;
  product_name: string;
  historical_avg: number;
  predicted: number;
  confidence: number;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Branch stats ─────────────────────────────────────────────────────────────

export interface BranchStats {
  branch_id: string;
  branch_name: string;
  total_revenue: number;
  total_orders: number;
  occupancy_rate: number;
}
