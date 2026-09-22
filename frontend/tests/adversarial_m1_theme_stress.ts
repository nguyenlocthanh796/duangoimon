import './setup_env';
import * as fs from 'fs';
import * as path from 'path';
import {
  lightTheme,
  darkTheme,
  ThemeType,
  SurfaceColors,
  TextColors,
  BorderColors,
  BrandColors,
  StatusColors,
} from '../lib/theme/colors';
import {
  THEME_TOKENS,
  TYPOGRAPHY_TIERS,
  TEXT_INPUT_FONT_SIZES,
  QR_CANVAS_COLOR,
  ON_BRAND_TEXT_COLOR,
} from '../lib/theme/tokens';
import * as themeIndex from '../lib/theme/index';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

console.log('================================================================================');
console.log('🔥 EMPIRICAL CHALLENGER: MILESTONE 1 THEME & UI COMPONENT DEEP STRESS HARNESS');
console.log('================================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. DUAL-THEME STRUCTURAL PARITY & SYMMETRY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. AUDITING DUAL-THEME STRUCTURAL SYMMETRY (lightTheme vs darkTheme) ---');

function getAllLeafPaths(obj: Record<string, any>, prefix = ''): { path: string; type: string; val: any }[] {
  let paths: { path: string; type: string; val: any }[] = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      paths = paths.concat(getAllLeafPaths(val, fullPath));
    } else {
      paths.push({ path: fullPath, type: typeof val, val });
    }
  }
  return paths;
}

const lightPaths = getAllLeafPaths(lightTheme);
const darkPaths = getAllLeafPaths(darkTheme);

const lightPathMap = new Map(lightPaths.map((p) => [p.path, p]));
const darkPathMap = new Map(darkPaths.map((p) => [p.path, p]));

assert(
  lightPaths.length === darkPaths.length,
  `Exact leaf property count match: lightTheme (${lightPaths.length}) === darkTheme (${darkPaths.length})`
);

let missingInDark: string[] = [];
let typeMismatch: string[] = [];
for (const [p, lInfo] of lightPathMap.entries()) {
  const dInfo = darkPathMap.get(p);
  if (!dInfo) {
    missingInDark.push(p);
  } else if (dInfo.type !== lInfo.type) {
    typeMismatch.push(`${p} (light: ${lInfo.type} vs dark: ${dInfo.type})`);
  }
}

let missingInLight: string[] = [];
for (const p of darkPathMap.keys()) {
  if (!lightPathMap.has(p)) {
    missingInLight.push(p);
  }
}

assert(missingInDark.length === 0, `0 keys missing in darkTheme (Found: ${missingInDark.join(', ') || 'none'})`);
assert(missingInLight.length === 0, `0 keys missing in lightTheme (Found: ${missingInLight.join(', ') || 'none'})`);
assert(typeMismatch.length === 0, `0 type mismatches across themes (Found: ${typeMismatch.join(', ') || 'none'})`);

