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

let totalNumericAppText = 0;
let tabularAppText = 0;
const missingList: Array<{ file: string; line: number; snippet: string }> = [];

for (const file of allFiles) {
  const relPath = path.relative(frontendRoot, file);
  const content = fs.readFileSync(file, 'utf-8');
  
  // Find all <AppText ...> ... </AppText> blocks
  const appTextRegex = /<AppText([\s\S]*?)>([\s\S]*?)<\/AppText>/g;
  let match: RegExpExecArray | null;

  while ((match = appTextRegex.exec(content)) !== null) {
    const props = match[1];
    const children = match[2];
    
    // Check if children contain numeric variables or formatting
    const isNumeric = 
      children.includes('toLocaleString') ||
      children.includes('totalAmount') ||
      children.includes('totalQty') ||
      children.includes('subTotal') ||
      children.includes('finalTotal') ||
      children.includes('cartQty') ||
      children.includes('price') ||
      children.includes('amount') ||
      children.includes('elapsedMin') ||
      children.includes('differenceAmount') ||
      children.includes('expectedEndingCash') ||
      children.includes('{code}') ||
      children.includes('đ') ||
      children.includes('VND') ||
      children.includes('phút') ||
      children.includes(' món');

    if (isNumeric) {
      totalNumericAppText++;
      const hasTabular = props.includes('tabularNums') || props.includes("fontVariant: ['tabular-nums']");
      if (hasTabular) {
        tabularAppText++;
      } else {
        const lineNum = content.substring(0, match.index).split('\n').length;
        missingList.push({
          file: relPath,
          line: lineNum,
          snippet: `<AppText${props.trim().slice(0, 40)}...>${children.trim().slice(0, 40)}...</AppText>`,
        });
      }
    }
  }
}

console.log(`\n================================================================================`);
console.log(`📊 TABULAR NUMS DETAILED SCAN:`);
console.log(`  Total numeric AppText blocks found: ${totalNumericAppText}`);
console.log(`  With tabularNums enabled: ${tabularAppText} (${((tabularAppText / (totalNumericAppText || 1)) * 100).toFixed(1)}%)`);
console.log(`  Without tabularNums: ${missingList.length}`);
console.log(`================================================================================\n`);

if (missingList.length > 0) {
  console.log('Instances without explicit tabularNums (checking if non-numeric/textual):');
  missingList.forEach(m => console.log(`  🔍 ${m.file}:${m.line} -> ${m.snippet.replace(/\n/g, ' ')}`));
}
