#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// POSA Mock Server — RESTful API trên port 8000
// Dùng JSON file-based DB, full CRUD cho tất cả module
// ═══════════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const path = require('path');
const { Table, nextId, DATA_DIR,
  seedBranches, seedStations, seedSuppliers, seedMaterials, seedProducts, seedRecipes,
  seedCustomers, seedBookings, seedTiers, seedCampaigns, seedVouchers, seedPromoRules,
  seedShifts, seedUsers, seedTables, seedPurchaseOrders, seedAuditLogs,
  seedTransactions, seedInvoices, seedTaxProfiles, seedBankAccounts, seedDeadlines,
  pastDate, futureDate, pick, VN_FIRST, VN_MID, VN_LAST, PRODS, CATEGORIES } = require('./db.cjs');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// ─── Init DB Tables ─────────────────────────────────────────
const db = {
  branches: new Table('branches', seedBranches),
  stations: new Table('stations', seedStations),
  suppliers: new Table('suppliers', seedSuppliers),
  materials: new Table('materials', seedMaterials),
  products: new Table('products', seedProducts),
  recipes: new Table('recipes', seedRecipes),
  customers: new Table('customers', seedCustomers),
  bookings: new Table('bookings', seedBookings),
  tiers: new Table('tiers', seedTiers),
  campaigns: new Table('campaigns', seedCampaigns),
  vouchers: new Table('vouchers', seedVouchers),
  promorules: new Table('promorules', seedPromoRules),
  shifts: new Table('shifts', seedShifts),
  users: new Table('users', seedUsers),
  tables: new Table('tables', seedTables),
  pos: new Table('pos', seedPurchaseOrders),
  auditlogs: new Table('auditlogs', seedAuditLogs),
  transactions: new Table('transactions', seedTransactions),
  invoices: new Table('invoices', seedInvoices),
  taxprofiles: new Table('taxprofiles', seedTaxProfiles),
  bankaccounts: new Table('bankaccounts', seedBankAccounts),
  deadlines: new Table('deadlines', seedDeadlines),
};

// ─── Helper: parse path params ────────────────────────────────
const API = '/api/v1';
const getBase = (t) => `${API}/quan-ly/${t}`;
const getKeToan = (t) => `${API}/ke-toan/${t}`;
const getThue = (t) => `${API}/thue/${t}`;

// Generic CRUD factory
function crud(tableName, basePath, idPrefix) {
  const table = db[tableName];
  return {
    list: (req, res) => res.json(table.all()),
    get: (req, res) => { const item = table.find(req.params.id); if (!item) return res.status(404).json({error:'Not found'}); res.json(item); },
    create: (req, res) => { const item = { id: nextId(idPrefix), ...req.body, created_at: new Date().toISOString() }; res.status(201).json(table.insert(item)); },
    update: (req, res) => { const item = table.update(req.params.id, req.body); if (!item) return res.status(404).json({error:'Not found'}); res.json(item); },
    remove: (req, res) => { if (!table.remove(req.params.id)) return res.status(404).json({error:'Not found'}); res.json({success:true}); },
  };
}

// ═══════════════════════════════════════════════════════════════
// MODULE: QUẢN LÝ
// ═══════════════════════════════════════════════════════════════

// ── Branches ──
const brCrud = crud('branches', 'branches', 'br');
app.get(`${API}/quan-ly/branches`, brCrud.list);
app.get(`${API}/quan-ly/branches/flat`, (req, res) => res.json(db.branches.all().map(({id,name,address})=>({id,name,address}))));
app.post(`${API}/quan-ly/branches`, brCrud.create);
app.put(`${API}/quan-ly/branches/:id`, brCrud.update);
app.delete(`${API}/quan-ly/branches/:id`, brCrud.remove);
app.get(`${API}/quan-ly/branches/:id`, brCrud.get);

// ── Stations ──
const stCrud = crud('stations', 'stations', 'st');
app.get(`${API}/quan-ly/stations`, stCrud.list);
app.post(`${API}/quan-ly/stations`, stCrud.create);
app.put(`${API}/quan-ly/stations/:id`, (req, res) => { const item = db.stations.update(req.params.id, req.body); if(!item) return res.status(404).json({error:'Not found'}); res.json(item); });
app.delete(`${API}/quan-ly/stations/:id`, (req, res) => { db.stations.remove(req.params.id); res.json({success:true}); });

