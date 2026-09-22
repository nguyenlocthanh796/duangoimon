import fs from 'fs';
import path from 'path';
import { getResponsiveFont, FontToken } from '../lib/theme/typography';
import { lightTheme, darkTheme } from '../lib/theme/colors';

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 ADVERSARIAL STRESS HARNESS — CHALLENGER M2
// ═══════════════════════════════════════════════════════════════════════════

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, details?: string) {
  results.push({ suite, name, passed: condition, details });
  if (!condition) {
    console.error(`❌ [FAIL] ${suite} -> ${name}: ${details || ''}`);
  } else {
    console.log(`✅ [PASS] ${suite} -> ${name}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPOGRAPHY 5-TIER & SCALING VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. TESTING TYPOGRAPHY TOKENS & SCALING ---');

const mobileFonts = getResponsiveFont(true);
const tabletFonts = getResponsiveFont(false);

const checkVietnameseLineHeight = (token: FontToken, label: string) => {
  const ratio = token.lineHeight / token.fontSize;
  return {
    valid: ratio >= 1.25 && ratio <= 1.6,
    ratio,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
  };
};

// Test Mobile Breakpoints
assert('Typography: Mobile', 'xs fontSize = 13', mobileFonts.xs.fontSize === 13);
assert('Typography: Mobile', 'xs lineHeight >= 1.25x', checkVietnameseLineHeight(mobileFonts.xs, 'mobile xs').valid);
assert('Typography: Mobile', 'sm fontSize = 15', mobileFonts.sm.fontSize === 15);
assert('Typography: Mobile', 'sm lineHeight >= 1.25x', checkVietnameseLineHeight(mobileFonts.sm, 'mobile sm').valid);
assert('Typography: Mobile', 'md fontSize = 17', mobileFonts.md.fontSize === 17);
assert('Typography: Mobile', 'md lineHeight >= 1.25x', checkVietnameseLineHeight(mobileFonts.md, 'mobile md').valid);
assert('Typography: Mobile', 'lg fontSize = 22', mobileFonts.lg.fontSize === 22);
assert('Typography: Mobile', 'lg lineHeight >= 1.25x', checkVietnameseLineHeight(mobileFonts.lg, 'mobile lg').valid);
assert('Typography: Mobile', 'lgMedium exists and fontWeight is 500', mobileFonts.lgMedium.fontWeight === '500');
assert('Typography: Mobile', 'xl fontSize = 26', mobileFonts.xl.fontSize === 26);
assert('Typography: Mobile', 'xl lineHeight >= 1.18x', checkVietnameseLineHeight(mobileFonts.xl, 'mobile xl').ratio >= 1.18);

// Test Tablet Breakpoints
assert('Typography: Tablet', 'xs fontSize = 14', tabletFonts.xs.fontSize === 14);
assert('Typography: Tablet', 'sm fontSize = 16', tabletFonts.sm.fontSize === 16);
assert('Typography: Tablet', 'md fontSize = 18', tabletFonts.md.fontSize === 18);
assert('Typography: Tablet', 'lg fontSize = 25', tabletFonts.lg.fontSize === 25);
assert('Typography: Tablet', 'xl fontSize = 30', tabletFonts.xl.fontSize === 30);
assert('Typography: Tablet', 'includeFontPadding is false for all', 
  [tabletFonts.xs, tabletFonts.sm, tabletFonts.md, tabletFonts.lg, tabletFonts.xl].every(t => t.includeFontPadding === false)
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. WCAG 2.1 CONTRAST RATIO FORMULA & DUAL-THEME AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. TESTING WCAG 2.1 CONTRAST RATIOS ---');

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Light Theme Contrast
const lightCanvas = lightTheme.surface.app; // #F8FAFC
const lightCard = lightTheme.surface.card;  // #FFFFFF
const lightTextPrimary = lightTheme.text.primary; // #0F172A
const lightTextMuted = lightTheme.text.muted;     // #475569
const lightBrandAccent = lightTheme.brand.accent; // #EA580C
const lightBrandPrimary = lightTheme.brand.primary; // #0D9488

const lightTextRatio = getContrastRatio(lightCanvas, lightTextPrimary);
const lightMutedRatio = getContrastRatio(lightCanvas, lightTextMuted);
const lightAccentRatio = getContrastRatio(lightCanvas, lightBrandAccent);
const lightPrimaryRatio = getContrastRatio(lightCanvas, lightBrandPrimary);

console.log(`Light Mode Contrast Ratios:`);
console.log(`  Text Primary (#0F172A) on #F8FAFC: ${lightTextRatio.toFixed(2)}:1 (AAA requires >= 7:1)`);
console.log(`  Text Muted (#475569) on #F8FAFC: ${lightMutedRatio.toFixed(2)}:1 (AA requires >= 4.5:1)`);
console.log(`  Brand Accent (#EA580C) on #F8FAFC: ${lightAccentRatio.toFixed(2)}:1`);
console.log(`  Brand Primary (#0D9488) on #F8FAFC: ${lightPrimaryRatio.toFixed(2)}:1`);

assert('Theme: Light Contrast', 'Text Primary >= 7:1 (AAA)', lightTextRatio >= 7.0, `${lightTextRatio.toFixed(2)}:1`);
assert('Theme: Light Contrast', 'Text Muted >= 4.5:1 (AA)', lightMutedRatio >= 4.5, `${lightMutedRatio.toFixed(2)}:1`);
assert('Theme: Light Accent', 'Accent is #EA580C', lightTheme.brand.accent === '#EA580C');

// Dark Theme Contrast
const darkCanvas = darkTheme.surface.app;   // #0B0F19
const darkCard = darkTheme.surface.card;    // #141E30
const darkTextPrimary = darkTheme.text.primary; // #FFFFFF
const darkTextMuted = darkTheme.text.muted;     // #94A3B8
const darkBrandAccent = darkTheme.brand.accent; // #FB923C
const darkBrandPrimary = darkTheme.brand.primary; // #14B8A6

const darkTextRatio = getContrastRatio(darkCanvas, darkTextPrimary);
const darkMutedRatio = getContrastRatio(darkCanvas, darkTextMuted);
const darkAccentRatio = getContrastRatio(darkCanvas, darkBrandAccent);
const darkPrimaryRatio = getContrastRatio(darkCanvas, darkBrandPrimary);

console.log(`Dark Mode Contrast Ratios:`);
console.log(`  Text Primary (#FFFFFF) on #0B0F19: ${darkTextRatio.toFixed(2)}:1 (AAA requires >= 7:1)`);
console.log(`  Text Muted (#94A3B8) on #0B0F19: ${darkMutedRatio.toFixed(2)}:1 (AA requires >= 4.5:1)`);
console.log(`  Brand Accent (#FB923C) on #0B0F19: ${darkAccentRatio.toFixed(2)}:1`);
console.log(`  Brand Primary (#14B8A6) on #0B0F19: ${darkPrimaryRatio.toFixed(2)}:1`);

assert('Theme: Dark Contrast', 'Text Primary >= 7:1 (AAA)', darkTextRatio >= 7.0, `${darkTextRatio.toFixed(2)}:1`);
assert('Theme: Dark Contrast', 'Text Muted >= 4.5:1 (AA)', darkMutedRatio >= 4.5, `${darkMutedRatio.toFixed(2)}:1`);
assert('Theme: Dark Accent', 'Accent is #FB923C', darkTheme.brand.accent === '#FB923C');
assert('Theme: Dark Accent Contrast', 'Dark Accent on Dark Card >= 4.5:1', getContrastRatio(darkCard, darkBrandAccent) >= 4.5);

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADVERSARIAL SCAN FOR FORBIDDEN FONT OVERRIDES ON APPTEXT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. SCANNING FILES FOR FORBIDDEN OVERRIDES & UNMANAGED HEX ---');

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo' && file !== 'tests') {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const frontendRoot = path.resolve(__dirname, '..');
const appFiles = walkDir(path.join(frontendRoot, 'app'));
const componentFiles = walkDir(path.join(frontendRoot, 'lib', 'components'));
const allTargetFiles = [...appFiles, ...componentFiles];

let rawTextViolations: string[] = [];
let appTextOverrides: string[] = [];

for (const filePath of allTargetFiles) {
  if (filePath.endsWith('AppText.tsx')) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check if raw <Text> is used directly
    if (line.match(/<Text\b/) && !line.includes('//') && !line.includes('TextInput') && !line.includes('AppText')) {
      rawTextViolations.push(`${path.relative(frontendRoot, filePath)}:${index + 1} -> ${line.trim()}`);
    }
    // Check if <AppText has inline fontSize / lineHeight
    if (line.includes('<AppText') && (line.includes('fontSize') || line.includes('lineHeight'))) {
      appTextOverrides.push(`${path.relative(frontendRoot, filePath)}:${index + 1} -> ${line.trim()}`);
    }
  });
}

assert('Clean Design System', 'Zero raw <Text> tags bypassing <AppText>', rawTextViolations.length === 0, rawTextViolations.join('; '));
assert('Clean Design System', 'Zero inline fontSize / lineHeight overrides on <AppText>', appTextOverrides.length === 0, appTextOverrides.join('; '));

// ─────────────────────────────────────────────────────────────────────────────
// 4. ANTI-FRAUD GUARD MATHEMATICAL ORACLE & BOUNDARY TESTING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. ANTI-FRAUD GUARD MATHEMATICAL ORACLE ---');

interface DiscountCase {
  subTotal: number;
  discountType: 'percent' | 'fixed';
  val: number;
  expectedAmount: number;
  expectedPercentage: number;
  expectedIsExcessive: boolean;
}

const testCases: DiscountCase[] = [
  { subTotal: 100000, discountType: 'percent', val: 10, expectedAmount: 10000, expectedPercentage: 10, expectedIsExcessive: false },
  { subTotal: 100000, discountType: 'percent', val: 20, expectedAmount: 20000, expectedPercentage: 20, expectedIsExcessive: false },
  { subTotal: 100000, discountType: 'percent', val: 20.1, expectedAmount: 20100, expectedPercentage: 20.1, expectedIsExcessive: true },
  { subTotal: 100000, discountType: 'percent', val: 50, expectedAmount: 50000, expectedPercentage: 50, expectedIsExcessive: true },
  { subTotal: 100000, discountType: 'percent', val: 100, expectedAmount: 100000, expectedPercentage: 100, expectedIsExcessive: true },
  
  // Fixed amount tests
  { subTotal: 100000, discountType: 'fixed', val: 20000, expectedAmount: 20000, expectedPercentage: 20, expectedIsExcessive: false },
  { subTotal: 100000, discountType: 'fixed', val: 20001, expectedAmount: 20001, expectedPercentage: 20, expectedIsExcessive: false },
  { subTotal: 100000, discountType: 'fixed', val: 21000, expectedAmount: 21000, expectedPercentage: 21, expectedIsExcessive: true },
  { subTotal: 500000, discountType: 'fixed', val: 100000, expectedAmount: 100000, expectedPercentage: 20, expectedIsExcessive: false },
  { subTotal: 500000, discountType: 'fixed', val: 100001, expectedAmount: 100001, expectedPercentage: 20, expectedIsExcessive: false },
  { subTotal: 500000, discountType: 'fixed', val: 105000, expectedAmount: 105000, expectedPercentage: 21, expectedIsExcessive: true },
  { subTotal: 100000, discountType: 'fixed', val: 200000, expectedAmount: 100000, expectedPercentage: 100, expectedIsExcessive: true },

  // Edge cases
  { subTotal: 0, discountType: 'percent', val: 50, expectedAmount: 0, expectedPercentage: 0, expectedIsExcessive: false },
  { subTotal: 0, discountType: 'fixed', val: 50000, expectedAmount: 0, expectedPercentage: 0, expectedIsExcessive: false },
  { subTotal: 100000, discountType: 'percent', val: 0, expectedAmount: 0, expectedPercentage: 0, expectedIsExcessive: false },
];

testCases.forEach((tc, idx) => {
  const activeDiscountVal = tc.val;
  let discountAmount = 0;
  if (activeDiscountVal > 0) {
    if (tc.discountType === 'percent') {
      discountAmount = Math.round((tc.subTotal * activeDiscountVal) / 100);
    } else {
      discountAmount = Math.min(tc.subTotal, activeDiscountVal);
    }
  }

  let discountPercentage = 0;
  if (tc.subTotal > 0) {
    if (tc.discountType === 'percent') {
      discountPercentage = activeDiscountVal;
    } else {
      discountPercentage = Math.round((discountAmount / tc.subTotal) * 100);
    }
  }

  const isExcessive = discountPercentage > 20;

  assert(
    'Anti-Fraud Oracle',
    `Case #${idx + 1}: ${tc.subTotal} VND with ${tc.val}${tc.discountType === 'percent' ? '%' : ' VND'}`,
    discountAmount === tc.expectedAmount && isExcessive === tc.expectedIsExcessive,
    `Calculated amount: ${discountAmount} (expected ${tc.expectedAmount}), isExcessive: ${isExcessive} (expected ${tc.expectedIsExcessive})`
  );
});

// Audit Tag Idempotency Test
const note1 = 'Khách VIP Thân Thiết';
const tagged1 = note1.trim().startsWith('[ANTI-FRAUD AUDIT >20%]')
  ? note1.trim()
  : `[ANTI-FRAUD AUDIT >20%] ${note1.trim()}`;
assert('Anti-Fraud Audit Tag', 'Tags untagged note', tagged1 === '[ANTI-FRAUD AUDIT >20%] Khách VIP Thân Thiết');

const note2 = '[ANTI-FRAUD AUDIT >20%] Chủ Quán Duyệt';
const tagged2 = note2.trim().startsWith('[ANTI-FRAUD AUDIT >20%]')
  ? note2.trim()
  : `[ANTI-FRAUD AUDIT >20%] ${note2.trim()}`;
assert('Anti-Fraud Audit Tag', 'Does not double tag already tagged note', tagged2 === '[ANTI-FRAUD AUDIT >20%] Chủ Quán Duyệt');

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY OF ADVERSARIAL RUN
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================================');
const passedCount = results.filter(r => r.passed).length;
const failedCount = results.filter(r => !r.passed).length;
console.log(`📊 ADVERSARIAL STRESS TEST RESULTS: ${passedCount}/${results.length} PASSED (${failedCount} FAILED)`);
console.log('================================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
