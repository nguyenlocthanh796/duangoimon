/**
 * 👑 OngChu Lean POS - Adversarial Challenger M2 Comprehensive Empirical Audit Harness
 */

import fs from 'fs';
import path from 'path';

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
const allFiles = [...appFiles, ...componentFiles];

const m2Targets = [
  'app/index.tsx',
  'app/thanh-toan/index.tsx',
  'app/kds/index.tsx',
  'app/hoa-don/index.tsx',
];

console.log('================================================================================');
console.log('🔬 ADVERSARIAL FORENSIC AUDIT — MILESTONE M2');
console.log('================================================================================\n');

// 1. FORENSIC AUDIT: TABULAR NUMS IN M2 SCREENS
console.log('--- 1. TABULAR NUMS AUDIT IN M2 SCREENS ---');
interface TabularFinding {
  file: string;
  line: number;
  text: string;
  props: string;
}

const missingTabularNums: TabularFinding[] = [];

m2Targets.forEach((targetRelPath) => {
  const fullPath = path.join(frontendRoot, targetRelPath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const appTextRegex = /<AppText([\s\S]*?)>([\s\S]*?)<\/AppText>/g;
  let match: RegExpExecArray | null;

  while ((match = appTextRegex.exec(content)) !== null) {
    const props = match[1];
    const children = match[2];

    const hasDynamicNumber =
      /toLocaleString\s*\(/.test(children) ||
      /formatCurrency\s*\(/.test(children) ||
      /\b(totalAmount|subTotal|finalTotal|totalQty|cartQty|discountAmount|paidAmount|changeAmount|vietqrTotal|cashTotal|totalRevenue)\b/.test(children) ||
      /\{\s*[\w.]*(?:Amount|Total|Qty|Price|Count|Revenue|Rate|Time|Minutes|Min)\s*\}/.test(children) ||
      /\b(elapsedMin|currentTime)\b/.test(children);

    if (hasDynamicNumber) {
      const hasTabular = props.includes('tabularNums') || props.includes("fontVariant: ['tabular-nums']");
      if (!hasTabular) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        missingTabularNums.push({
          file: targetRelPath,
          line: lineNum,
          text: children.trim().replace(/\s+/g, ' '),
          props: props.trim().replace(/\s+/g, ' '),
        });
      }
    }
  }
});

console.log(`Found ${missingTabularNums.length} missing tabularNums in M2 screens:`);
missingTabularNums.forEach((f) => {
  console.log(`  ❌ ${f.file}:${f.line} -> <AppText ${f.props}>${f.text}</AppText>`);
});

// 2. FORENSIC AUDIT: STRICT MICROCOPY
console.log('\n--- 2. STRICT MICROCOPY AUDIT ---');

// CTA Buttons check in M2 screens
interface CtaFinding {
  file: string;
  line: number;
  ctaText: string;
  wordCount: number;
}
const ctaViolations: CtaFinding[] = [];

m2Targets.forEach((targetRelPath) => {
  const fullPath = path.join(frontendRoot, targetRelPath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  // Find Button title="..."
  const btnTitleRegex = /<Button[\s\S]*?title=(?:\{['"`](.*?)['"`]\}|["'](.*?)["'])[\s\S]*?\/>/g;
  let match: RegExpExecArray | null;
  while ((match = btnTitleRegex.exec(content)) !== null) {
    const title = (match[1] || match[2] || '').trim();
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length > 3) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      ctaViolations.push({ file: targetRelPath, line: lineNum, ctaText: title, wordCount: words.length });
    }
  }

  // Find TouchableOpacity / Pressable with direct AppText
  const touchableRegex = /<TouchableOpacity[\s\S]*?>([\s\S]*?)<\/TouchableOpacity>/g;
  while ((match = touchableRegex.exec(content)) !== null) {
    const inside = match[1];
    const textMatch = inside.match(/<AppText[\s\S]*?>([\s\S]*?)<\/AppText>/);
    if (textMatch) {
      const text = textMatch[1].replace(/<.*?>/g, '').replace(/\{.*?\}/g, '').trim();
      if (text && !text.includes('\n') && text.length < 30) {
        const words = text.split(/\s+/).filter((w) => w && w !== '·' && w !== 'đ' && w !== '-');
        if (words.length > 3) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          ctaViolations.push({ file: targetRelPath, line: lineNum, ctaText: text, wordCount: words.length });
        }
      }
    }
  }
});

console.log(`CTA violations (> 3 words): ${ctaViolations.length}`);
ctaViolations.forEach((v) => {
  console.log(`  ❌ ${v.file}:${v.line} -> "${v.ctaText}" (${v.wordCount} words)`);
});

// Toast check across codebase
interface ToastFinding {
  file: string;
  line: number;
  field: string;
  text: string;
  wordCount: number;
}
const toastViolations: ToastFinding[] = [];

allFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  const toastRegex = /showToast\(\s*\{([\s\S]*?)\}\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = toastRegex.exec(content)) !== null) {
    const toastBody = match[1];
    const titleMatch = toastBody.match(/title:\s*['"`](.*?)['"`]/);
    const msgMatch = toastBody.match(/message:\s*(?:['"`](.*?)['"`]|`([\s\S]*?)`)/);

    const lineNum = content.substring(0, match.index).split('\n').length;
    if (titleMatch) {
      const title = titleMatch[1].trim();
      const words = title.split(/\s+/).filter(Boolean);
      if (words.length > 7) {
        toastViolations.push({
          file: path.relative(frontendRoot, file),
          line: lineNum,
          field: 'title',
          text: title,
          wordCount: words.length,
        });
      }
    }
    if (msgMatch) {
      const rawMsg = (msgMatch[1] || msgMatch[2] || '').trim();
      const cleanMsg = rawMsg.replace(/\$\{.*?\}/g, 'TOKEN');
      const words = cleanMsg.split(/\s+/).filter(Boolean);
      if (words.length > 7) {
        toastViolations.push({
          file: path.relative(frontendRoot, file),
          line: lineNum,
          field: 'message',
          text: rawMsg,
          wordCount: words.length,
        });
      }
    }
  }
});

console.log(`Toast violations (> 7 words): ${toastViolations.length}`);
toastViolations.forEach((v) => {
  console.log(`  ❌ ${v.file}:${v.line} [${v.field}] -> "${v.text}" (${v.wordCount} words)`);
});

// 3. ZERO GPU BLUR SHADER DEGRADATION AUDIT
console.log('\n--- 3. ZERO GPU BLUR SHADER AUDIT ---');
let blurIssues = 0;
allFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('@react-native-community/blur')) {
    blurIssues++;
    console.log(`  ❌ Heavy blur import in ${path.relative(frontendRoot, file)}`);
  }
  if (/backdrop-filter:\s*blur\(/i.test(content)) {
    blurIssues++;
    console.log(`  ❌ Heavy CSS backdrop-filter blur in ${path.relative(frontendRoot, file)}`);
  }
});
if (blurIssues === 0) {
  console.log('  ✅ 100% Clean: Zero heavy GPU blur shaders or packages found.');
}

console.log('\n================================================================================');
console.log('📊 AUDIT SUMMARY:');
console.log(`  Missing tabularNums: ${missingTabularNums.length}`);
console.log(`  CTA Violations: ${ctaViolations.length}`);
console.log(`  Toast Violations: ${toastViolations.length}`);
console.log(`  Heavy GPU Blur Violations: ${blurIssues}`);
console.log('================================================================================');
