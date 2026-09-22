const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve('d:/duanpos-ongchu/frontend');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'tests') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = [...walk(path.join(frontendRoot, 'app')), ...walk(path.join(frontendRoot, 'lib', 'components'))];

const trueMissing = [];
const trueWithTabular = [];

for (const file of allFiles) {
  const rel = path.relative(frontendRoot, file);
  const content = fs.readFileSync(file, 'utf8');

  // Match each <AppText ... > ... </AppText>
  // Let's find each opening <AppText
  let idx = 0;
  while ((idx = content.indexOf('<AppText', idx)) !== -1) {
    // find end of opening tag
    let openEnd = content.indexOf('>', idx);
    if (openEnd === -1) break;
    // check if self-closing
    const isSelfClosing = content[openEnd - 1] === '/';
    const tagHeader = content.substring(idx, openEnd + 1);
    const hasTabularProp = tagHeader.includes('tabularNums') || tagHeader.includes("fontVariant: ['tabular-nums']");

    let childrenText = '';
    let closeIdx = -1;
    if (!isSelfClosing) {
      // Find matching </AppText> (account for possible nested)
      let searchPos = openEnd + 1;
      let depth = 1;
      while (depth > 0 && searchPos < content.length) {
        const nextOpen = content.indexOf('<AppText', searchPos);
        const nextClose = content.indexOf('</AppText>', searchPos);
        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 8;
        } else {
          depth--;
          if (depth === 0) {
            childrenText = content.substring(openEnd + 1, nextClose);
            closeIdx = nextClose + 10;
          } else {
            searchPos = nextClose + 10;
          }
        }
      }
    } else {
      closeIdx = openEnd + 1;
    }

    const lineNum = content.substring(0, idx).split('\n').length;

    // Check if children contain number / money / qty / time / code
    const isNumericContent = 
      /(\bformatCurrency|\bformatVND|\bformatPrice|\.toLocaleString|\bformatMoney|\bformatNumber)/.test(childrenText) ||
      /(\btotalAmount|\bsubTotal|\bfinalTotal|\btotalQty|\bcartQty|\bitemCount|\belapsedMin|\bdifferenceAmount|\bexpectedEndingCash)/.test(childrenText) ||
      /\b(HD|BILL|ORD|INV|DH|KDS|CHỜ|BAN|BÀN|CA|VOUCHER|MÃ|SL)[-_ #:]?\d+/i.test(childrenText) ||
      /đ|₫|VND|VNĐ/.test(childrenText) && /\d|\{|price|amount|total|cost|fee|qty/i.test(childrenText);

    if (isNumericContent) {
      if (hasTabularProp) {
        trueWithTabular.push({ file: rel, line: lineNum, children: childrenText.trim().replace(/\s+/g, ' ').slice(0, 60) });
      } else {
        trueMissing.push({
          file: rel,
          line: lineNum,
          tagHeader: tagHeader.replace(/\s+/g, ' ').slice(0, 80),
          children: childrenText.trim().replace(/\s+/g, ' ').slice(0, 80),
        });
      }
    }

    idx = openEnd + 1;
  }
}

console.log('================================================================================');
console.log(`ACCURATE TABULAR NUMS PARSER:`);
console.log(`  Numeric AppText blocks with explicit tabularNums: ${trueWithTabular.length}`);
console.log(`  Numeric AppText blocks WITHOUT tabularNums: ${trueMissing.length}`);
console.log(`  Compliance percentage: ${((trueWithTabular.length / (trueWithTabular.length + trueMissing.length)) * 100).toFixed(1)}%`);
console.log('================================================================================\n');

if (trueMissing.length > 0) {
  console.log('Exact list of missing tabularNums:');
  trueMissing.forEach(m => {
    console.log(`  [MISSING] ${m.file}:${m.line}`);
    console.log(`            Tag: ${m.tagHeader}`);
    console.log(`            Content: ${m.children}\n`);
  });
}