// ── Suppliers ──
const spCrud = crud('suppliers', 'suppliers', 'sp');
app.get(`${API}/quan-ly/suppliers`, spCrud.list);
app.post(`${API}/quan-ly/suppliers`, spCrud.create);
app.put(`${API}/quan-ly/suppliers/:id`, spCrud.update);
app.delete(`${API}/quan-ly/suppliers/:id`, spCrud.remove);

// ── Raw Materials ──
const rmCrud = crud('materials', 'raw-materials', 'rm');
app.get(`${API}/quan-ly/raw-materials`, rmCrud.list);
app.post(`${API}/quan-ly/raw-materials`, rmCrud.create);
app.put(`${API}/quan-ly/raw-materials/:id`, rmCrud.update);
app.delete(`${API}/quan-ly/raw-materials/:id`, rmCrud.remove);

// ── Products (Menu) ──
const prCrud = crud('products', 'products', 'pr');
app.get(`${API}/quan-ly/products`, prCrud.list);
app.post(`${API}/quan-ly/products`, prCrud.create);
app.put(`${API}/quan-ly/products/:id`, prCrud.update);
app.delete(`${API}/quan-ly/products/:id`, prCrud.remove);

// ── Recipes ──
app.get(`${API}/quan-ly/recipes`, (req, res) => res.json(db.recipes.all()));
app.delete(`${API}/quan-ly/recipes/:id`, (req, res) => { db.recipes.remove(req.params.id); res.json({success:true}); });

// ── Customers ──
const csCrud = crud('customers', 'customers', 'cs');
app.get(`${API}/quan-ly/customers`, csCrud.list);
app.post(`${API}/quan-ly/customers`, csCrud.create);

// ── Bookings ──
app.get(`${API}/quan-ly/booking`, (req, res) => res.json(db.bookings.all()));
app.get(`${API}/quan-ly/booking/:id`, (req, res) => { const b = db.bookings.find(req.params.id); if(!b) return res.status(404).json({error:'Not found'}); res.json(b); });
app.post(`${API}/quan-ly/booking`, (req, res) => { const b = { id:nextId('bk'), branch_id:'br_01', status:'pending', ...req.body, created_at:new Date().toISOString() }; res.status(201).json(db.bookings.insert(b)); });
app.put(`${API}/quan-ly/booking/:id`, (req, res) => { const b = db.bookings.update(req.params.id, req.body); if(!b) return res.status(404).json({error:'Not found'}); res.json(b); });

// ── Membership Tiers ──
app.get(`${API}/quan-ly/membership/tiers`, (req, res) => res.json(db.tiers.all()));
app.post(`${API}/quan-ly/membership/tiers`, (req, res) => { const t = { id:nextId('mb'), ...req.body, is_active:true, member_count:0, created_at:new Date().toISOString() }; res.status(201).json(db.tiers.insert(t)); });
app.put(`${API}/quan-ly/membership/tiers/:id`, (req, res) => { const t = db.tiers.update(req.params.id, req.body); if(!t) return res.status(404).json({error:'Not found'}); res.json(t); });
app.delete(`${API}/quan-ly/membership/tiers/:id`, (req, res) => { db.tiers.remove(req.params.id); res.json({success:true}); });

// ── Marketing Campaigns ──
app.get(`${API}/quan-ly/marketing/campaigns`, (req, res) => res.json(db.campaigns.all()));
app.post(`${API}/quan-ly/marketing/campaigns`, (req, res) => { const c = { id:nextId('cm'), ...req.body, sent_count:0, is_active:true, created_at:new Date().toISOString() }; res.status(201).json(db.campaigns.insert(c)); });
app.put(`${API}/quan-ly/marketing/campaigns/:id`, (req, res) => { const c = db.campaigns.update(req.params.id, req.body); if(!c) return res.status(404).json({error:'Not found'}); res.json(c); });

// ── Promo Vouchers ──
app.get(`${API}/quan-ly/promo/vouchers`, (req, res) => res.json(db.vouchers.all()));
app.put(`${API}/quan-ly/promo/vouchers/:id`, (req, res) => { const v = db.vouchers.update(req.params.id, req.body); if(!v) return res.status(404).json({error:'Not found'}); res.json(v); });

