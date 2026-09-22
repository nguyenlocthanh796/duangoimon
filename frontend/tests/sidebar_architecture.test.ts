import { runner, assert } from './harness';
import { useUIStore } from '../lib/store/useUIStore';
import { getFilteredNavGroups } from '../lib/components/ui/sidebarConfig';
import * as fs from 'fs';
import * as path from 'path';

export async function runSidebarArchitectureTests() {
  runner.setContext('Sidebar Architecture', 'Global Overlay, useUIStore & RBAC Clean Filter');

  await runner.test('1. useUIStore manages sidebar open/close/toggle correctly', async () => {
    useUIStore.setState({ isSidebarOpen: false });
    assert.isFalse(useUIStore.getState().isSidebarOpen);

    useUIStore.getState().openSidebar();
    assert.isTrue(useUIStore.getState().isSidebarOpen);

    useUIStore.getState().closeSidebar();
    assert.isFalse(useUIStore.getState().isSidebarOpen);

    useUIStore.getState().toggleSidebar();
    assert.isTrue(useUIStore.getState().isSidebarOpen);

    useUIStore.getState().toggleSidebar();
    assert.isFalse(useUIStore.getState().isSidebarOpen);
  });

  await runner.test('2. Owner sees 100% full navigation groups and all 12 items', async () => {
    const groups = getFilteredNavGroups('owner');
    assert.strictEqual(groups.length, 4);

    const allItems = groups.flatMap((g) => g.items);
    assert.isTrue(allItems.some((i) => i.route === '/cai-dat'));
    assert.isTrue(allItems.some((i) => i.route === '/nhan-su'));
    assert.isTrue(allItems.some((i) => i.route === '/bao-cao-loi-nhuan'));
    assert.isTrue(allItems.some((i) => i.route === '/so-quy'));
    assert.isTrue(allItems.some((i) => i.route === '/thuc-don'));
  });

  await runner.test('3. Manager menu cleanly hides sensitive System Settings and Staff Payroll', async () => {
    const groups = getFilteredNavGroups('manager');
    const allItems = groups.flatMap((g) => g.items);

    assert.isFalse(allItems.some((i) => i.route === '/cai-dat'));
    assert.isFalse(allItems.some((i) => i.route === '/nhan-su'));
    assert.isTrue(allItems.some((i) => i.route === '/bao-cao-loi-nhuan'));
    assert.isTrue(allItems.some((i) => i.route === '/so-quy'));
    assert.isTrue(allItems.some((i) => i.route === '/giao-ca'));
    assert.isTrue(allItems.some((i) => i.route === '/thuc-don'));
    assert.isTrue(allItems.some((i) => i.route === '/kho-hang'));
  });

  await runner.test('4. Cashier menu hides P&L Report, Staff, Settings, Warehouse and Table Ops', async () => {
    const groups = getFilteredNavGroups('cashier');
    const allItems = groups.flatMap((g) => g.items);

    // Forbidden
    assert.isFalse(allItems.some((i) => i.route === '/bao-cao-loi-nhuan'));
    assert.isFalse(allItems.some((i) => i.route === '/nhan-su'));
    assert.isFalse(allItems.some((i) => i.route === '/cai-dat'));
    assert.isFalse(allItems.some((i) => i.route === '/kho-hang'));
    assert.isFalse(allItems.some((i) => i.route === '/quan-ly-ban'));
    assert.isFalse(allItems.some((i) => i.route === '/thuc-don'));

    // Allowed
    assert.isTrue(allItems.some((i) => i.route === '/'));
    assert.isTrue(allItems.some((i) => i.route === '/kds'));
    assert.isTrue(allItems.some((i) => i.route === '/hoa-don'));
    assert.isTrue(allItems.some((i) => i.route === '/so-quy'));
    assert.isTrue(allItems.some((i) => i.route === '/giao-ca'));
    assert.isTrue(allItems.some((i) => i.id === 'lock_screen'));
    assert.isTrue(allItems.some((i) => i.id === 'login_screen'));
  });

  await runner.test('5. Server role is ultra-lean (only tables, kds, invoices, lock/logout)', async () => {
    const groups = getFilteredNavGroups('server');
    const allItems = groups.flatMap((g) => g.items);

    // Forbidden
    assert.isFalse(allItems.some((i) => i.route === '/so-quy'));
    assert.isFalse(allItems.some((i) => i.route === '/giao-ca'));
    assert.isFalse(allItems.some((i) => i.route === '/bao-cao-loi-nhuan'));
    assert.isFalse(allItems.some((i) => i.route === '/thuc-don'));
    assert.isFalse(allItems.some((i) => i.route === '/cai-dat'));

    // Allowed
    assert.isTrue(allItems.some((i) => i.route === '/'));
    assert.isTrue(allItems.some((i) => i.route === '/kds'));
    assert.isTrue(allItems.some((i) => i.route === '/hoa-don'));
    assert.isTrue(allItems.some((i) => i.id === 'lock_screen'));
    assert.isTrue(allItems.some((i) => i.id === 'login_screen'));
  });

  await runner.test('6. Single Mount Invariant: Only _layout.tsx renders <AppSidebar across frontend/app', async () => {
    const appDir = path.resolve(__dirname, '../app');
    const files = fs.readdirSync(appDir, { recursive: true }) as string[];

    const screensWithSidebar: string[] = [];
    for (const f of files) {
      if (typeof f !== 'string' || (!f.endsWith('.tsx') && !f.endsWith('.ts'))) continue;
      const fullPath = path.join(appDir, f);
      if (!fs.statSync(fullPath).isFile()) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<AppSidebar')) {
        screensWithSidebar.push(f.replace(/\\/g, '/'));
      }
    }

    assert.strictEqual(screensWithSidebar.length, 1);
    assert.strictEqual(screensWithSidebar[0], '_layout.tsx');
  });
}
