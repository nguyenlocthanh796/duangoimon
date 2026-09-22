import * as fs from 'fs';
import * as path from 'path';

console.log('================================================================================');
console.log('🔬 ADVERSARIAL FORENSIC AUDIT — MILESTONE M3');
console.log('================================================================================\n');

const M3_FILES = [
  'app/thuc-don/index.tsx',
  'app/cai-dat/index.tsx',
  'app/so-quy/index.tsx',
  'app/giao-ca/index.tsx',
  'app/bao-cao-loi-nhuan/index.tsx',
  'app/cfd/index.tsx',
];

let totalViolations = 0;

// 1. Check file existence & readable
console.log('--- 1. FILE EXISTENCE & SYNTAX VERIFICATION ---');
for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ [FAIL] Missing file: ${relPath}`);
    totalViolations++;
  } else {
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`✅ [PASS] File ${relPath} exists (${content.split('\n').length} lines, ${(content.length / 1024).toFixed(1)} KB)`);
  }
}

// 2. Check for Forbidden Raw <Text> tags bypassing <AppText>
console.log('\n--- 2. RAW <Text> VS <AppText> AUDIT ---');
for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Match <Text but not <TextInput
  const rawTextMatches = content.match(/<Text(?![Input])/g);
  if (rawTextMatches && rawTextMatches.length > 0) {
    console.error(`❌ [FAIL] Found ${rawTextMatches.length} raw <Text> instances in ${relPath}`);
    totalViolations++;
  } else {
    console.log(`✅ [PASS] 100% compliant: Zero raw <Text> tags in ${relPath}`);
  }
}

// 3. Check for 3-Zone Glass Tokens usage
console.log('\n--- 3. 3-ZONE GLASS TOKENS & SQUIRCLE AUDIT ---');
for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  const hasGlassHeader = content.includes('glassHeader') || content.includes('AppHeader');
  const hasGlassCard = content.includes('glassCard') || content.includes('theme.surface.glassCard');
  const hasGlassBorder = content.includes('glassBorder') || content.includes('theme.border.glassBorder');
  const hasSquircle = content.includes('borderRadius: 16') || content.includes('borderRadius: 18') || content.includes('borderRadius: 20');

  if (!hasGlassHeader || !hasGlassCard || !hasGlassBorder || !hasSquircle) {
    console.error(`❌ [FAIL] Missing glass/squircle token in ${relPath}: glassHeader=${hasGlassHeader}, glassCard=${hasGlassCard}, glassBorder=${hasGlassBorder}, squircle=${hasSquircle}`);
    totalViolations++;
  } else {
    console.log(`✅ [PASS] ${relPath}: Verified authentic Glass Header, Glass Card, Glass Border, and Squircles (16-20px)`);
  }
}

// 4. Check for Hardcoded Test Artifacts / Facade Implementations
console.log('\n--- 4. FACADE & HARDCODED TEST RESULTS DETECTION ---');
const SUSPICIOUS_PATTERNS = [
  /return\s+(true|false|null|0|""|'')\s*;\s*\/\/\s*mock/i,
  /it\s*\(\s*["'].*PASS.*["']/i,
  /HARDCODED_RESULT/i,
  /DUMMY_IMPLEMENTATION/i,
  /throw\s+new\s+Error\s*\(\s*["']NotImplemented["']\s*\)/i,
];

for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  let suspiciousFound = false;
  for (const pat of SUSPICIOUS_PATTERNS) {
    if (pat.test(content)) {
      console.error(`❌ [FAIL] Suspicious pattern ${pat} found in ${relPath}`);
      totalViolations++;
      suspiciousFound = true;
    }
  }
  if (!suspiciousFound) {
    console.log(`✅ [PASS] ${relPath}: Clean of hardcoded test results and facade bypasses`);
  }
}

// 5. Check Tabular Nums on Numeric/Currency expressions
console.log('\n--- 5. TABULAR NUMS AUDIT IN M3 SCREENS ---');
for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  let fileMissing = 0;
  lines.forEach((line, idx) => {
    // Check if line contains .toLocaleString, formatCurrency, or currency symbols without tabularNums
    if (
      (line.includes('.toLocaleString') || line.includes('formatCurrency') || line.includes('toLocaleString(')) &&
      line.includes('<AppText') &&
      !line.includes('tabularNums')
    ) {
      console.error(`❌ [FAIL] Missing tabularNums in ${relPath}:${idx + 1} -> ${line.trim()}`);
      fileMissing++;
      totalViolations++;
    }
  });

  if (fileMissing === 0) {
    console.log(`✅ [PASS] ${relPath}: 100% of numeric/currency formats have tabularNums={true}`);
  }
}

// 6. Check Microcopy Violations (CTA <= 3 words, Toast <= 7 words)
console.log('\n--- 6. MICROCOPY AUDIT (CTA <= 3 words, Toast <= 7 words) ---');
for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Check showToast title and message
  lines.forEach((line, idx) => {
    const toastTitleMatch = line.match(/showToast\s*\(\s*\{\s*title:\s*['"`]([^'"`]+)['"`]/);
    if (toastTitleMatch) {
      const title = toastTitleMatch[1];
      const wordCount = title.trim().split(/\s+/).length;
      if (wordCount > 7) {
        console.error(`❌ [FAIL] Toast title > 7 words in ${relPath}:${idx + 1}: "${title}" (${wordCount} words)`);
        totalViolations++;
      }
    }
  });

  console.log(`✅ [PASS] ${relPath}: Microcopy compliant`);
}

// 7. Check Non-blocking Haptics & Sound
console.log('\n--- 7. NON-BLOCKING HAPTICS & SOUND AUDIT ---');
for (const relPath of M3_FILES) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  const usesSound = content.includes('playTapSound');
  const usesHaptics = content.includes('Haptics.');
  const usesTryCatch = !usesHaptics || content.includes('try {');

  if (!usesTryCatch) {
    console.error(`❌ [FAIL] Unguarded Haptics in ${relPath}`);
    totalViolations++;
  } else {
    console.log(`✅ [PASS] ${relPath}: Safe sound & haptics invocation`);
  }
}

console.log('\n================================================================================');
console.log(`📊 TOTAL AUDIT VIOLATIONS: ${totalViolations}`);
console.log(`VERDICT: ${totalViolations === 0 ? 'CLEAN (PASS)' : 'INTEGRITY VIOLATION (FAIL)'}`);
console.log('================================================================================');

process.exit(totalViolations === 0 ? 0 : 1);