// ── Promo Rules ──
app.get(`${API}/quan-ly/promo/rules`, (req, res) => res.json(db.promorules.all()));
app.put(`${API}/quan-ly/promo/rules/:id`, (req, res) => { const r = db.promorules.update(req.params.id, req.body); if(!r) return res.status(404).json({error:'Not found'}); res.json(r); });

// ── Shifts ──
app.get(`${API}/quan-ly/shifts`, (req, res) => res.json(db.shifts.all()));
app.get(`${API}/quan-ly/shifts/active`, (req, res) => {
  const active = db.shifts.all().find(s => s.status === 'dang_lam');
  res.json(active || null);
});
app.post(`${API}/quan-ly/shifts/start`, (req, res) => {
  const s = { id:nextId('sh'), shift_code:`CA-${String(new Date().getDate()).padStart(2,'0')}${Math.floor(Math.random()*100)}`, ...req.body, status:'dang_lam', start_at:new Date().toISOString(), created_at:new Date().toISOString() };
  res.status(201).json(db.shifts.insert(s));
});
app.post(`${API}/quan-ly/shifts/end`, (req, res) => {
  const active = db.shifts.all().find(s => s.status === 'dang_lam');
  if (!active) return res.status(404).json({error:'No active shift'});
  const s = db.shifts.update(active.id, { ...req.body, status:'da_ket_thuc', end_at:new Date().toISOString() });
  res.json(s);
});

// ── Users ──
app.get(`${API}/quan-ly/users`, (req, res) => res.json({items: db.users.all()}));
app.post(`${API}/quan-ly/users`, (req, res) => { const u = { id:nextId('us'), ...req.body, is_active:true }; res.status(201).json(db.users.insert(u)); });
app.put(`${API}/quan-ly/users/:id`, (req, res) => { const u = db.users.update(req.params.id, req.body); if(!u) return res.status(404).json({error:'Not found'}); res.json(u); });

// ── Tables ──
const tbCrud = crud('tables', 'tables', 'tb');
app.get(`${API}/quan-ly/tables`, tbCrud.list);
app.post(`${API}/quan-ly/tables`, tbCrud.create);
app.put(`${API}/quan-ly/tables/:id`, tbCrud.update);
app.delete(`${API}/quan-ly/tables/:id`, tbCrud.remove);

// ── Purchase Orders ──
app.get(`${API}/quan-ly/purchase-orders`, (req, res) => res.json(db.pos.all()));
app.post(`${API}/quan-ly/purchase-orders`, (req, res) => {
  const po = { id:nextId('po'), po_number:`PO-2026-${String(db.pos.count()+1).padStart(3,'0')}`, ...req.body, status:'draft', created_at:new Date().toISOString() };
  res.status(201).json(db.pos.insert(po));
});
app.put(`${API}/quan-ly/purchase-orders/:id`, (req, res) => { const po = db.pos.update(req.params.id, req.body); if(!po) return res.status(404).json({error:'Not found'}); res.json(po); });

// ── Audit Logs ──
app.get(`${API}/quan-ly/audit-logs`, (req, res) => res.json(db.auditlogs.all()));

// ── Dashboard ──
app.get(`${API}/quan-ly/dashboard`, (req, res) => {
  const products = db.products.all();
  res.json({
    today_revenue: 42500000, total_orders: 87, revenue_growth: 12.5, orders_growth: 8.3,
    table_stats: { trong: db.tables.all().filter(t=>t.status==='trong'&&t.is_active).length, co_khach: db.tables.all().filter(t=>t.status==='có khách').length, da_dat: db.tables.all().filter(t=>t.status==='đã đặt').length },
    top_products: products.slice(0,5).map(p => ({ name: p.name, quantity: Math.floor(Math.random()*50+20) })),
  });
});

// ── Exec Dashboard ──
app.get(`${API}/quan-ly/exec-dashboard`, (req, res) => {
  const branches = db.branches.all().filter(b=>b.is_active);
  res.json({
    total_revenue: 1250000000, revenue_change: 15.3, total_orders: 3420, order_change: 11.7,
    avg_order: 365000, avg_change: 3.2, active_tables: 28, table_occupancy: 68.5,
    revenue_by_branch: branches.map(b => ({ branch: b.name, revenue: Math.round(300000000+Math.random()*300000000) })),
    daily_revenue: Array.from({length:30},(_,i)=>({ date:pastDate(29-i).split('T')[0], revenue:Math.round(30000000+Math.random()*25000000) })),
    top_branches: branches.map(b => ({ branch: b.name, revenue: Math.round(400000000+Math.random()*200000000) })),
  });
});

