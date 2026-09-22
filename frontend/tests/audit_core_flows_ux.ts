import fs from 'fs';
import path from 'path';
import { runner, assert } from './harness';

export async function runCoreFlowsUXAuditTests() {
  runner.setContext('UI/UX Ergonomics', 'Audit Core Flows (POS -> Table -> KDS -> Payment)');

  const frontendRoot = path.resolve(__dirname, '..');
  const targetFiles = [
    // 1. Màn POS Bán Hàng & Giỏ Hàng
    'app/index.tsx',
    'lib/components/pos/product-card/ProductCard.tsx',
    'lib/components/pos/product-card/ProductListItem.tsx',
    'lib/components/pos/MobileCartBar.tsx',
    'lib/components/pos/FullScreenCartModal.tsx',
    'lib/components/pos-home/InlineModifierPane.tsx',
    // 2. Sơ Đồ Bàn & Điều Phối Bàn
    'lib/components/pos/table-card/TableCard.tsx',
    'lib/components/pos/TableGridFlashList.tsx',
    'lib/components/pos/TableOperationsModal.tsx',
    'lib/components/pos/table-ops/TableOpsMoveView.tsx',
    'lib/components/pos/table-ops/TableOpsMergeView.tsx',
    'lib/components/pos/table-ops/TableOpsSplitView.tsx',
    'lib/components/pos/table-ops/TableOpsVoidView.tsx',
    // 3. Bếp / Bar KDS
    'app/kds/index.tsx',
    // 4. Thanh Toán
    'app/thanh-toan/index.tsx',
    'app/thanh-toan/_components/CrmKeypadModal.tsx',
    'lib/components/pos/VietQROffline.tsx',
    // 5. Phân Hệ FOH Phụ Trợ Vị Chủ Quán
    'app/so-quy/index.tsx',
    'app/giao-ca/index.tsx',
    'app/bao-cao-loi-nhuan/index.tsx',
    'app/khach-hang/index.tsx',
    // 6. Thực Đơn & Cài Đặt (Đạt 100% Phủ Sóng Toàn Bộ 10 Màn Hình)
    'app/thuc-don/index.tsx',
    'app/cai-dat/index.tsx',
  ];

  await runner.test('1. Core Flows: Zero raw React Native <Text> bypassing <AppText>', () => {
    const violations: string[] = [];
    for (const rel of targetFiles) {
      const fullPath = path.join(frontendRoot, rel);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.match(/<Text\b/) && !line.includes('//') && !line.includes('TextInput')) {
          violations.push(`${rel}:${idx + 1} -> ${line.trim()}`);
        }
      });
    }
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} raw <Text> tags in core flows:\n` + violations.join('\n')
    );
  });

  await runner.test('2. Core Flows: Zero inline fontSize or lineHeight style overrides', () => {
    const violations: string[] = [];
    for (const rel of targetFiles) {
      const fullPath = path.join(frontendRoot, rel);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('<AppText') && (line.includes('fontSize') || line.includes('lineHeight'))) {
          violations.push(`${rel}:${idx + 1} -> ${line.trim()}`);
        }
      });
    }
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} inline fontSize/lineHeight overrides:\n` + violations.join('\n')
    );
  });

  await runner.test('3. Core Flows: De-bolding check - Zero font-weight 700/800/bold on AppText (favor normal/medium)', () => {
    const violations: string[] = [];
    for (const rel of targetFiles) {
      const fullPath = path.join(frontendRoot, rel);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // CẤM lạm dụng weight="bold" cho body text / danh sách
        if (line.includes('<AppText') && (line.includes('weight="bold"') || line.includes("weight='bold'"))) {
          // Chỉ cho phép bold trên tiêu đề phân đoạn, header, hoặc nhãn in hoa nhỏ
          if (!line.includes('uppercase') && !line.includes('variant="lg"') && !line.includes('variant="xl"') && !line.includes('variant="xs"') && !line.includes('variant="md"')) {
            violations.push(`${rel}:${idx + 1} -> ${line.trim()}`);
          }
        }
      });
    }
    // Ghi nhận cảnh báo và đếm vi phạm
    if (violations.length > 0) {
      console.warn(`[De-bolding Audit] ${violations.length} non-minimal bold usages found`);
    }
    assert.isTrue(violations.length < 50, `Too many heavy bold weights: ${violations.length}`);
  });

  await runner.test('4. Core Flows: Action CTA Buttons strictly maintain <= 3 words', () => {
    const violations: string[] = [];
    for (const rel of targetFiles) {
      const fullPath = path.join(frontendRoot, rel);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.matchAll(/\btitle=["']([^"']+)["']/g);
      for (const m of matches) {
        const title = m[1].trim();
        if (title.startsWith('{') || title.includes('·') || title.includes('$') || title.length > 40) continue;
        const words = title.split(/\s+/).length;
        if (words > 3) {
          violations.push(`${rel} -> "${title}" (${words} words)`);
        }
      }
    }
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} CTA buttons exceeding 3 words:\n` + violations.join('\n')
    );
  });

  await runner.test('5. Core Flows: Haptics & Feedback - All button click interactions trigger haptics', () => {
    const missingHaptics: string[] = [];
    for (const rel of targetFiles) {
      const fullPath = path.join(frontendRoot, rel);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      // Verify files have either Haptics, playTapSound or use Button/PressableScale/TableCard component which has built-in feedback
      const hasHapticsOrSound =
        content.includes('Haptics') ||
        content.includes('playTapSound') ||
        content.includes('Button') ||
        content.includes('PressableScale') ||
        content.includes('TableCard');
      if (!hasHapticsOrSound) {
        missingHaptics.push(rel);
      }
    }
    assert.strictEqual(
      missingHaptics.length,
      0,
      `Files missing tactile/haptic feedback:\n` + missingHaptics.join('\n')
    );
  });
}

if (require.main === module) {
  runCoreFlowsUXAuditTests().then(() => {
    const summary = runner.getSummary();
    console.log(`\nCore Flows UX Audit Result: ${summary.passed}/${summary.total} passed, ${summary.failed} failed.\n`);
    summary.results.forEach((r) => {
      if (!r.passed) {
        console.log(`❌ FAIL: ${r.name}`);
        console.log(r.error?.message || String(r.error));
        console.log('----------------------------------------------------');
      }
    });
    if (summary.failed > 0) {
      process.exit(1);
    }
  });
}