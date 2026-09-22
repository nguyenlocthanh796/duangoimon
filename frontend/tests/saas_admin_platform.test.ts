/**
 * 👑 OngChu Lean POS - SaaS Platform Landlord & Super Admin Test Suite
 * Tests:
 * 1. SaaS MRR, ARR & Subscription Billing calculations.
 * 2. Multi-tenant lifecycle: Provisioning (createTenant), Status Toggling (Lock/Unlock).
 * 3. License Extension (renewTenantLicense) & Expiration tracking.
 * 4. Tenant search & plan tier filtering.
 * 5. Emergency tech support & rescue code generation.
 */

import { runner, assert } from './harness';
import {
  useSaaSAdminStore,
  SAAS_PLAN_TIERS,
  SaaSTenant,
} from '../lib/store/useSaaSAdminStore';

export async function runSaaSAdminPlatformTests() {
  console.log('\n--- Running SaaS Platform Landlord & Super Admin Tests ---');
  runner.setContext('SaaS Platform Admin', 'Multi-Tenant Landlord, Billing & License Management');

  // Test 1: Plan Tier Specifications & Pricing Alignment
  await runner.test('SaaS Plans: 4 standard tiers are defined with proper limits & pricing', () => {
    assert.strictEqual(SAAS_PLAN_TIERS.trial.pricePerMonth, 0, 'Trial tier must be 0 VND');
    assert.strictEqual(SAAS_PLAN_TIERS.trial.maxBranches, 1, 'Trial allows 1 branch');
    assert.strictEqual(SAAS_PLAN_TIERS.standard.pricePerMonth, 199000, 'Standard tier is 199k');
    assert.strictEqual(SAAS_PLAN_TIERS.pro.pricePerMonth, 399000, 'Pro tier is 399k');
    assert.strictEqual(SAAS_PLAN_TIERS.enterprise.pricePerMonth, 799000, 'Enterprise tier is 799k');
    assert.strictEqual(SAAS_PLAN_TIERS.enterprise.maxBranches, 'unlimited', 'Enterprise has unlimited branches');
  });

  // Test 2: MRR & Metrics calculation
  await runner.test('SaaS Metrics: MRR, ARR and Expiring tenant counts are computed accurately', () => {
    const store = useSaaSAdminStore.getState();
    const metrics = store.getMetrics();

    assert.isTrue(metrics.totalTenants > 0, 'Total tenants must be > 0');
    assert.isTrue(metrics.totalMRR > 0, 'Total MRR must be positive');
    assert.strictEqual(metrics.annualARR, metrics.totalMRR * 12, 'ARR must equal MRR * 12');
    assert.isTrue(metrics.activeTenants <= metrics.totalTenants, 'Active count cannot exceed total');
    assert.isTrue(metrics.expiringTenants >= 0, 'Expiring count must be non-negative');
  });

  // Test 3: Search and Filter operations
  await runner.test('SaaS Filters: Filters by plan and search query work as expected', () => {
    const store = useSaaSAdminStore.getState();

    // Filter by 'pro' plan
    store.setPlanFilter('pro');
    const proList = store.getFilteredTenants();
    for (const t of proList) {
      assert.strictEqual(t.subscriptionPlan, 'pro', 'Must only return pro tenants');
    }

    // Reset plan filter
    store.setPlanFilter('all');

    // Search query match
    store.setSearchQuery('An Giang');
    const searchList = store.getFilteredTenants();
    assert.isTrue(searchList.length > 0, 'Should find Quán Chè Bưởi An Giang');
    assert.isTrue(searchList[0].name.includes('An Giang'), 'Matched name check');

    // Reset search
    store.setSearchQuery('');
  });

  // Test 4: Tenant Provisioning (Create Tenant)
  await runner.test('SaaS Onboarding: createTenant creates a new active tenant with correct expiry', async () => {
    const store = useSaaSAdminStore.getState();
    const testSubdomain = 'testquancafe' + Date.now();

    const res = await store.createTenant({
      name: 'Quán Cafe Thử Nghiệm',
      subdomain: testSubdomain,
      phone: '0977 111 222',
      ownerName: 'Anh Thử',
      subscriptionPlan: 'standard',
      durationMonths: 6,
    });

    assert.isTrue(res.success, 'Creation must succeed');

    const created = useSaaSAdminStore.getState().tenants.find((t) => t.subdomain === testSubdomain);
    assert.isTrue(created !== undefined, 'Created tenant must exist in store');
    assert.strictEqual(created?.name, 'Quán Cafe Thử Nghiệm');
    assert.strictEqual(created?.subscriptionPlan, 'standard');
    assert.strictEqual(created?.monthlyFee, 199000);
    assert.isTrue(created!.isActive, 'New tenant must be active');
    assert.isTrue(created!.licenseDaysLeft >= 170, 'Must have ~180 days for 6-month duration');

    // Duplicate subdomain rejection
    const resDup = await store.createTenant({
      name: 'Quán Trùng Mã Khác Tên ' + Date.now(),
      subdomain: testSubdomain,
      phone: '0977 111 333',
      ownerName: 'Anh Khác',
      subscriptionPlan: 'pro',
      durationMonths: 1,
    });
    assert.isFalse(resDup.success, 'Must reject duplicate subdomain');

    // Duplicate store name rejection
    const resNameDup = await store.createTenant({
      name: 'Quán Cafe Thử Nghiệm',
      subdomain: 'brandnewsubdomain' + Date.now(),
      phone: '0977 999 888',
      ownerName: 'Anh Mới',
      subscriptionPlan: 'standard',
      durationMonths: 1,
    });
    assert.isFalse(resNameDup.success, 'Must reject duplicate store name');

    // Duplicate phone rejection
    const resPhoneDup = await store.createTenant({
      name: 'Quán Tên Hoàn Toàn Mới ' + Date.now(),
      subdomain: 'anothernewsubdomain' + Date.now(),
      phone: '0977 111 222', // Trùng SĐT với Quán Cafe Thử Nghiệm vừa tạo
      ownerName: 'Anh Khác',
      subscriptionPlan: 'standard',
      durationMonths: 1,
    });
    assert.isFalse(resPhoneDup.success, 'Must reject duplicate phone number');
  });

  // Test 5: Tenant License Renewal
  await runner.test('SaaS Renewal: renewTenantLicense extends license expiration', async () => {
    const store = useSaaSAdminStore.getState();
    const tenant = store.tenants[0];
    const prevDays = tenant.licenseDaysLeft;

    const res = await store.renewTenantLicense(tenant.id, 3);
    assert.isTrue(res.success, 'Renewal must succeed');

    const updated = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenant.id);
    assert.isTrue(updated!.licenseDaysLeft > prevDays, 'Days left must increase');
    assert.isTrue(updated!.isActive, 'Must be active after renewal');
  });

  // Test 6: Tenant Lock / Unlock (Suspension)
  await runner.test('SaaS Suspension: toggleTenantStatus locks and unlocks tenant', async () => {
    const store = useSaaSAdminStore.getState();
    const tenant = store.tenants[0];
    const initialStatus = tenant.isActive;

    // Toggle once -> flips status
    const res1 = await store.toggleTenantStatus(tenant.id);
    assert.isTrue(res1.success);
    assert.strictEqual(res1.newStatus, !initialStatus);

    let current = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenant.id);
    assert.strictEqual(current?.isActive, !initialStatus);

    // Toggle back -> restore
    const res2 = await store.toggleTenantStatus(tenant.id);
    assert.isTrue(res2.success);
    assert.strictEqual(res2.newStatus, initialStatus);

    current = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenant.id);
    assert.strictEqual(current?.isActive, initialStatus);
  });

  // Test 7: Emergency PIN Reset & Rescue Code
  await runner.test('SaaS Rescue: resetTenantPin issues 9999 PIN and emergency unbind code', async () => {
    const store = useSaaSAdminStore.getState();
    const tenant = store.tenants[0];

    const res = await store.resetTenantPin(tenant.id);
    assert.isTrue(res.success);
    assert.strictEqual(res.ownerPin, '9999', 'Rescue PIN must be 9999');
    assert.isTrue(res.rescueCode.startsWith('SAAS'), 'Rescue code format check');
  });

  // Test 8: Urgent collection list & count parity
  await runner.test('SaaS Urgent Collection: getUrgentTenants aligns 100% with urgentTenantsCount', () => {
    const store = useSaaSAdminStore.getState();
    const metrics = store.getMetrics();
    const urgentList = store.getUrgentTenants();

    assert.strictEqual(urgentList.length, metrics.urgentTenantsCount, 'Urgent list count must equal urgentTenantsCount');
    for (const t of urgentList) {
      assert.isTrue(!t.isActive || t.licenseDaysLeft <= 14, 'Every tenant in urgent list must be expired or <= 14 days');
    }
  });

  // Test 9: 1-Tap Technical Support Impersonation (View as Owner)
  await runner.test('SaaS Impersonation: startImpersonation enables 1-tap landlord support mode', () => {
    const { useAuthStore } = require('../lib/store/useAuthStore');
    const auth = useAuthStore.getState();
    const store = useSaaSAdminStore.getState();
    const targetTenant = store.tenants[0];

    // Bắt đầu impersonate
    auth.startImpersonation({
      id: targetTenant.id,
      name: targetTenant.name,
      subdomain: targetTenant.subdomain,
      phone: targetTenant.phone,
      subscriptionPlan: targetTenant.subscriptionPlan,
    });

    const state1 = useAuthStore.getState();
    assert.isTrue(state1.impersonation?.isImpersonating === true, 'isImpersonating must be true');
    assert.strictEqual(state1.impersonation?.tenantId, targetTenant.id);
    assert.strictEqual(state1.currentRole, 'owner', 'Role must switch to owner for technical support');
    assert.strictEqual(state1.tenant.code, targetTenant.subdomain);

    // Kết thúc impersonate -> phục hồi super_admin
    auth.stopImpersonation();
    const state2 = useAuthStore.getState();
    assert.isTrue(state2.impersonation === null, 'impersonation must be null after stop');
    assert.strictEqual(state2.currentRole, 'super_admin', 'Role must revert to super_admin');
  });

  // Test 10: Real Database Live Synchronization with Go Backend
  await runner.test('SaaS Sync: fetchTenants syncs with Go Backend and SQLite database', async () => {
    const store = useSaaSAdminStore.getState();
    await store.fetchTenants();

    const afterSync = useSaaSAdminStore.getState().tenants;
    assert.isTrue(afterSync.length >= 6, 'Must sync at least 6 tenants from live SQLite');
    const ongchu = afterSync.find((t) => t.subdomain === 'ongchu');
    assert.isTrue(ongchu !== undefined, 'Live tenant ongchu must exist');
    assert.strictEqual(ongchu?.subscriptionPlan, 'pro');
  });

  // Test 11: Device Fleet Monitoring & 1-Tap Remote Unbind
  await runner.test('SaaS Fleet: fetchTenantDevices and unbindTenantDevice manage POS/KDS devices', async () => {
    const store = useSaaSAdminStore.getState();
    const tenantId = 'tenant_ongchu';

    const devices = await store.fetchTenantDevices(tenantId);
    assert.isTrue(Array.isArray(devices), 'Devices must be an array');
    assert.isTrue(devices.length > 0, 'tenant_ongchu should have registered devices');

    const initialCount = devices.length;
    const targetDev = devices[0];

    // Remote unbind
    const unbindRes = await store.unbindTenantDevice(tenantId, targetDev.id);
    assert.isTrue(unbindRes.success, 'Unbind must succeed');

    const afterUnbind = useSaaSAdminStore.getState().devicesByTenant[tenantId] || [];
    assert.strictEqual(afterUnbind.length, initialCount - 1, 'Device count must decrement by 1');
    assert.isFalse(afterUnbind.some((d) => d.id === targetDev.id), 'Unbound device must no longer exist in fleet');

    // Phục hồi thiết bị để đảm bảo tính bất biến (idempotent) qua các lần chạy test
    useSaaSAdminStore.setState((state) => ({
      devicesByTenant: {
        ...state.devicesByTenant,
        [tenantId]: [...(state.devicesByTenant[tenantId] || []), targetDev],
      },
    }));
  });

  // Test 12: Feature Flags & Add-on Toggling with MRR Auto-Recalculation
  await runner.test('SaaS Add-ons & MRR: toggleTenantAddon updates addon status and recalculates monthlyFee', async () => {
    const store = useSaaSAdminStore.getState();
    const tenantId = 'tenant_ongchu';

    const addons = await store.fetchTenantAddons(tenantId);
    assert.isTrue(Array.isArray(addons), 'Addons must be an array');
    assert.isTrue(addons.length >= 6, 'Should have 6 standard add-on modules');

    // Toggle multi_branch (fee: 100,000đ)
    const branchAddon = addons.find((a) => a.addonCode === 'multi_branch');
    assert.isTrue(branchAddon !== undefined, 'multi_branch addon must exist');

    const tenant = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenantId);
    const basePlanFee = SAAS_PLAN_TIERS[tenant!.subscriptionPlan]?.pricePerMonth || 199000;
    const currentEnabledAddons = addons.filter((a) => a.isEnabled);
    const totalAddonsFee = currentEnabledAddons.reduce((sum, a) => sum + a.monthlyFee, 0);
    const fullMRR = basePlanFee + totalAddonsFee;
    const reducedMRR = fullMRR - (branchAddon?.monthlyFee || 100000);

    // Toggle off
    await store.toggleTenantAddon(tenantId, 'multi_branch', false);
    const tenantAfterOff = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenantId);
    assert.strictEqual(tenantAfterOff?.monthlyFee, reducedMRR, 'MRR must equal base plan + remaining active addons');

    // Toggle back on
    await store.toggleTenantAddon(tenantId, 'multi_branch', true);
    const tenantAfterOn = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenantId);
    assert.strictEqual(tenantAfterOn?.monthlyFee, fullMRR, 'MRR must restore to base plan + all active addons');
  });

  // Test 13: SaaS Invoices Ledger & Auto Invoice Generation on Renewal
  await runner.test('SaaS Invoices: fetchTenantInvoices and renewTenantLicense generate and record invoices', async () => {
    const store = useSaaSAdminStore.getState();
    const tenantId = 'tenant_ongchu';

    const initialInvoices = await store.fetchTenantInvoices(tenantId);
    assert.isTrue(Array.isArray(initialInvoices), 'Invoices must be an array');
    const initialCount = initialInvoices.length;

    // Perform license renewal
    const renewRes = await store.renewTenantLicense(tenantId, 6);
    assert.isTrue(renewRes.success, 'License renewal must succeed');

    const updatedInvoices = useSaaSAdminStore.getState().invoicesByTenant[tenantId] || [];
    assert.strictEqual(updatedInvoices.length, initialCount + 1, 'Invoices count must increase by 1 after renewal');

    const latestInvoice = updatedInvoices[0];
    assert.isTrue(latestInvoice.invoiceCode.startsWith('INV-2026-'), 'Invoice code must follow INV-2026-xxxx format');
    assert.strictEqual(latestInvoice.monthsAdded, 6, 'Months added must be 6');
    assert.isTrue(latestInvoice.amount > 0, 'Amount must be positive');
    assert.strictEqual(latestInvoice.paymentMethod, 'vietqr', 'Default payment method should be vietqr');
  });

  // Test 14: Tenant Branch Management & Quota Enforcement
  await runner.test('SaaS Branches: fetchTenantBranches and createTenantBranch enforce plan quota limits', async () => {
    const store = useSaaSAdminStore.getState();
    const tenantId = 'tenant_ongchu';

    const branches = await store.fetchTenantBranches(tenantId);
    assert.isTrue(Array.isArray(branches), 'Branches must be an array');
    assert.isTrue(branches.length >= 3, 'tenant_ongchu should have 3 branches');

    // Check quota calculation
    const quota = store.getTenantQuota(tenantId);
    assert.strictEqual(quota.branchCount, branches.length, 'Quota branchCount matches branch list length');
    assert.strictEqual(quota.maxBranches, 3, 'Pro tier maxBranches is 3');
    assert.isTrue(quota.isAtBranchLimit, 'tenant_ongchu with 3 branches is at branch limit');

    // Attempting to add 4th branch on Pro tier (limit 3) must be rejected
    const rejectRes = await store.createTenantBranch(tenantId, {
      name: 'Chi Nhánh 4 - Vượt Hạn Mức',
      address: '99 Đường Quá Tải',
    });
    assert.isFalse(rejectRes.success, 'Branch creation exceeding plan quota must be rejected');
    assert.isTrue(Boolean(rejectRes.error?.includes('tối đa 3 chi nhánh')), 'Error message must specify quota limit');

    // Enterprise tenant allows unlimited branches
    const entTenantRes = await store.createTenant({
      name: 'Chuỗi Trà Sữa Doanh Nghiệp',
      subdomain: 'trasuaent' + Date.now(),
      phone: '0988 555 666',
      ownerName: 'Anh Chuỗi',
      subscriptionPlan: 'enterprise',
      durationMonths: 12,
    });
    assert.isTrue(entTenantRes.success, 'Enterprise tenant creation must succeed');
    const entTenant = useSaaSAdminStore.getState().tenants.find((t) => t.name === 'Chuỗi Trà Sữa Doanh Nghiệp');
    assert.isTrue(entTenant !== undefined, 'Enterprise tenant exists');

    const entBranchRes = await store.createTenantBranch(entTenant!.id, {
      name: 'Chi Nhánh Q.1',
      address: '10 Hai Bà Trưng',
      phone: '028 3822 9900',
      managerName: 'Chị Mai',
    });
    assert.isTrue(entBranchRes.success, 'Enterprise tier allows creating branch');
    assert.strictEqual(entBranchRes.branch?.name, 'Chi Nhánh Q.1');
    assert.isTrue(Boolean(entBranchRes.branch?.isMain), 'First branch of tenant must be main branch');
  });

  // Test 15: Tenant Branch Status Toggling & Device Mapping
  await runner.test('SaaS Branches: toggleTenantBranchStatus locks and unlocks branches', async () => {
    const store = useSaaSAdminStore.getState();
    const tenantId = 'tenant_ongchu';
    const branches = store.branchesByTenant[tenantId] || [];
    assert.isTrue(branches.length > 0, 'Must have branches to toggle');

    const targetBranch = branches[0];
    const initialStatus = targetBranch.isActive;

    // Toggle status (lock)
    const toggle1 = await store.toggleTenantBranchStatus(tenantId, targetBranch.id);
    assert.isTrue(toggle1.success, 'Toggle 1 must succeed');
    assert.strictEqual(toggle1.newStatus, !initialStatus, 'Status must invert');

    const branchAfter1 = (useSaaSAdminStore.getState().branchesByTenant[tenantId] || []).find((b) => b.id === targetBranch.id);
    assert.strictEqual(branchAfter1?.isActive, !initialStatus, 'Branch in store must reflect new status');

    // Toggle status (unlock)
    const toggle2 = await store.toggleTenantBranchStatus(tenantId, targetBranch.id);
    assert.isTrue(toggle2.success, 'Toggle 2 must succeed');
    assert.strictEqual(toggle2.newStatus, initialStatus, 'Status must restore to original');
  });

  // Test 16: 1-Tap Subscription Plan Switching & Quota Warning Alerts
  await runner.test('SaaS Plan Switcher: changeTenantPlan upgrades/downgrades with MRR update and quota warnings', async () => {
    const store = useSaaSAdminStore.getState();
    const tenantId = 'tenant_tra_bong';

    // Đảm bảo trạng thái ban đầu chuẩn là standard
    await store.changeTenantPlan(tenantId, 'standard');
    const initialTenant = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenantId);
    assert.strictEqual(initialTenant?.subscriptionPlan, 'standard');

    // Upgrade to Pro (399k base)
    const upgradeRes = await store.changeTenantPlan(tenantId, 'pro');
    assert.isTrue(upgradeRes.success, 'Upgrade to pro must succeed');
    const tenantAfterUpgrade = useSaaSAdminStore.getState().tenants.find((t) => t.id === tenantId);
    assert.strictEqual(tenantAfterUpgrade?.subscriptionPlan, 'pro');
    assert.isTrue(tenantAfterUpgrade!.monthlyFee >= 399000, 'Monthly fee must reflect Pro plan base price');

    // Downgrade tenant_ongchu (3 branches, 6 devices) to Standard (limit 1 branch, 3 devices) -> must trigger quota warning
    const ongchuUpgrade = await store.changeTenantPlan('tenant_ongchu', 'standard');
    assert.isTrue(ongchuUpgrade.success, 'Plan switch executes');
    assert.isTrue(ongchuUpgrade.warning !== undefined, 'Must return quota warning on downgrade when exceeding limits');
    assert.isTrue(Boolean(ongchuUpgrade.warning?.includes('vượt trần')), 'Warning text must mention exceeded limits');

    // Phục hồi trạng thái chuẩn sau test
    await store.changeTenantPlan('tenant_ongchu', 'pro');
    await store.changeTenantPlan(tenantId, 'standard');
  });

  // Test 17: Super Admin Permanent Tenant Deletion (deleteTenant)
  await runner.test('SaaS Delete: deleteTenant permanently removes tenant and all associated records', async () => {
    const store = useSaaSAdminStore.getState();
    const sub = 'deltest' + Date.now();

    // 1. Create a dummy tenant
    const createRes = await store.createTenant({
      name: 'Quán Sẽ Bị Xóa',
      subdomain: sub,
      phone: '0911 222 333',
      ownerName: 'Người Tạm',
      subscriptionPlan: 'trial',
      durationMonths: 1,
    });
    assert.isTrue(createRes.success, 'Created dummy tenant for deletion');
    const dummy = useSaaSAdminStore.getState().tenants.find((t) => t.subdomain === sub);
    assert.isTrue(dummy !== undefined, 'Dummy tenant exists');
    const dummyId = dummy!.id;

    // 2. Add branch
    await store.createTenantBranch(dummyId, { name: 'CN Tạm' });
    const branchesBefore = useSaaSAdminStore.getState().branchesByTenant[dummyId] || [];
    assert.isTrue(branchesBefore.length > 0, 'Branch created for dummy tenant');

    // 3. Delete tenant
    const deleteRes = await store.deleteTenant(dummyId);
    assert.isTrue(deleteRes.success, 'Delete tenant should succeed');

    // 4. Verify tenant is removed from list
    const deletedTenant = useSaaSAdminStore.getState().tenants.find((t) => t.id === dummyId);
    assert.isTrue(deletedTenant === undefined, 'Tenant must no longer exist in tenants array');

    // 5. Verify records cleaned up
    assert.isTrue(useSaaSAdminStore.getState().branchesByTenant[dummyId] === undefined, 'Branches for tenant must be purged');
    assert.isTrue(useSaaSAdminStore.getState().devicesByTenant[dummyId] === undefined, 'Devices for tenant must be purged');
    assert.isTrue(useSaaSAdminStore.getState().addonsByTenant[dummyId] === undefined, 'Addons for tenant must be purged');
    assert.isTrue(useSaaSAdminStore.getState().invoicesByTenant[dummyId] === undefined, 'Invoices for tenant must be purged');

    // 6. Non-existent tenant deletion handling
    const nonExistentRes = await store.deleteTenant('non_existent_tenant_xyz');
    assert.isFalse(nonExistentRes.success, 'Deleting non-existent tenant must return failure');
  });
}

