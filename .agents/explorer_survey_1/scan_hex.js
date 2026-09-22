const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const targetDirs = [
  path.join(rootDir, 'frontend/app'),
  path.join(rootDir, 'frontend/lib/components'),
  path.join(rootDir, 'frontend/lib/store'),
  path.join(rootDir, 'frontend/lib/utils'),
  path.join(rootDir, 'frontend/lib/hooks'),
  path.join(rootDir, 'frontend/tests')
];

const excludeDirs = [
  path.join(rootDir, 'frontend/lib/theme'),
  path.join(rootDir, 'frontend/node_modules'),
  path.join(rootDir, 'frontend/.expo'),
  path.join(rootDir, 'frontend/dist')
];

// Regex for hex color codes: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;

const results = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  if (excludeDirs.some(ex => dir.startsWith(ex))) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.expo' || item === 'dist' || item === '.git') continue;
      walk(full);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
      scanFile(full);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  
  lines.forEach((line, idx) => {
    let match;
    hexRegex.lastIndex = 0;
    while ((match = hexRegex.exec(line)) !== null) {
      results.push({
        file: relPath,
        line: idx + 1,
        color: match[0].toUpperCase(),
        lineContent: line.trim()
      });
    }
  });
}

targetDirs.forEach(d => walk(d));

// Group by file
const grouped = {};
const colorFrequency = {};

for (const r of results) {
  if (!grouped[r.file]) grouped[r.file] = [];
  grouped[r.file].push(r);
  
  colorFrequency[r.color] = (colorFrequency[r.color] || 0) + 1;
}

const summary = {
  totalOccurrences: results.length,
  totalFiles: Object.keys(grouped).length,
  colorFrequency,
  grouped
};

fs.writeFileSync(
  path.join(__dirname, 'scan_results.json'),
  JSON.stringify(summary, null, 2),
  'utf8'
);

console.log(`Scan completed: ${results.length} occurrences across ${Object.keys(grouped).length} files.`);
console.log(`Results saved to scan_results.json`);
