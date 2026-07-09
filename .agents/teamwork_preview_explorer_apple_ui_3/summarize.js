const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('e:\\posa\\.agents\\teamwork_preview_explorer_apple_ui_3\\search_results.json', 'utf8'));

let output = '';

output += '--- ROUNDED CLASSES (> 4px) BY FILE ---\n';
const roundedByFile = {};
data.forEach(item => {
  if (item.type === 'rounded') {
    if (!roundedByFile[item.file]) roundedByFile[item.file] = [];
    roundedByFile[item.file].push({ line: item.line, text: item.text, matches: item.matches });
  }
});

for (const [file, items] of Object.entries(roundedByFile)) {
  const relativePath = path.relative('e:\\posa\\frontend', file);
  output += `\nFile: ${relativePath} (${items.length} occurrences)\n`;
  items.forEach(item => {
    output += `  Line ${item.line}: ${item.matches.join(', ')} -> "${item.text}"\n`;
  });
}

output += '\n--- RESPONSIVE SCALING BY FILE ---\n';
const responsiveByFile = {};
data.forEach(item => {
  if (item.type === 'responsive') {
    if (!responsiveByFile[item.file]) responsiveByFile[item.file] = [];
    responsiveByFile[item.file].push({ line: item.line, text: item.text });
  }
});

for (const [file, items] of Object.entries(responsiveByFile)) {
  const relativePath = path.relative('e:\\posa\\frontend', file);
  output += `\nFile: ${relativePath} (${items.length} occurrences)\n`;
  items.forEach(item => {
    output += `  Line ${item.line}: "${item.text}"\n`;
  });
}

fs.writeFileSync('e:\\posa\\.agents\\teamwork_preview_explorer_apple_ui_3\\summary.txt', output, 'utf8');
console.log('Summary written successfully.');
