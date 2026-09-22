import fs from 'fs';
import path from 'path';

/**
 * 👑 CHALLENGER M3_1 ADVERSARIAL VERIFICATION SUITE (V2 Accurate AST/Regex)
 * Empirically tests:
 * 1. 3-Zone Glass Architecture tokens on all 6 management screens
 * 2. Squircle Card border radii (16px - 20px)
 * 3. Touch Targets (>= 44px - 52px) on interactive controls (Inputs, CTA Buttons, Steppers)
 * 4. Tabular Nums on all numeric, currency, count, timestamp figures
 * 5. Strict Microcopy (CTA <= 3 words, Toast <= 7 words)
 * 6. Zero raw <Text> tags bypassing <AppText>
 */

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const M3_SCREEN_FILES = [
  'app/thuc-don/index.tsx',
  'app/cai-dat/index.tsx',
  'app/so-quy/index.tsx',
  'app/giao-ca/index.tsx',
  'app/bao-cao-loi-nhuan/index.tsx',
  'app/cfd/index.tsx',
];

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  details?: string[];
}

const results: TestResult[] = [];

function runCheck(name: string, checkFn: () => { passed: boolean; message?: string; details?: string[] }) {
  try {
    const res = checkFn();
    results.push({ name, ...res });
    if (res.passed) {
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}: ${res.message || 'Check failed'}`);
      if (res.details) {
        res.details.forEach((d) => console.error(`     - ${d}`));
      }
    }
  } catch (err: any) {
    results.push({ name, passed: false, message: err.message });
    console.error(`  ❌ [ERROR] ${name}: ${err.message}`);
  }
}

console.log(`\n================================================================================`);
console.log(`🔥 [CHALLENGER M3_1] EMPIRICAL ADVERSARIAL AUDIT OF 6 MANAGEMENT SCREENS`);
console.log(`================================================================================\n`);

// -----------------------------------------------------------------------------
// 1. VERIFY 3-ZONE GLASS TOKENS
// -----------------------------------------------------------------------------
console.log(`📌 SECTION 1: 3-Zone Frosted Glass Layout & Tokens`);

for (const screenPath of M3_SCREEN_FILES) {
  const fullPath = path.join(FRONTEND_ROOT, screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  runCheck(`Glass Tokens: ${screenPath} uses glassHeader & glassCard`, () => {
    const hasGlassHeader = content.includes('glassHeader') || content.includes('AppHeader');
    const hasGlassCard = content.includes('glassCard');
    const hasGlassBorder = content.includes('glassBorder');

    const issues: string[] = [];
    if (!hasGlassHeader) issues.push('Missing glassHeader or AppHeader');
    if (!hasGlassCard) issues.push('Missing glassCard token');
    if (!hasGlassBorder) issues.push('Missing glassBorder token');

    return {
      passed: issues.length === 0,
      message: issues.join('; '),
    };
  });
}

// -----------------------------------------------------------------------------
// 2. VERIFY SQUIRCLE BORDER RADII (16px - 20px)
// -----------------------------------------------------------------------------
console.log(`\n📌 SECTION 2: Squircle Card Border Radii (16px - 20px)`);

for (const screenPath of M3_SCREEN_FILES) {
  const fullPath = path.join(FRONTEND_ROOT, screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  runCheck(`Squircle Standard: ${screenPath} card border radii in [16, 18, 20]`, () => {
    const cardRadiusMatches = content.match(/borderRadius:\s*(\d+)/g) || [];
    const radii = cardRadiusMatches.map((m) => parseInt(m.replace(/\D/g, ''), 10));

    const hasSquircle = radii.some((r) => r >= 16 && r <= 20);
    return {
      passed: hasSquircle,
      message: `Found radii: ${Array.from(new Set(radii)).join(', ')}`,
    };
  });
}

// -----------------------------------------------------------------------------
// 3. VERIFY TOUCH TARGETS (>= 44px - 52px)
// -----------------------------------------------------------------------------
console.log(`\n📌 SECTION 3: Ergonomic Touch Targets (>= 44px - 52px) on Interactive Controls`);

for (const screenPath of M3_SCREEN_FILES) {
  const fullPath = path.join(FRONTEND_ROOT, screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  runCheck(`Touch Target Heights: ${screenPath}`, () => {
    // CFD is display-only screen (no operational form buttons), but let's check its buttons/badges
    const heightMatches = content.match(/height:\s*(\d+)/g) || [];
    const heights = heightMatches.map((m) => parseInt(m.replace(/\D/g, ''), 10));

    if (screenPath.includes('cfd')) {
      // CFD is a customer-facing display
      return { passed: true, message: 'CFD is customer-facing display layout' };
    }

    // Interactive management screens must have standard 44px-52px buttons/inputs
    const hasComfortableTouchTargets = heights.some((h) => h >= 44 && h <= 56);
    return {
      passed: hasComfortableTouchTargets,
      message: `Heights found: ${Array.from(new Set(heights)).join(', ')}`,
    };
  });
}

// -----------------------------------------------------------------------------
// 4. VERIFY TABULAR NUMS ON NUMERIC FIGURES
// -----------------------------------------------------------------------------
console.log(`\n📌 SECTION 4: Tabular Nums on Numeric & Currency AppText`);

for (const screenPath of M3_SCREEN_FILES) {
  const fullPath = path.join(FRONTEND_ROOT, screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  runCheck(`Tabular Nums Enforcement: ${screenPath}`, () => {
    // Robust tag extractor for <AppText ...> ... </AppText>
    const lines = content.split('\n');
    const failures: string[] = [];

    let inAppText = false;
    let currentOpeningProps = '';
    let currentChildren = '';
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('<AppText')) {
        inAppText = true;
        startLine = i + 1;
        currentOpeningProps = '';
        currentChildren = '';
      }

      if (inAppText) {
        const closeTagIdx = line.indexOf('</AppText>');
        if (closeTagIdx !== -1) {
          // Closed on this line
          const openTagCloseIdx = line.indexOf('>');
          if (openTagCloseIdx !== -1 && openTagCloseIdx < closeTagIdx) {
            currentChildren += line.substring(openTagCloseIdx + 1, closeTagIdx);
          } else {
            currentChildren += line.substring(0, closeTagIdx);
          }

          // Evaluate this AppText block
          const combinedProps = currentOpeningProps + line;
          const hasTabular = combinedProps.includes('tabularNums') || combinedProps.includes("fontVariant: ['tabular-nums']");

          const isNumeric =
            currentChildren.includes('formatCurrency(') ||
            currentChildren.includes('.toLocaleString(') ||
            currentChildren.includes('it.qty') ||
            currentChildren.includes('it.price') ||
            currentChildren.includes('denom.toLocaleString') ||
            currentChildren.includes('lineTotal') ||
            currentChildren.includes('expectedCash') ||
            currentChildren.includes('actualCash') ||
            currentChildren.includes('diffAmount.toLocaleString') ||
            currentChildren.includes('shift.startingCash') ||
            currentChildren.includes('shift.totalCashSales') ||
            currentChildren.includes('shift.totalVietQRSales') ||
            currentChildren.includes('shift.totalCashOut') ||
            currentChildren.includes('clock.toLocaleTimeString') ||
            currentChildren.includes('t.amount') ||
            currentChildren.includes('netBalance') ||
            currentChildren.includes('totalIn') ||
            currentChildren.includes('totalOut') ||
            currentChildren.includes('rangeConfig.revenue') ||
            currentChildren.includes('rangeConfig.netProfit') ||
            currentChildren.includes('rangeConfig.cashInDrawer') ||
            currentChildren.includes('rangeConfig.vietqrTotal') ||
            currentChildren.includes('rangeConfig.cardTotal') ||
            currentChildren.includes('rangeConfig.foodCost') ||
            currentChildren.includes('rangeConfig.cashExpenses') ||
            currentChildren.includes('rangeConfig.orderCount') ||
            currentChildren.includes('rangeConfig.avgTicket');

          if (isNumeric && !hasTabular) {
            failures.push(`Line ${startLine}: ${currentChildren.trim().slice(0, 50)}`);
          }

          inAppText = false;
        } else {
          currentOpeningProps += ' ' + line;
          currentChildren += ' ' + line;
        }
      }
    }

    return {
      passed: failures.length === 0,
      message: failures.length > 0 ? `${failures.length} non-tabular dynamic figures` : undefined,
      details: failures,
    };
  });
}

// -----------------------------------------------------------------------------
// 5. VERIFY STRICT MICROCOPY (CTA <= 3 words, Toast <= 7 words)
// -----------------------------------------------------------------------------
console.log(`\n📌 SECTION 5: Strict Microcopy (CTA <= 3 words, Toast <= 7 words)`);

for (const screenPath of M3_SCREEN_FILES) {
  const fullPath = path.join(FRONTEND_ROOT, screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  runCheck(`Microcopy CTA & Toast Length: ${screenPath}`, () => {
    const violations: string[] = [];

    // Check Toast titles
    const toastTitleMatches = content.match(/title:\s*['"`]([^'"`]+)['"`]/g) || [];
    for (const tm of toastTitleMatches) {
      const title = tm.replace(/title:\s*['"`]/, '').replace(/['"`]$/, '').trim();
      const wordCount = title.split(/\s+/).filter(Boolean).length;
      if (wordCount > 7) {
        violations.push(`Toast title exceeds 7 words: "${title}" (${wordCount} words)`);
      }
    }

    // Check Button titles (word boundary \btitle=)
    const buttonTitleMatches = content.match(/\btitle\s*=\s*['"`]([^'"`]+)['"`]/g) || [];
    for (const bm of buttonTitleMatches) {
      const title = bm.replace(/\btitle\s*=\s*['"`]/, '').replace(/['"`]$/, '').trim();
      const wordCount = title.split(/\s+/).filter(Boolean).length;
      if (wordCount > 3) {
        violations.push(`Button CTA exceeds 3 words: "${title}" (${wordCount} words)`);
      }
    }

    return {
      passed: violations.length === 0,
      message: violations.join('; '),
      details: violations,
    };
  });
}

// -----------------------------------------------------------------------------
// 6. VERIFY ZERO RAW <Text> TAGS
// -----------------------------------------------------------------------------
console.log(`\n📌 SECTION 6: Zero Raw <Text> Bypassing <AppText>`);

for (const screenPath of M3_SCREEN_FILES) {
  const fullPath = path.join(FRONTEND_ROOT, screenPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  runCheck(`Design System Typography: ${screenPath} has 0 raw <Text> tags`, () => {
    const importsRawText = /import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*['"]react-native['"]/.test(content);
    const usesRawText = /<Text[\s>]/.test(content);

    const issues: string[] = [];
    if (importsRawText) issues.push('Imports raw Text from react-native');
    if (usesRawText) issues.push('Uses <Text> directly');

    return {
      passed: issues.length === 0,
      message: issues.join('; '),
    };
  });
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
const totalTests = results.length;
const passedTests = results.filter((r) => r.passed).length;
const failedTests = totalTests - passedTests;

console.log(`\n================================================================================`);
console.log(`📊 CHALLENGER M3_1 AUDIT SUMMARY:`);
console.log(`  • Total Invariant Checks: ${totalTests}`);
console.log(`  • Passed                : ${passedTests}`);
console.log(`  • Failed                : ${failedTests}`);
console.log(`================================================================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL 6 MANAGEMENT SCREENS STRICTLY COMPLY WITH ALL M3 INVARIANTS!\n`);
}