// ── Menu Engineering ──
app.get(`${API}/quan-ly/menu-eng/matrix`, (req, res) => {
  res.json(db.products.all().filter(p=>p.is_active).map(p => ({
    product_id: p.id, name: p.name, category: p.category, price: p.price, cost_price: p.cost_price,
    food_cost_pct: Math.round(p.cost_price/p.price*100), quantity: Math.floor(Math.random()*300+50),
    revenue: Math.round(p.price*(Math.floor(Math.random()*300+50))),
    profit: Math.round((p.price-p.cost_price)*(Math.floor(Math.random()*300+50))),
    quadrant: pick(['star','plowhorse','puzzle','dog']),
  })));
});
app.get(`${API}/quan-ly/menu-eng/top-bottom`, (req, res) => {
  const ps = db.products.all().filter(p=>p.is_active);
  const items = ps.map(p => ({ product_id:p.id, name:p.name, quantity:Math.floor(Math.random()*500+50), revenue:Math.round(p.price*(Math.floor(Math.random()*200+20))) }));
  res.json({ top: items.sort((a,b)=>b.quantity-a.quantity).slice(0,4), bottom: items.sort((a,b)=>a.quantity-b.quantity).slice(0,2) });
});

// ── BI Reports ──
app.get(`${API}/quan-ly/reports/bi/revenue`, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  res.json(Array.from({length:days},(_,i)=>({ date:pastDate(days-1-i).split('T')[0], revenue:Math.round(25000000+Math.random()*20000000), orders:Math.round(50+Math.random()*60), avg_order_value:Math.round(350000+(Math.random()-0.5)*100000) })));
});
app.get(`${API}/quan-ly/reports/bi/food-cost`, (req, res) => {
  res.json([
    { period:'T1/2026', total_food_cost:285000000, total_revenue:750000000, food_cost_pct:38 },
    { period:'T2/2026', total_food_cost:260000000, total_revenue:720000000, food_cost_pct:36.1 },
    { period:'T3/2026', total_food_cost:310000000, total_revenue:810000000, food_cost_pct:38.3 },
  ]);
});

// ── Forecast ──
app.get(`${API}/quan-ly/forecast/demand`, (req, res) => {
  res.json(db.products.all().filter(p=>p.is_active).map(p => ({
    product_id:p.id, product_name:p.name, historical_avg:Math.floor(Math.random()*80+10),
    predicted:Math.floor(Math.random()*100+15), confidence:Math.round((0.6+Math.random()*0.35)*100)/100,
  })));
});

// ── Sales Report ──
app.get(`${API}/quan-ly/reports/sales`, (req, res) => {
  const ps = db.products.all().filter(p=>p.is_active);
  res.json({
    daily: Array.from({length:30},(_,i)=>({ date:pastDate(29-i).split('T')[0], orders:Math.round(50+Math.random()*60), revenue:Math.round(25000000+Math.random()*20000000) })),
    top_products: ps.slice(0,5).map(p => ({ name:p.name, quantity:Math.floor(Math.random()*200+20), total:Math.round(p.price*(Math.floor(Math.random()*100+10))) })),
  });
});

// ═══════════════════════════════════════════════════════════════
// MODULE: KẾ TOÁN
// ═══════════════════════════════════════════════════════════════

// ── Transactions ──
function transRouter(base) {
  app.get(`${base}/transactions`, (req, res) => res.json(db.transactions.all()));
  app.post(`${base}/transactions`, (req, res) => { const t = { id:nextId('tx'), branch_id:'br_01', ...req.body, created_at:new Date().toISOString() }; res.status(201).json(db.transactions.insert(t)); });
  app.post(`${base}/transactions/bulk-delete`, (req, res) => { (req.body.ids||[]).forEach(id => db.transactions.remove(id)); res.json({deleted:(req.body.ids||[]).length}); });
}
transRouter(`${API}/quan-ly`);
transRouter(`${API}/ke-toan`);

