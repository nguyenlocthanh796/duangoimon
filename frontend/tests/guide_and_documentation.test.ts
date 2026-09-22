import { runner, assert } from './harness';
import * as fs from 'fs';
import * as path from 'path';
import { checkRoutePermission } from '../lib/store/useAuthStore';
import { RAW_NAV_GROUPS } from '../lib/components/ui/sidebarConfig';

export async function runGuideAndDocumentationTests() {
  runner.setContext('Guide & Documentation', 'Verify in-app /huong-dan route, RBAC permissions, and operational manual');

  await runner.test('1. Staff & Owner roles have permission to access /huong-dan', () => {
    assert.isTrue(checkRoutePermission('owner', '/huong-dan'), 'Owner can access /huong-dan');
    assert.isTrue(checkRoutePermission('manager', '/huong-dan'), 'Manager can access /huong-dan');
    assert.isTrue(checkRoutePermission('cashier', '/huong-dan'), 'Cashier can access /huong-dan');
    assert.isTrue(checkRoutePermission('server', '/huong-dan'), 'Server can access /huong-dan');
    assert.isFalse(checkRoutePermission('super_admin', '/huong-dan'), 'Super Admin is SaaS-only');
  });

  await runner.test('2. Navigation configs include /huong-dan route with proper metadata', () => {
    const systemGroup = RAW_NAV_GROUPS.find((g) => g.groupTitle === 'HỆ THỐNG & THIẾT BỊ');
    assert.isTrue(Boolean(systemGroup), 'HỆ THỐNG & THIẾT BỊ group must exist');
    const guideItem = systemGroup?.items.find((i) => i.id === 'huong_dan');
    assert.isTrue(Boolean(guideItem), 'huong_dan item must exist in sidebar');
    assert.strictEqual(guideItem?.route, '/huong-dan');
    assert.strictEqual(guideItem?.icon, 'help-circle-outline');
  });

  await runner.test('3. Operational manual HUONG_DAN_SU_DUNG.md and updated README.md exist with complete sections', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const manualPath = path.join(projectRoot, 'HUONG_DAN_SU_DUNG.md');
    const readmePath = path.join(projectRoot, 'README.md');

    assert.isTrue(fs.existsSync(manualPath), 'HUONG_DAN_SU_DUNG.md must exist in root');
    assert.isTrue(fs.existsSync(readmePath), 'README.md must exist in root');

    const manualContent = fs.readFileSync(manualPath, 'utf8');
    assert.isTrue(manualContent.includes('CẨM NANG HƯỚNG DẪN SỬ DỤNG'), 'Manual header present');
    assert.isTrue(manualContent.includes('9100'), 'Printer LAN 9100 documented');
    assert.isTrue(manualContent.includes('VietQR'), 'VietQR documented');
    assert.isTrue(manualContent.includes('Nghị định 123'), 'Decree 123 MTT documented');
    assert.isTrue(manualContent.includes('Telegram'), 'Fraud Telegram alert documented');

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    assert.isTrue(readmeContent.includes('/huong-dan'), 'README references in-app guide');
    assert.isTrue(readmeContent.includes('HUONG_DAN_SU_DUNG.md'), 'README references manual');
  });

  await runner.test('4. In-App guide component app/huong-dan/index.tsx has clean typography and zero raw <Text>', () => {
    const guideCompPath = path.resolve(__dirname, '../app/huong-dan/index.tsx');
    assert.isTrue(fs.existsSync(guideCompPath), 'huong-dan/index.tsx must exist');

    const content = fs.readFileSync(guideCompPath, 'utf8');
    // Ensure no raw <Text
    const rawTextRegex = /<Text[\s>]/g;
    assert.isFalse(rawTextRegex.test(content), 'Must not use raw <Text> tags');
    // Ensure AppText is used
    assert.isTrue(content.includes('<AppText'), 'Must use <AppText>');
    // Ensure AppHeader is used
    assert.isTrue(content.includes('<AppHeader'), 'Must use standard <AppHeader>');
  });
}
