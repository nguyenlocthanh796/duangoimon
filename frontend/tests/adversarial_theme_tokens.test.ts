import './setup_env';
import { lightTheme, darkTheme, THEME_TOKENS, TYPOGRAPHY_TIERS, TEXT_INPUT_FONT_SIZES, QR_CANVAS_COLOR, ON_BRAND_TEXT_COLOR } from '../lib/theme/tokens';
import * as themeIndex from '../lib/theme/index';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log('  [PASS] ' + msg);
  } else {
    failed++;
    console.error('  [FAIL] ' + msg);
  }
}

console.log('================================================================================');
console.log('EMPIRICAL CHALLENGER: THEME TOKENS & EDGE CASES VERIFICATION');
console.log('================================================================================\n');

function getAllPropertyPaths(obj: any, prefix = ''): { path: string; value: any }[] {
  let paths: { path: string; value: any }[] = [];
  for (const key of Object.keys(obj)) {
    const currentPath = prefix ? prefix + '.' + key : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths = paths.concat(getAllPropertyPaths(value, currentPath));
    } else {
      paths.push({ path: currentPath, value });
    }
  }
  return paths;
}

console.log('--- 1. STRUCTURAL SYMMETRY & UNDEFINED VALUE AUDIT ---');
const lightPaths = getAllPropertyPaths(lightTheme);
const darkPaths = getAllPropertyPaths(darkTheme);

const lightPathMap = new Map(lightPaths.map(p => [p.path, p.value]));
const darkPathMap = new Map(darkPaths.map(p => [p.path, p.value]));

console.log('Total token paths: lightTheme=' + lightPaths.length + ', darkTheme=' + darkPaths.length);
assert(lightPaths.length === darkPaths.length, 'lightTheme and darkTheme have identical property counts (' + lightPaths.length + ')');

let missingInDark = 0;
for (const p of lightPaths) {
  if (!darkPathMap.has(p.path)) {
    console.error('Missing in darkTheme: ' + p.path);
    missingInDark++;
  }
}
assert(missingInDark === 0, 'Zero tokens in lightTheme missing from darkTheme');

let missingInLight = 0;
for (const p of darkPaths) {
  if (!lightPathMap.has(p.path)) {
    console.error('Missing in lightTheme: ' + p.path);
    missingInLight++;
  }
}
assert(missingInLight === 0, 'Zero tokens in darkTheme missing from lightTheme');

let undefinedOrNullCount = 0;
for (const p of lightPaths) {
  if (p.value === undefined || p.value === null || p.value === '' || (typeof p.value === 'number' && isNaN(p.value))) {
    console.error('Invalid value in lightTheme at ' + p.path + ': ' + p.value);
    undefinedOrNullCount++;
  }
}
for (const p of darkPaths) {
  if (p.value === undefined || p.value === null || p.value === '' || (typeof p.value === 'number' && isNaN(p.value))) {
    console.error('Invalid value in darkTheme at ' + p.path + ': ' + p.value);
    undefinedOrNullCount++;
  }
}
assert(undefinedOrNullCount === 0, 'Zero undefined, null, empty string, or NaN token values across both themes');

console.log('\n--- 2. REQUIRED SECTIONS INTEGRITY ---');
const requiredSections = ['surface', 'text', 'border', 'brand', 'status'];
for (const sec of requiredSections) {
  assert(sec in lightTheme, 'lightTheme contains section: ' + sec);
  assert(sec in darkTheme, 'darkTheme contains section: ' + sec);
}

