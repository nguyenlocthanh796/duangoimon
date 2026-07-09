const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('e:\\posa\\.agents\\teamwork_preview_explorer_apple_ui_3\\search_results.json', 'utf8'));

let output = '';
const roundedByFile = {};
data.forEach(item => {
  if (item.type === 'rounded') {
    if (!roundedByFile[item.file]) roundedByFile[item.file] = [];
    roundedByFile[item.file].push({ line: item.line, text: item.text, matches: item.matches });
  }
});

for (const [file, items] of Object.entries(roundedByFile)) {
  const relativePath = path.relative('e:\\posa\\frontend', file);
  // Let's filter to files in lib/
  if (relativePath.startsWith('lib')) {
    output += `\nFile: ${relativePath} (${items.length} occurrences)\n`;
    items.forEach(item => {
      output += `  Line ${item.line}: ${item.matches.join(', ')} -> "${item.text}"\n`;
    });
  }
}

fs.writeFileSync('e:\\posa\\.agents\\teamwork_preview_explorer_apple_ui_3\\summary_lib.txt', output, 'utf8');
console.log('Summary lib written successfully.');
