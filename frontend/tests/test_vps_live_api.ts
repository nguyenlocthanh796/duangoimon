/**
 * 👑 OngChu Lean POS - Master VPS Live Database Integration Test (TypeScript Runner)
 * Executes against live VPS Cloud Database (https://app.ongchu.cloud)
 */

import './setup_env';
import { runner, assert } from './harness';
import { apiClient } from '../lib/api/apiClient';

const VPS_URL = 'https://app.ongchu.cloud';
const TENANT_ID = 'tenant_quanchebuoiangiang';

async function vpsReq(path: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${VPS_URL}${path}${path.includes('?') ? '&' : '?'}tenant_id=${TENANT_ID}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { success: res.ok, status: res.status, data };
}

export async function runVPSLiveDatabaseTests() {
  console.log('\n--- Running Master VPS Live Database Integration Tests ---');
  runner.setContext('VPS Database', 'Live VPS Pure-Go SQLite WAL & Multi-Tenant Database Engine');

  // 1. Health & Server Version
  await runner.test('VPS-1: Server Health Check & Engine Signature', async () => {
    const health = await vpsReq('/health');
    assert.ok(health.success, 'Health check must succeed');
    assert.strictEqual(health.data?.status, 'healthy');
    assert.ok(health.data?.service?.includes('OngChu POS'), 'Must identify OngChu POS');
  });

  // 2. Multi-Tenant Auth
  await runner.test('VPS-2: Multi-Tenant Credentials Validation & Rejection of Bad Password', async () => {
    const validLogin = await vpsReq('/api/v1/public/login', {
      method: 'POST',
      body: JSON.stringify({
        tenant_code: 'quanquan',
        username: 'quanquan',
        password: 'Danh@!26062002',
      }),
    });
    assert.ok(validLogin.success, 'Valid login must succeed');

    const invalidLogin = await vpsReq('/api/v1/public/login', {
      method: 'POST',
      body: JSON.stringify({
        tenant_code: 'quanquan',
        username: 'quanquan',
        password: 'WrongPassword!',
      }),
    });
    assert.ok(!invalidLogin.success, 'Invalid password must be rejected');
  });

  // 3. VPS Live Dining Tables & Areas
  await runner.test('VPS-3: Fetch Live Dining Tables & Areas from VPS DB', async () => {
    const areasRes = await vpsReq('/api/v1/areas');
    assert.ok(areasRes.success, 'Fetch areas must succeed');
    const areas = Array.isArray(areasRes.data) ? areasRes.data : areasRes.data?.data || [];
    assert.ok(areas.length >= 2, 'Must have at least 2 areas on VPS');

    const tablesRes = await vpsReq('/api/v1/tables');
    assert.ok(tablesRes.success, 'Fetch tables must succeed');
    const tables = Array.isArray(tablesRes.data) ? tablesRes.data : tablesRes.data?.data || [];
    assert.ok(tables.length >= 15, 'Must have at least 15 dining tables on VPS');
  });

  // 4. VPS Live Menu Catalog
  await runner.test('VPS-4: Fetch Live Menu Categories & Products from VPS DB', async () => {
    const catRes = await vpsReq('/api/v1/categories');
    assert.ok(catRes.success, 'Fetch categories must succeed');
    const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [];
    assert.ok(cats.length >= 6, 'Must have at least 6 categories on VPS');

    const prodRes = await vpsReq('/api/v1/products');
    assert.ok(prodRes.success, 'Fetch products must succeed');
    const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || [];
    assert.ok(prods.length >= 40, 'Must have at least 40 products on VPS');
  });

  // 5. Order Flow & Payment on VPS DB
  await runner.test('VPS-5: Order Lifecycle, VietQR & Payment on VPS DB', async () => {
    const orderPayload = {
      tenant_id: TENANT_ID,
      table_id: 'tbl_01',
      table_name: 'Bàn 01',
      order_channel: 'dine_in',
      staff_name: 'Thu Ngân TS',
      items: [
        {
          product_id: 'prod_01',
          product_name: 'Chè Bưởi Tứ Quý',
          unit_price: 28000,
          quantity: 1,
          station: 'bar',
          subtotal: 28000,
        },
      ],
      subtotal: 28000,
      discount_amount: 0,
      vat_amount: 0,
      total_amount: 28000,
      payment_method: 'cash',
      status: 'dang_xu_ly',
    };

    const createRes = await vpsReq('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
    assert.ok(createRes.success, 'Order creation on VPS DB must succeed');
    const orderId = createRes.data?.id;
    assert.ok(orderId, 'Created order must return ID');

    // Pay order
    const payRes = await vpsReq(`/api/v1/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify({
        payment_method: 'cash',
        cash_received: 50000,
        cash_change: 22000,
        staff_name: 'Thu Ngân TS',
      }),
    });
    assert.ok(payRes.success, 'Order payment on VPS DB must succeed');
  });

  // 6. Cash Flow (Sổ Quỹ) on VPS DB
  await runner.test('VPS-6: Record and Retrieve Cash Transactions on VPS DB', async () => {
    const txRes = await vpsReq('/api/v1/cash/transactions', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: TENANT_ID,
        branch_id: 'branch_main',
        type: 'chi',
        category: 'chi_mua_rau_cho',
        amount: 25000,
        description: 'Mua lá dứa thơm',
        performed_by: 'Chủ Quán TS',
      }),
    });
    assert.ok(txRes.success, 'Cash transaction creation on VPS DB must succeed');

    const listRes = await vpsReq('/api/v1/cash/transactions');
    assert.ok(listRes.success, 'Cash transaction listing from VPS DB must succeed');
  });

  // 7. Store Settings & Hardware on VPS DB
  await runner.test('VPS-7: Fetch Store Settings & Hardware Profile from VPS DB', async () => {
    const settingsRes = await vpsReq('/api/v1/settings');
    assert.ok(settingsRes.success, 'Get settings from VPS DB must succeed');
    const settings = settingsRes.data?.data || settingsRes.data;
    assert.ok(settings?.store_name, 'Store name must exist on VPS DB');
  });

  // 8. Owner 3 Golden Numbers (P&L) on VPS DB
  await runner.test('VPS-8: Compute Owner 3 Golden Numbers P&L on VPS DB', async () => {
    const pnlRes = await vpsReq('/api/v1/owner/pnl-summary');
    assert.ok(pnlRes.success, 'Get Owner PnL summary from VPS DB must succeed');
  });
}


// Standalone execution if run directly
if (require.main === module) {
  runVPSLiveDatabaseTests().then(() => {
    const ok = runner.printSummary();
    process.exit(ok ? 0 : 1);
  });
}
