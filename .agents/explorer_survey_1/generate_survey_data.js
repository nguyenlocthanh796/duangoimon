const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'scan_results.json'), 'utf8'));

// Categorize all occurrences
const report = {
  themeTokensAnalysis: {},
  appScreens: {},
  componentsUI: {},
  componentsPOS: {},
  componentsOther: {},
  storeFiles: {},
  testFiles: {}
};

for (const [file, items] of Object.entries(data.grouped)) {
  if (file.startsWith('frontend/app/')) {
    report.appScreens[file] = items;
  } else if (file.startsWith('frontend/lib/components/ui/')) {
    report.componentsUI[file] = items;
  } else if (file.startsWith('frontend/lib/components/pos/')) {
    report.componentsPOS[file] = items;
  } else if (file.startsWith('frontend/lib/components/')) {
    report.componentsOther[file] = items;
  } else if (file.startsWith('frontend/lib/store/')) {
    report.storeFiles[file] = items;
  } else if (file.startsWith('frontend/tests/')) {
    report.testFiles[file] = items;
  }
}

fs.writeFileSync(
  path.join(__dirname, 'categorized_occurrences.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('Categorized occurrences generated.');
