const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'scan_results.json'), 'utf8'));

console.log('--- COLOR FREQUENCY (Top 30) ---');
const sortedColors = Object.entries(data.colorFrequency).sort((a, b) => b[1] - a[1]);
sortedColors.slice(0, 30).forEach(([c, count]) => {
  console.log(`${c}: ${count}`);
});

console.log('\n--- BY CATEGORY / DIRECTORY ---');
const appFiles = {};
const componentFiles = {};
const storeFiles = {};
const testFiles = {};
const otherFiles = {};

for (const [file, items] of Object.entries(data.grouped)) {
  if (file.startsWith('frontend/app/')) {
    appFiles[file] = items;
  } else if (file.startsWith('frontend/lib/components/')) {
    componentFiles[file] = items;
  } else if (file.startsWith('frontend/lib/store/')) {
    storeFiles[file] = items;
  } else if (file.startsWith('frontend/tests/')) {
    testFiles[file] = items;
  } else {
    otherFiles[file] = items;
  }
}

console.log(`frontend/app/: ${Object.keys(appFiles).length} files, ${Object.values(appFiles).reduce((s, a) => s + a.length, 0)} occurrences`);
console.log(`frontend/lib/components/: ${Object.keys(componentFiles).length} files, ${Object.values(componentFiles).reduce((s, a) => s + a.length, 0)} occurrences`);
console.log(`frontend/lib/store/: ${Object.keys(storeFiles).length} files, ${Object.values(storeFiles).reduce((s, a) => s + a.length, 0)} occurrences`);
console.log(`frontend/tests/: ${Object.keys(testFiles).length} files, ${Object.values(testFiles).reduce((s, a) => s + a.length, 0)} occurrences`);
console.log(`other: ${Object.keys(otherFiles).length} files, ${Object.values(otherFiles).reduce((s, a) => s + a.length, 0)} occurrences`);

console.log('\n--- 10 POS SCREENS IN frontend/app/ ---');
const posScreens = [
  'frontend/app/index.tsx',
  'frontend/app/thanh-toan/index.tsx',
  'frontend/app/kds/index.tsx',
  'frontend/app/hoa-don/index.tsx',
  'frontend/app/thuc-don/index.tsx',
  'frontend/app/cai-dat/index.tsx',
  'frontend/app/so-quy/index.tsx',
  'frontend/app/giao-ca/index.tsx',
  'frontend/app/bao-cao-loi-nhuan/index.tsx',
  'frontend/app/cfd/index.tsx',
  'frontend/app/_layout.tsx'
];

posScreens.forEach(scr => {
  const items = appFiles[scr] || [];
  console.log(`Screen ${scr}: ${items.length} occurrences`);
  if (items.length > 0) {
    // Show unique colors
    const colors = [...new Set(items.map(i => i.color))];
    console.log(`   Unique colors: ${colors.join(', ')}`);
  }
});

console.log('\n--- OTHER SCREENS IN frontend/app/ ---');
for (const [file, items] of Object.entries(appFiles)) {
  if (!posScreens.includes(file)) {
    const colors = [...new Set(items.map(i => i.color))];
    console.log(`Screen ${file}: ${items.length} occurrences [${colors.join(', ')}]`);
  }
}