console.log('\n--- 3. PROJECT.md CONTRACT COMPLIANCE ---');
assert(lightTheme.text.inverse === '#FFFFFF', 'lightTheme.text.inverse === #FFFFFF');
assert(darkTheme.text.inverse === '#14110E', 'darkTheme.text.inverse === #14110E (Anti-Glare contrast)');
assert(lightTheme.text.onBrand === '#FFFFFF', 'lightTheme.text.onBrand === #FFFFFF');
assert(darkTheme.text.onBrand === '#FFFFFF', 'darkTheme.text.onBrand === #FFFFFF (Indochine white text on Vàng Đồng Thau brand button)');
assert(lightTheme.brand.accent === '#B45309', 'lightTheme.brand.accent === #B45309');
assert(darkTheme.brand.accent === '#B45309', 'darkTheme.brand.accent === #B45309 (Vàng Đồng Thau Phin Anti-Glare)');

assert(lightTheme.surface.switchTrack === '#E7E5E4', 'lightTheme.surface.switchTrack === #E7E5E4');
assert(darkTheme.surface.switchTrack === '#44403C', 'darkTheme.surface.switchTrack === #44403C');
assert(lightTheme.surface.switchTrackDanger === '#FECACA', 'lightTheme.surface.switchTrackDanger === #FECACA');
assert(darkTheme.surface.switchTrackDanger === '#7F1D1D', 'darkTheme.surface.switchTrackDanger === #7F1D1D');
assert(lightTheme.surface.qrCanvas === '#FFFFFF', 'lightTheme.surface.qrCanvas === #FFFFFF');
assert(darkTheme.surface.qrCanvas === '#FFFFFF', 'darkTheme.surface.qrCanvas === #FFFFFF');
assert(lightTheme.surface.shadow === '#000000', 'lightTheme.surface.shadow === #000000');
assert(darkTheme.surface.shadow === '#000000', 'darkTheme.surface.shadow === #000000');

assert(lightTheme.border.subtle === '#E7E5E4', 'lightTheme.border.subtle === #E7E5E4');
assert(darkTheme.border.subtle === 'rgba(243, 239, 234, 0.12)', 'darkTheme.border.subtle is valid');

const statusKeys = [
  'pendingBg', 'pendingText', 'pendingBorder',
  'cookingBg', 'cookingText', 'cookingBorder',
  'readyBg', 'readyText', 'readyBorder',
  'dangerBg', 'dangerText', 'dangerBorder',
  'warningBg', 'warningText', 'warningBorder',
];

for (const k of statusKeys) {
  assert(k in lightTheme.status, 'lightTheme.status has ' + k);
  assert(k in darkTheme.status, 'darkTheme.status has ' + k);
  assert(typeof (lightTheme.status as any)[k] === 'string' && (lightTheme.status as any)[k].length > 0, 'lightTheme.status.' + k + ' is non-empty string');
  assert(typeof (darkTheme.status as any)[k] === 'string' && (darkTheme.status as any)[k].length > 0, 'darkTheme.status.' + k + ' is non-empty string');
}

console.log('\n--- 4. TOKENS MODULE EXPORTS AUDIT ---');
assert(THEME_TOKENS.light === lightTheme, 'THEME_TOKENS.light references lightTheme');
assert(THEME_TOKENS.dark === darkTheme, 'THEME_TOKENS.dark references darkTheme');
assert(QR_CANVAS_COLOR === '#FFFFFF', 'QR_CANVAS_COLOR === #FFFFFF');
assert(ON_BRAND_TEXT_COLOR === '#FFFFFF', 'ON_BRAND_TEXT_COLOR === #FFFFFF');

assert(Array.isArray(TEXT_INPUT_FONT_SIZES), 'TEXT_INPUT_FONT_SIZES is an array');
assert(JSON.stringify(TEXT_INPUT_FONT_SIZES) === JSON.stringify([16, 18, 22]), 'TEXT_INPUT_FONT_SIZES === [16, 18, 22]');