// ── Invoices ──
function invoiceRouter(base) {
  app.get(`${base}/invoices`, (req, res) => res.json(db.invoices.all()));
  app.post(`${base}/invoices`, (req, res) => { const inv = { id:nextId('inv'), branch_id:'br_01', invoice_number:`HD-2026-${String(db.invoices.count()+1).padStart(4,'0')}`, ...req.body, status:'issued', issued_at:new Date().toISOString(), created_at:new Date().toISOString() }; res.status(201).json(db.invoices.insert(inv)); });
  app.delete(`${base}/invoices/:id`, (req, res) => { db.invoices.remove(req.params.id); res.json({success:true}); });
  app.get(`${base}/invoices/csv/:branchId`, (req, res) => res.json({url:'#'}));
  app.get(`${base}/invoices/:id/export`, (req, res) => res.json({url:'#'}));
}
invoiceRouter(`${API}/quan-ly`);
invoiceRouter(`${API}/ke-toan`);

// ── Paid Orders (for invoice creation) ──
app.get(`${API}/ke-toan/orders/paid`, (req, res) => {
  res.json(db.products.all().filter(p=>p.is_active).map(p => ({
    id:nextId('ord'), product_id:p.id, product_name:p.name, quantity:Math.floor(Math.random()*5)+1,
    unit_price:p.price, total:p.price*(Math.floor(Math.random()*5)+1), created_at:pastDate(Math.floor(Math.random()*7)),
  })));
});

// ── Kế Toán Dashboard Summary ──
app.get(`${API}/quan-ly/dashboard/summary`, (req, res) => res.json({
  revenue_this_month: 425000000, expenses_this_month: 312000000, profit_this_month: 113000000,
  unpaid_invoices: 3, due_deadlines: 2, bank_accounts_count: 2,
}));

// ═══════════════════════════════════════════════════════════════
// MODULE: THUẾ (HKD)
// ═══════════════════════════════════════════════════════════════

// ── Tax Profiles ──
app.get(`${API}/thue/profiles/:branchId`, (req, res) => res.json(db.taxprofiles.all().filter(p=>p.branch_id===req.params.branchId)));
app.get(`${API}/thue/profiles/:id/status`, (req, res) => {
  const p = db.taxprofiles.find(req.params.id);
  if (!p) return res.status(404).json({error:'Not found'});
  res.json({ id:p.id, tax_code:p.tax_code, legal_name:p.legal_name, tier:'N2', tier_label:'N2 — Doanh thu từ 100tr - 1tỷ', revenue_ytd:p.revenue_ytd, pct_of_1ty:85, threshold_alert_sent:p.threshold_alert_sent, registration_status:p.registration_status, tax_method:p.tax_method });
});
app.patch(`${API}/thue/profiles/:id`, (req, res) => { const p = db.taxprofiles.update(req.params.id, req.body); if(!p) return res.status(404).json({error:'Not found'}); res.json(p); });
app.post(`${API}/thue/profiles`, (req, res) => { const p = { id:nextId('tp'), ...req.body, registration_status:'draft', created_at:new Date().toISOString() }; res.status(201).json(db.taxprofiles.insert(p)); });

// ── Bank Accounts ──
app.get(`${API}/thue/bank-accounts/:branchId`, (req, res) => res.json(db.bankaccounts.all().filter(b=>b.branch_id===req.params.branchId)));
app.post(`${API}/thue/bank-accounts`, (req, res) => { const ba = { id:nextId('ba'), ...req.body, form_status:'draft' }; res.status(201).json(db.bankaccounts.insert(ba)); });

// ── Deadlines ──
app.get(`${API}/thue/deadlines/:branchId`, (req, res) => res.json(db.deadlines.all().filter(d=>d.branch_id===req.params.branchId)));
app.post(`${API}/thue/deadlines/bulk-submit`, (req, res) => { (req.body.ids||[]).forEach(id => db.deadlines.update(id, {submitted:true})); res.json({submitted:(req.body.ids||[]).length, status:'submitted'}); });

