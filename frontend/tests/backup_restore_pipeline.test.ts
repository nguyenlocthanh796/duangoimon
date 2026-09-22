/**
 * 👑 OngChu Lean POS - Backup & Restore Pipeline Test Suite
 */
import './setup_env';
import { runner, assert } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';

export async function runBackupRestorePipelineTests() {
  runner.setContext('Backup & Restore', 'Full JSON Import and Snapshot Preservation');

  await runner.test('1. Nạp và lưu trữ an toàn file sao lưu Quán Chè Bưởi (không bị xóa nhầm)', async () => {
    const backupPath = 'c:/Users/locthanhit/Downloads/mau/ongchu_backup_quanchebuoi_2026-09-19.json';
    const jsonContent = fs.readFileSync(backupPath, 'utf8');
    const parsed = JSON.parse(jsonContent);

    const targetTenantId = parsed.tenantId || 'tenant_quanchebuoiangiang';
    const targetStoreName = parsed.storeSettings?.storeName || 'Quán Chè Bưởi An Giang';

    const safeTables = Array.isArray(parsed.tables) ? parsed.tables : [];
    const safeSelectedTable = safeTables.length > 0 ? safeTables[0] : usePOSStore.getState().selectedTable;

    usePOSStore.setState({
      tenantId: targetTenantId,
      categories: parsed.categories,
      menuItems: parsed.menuItems,
      tables: parsed.tables,
      areas: parsed.areas,
      toppings: parsed.toppings,
      inventoryItems: parsed.inventoryItems,
      storeSettings: parsed.storeSettings,
      selectedTable: safeSelectedTable,
      tableCarts: {},
      tableDiscounts: {},
    });

    const snapshot = {
      tenantId: targetTenantId,
      tables: parsed.tables,
      categories: parsed.categories,
      areas: parsed.areas,
      toppings: parsed.toppings,
      inventoryItems: parsed.inventoryItems,
      menuItems: parsed.menuItems,
      storeSettings: parsed.storeSettings,
    };
    await AsyncStorage.setItem('ongchu_pos_tenant_' + targetTenantId, JSON.stringify(snapshot));

    // Kiểm tra ngay sau khi nạp
    const posState = usePOSStore.getState();
    assert.strictEqual(posState.tenantId, targetTenantId, 'TenantId phải là ' + targetTenantId);
    assert.strictEqual(posState.menuItems.length, 44, 'Thực đơn phải có đúng 44 món');
    assert.strictEqual(posState.tables.length, 15, 'Sơ đồ bàn phải có 15 bàn');
    assert.strictEqual(posState.areas.length, 2, 'Khu vực phải có 2 khu vực');
    assert.strictEqual(posState.selectedTable.id, 'tbl_01', 'Bàn chọn mặc định là tbl_01');

    // Giả lập chuyển đổi quán hoặc reload app
    await usePOSStore.getState().switchTenant(targetTenantId, targetStoreName);

    const reloadedState = usePOSStore.getState();
    assert.strictEqual(reloadedState.menuItems.length, 44, 'Sau reload thực đơn vẫn giữ nguyên 44 món (không bị xóa)');
    assert.strictEqual(reloadedState.tables.length, 15, 'Sau reload vẫn giữ nguyên 15 bàn (không bị xóa)');
    assert.strictEqual(reloadedState.areas.length, 2, 'Sau reload vẫn giữ nguyên 2 khu vực');
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  runBackupRestorePipelineTests().then(() => {
    runner.printSummary();
  });
}