assert('xxs' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.xxs.mobile === 12, 'TYPOGRAPHY_TIERS.xxs.mobile === 12');
assert('xs' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.xs.mobile === 14, 'TYPOGRAPHY_TIERS.xs.mobile === 14');
assert('sm' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.sm.mobile === 16, 'TYPOGRAPHY_TIERS.sm.mobile === 16');
assert('md' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.md.mobile === 18, 'TYPOGRAPHY_TIERS.md.mobile === 18');
assert('lg' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.lg.mobile === 22, 'TYPOGRAPHY_TIERS.lg.mobile === 22');
assert('xl' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.xl.mobile === 28, 'TYPOGRAPHY_TIERS.xl.mobile === 28');
assert('display' in TYPOGRAPHY_TIERS && TYPOGRAPHY_TIERS.display.mobile === 36, 'TYPOGRAPHY_TIERS.display.mobile === 36');

assert((themeIndex as any).lightTheme === lightTheme, 'themeIndex re-exports lightTheme');
assert((themeIndex as any).darkTheme === darkTheme, 'themeIndex re-exports darkTheme');
assert((themeIndex as any).THEME_TOKENS === THEME_TOKENS, 'themeIndex re-exports THEME_TOKENS');
assert((themeIndex as any).TYPOGRAPHY_TIERS === TYPOGRAPHY_TIERS, 'themeIndex re-exports TYPOGRAPHY_TIERS');
assert((themeIndex as any).TEXT_INPUT_FONT_SIZES === TEXT_INPUT_FONT_SIZES, 'themeIndex re-exports TEXT_INPUT_FONT_SIZES');
assert((themeIndex as any).useTheme !== undefined, 'themeIndex exports useTheme hook');
assert((themeIndex as any).ThemeProvider !== undefined, 'themeIndex exports ThemeProvider');

console.log('\n--- 5. APPTOAST STATUS TOKEN RESILIENCE ---');
const toastTypes = ['success', 'warning', 'error', 'info'] as const;
for (const t of toastTypes) {
  let bg: string, text: string, border: string;
  switch (t) {
    case 'success':
      bg = lightTheme.status.readyBg;
      text = lightTheme.status.readyText;
      border = lightTheme.status.readyBorder;
      break;
    case 'warning':
      bg = lightTheme.status.warningBg;
      text = lightTheme.status.warningText;
      border = lightTheme.status.warningBorder;
      break;
    case 'error':
      bg = lightTheme.status.dangerBg;
      text = lightTheme.status.dangerText;
      border = lightTheme.status.dangerBorder;
      break;
    case 'info':
    default:
      bg = lightTheme.status.cookingBg;
      text = lightTheme.status.cookingText;
      border = lightTheme.status.cookingBorder;
      break;
  }
  assert(Boolean(bg && text && border), 'Toast type ' + t + ' resolves valid tokens in lightTheme');

  switch (t) {
    case 'success':
      bg = darkTheme.status.readyBg;
      text = darkTheme.status.readyText;
      border = darkTheme.status.readyBorder;
      break;
    case 'warning':
      bg = darkTheme.status.warningBg;
      text = darkTheme.status.warningText;
      border = darkTheme.status.warningBorder;
      break;
    case 'error':
      bg = darkTheme.status.dangerBg;
      text = darkTheme.status.dangerText;
      border = darkTheme.status.dangerBorder;
      break;
    case 'info':
    default:
      bg = darkTheme.status.cookingBg;
      text = darkTheme.status.cookingText;
      border = darkTheme.status.cookingBorder;
      break;
  }
  assert(Boolean(bg && text && border), 'Toast type ' + t + ' resolves valid tokens in darkTheme');
}



// 6. ZERO HEX COLORS IN FRONTEND/LIB/COMPONENTS/UI/
console.log('\n--- 6. ZERO HEX IN FRONTEND/LIB/COMPONENTS/UI/ ---');
const fs = require('fs');
const path = require('path');

