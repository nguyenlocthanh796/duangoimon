const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'scan_results.json'), 'utf8'));

console.log('=== FRONTEND/LIB/COMPONENTS BREAKDOWN ===');
for (const [file, items] of Object.entries(data.grouped)) {
  if (file.startsWith('frontend/lib/components/')) {
    const colors = [...new Set(items.map(i => i.color))];
    console.log(`${file} (${items.length} occurrences): ${colors.join(', ')}`);
  }
}
