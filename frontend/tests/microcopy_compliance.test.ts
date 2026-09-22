import { runner, assert } from './harness';
import * as fs from 'fs';
import * as path from 'path';

export async function runMicrocopyComplianceTests() {
  runner.setContext('Microcopy Compliance', 'Audit 100% CTA <= 3 words, No "Vui lòng", Header <= 3 words');

  await runner.test('1. Critical POS CTA Buttons strictly maintain <= 3 words', async () => {
    const filesToCheck = [
      'lib/components/pos/table-ops/TableOpsVoidView.tsx',
      'lib/components/pos/TableOperationsModal.tsx',
      'lib/components/pos/table-ops/TableOpsGuestNoteView.tsx',
      'lib/components/pos/VoidItemModal.tsx',
      'lib/components/pos/DiscountModal.tsx',
      'lib/components/pos/QRScannerModal.tsx',
      'lib/components/ui/RoleSwitcher.tsx',
    ];

    const frontendDir = path.resolve(__dirname, '..');
    for (const rel of filesToCheck) {
      const fullPath = path.join(frontendDir, rel);
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.matchAll(/\btitle=["']([^"']+)["']/g);
      for (const m of matches) {
        const title = m[1].trim();
        // Ignore placeholders or prop values
        if (title.startsWith('{') || title.includes('·') || title.includes('$')) continue;
        const words = title.split(/\s+/).length;
        assert.isTrue(
          words <= 3,
          `Button in ${rel} has ${words} words: "${title}" (must be <= 3 words)`
        );
      }
    }
  });

  await runner.test('2. Toast messages in frontend/app eliminate administrative "Vui lòng"', async () => {
    const appDir = path.resolve(__dirname, '../app');
    const files = fs.readdirSync(appDir, { recursive: true }) as string[];

    for (const f of files) {
      if (typeof f !== 'string' || (!f.endsWith('.tsx') && !f.endsWith('.ts'))) continue;
      const fullPath = path.join(appDir, f);
      if (!fs.statSync(fullPath).isFile()) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const toastMatches = content.matchAll(/showToast\(\{([^}]+)\}\)/g);
      for (const m of toastMatches) {
        const block = m[1];
        const msgMatch = block.match(/message:\s*[`"']([^"`']+)[`"']/);
        if (msgMatch) {
          const msg = msgMatch[1];
          assert.isFalse(
            msg.toLowerCase().includes('vui lòng'),
            `Toast in ${f} contains "Vui lòng": "${msg}"`
          );
        }
      }
    }
  });

  await runner.test('3. Screen headers and navigation titles maintain <= 3 words', async () => {
    const headerTitles = [
      'Sơ Đồ Bàn',
      'Bếp & Bar',
      'Sổ Đơn',
      'Thực Đơn',
      'Kho Hàng',
      'Sổ Quỹ',
      'Giao Ca',
      'Báo Cáo P&L',
      'Nhân Sự',
      'Cài Đặt',
      'Thanh Toán',
      'Quản Lý Bàn',
    ];

    for (const t of headerTitles) {
      const words = t.split(/\s+/).length;
      assert.isTrue(words <= 3, `Title "${t}" has ${words} words (must be <= 3)`);
    }
  });

  await runner.test('4. Global codebase audit: 100% zero "Vui lòng" across app and lib', async () => {
    const frontendDir = path.resolve(__dirname, '..');
    const dirsToCheck = [path.join(frontendDir, 'app'), path.join(frontendDir, 'lib')];

    for (const dir of dirsToCheck) {
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const f of files) {
        if (typeof f !== 'string' || (!f.endsWith('.tsx') && !f.endsWith('.ts'))) continue;
        const fullPath = path.join(dir, f);
        if (!fs.statSync(fullPath).isFile()) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        assert.isFalse(
          content.toLowerCase().includes('vui lòng'),
          `File ${f} contains forbidden administrative "Vui lòng"`
        );
      }
    }
  });

  await runner.test('5. Global codebase audit: zero verbose confirmation "Bạn có chắc" across app and lib', async () => {
    const frontendDir = path.resolve(__dirname, '..');
    const dirsToCheck = [path.join(frontendDir, 'app'), path.join(frontendDir, 'lib')];

    for (const dir of dirsToCheck) {
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const f of files) {
        if (typeof f !== 'string' || (!f.endsWith('.tsx') && !f.endsWith('.ts'))) continue;
        const fullPath = path.join(dir, f);
        if (!fs.statSync(fullPath).isFile()) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        assert.isFalse(
          content.toLowerCase().includes('bạn có chắc'),
          `File ${f} contains verbose confirmation "Bạn có chắc"`
        );
      }
    }
  });
}