// Check top-level group keys
const requiredGroups = ['surface', 'text', 'border', 'brand', 'status'];
for (const grp of requiredGroups) {
  assert(grp in lightTheme, `lightTheme contains group '${grp}'`);
  assert(grp in darkTheme, `darkTheme contains group '${grp}'`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THEME.STATUS.* PALETTE CONSISTENCY & PROJECT CONTRACT AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. AUDITING theme.status.* PALETTE KEYS & CONTRACT VALUES ---');

const expectedStatusKeys = [
  'pendingBg', 'pendingText', 'pendingBorder',
  'cookingBg', 'cookingText', 'cookingBorder',
  'readyBg', 'readyText', 'readyBorder',
  'dangerBg', 'dangerText', 'dangerBorder',
  'warningBg', 'warningText', 'warningBorder',
];

const lightStatusKeys = Object.keys(lightTheme.status);
const darkStatusKeys = Object.keys(darkTheme.status);

assert(
  lightStatusKeys.length === 15,
  `lightTheme.status has exactly 15 keys (actual: ${lightStatusKeys.length})`
);
assert(
  darkStatusKeys.length === 15,
  `darkTheme.status has exactly 15 keys (actual: ${darkStatusKeys.length})`
);

const missingStatusInLight = expectedStatusKeys.filter((k) => !(k in lightTheme.status));
const missingStatusInDark = expectedStatusKeys.filter((k) => !(k in darkTheme.status));

assert(missingStatusInLight.length === 0, `lightTheme has all 15 status keys`);
assert(missingStatusInDark.length === 0, `darkTheme has all 15 status keys`);

// Check specific contract values from PROJECT.md
assert(lightTheme.status.pendingBg === '#FFFBEB', 'lightTheme.status.pendingBg === #FFFBEB');
assert(lightTheme.status.pendingText === '#D97706', 'lightTheme.status.pendingText === #D97706');
assert(lightTheme.status.pendingBorder === '#FDE68A', 'lightTheme.status.pendingBorder === #FDE68A');

assert(darkTheme.status.pendingBg === 'rgba(245, 158, 11, 0.15)', 'darkTheme.status.pendingBg === rgba(245, 158, 11, 0.15)');
assert(darkTheme.status.pendingText === '#F59E0B', 'darkTheme.status.pendingText === #F59E0B');
assert(darkTheme.status.pendingBorder === 'rgba(245, 158, 11, 0.30)', 'darkTheme.status.pendingBorder === rgba(245, 158, 11, 0.30)');

assert(lightTheme.status.cookingBg === '#EFF6FF', 'lightTheme.status.cookingBg === #EFF6FF');
assert(lightTheme.status.cookingText === '#2563EB', 'lightTheme.status.cookingText === #2563EB');
assert(lightTheme.status.cookingBorder === '#BFDBFE', 'lightTheme.status.cookingBorder === #BFDBFE');

assert(darkTheme.status.cookingBg === 'rgba(59, 130, 246, 0.15)', 'darkTheme.status.cookingBg === rgba(59, 130, 246, 0.15)');
assert(darkTheme.status.cookingText === '#3B82F6', 'darkTheme.status.cookingText === #3B82F6');
assert(darkTheme.status.cookingBorder === 'rgba(59, 130, 246, 0.30)', 'darkTheme.status.cookingBorder === rgba(59, 130, 246, 0.30)');

assert(lightTheme.status.readyBg === '#ECFDF5', 'lightTheme.status.readyBg === #ECFDF5');
assert(lightTheme.status.readyText === '#059669', 'lightTheme.status.readyText === #059669');
assert(lightTheme.status.readyBorder === '#A7F3D0', 'lightTheme.status.readyBorder === #A7F3D0');

assert(darkTheme.status.readyBg === 'rgba(16, 185, 129, 0.15)', 'darkTheme.status.readyBg === rgba(16, 185, 129, 0.15)');
assert(darkTheme.status.readyText === '#10B981', 'darkTheme.status.readyText === #10B981');
assert(darkTheme.status.readyBorder === 'rgba(16, 185, 129, 0.30)', 'darkTheme.status.readyBorder === rgba(16, 185, 129, 0.30)');

assert(lightTheme.status.dangerBg === '#FEF2F2', 'lightTheme.status.dangerBg === #FEF2F2');
assert(lightTheme.status.dangerText === '#DC2626', 'lightTheme.status.dangerText === #DC2626');
assert(lightTheme.status.dangerBorder === '#FECACA', 'lightTheme.status.dangerBorder === #FECACA');

assert(darkTheme.status.dangerBg === 'rgba(239, 68, 68, 0.15)', 'darkTheme.status.dangerBg === rgba(239, 68, 68, 0.15)');
assert(darkTheme.status.dangerText === '#EF4444', 'darkTheme.status.dangerText === #EF4444');
assert(darkTheme.status.dangerBorder === 'rgba(239, 68, 68, 0.30)', 'darkTheme.status.dangerBorder === rgba(239, 68, 68, 0.30)');

assert(lightTheme.status.warningBg === '#FFF7ED', 'lightTheme.status.warningBg === #FFF7ED');
assert(lightTheme.status.warningText === '#C2410C', 'lightTheme.status.warningText === #C2410C');
assert(lightTheme.status.warningBorder === '#FFEDD5', 'lightTheme.status.warningBorder === #FFEDD5');

assert(darkTheme.status.warningBg === 'rgba(234, 88, 12, 0.15)', 'darkTheme.status.warningBg === rgba(234, 88, 12, 0.15)');
assert(darkTheme.status.warningText === '#FB923C', 'darkTheme.status.warningText === #FB923C');
assert(darkTheme.status.warningBorder === 'rgba(234, 88, 12, 0.30)', 'darkTheme.status.warningBorder === rgba(234, 88, 12, 0.30)');

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPANDED THEME TOKENS CONTRACT AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. AUDITING EXPANDED TOKENS CONTRACT (switchTrack, qrCanvas, onBrand, subtle) ---');

assert(lightTheme.text.onBrand === '#FFFFFF', 'lightTheme.text.onBrand === #FFFFFF');
assert(darkTheme.text.onBrand === '#FFFFFF', 'darkTheme.text.onBrand === #FFFFFF');
assert(lightTheme.text.inverse === '#FFFFFF', 'lightTheme.text.inverse === #FFFFFF');
assert(darkTheme.text.inverse === '#FFFFFF', 'darkTheme.text.inverse === #FFFFFF (resolved contrast fix)');

assert(lightTheme.surface.switchTrack === '#CBD5E1', 'lightTheme.surface.switchTrack === #CBD5E1');
assert(darkTheme.surface.switchTrack === '#334155', 'darkTheme.surface.switchTrack === #334155');

assert(lightTheme.surface.switchTrackDanger === '#FCA5A5', 'lightTheme.surface.switchTrackDanger === #FCA5A5');
assert(darkTheme.surface.switchTrackDanger === '#7F1D1D', 'darkTheme.surface.switchTrackDanger === #7F1D1D');

assert(lightTheme.surface.qrCanvas === '#FFFFFF', 'lightTheme.surface.qrCanvas === #FFFFFF');
assert(darkTheme.surface.qrCanvas === '#FFFFFF', 'darkTheme.surface.qrCanvas === #FFFFFF');

assert(lightTheme.surface.shadow === '#000000', 'lightTheme.surface.shadow === #000000');
assert(darkTheme.surface.shadow === '#000000', 'darkTheme.surface.shadow === #000000');

assert(lightTheme.border.subtle === '#E2E8F0', 'lightTheme.border.subtle === #E2E8F0');
assert(darkTheme.border.subtle === '#1E293B', 'darkTheme.border.subtle === #1E293B');

// ─────────────────────────────────────────────────────────────────────────────
// 4. TOKENS.TS RE-EXPORT & CIRCULAR DEPENDENCY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. AUDITING tokens.ts RE-EXPORTS & IMPORT GRAPH INTEGRITY ---');

assert(THEME_TOKENS.light === lightTheme, 'THEME_TOKENS.light reference equals lightTheme');
assert(THEME_TOKENS.dark === darkTheme, 'THEME_TOKENS.dark reference equals darkTheme');

assert(Array.isArray(TEXT_INPUT_FONT_SIZES), 'TEXT_INPUT_FONT_SIZES is an array');
assert(
  JSON.stringify(TEXT_INPUT_FONT_SIZES) === JSON.stringify([16, 18, 22]),
  `TEXT_INPUT_FONT_SIZES strictly equals [16, 18, 22]`
);

assert(QR_CANVAS_COLOR === '#FFFFFF', 'QR_CANVAS_COLOR === #FFFFFF');
assert(ON_BRAND_TEXT_COLOR === '#FFFFFF', 'ON_BRAND_TEXT_COLOR === #FFFFFF');

assert(TYPOGRAPHY_TIERS.xs.mobile === 14 && TYPOGRAPHY_TIERS.xs.tablet === 14, 'TYPOGRAPHY_TIERS.xs is 14/14');
assert(TYPOGRAPHY_TIERS.sm.mobile === 16 && TYPOGRAPHY_TIERS.sm.tablet === 16, 'TYPOGRAPHY_TIERS.sm is 16/16');
assert(TYPOGRAPHY_TIERS.md.mobile === 18 && TYPOGRAPHY_TIERS.md.tablet === 18, 'TYPOGRAPHY_TIERS.md is 18/18');
assert(TYPOGRAPHY_TIERS.lg.mobile === 22 && TYPOGRAPHY_TIERS.lg.tablet === 22, 'TYPOGRAPHY_TIERS.lg is 22/22');

// Check re-export via index.tsx
assert((themeIndex as any).THEME_TOKENS !== undefined, 'index.tsx successfully re-exports THEME_TOKENS');
assert((themeIndex as any).TYPOGRAPHY_TIERS !== undefined, 'index.tsx successfully re-exports TYPOGRAPHY_TIERS');
assert((themeIndex as any).TEXT_INPUT_FONT_SIZES !== undefined, 'index.tsx successfully re-exports TEXT_INPUT_FONT_SIZES');
assert((themeIndex as any).lightTheme !== undefined, 'index.tsx re-exports lightTheme');
assert((themeIndex as any).darkTheme !== undefined, 'index.tsx re-exports darkTheme');
assert(typeof (themeIndex as any).useTheme === 'function', 'index.tsx exports useTheme hook');
assert(typeof (themeIndex as any).ThemeProvider === 'function', 'index.tsx exports ThemeProvider component');

// Static dependency graph analysis to ensure DAG:
const colorsPath = path.join(__dirname, '../lib/theme/colors.ts');
const tokensPath = path.join(__dirname, '../lib/theme/tokens.ts');
const indexPath = path.join(__dirname, '../lib/theme/index.tsx');

const colorsContent = fs.readFileSync(colorsPath, 'utf8');
const tokensContent = fs.readFileSync(tokensPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const colorsImportsTokens = /from\s+['"].*tokens['"]/.test(colorsContent);
const colorsImportsIndex = /from\s+['"].*index['"]/.test(colorsContent);
const tokensImportsIndex = /from\s+['"].*index['"]/.test(tokensContent);

assert(!colorsImportsTokens, 'colors.ts does NOT import tokens.ts (No circular dependency)');
assert(!colorsImportsIndex, 'colors.ts does NOT import index.tsx (No circular dependency)');
assert(!tokensImportsIndex, 'tokens.ts does NOT import index.tsx (No circular dependency)');

// ─────────────────────────────────────────────────────────────────────────────
// 5. HARDCODED HEX COLOR ERADICATION AUDIT IN UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. AUDITING UI COMPONENTS FOR HARDCODED HEX COLORS ---');

const uiDir = path.join(__dirname, '../lib/components/ui');
const uiFiles = fs.readdirSync(uiDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

console.log(`  Inspecting ${uiFiles.length} files in frontend/lib/components/ui/ ...`);

const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

let totalHexViolations = 0;
const violationDetails: { file: string; line: number; match: string; text: string }[] = [];

for (const file of uiFiles) {
  const filePath = path.join(uiDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    // Exclude comments if needed, but strict mode checks everything
    const matches = lineText.match(hexRegex);
    if (matches) {
      // Check if line is purely comment or code
      for (const m of matches) {
        totalHexViolations++;
        violationDetails.push({ file, line: idx + 1, match: m, text: lineText.trim() });
      }
    }
  });
}

assert(
  totalHexViolations === 0,
  `Zero hardcoded hex instances across all files in lib/components/ui/ (Found: ${totalHexViolations})`
);

if (totalHexViolations > 0) {
  console.error('  Violations breakdown:');
  for (const v of violationDetails) {
    console.error(`    ${v.file}:${v.line} -> ${v.match} in "${v.text}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. AUDIT TYPOGRAPHY NORMALIZATION IN AppRailNav.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. AUDITING TYPOGRAPHY NORMALIZATION IN AppRailNav.tsx ---');

const railNavPath = path.join(uiDir, 'AppRailNav.tsx');
const railNavContent = fs.readFileSync(railNavPath, 'utf8');

const hasFontSize9 = /fontSize:\s*9\b/.test(railNavContent);
assert(!hasFontSize9, 'AppRailNav.tsx: fontSize: 9 has been completely eliminated');

const hasNormalizedBadge = /badgeTextCollapsed:\s*\{[^}]*fontSize:\s*13/.test(railNavContent);
assert(hasNormalizedBadge, 'AppRailNav.tsx: badgeTextCollapsed normalized to fontSize: 13');

// ─────────────────────────────────────────────────────────────────────────────
// 7. WCAG CONTRAST RATIO & OPTICAL READABILITY TEST
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. WCAG 2.1 AAA/AA CONTRAST RATIO VERIFICATION ---');

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getRelativeLuminance(r1, g1, b1);
  const lum2 = getRelativeLuminance(r2, g2, b2);
  const bright = Math.max(lum1, lum2);
  const dark = Math.min(lum1, lum2);
  return (bright + 0.05) / (dark + 0.05);
}

// 7.1 Text primary vs surface card
const lightCardContrast = getContrastRatio(lightTheme.text.primary, lightTheme.surface.card);
console.log(`  Light Mode Text/Card contrast: ${lightCardContrast.toFixed(2)}:1`);
assert(lightCardContrast >= 7.0, `Light Mode Text/Card contrast satisfies WCAG AAA (>= 7.0:1)`);

const darkCardContrast = getContrastRatio(darkTheme.text.primary, darkTheme.surface.card);
console.log(`  Dark Mode Text/Card contrast: ${darkCardContrast.toFixed(2)}:1`);
assert(darkCardContrast >= 7.0, `Dark Mode Text/Card contrast satisfies WCAG AAA (>= 7.0:1)`);

// 7.2 onBrand text (#FFFFFF) on brand buttons
const lightBrandContrast = getContrastRatio(lightTheme.text.onBrand, lightTheme.brand.primary);
console.log(`  Light Mode Brand Primary button contrast: ${lightBrandContrast.toFixed(2)}:1`);
assert(lightBrandContrast >= 4.0, `Light Mode Brand Primary button text contrast >= 4.0:1 (actual: ${lightBrandContrast.toFixed(2)})`);

const darkBrandContrast = getContrastRatio(darkTheme.text.onBrand, darkTheme.brand.primary);
console.log(`  Dark Mode Brand Primary button contrast: ${darkBrandContrast.toFixed(2)}:1`);
assert(darkBrandContrast >= 3.0, `Dark Mode Brand Primary button text contrast >= 3.0:1 (actual: ${darkBrandContrast.toFixed(2)})`);

const lightDangerContrast = getContrastRatio(lightTheme.text.onBrand, lightTheme.brand.danger);
console.log(`  Light Mode Danger button contrast: ${lightDangerContrast.toFixed(2)}:1`);
assert(lightDangerContrast >= 4.5, `Light Mode Danger button text contrast >= 4.5:1 (actual: ${lightDangerContrast.toFixed(2)})`);

const darkDangerContrast = getContrastRatio(darkTheme.text.onBrand, darkTheme.brand.danger);
console.log(`  Dark Mode Danger button contrast: ${darkDangerContrast.toFixed(2)}:1`);
assert(darkDangerContrast >= 3.5, `Dark Mode Danger button text contrast >= 3.5:1 (actual: ${darkDangerContrast.toFixed(2)})`);

// ─────────────────────────────────────────────────────────────────────────────
// 8. ADVERSARIAL STRESS: IMMUTABILITY & RAPID THEME CONTEXT SWITCHING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 8. ADVERSARIAL STRESS: THEME CONTEXT RESOLUTION SPEED ---');

const startBench = performance.now();
const testIterations = 50000;
let currentMode: 'light' | 'dark' = 'light';
for (let i = 0; i < testIterations; i++) {
  currentMode = currentMode === 'light' ? 'dark' : 'light';
  const resolvedTheme = THEME_TOKENS[currentMode];
  // Access various deep properties
  const dummy1 = resolvedTheme.status.cookingBg;
  const dummy2 = resolvedTheme.surface.switchTrack;
  const dummy3 = resolvedTheme.text.onBrand;
}
const elapsedBench = performance.now() - startBench;
console.log(`  ⏱️ Performed ${testIterations} theme switch & property lookups in ${elapsedBench.toFixed(2)}ms`);
assert(elapsedBench < 100, `Theme resolution runs 50k times in < 100ms (actual: ${elapsedBench.toFixed(2)}ms)`);

console.log('\n================================================================================');
console.log(`🎯 CHALLENGER VERDICT: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
