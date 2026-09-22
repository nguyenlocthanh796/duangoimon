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

const appFiles = walk(path.join(frontendRoot, 'app'));
const compFiles = walk(path.join(frontendRoot, 'lib', 'components'));
const allFiles = [...appFiles, ...compFiles];

const variantsCount = {};
const non7ScaleVariants = [];
const weightsCount = { normal: 0, medium: 0, bold: 0, other: 0, unspecified: 0 };
const rawTextViolations = [];
const inlineOverrides = [];
const missingTabularList = [];
const textInputFontSizes = [];

const standard7 = new Set(['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'display']);

for (const file of allFiles) {
  const rel = path.relative(frontendRoot, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // Check raw Text
  if (!file.endsWith('AppText.tsx')) {
    lines.forEach((line, idx) => {
      if (/<Text\b/.test(line) && !line.includes('//') && !line.includes('TextInput') && !line.includes('AppText')) {
        rawTextViolations.push({ file: rel, line: idx + 1, content: line.trim() });
      }
    });
  }

  // Check TextInput fontSize
  lines.forEach((line, idx) => {
    const fsMatch = line.match(/fontSize:\s*(\d+)/);
    if (fsMatch) {
      const size = parseInt(fsMatch[1], 10);
      textInputFontSizes.push({ file: rel, line: idx + 1, size, lineText: line.trim() });
    }
  });

  // Check <AppText ...>
  const appTextTagRegex = /<AppText\b([^>]*?)(\/?>)/g;
  let tagMatch;
  while ((tagMatch = appTextTagRegex.exec(content)) !== null) {
    const attrs = tagMatch[1];
    const lineNum = content.substring(0, tagMatch.index).split('\n').length;

    // Check variant
    const variantMatch = attrs.match(/variant=["']([^"']+)["']/);
    if (variantMatch) {
      const v = variantMatch[1];
      variantsCount[v] = (variantsCount[v] || 0) + 1;
      if (!standard7.has(v)) {
        non7ScaleVariants.push({ file: rel, line: lineNum, variant: v, snippet: tagMatch[0].slice(0, 50) });
      }
    } else {
      // Default variant
      variantsCount['(default:bodyMedium)'] = (variantsCount['(default:bodyMedium)'] || 0) + 1;
    }

    // Check weight
    const weightMatch = attrs.match(/weight=["']([^"']+)["']/);
    if (weightMatch) {
      const w = weightMatch[1];
      if (w === 'normal') weightsCount.normal++;
      else if (w === 'medium') weightsCount.medium++;
      else if (w === 'bold') weightsCount.bold++;
      else {
        weightsCount.other++;
        console.log(`Other weight: ${w} in ${rel}:${lineNum}`);
      }
    } else {
      weightsCount.unspecified++;
    }

    // Check inline style fontSize/lineHeight
    if (attrs.includes('fontSize') || attrs.includes('lineHeight')) {
      inlineOverrides.push({ file: rel, line: lineNum, snippet: tagMatch[0] });
    }
  }

  // Check tabularNums for numeric content
  const appTextBlockRegex = /<AppText([\s\S]*?)>([\s\S]*?)<\/AppText>/g;
  let blockMatch;
  while ((blockMatch = appTextBlockRegex.exec(content)) !== null) {
    const props = blockMatch[1];
    const children = blockMatch[2];
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
      const hasTabular = props.includes('tabularNums') || props.includes("fontVariant: ['tabular-nums']");
      if (!hasTabular) {
        const lineNum = content.substring(0, blockMatch.index).split('\n').length;
        missingTabularList.push({
          file: rel,
          line: lineNum,
          children: children.trim().replace(/\s+/g, ' ').slice(0, 60),
          snippet: `<AppText${props.trim().slice(0, 40)}...>`,
        });
      }
    }
  }
}

console.log('====================================================');
console.log('EXPLORER 3: TYPOGRAPHY & TABULAR NUMS AUDIT RESULTS');
console.log('====================================================\n');

console.log(`Files scanned: ${allFiles.length}`);
console.log(`Raw <Text> violations: ${rawTextViolations.length}`);
console.log(`Inline fontSize/lineHeight on AppText: ${inlineOverrides.length}`);

console.log('\n--- VARIANTS COUNT ---');
console.log(variantsCount);

console.log(`\nNon-7-Scale Variants: ${non7ScaleVariants.length}`);
if (non7ScaleVariants.length > 0) {
  non7ScaleVariants.forEach(v => console.log(`  ❌ ${v.file}:${v.line} -> variant="${v.variant}"`));
}

console.log('\n--- WEIGHTS DISTRIBUTION ---');
const totalExplicitWeights = weightsCount.normal + weightsCount.medium + weightsCount.bold;
console.log(weightsCount);
console.log(`Normal + Medium ratio (of explicit weights): ${(((weightsCount.normal + weightsCount.medium) / (totalExplicitWeights || 1)) * 100).toFixed(1)}%`);
console.log(`Total AppText instances scanned: ${totalExplicitWeights + weightsCount.unspecified}`);

console.log(`\n--- TABULAR NUMS AUDIT ---`);
console.log(`Missing tabularNums on numeric AppText: ${missingTabularList.length}`);
console.log(`Sample missing tabularNums (first 25):`);
missingTabularList.slice(0, 25).forEach(m => console.log(`  ⚠️ ${m.file}:${m.line} -> "${m.children}"`));

console.log('\n--- TEXTINPUT FONT SIZES ---');
const fsHistogram = {};
const nonStandardFs = [];
textInputFontSizes.forEach(f => {
  fsHistogram[f.size] = (fsHistogram[f.size] || 0) + 1;
  if (![14, 16, 22].includes(f.size)) {
    nonStandardFs.push(f);
  }
});
console.log('Font size histogram:', fsHistogram);
console.log(`Non-standard fontSize count (!= 14, 16, 22): ${nonStandardFs.length}`);
nonStandardFs.forEach(f => console.log(`  ❌ ${f.file}:${f.line} -> fontSize: ${f.size} (${f.lineText})`));