const uiDir = path.resolve(__dirname, '../lib/components/ui');
const uiFiles = fs.readdirSync(uiDir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.tsx'));

console.log('  Scanning ' + uiFiles.length + ' files in ' + uiDir);
assert(uiFiles.length >= 8, 'UI directory has expected number of files (' + uiFiles.length + ')');

const hexRegex = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;

let totalHexMatches = 0;
let totalHashMatches = 0;

for (const file of uiFiles) {
  const filePath = path.join(uiDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line: string, idx: number) => {
    const hexMatches = line.match(hexRegex);
    if (hexMatches) {
      console.error('  [HEX FOUND] ' + file + ':' + (idx + 1) + ' -> ' + line.trim());
      totalHexMatches += hexMatches.length;
    }
    if (line.includes('#')) {
      console.error('  [HASH FOUND] ' + file + ':' + (idx + 1) + ' -> ' + line.trim());
      totalHashMatches++;
    }
  });
}

assert(totalHexMatches === 0, 'Zero hex colors (3, 4, 6, 8 digits) across frontend/lib/components/ui/ (actual: ' + totalHexMatches + ')');
assert(totalHashMatches === 0, 'Zero hash symbol occurrences across frontend/lib/components/ui/ (actual: ' + totalHashMatches + ')');

// 7. TYPOGRAPHY COMPLIANCE & FONT SIZE AUDIT
console.log('\n--- 7. TYPOGRAPHY COMPLIANCE & FONT SIZE AUDIT ---');

let rawTextUsages: string[] = [];
for (const file of uiFiles) {
  if (file === 'AppText.tsx') continue;
  const filePath = path.join(uiDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line: string, idx: number) => {
    if (/<Text[\s>]/.test(line)) {
      rawTextUsages.push(file + ':' + (idx + 1));
    }
  });
}
assert(rawTextUsages.length === 0, 'Zero raw <Text> tags in UI components outside AppText.tsx (actual: ' + rawTextUsages.length + ')');

let fontSizesFound: { file: string; line: number; size: number }[] = [];
const fontSizeRegex = /fontSize:\s*(\d+)/g;

for (const file of uiFiles) {
  if (file === 'AppOmniSearch.tsx' || file === 'AppFormField.tsx') continue; // Contains TextInput styling (fontSize: 16 per Apple HIG invariant)
  const filePath = path.join(uiDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line: string, idx: number) => {
    let match;
    while ((match = fontSizeRegex.exec(line)) !== null) {
      fontSizesFound.push({ file, line: idx + 1, size: parseInt(match[1], 10) });
    }
  });
}

console.log('  Explicit fontSize declarations in UI components: ' + JSON.stringify(fontSizesFound));
assert(fontSizesFound.length === 0, 'Zero explicit fontSize in UI components, 100% typography compliance via AppText (actual: ' + fontSizesFound.length + ')');

// 8. GLOBAL ZERO-HEX AUDIT ACROSS FRONTEND APP & COMPONENTS & STORE
console.log('\n--- 8. GLOBAL ZERO-HEX AUDIT ACROSS APP, COMPONENTS & STORE ---');

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const auditDirs = [
  path.resolve(__dirname, '../app'),
  path.resolve(__dirname, '../lib/components'),
  path.resolve(__dirname, '../lib/store'),
];

let globalHexCount = 0;
let scannedFilesCount = 0;

for (const dir of auditDirs) {
  const allFiles = getFilesRecursively(dir);
  scannedFilesCount += allFiles.length;
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line: string, idx: number) => {
      // Exclude comments if any
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      const hexMatches = line.match(hexRegex);
      if (hexMatches) {
        const rel = path.relative(path.resolve(__dirname, '..'), file);
        console.error('  [GLOBAL HEX FOUND] ' + rel + ':' + (idx + 1) + ' -> ' + trimmed);
        globalHexCount += hexMatches.length;
      }
    });
  }
}

console.log('  Scanned ' + scannedFilesCount + ' files across app/, lib/components/, lib/store/');
assert(globalHexCount === 0, 'Zero hardcoded hex colors across all app, component, and store files (actual: ' + globalHexCount + ')');

console.log('\n================================================================================');
console.log('CHALLENGE SUMMARY: ' + passed + ' PASSED, ' + failed + ' FAILED');
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
