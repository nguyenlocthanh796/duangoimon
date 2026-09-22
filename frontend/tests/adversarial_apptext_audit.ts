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

console.log(`Auditing ${allFiles.length} files in frontend/app and frontend/lib/components...\n`);

// 1. Direct <Text> usages (bypassing AppText)
const rawTextUsages: string[] = [];
for (const file of allFiles) {
  if (file.endsWith('AppText.tsx')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line imports Text from react-native or renders <Text
    if (line.match(/<Text\b/) && !line.includes('//') && !line.includes('TextInput')) {
      rawTextUsages.push(`${path.relative(frontendRoot, file)}:${idx + 1} -> ${line.trim()}`);
    }
  });
}

console.log(`1. Raw <Text> usages (bypassing AppText): ${rawTextUsages.length}`);
rawTextUsages.forEach(u => console.log('  ⚠️ ' + u));

// 2. <AppText> with style overriding fontSize or lineHeight
const appTextOverrides: string[] = [];
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Regex to find <AppText ... style={...}>
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('<AppText') && (line.includes('fontSize') || line.includes('lineHeight'))) {
      appTextOverrides.push(`${path.relative(frontendRoot, file)}:${idx + 1} -> ${line.trim()}`);
    }
  });
}

console.log(`\n2. AppText with inline fontSize / lineHeight: ${appTextOverrides.length}`);
appTextOverrides.forEach(u => console.log('  ⚠️ ' + u));

// 3. Scan for hardcoded HEX colors in TSX/TS files (excluding colors.ts, theme definitions, and svg paths)
const hexMatches: Array<{ file: string; line: number; hex: string; snippet: string }> = [];
const allowedHexPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

for (const file of allFiles) {
  const relPath = path.relative(frontendRoot, file);
  // Allow SVG backdrop files or theme files
  if (relPath.includes('theme') || relPath.includes('Svg') || relPath.includes('TableSvgBackdrop')) continue;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('//') && !line.includes('http')) return; // ignore comments
    if (line.includes('unsplash.com') || line.includes('http')) return; // ignore image urls

    const matches = line.match(allowedHexPattern);
    if (matches) {
      for (const hex of matches) {
        // Ignore #FFFFFF or #000000 in badges/icons where white text on colored badge is required
        if (hex.toUpperCase() === '#FFFFFF' || hex.toUpperCase() === '#FFF' || hex.toUpperCase() === '#000000' || hex.toUpperCase() === '#000') {
          continue;
        }
        hexMatches.push({
          file: relPath,
          line: idx + 1,
          hex,
          snippet: line.trim(),
        });
      }
    }
  });
}

console.log(`\n3. Hardcoded Hex Colors (Non-White/Black): ${hexMatches.length}`);
const hexGrouped: Record<string, number> = {};
hexMatches.forEach(h => {
  hexGrouped[h.file] = (hexGrouped[h.file] || 0) + 1;
  console.log(`  🔍 ${h.file}:${h.line} [${h.hex}] -> ${h.snippet.slice(0, 80)}`);
});

console.log('\nSummary by file:');
console.log(hexGrouped);

console.log('\n========================================');
console.log(`Typography Audit Result:`);
console.log(`- Raw <Text> tags: ${rawTextUsages.length}`);
console.log(`- AppText font overrides: ${appTextOverrides.length}`);
console.log('========================================');

if (rawTextUsages.length > 0 || appTextOverrides.length > 0) {
  console.error('\n❌ FAIL: Typography scale violation detected!');
  process.exit(1);
} else {
  console.log('\n✅ PASS: 100% Typography compliance achieved!');
}