// ── Tax Report (So Sách) ──
// Handle both /report/ and /report/:branchId
app.get(`${API}/thue/report`, (req, res) => {
  const branchId = 'br_01';
  res.json({
    hkd_name:'Hộ Kinh Doanh POSA Trung Tâm', tax_code:'1234567890',
    rows: Array.from({length:6},(_,i) => ({ period_month:`T${i+1}/2026`, revenue:Math.round(50000000+Math.random()*40000000), vat:Math.round(5000000+Math.random()*4000000), tncn:0, total:Math.round(5000000+Math.random()*4000000), group: i<3?1:2 })),
    totals: { revenue:'443,000,000', cost:'287,950,000', vat:'44,300,000', pit:'0', total:'44,300,000' },
  });
});
app.get(`${API}/thue/report/:branchId`, (req, res) => {
  const branchId = req.params.branchId;
  res.json({
    hkd_name:'Hộ Kinh Doanh POSA Trung Tâm', tax_code:'1234567890',
    rows: Array.from({length:6},(_,i) => ({ period_month:`T${i+1}/2026`, revenue:Math.round(50000000+Math.random()*40000000), vat:Math.round(5000000+Math.random()*4000000), tncn:0, total:Math.round(5000000+Math.random()*4000000), group: i<3?1:2 })),
    totals: { revenue:'443,000,000', cost:'287,950,000', vat:'44,300,000', pit:'0', total:'44,300,000' },
  });
});

// ── Declaration ──
// Handle both /declaration/:form/ and /declaration/:form/:branchId
app.get(`${API}/thue/declaration/:form`, (req, res) => res.type('application/xml').send(`<?xml version="1.0"?><declaration><form>${req.params.form}</form><branch>br_01</branch><data status="ok"/></declaration>`));
app.get(`${API}/thue/declaration/:form/:branchId`, (req, res) => res.type('application/xml').send(`<?xml version="1.0"?><declaration><form>${req.params.form}</form><branch>${req.params.branchId}</branch><data status="ok"/></declaration>`));
app.post(`${API}/thue/declaration/submit`, (req, res) => res.json({success:true, message:'Đã nộp tờ khai thành công'}));

// ── Legacy Checklist ──
// Handle both /checklist/ and /checklist/:branchId
app.post(`${API}/thue/legacy-inventory/checklist`, (req, res) => respondLegacyChecklist('br_01', req, res));
app.post(`${API}/thue/legacy-inventory/checklist/:branchId`, (req, res) => respondLegacyChecklist(req.params.branchId, req, res));

function respondLegacyChecklist(branchId, req, res) {
  res.json({
    branch_id:branchId, generated_at:new Date().toISOString(),
    items: [
      { product:'Phở bò gói hiệu Đệ Nhất 500g', opening_qty:120, avg_cost:15000, value:1800000 },
      { product:'Nước mắm Nam Ngư 1L', opening_qty:45, avg_cost:22000, value:990000 },
      { product:'Dầu ăn Tường An 1L', opening_qty:30, avg_cost:35000, value:1050000 },
      { product:'Bột ngọt Ajinomoto 200g', opening_qty:25, avg_cost:12000, value:300000 },
      { product:'Đường cát trắng 1kg', opening_qty:40, avg_cost:18000, value:720000 },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// STATUS & RESET
// ═══════════════════════════════════════════════════════════════

app.get(`${API}/status`, (req, res) => {
  const info = {};
  for (const [name, table] of Object.entries(db)) info[name] = table.count();
  res.json({ status:'running', version:'1.0.0', tables: info });
});

app.post(`${API}/reset`, (req, res) => {
  for (const table of Object.values(db)) table.reset();
  res.json({ success:true, message:'All tables reset to seed data' });
});

// ═══════════════════════════════════════════════════════════════
// 404
// ═══════════════════════════════════════════════════════════════
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error:'Not found', path: req.path });
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
const server = app.listen(PORT, () => {
  console.log(`\n  ┌────────────────────────────────────────────┐`);
  console.log(`  │  🚀  POSA Mock Server v1.0                 │`);
  console.log(`  │  📡  http://localhost:${PORT}${API.padEnd(37-PORT.toString().length-6)}│`);
  console.log(`  │  📦  ${Object.keys(db).length} tables, ${Object.values(db).reduce((s,t)=>s+t.count(),0)} records     │`);
  console.log(`  │  🔄  POST /api/v1/reset — reset data      │`);
  console.log(`  └────────────────────────────────────────────┘\n`);
});

// WebSocket — for real-time inventory updates
const wss = new WebSocketServer({ server, path: '/ws/inventory' });
wss.on('connection', (ws, req) => {
  console.log('[WS] Inventory client connected');
  ws.send(JSON.stringify({ type: 'inventory', data: db.materials.all().map(m => ({ id: m.id, name: m.name, current_stock: m.current_stock, min_stock: m.min_stock })) }));
  ws.on('close', () => console.log('[WS] Inventory client disconnected'));
});
