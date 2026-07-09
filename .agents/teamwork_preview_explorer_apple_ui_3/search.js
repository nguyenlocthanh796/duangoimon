const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'dist-test' && file !== 'dist_tests' && file !== '.git' && file !== '.expo') {
        walk(filepath, callback);
      }
    } else if (stat.isFile()) {
      if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        callback(filepath);
      }
    }
  }
};

const results = [];

walk('e:\\posa\\frontend', (filepath) => {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Search for rounded / borderRadius
    const roundedMatch = line.match(/(rounded-\w+|borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)/gi);
    if (roundedMatch) {
      results.push({
        file: filepath,
        line: index + 1,
        type: 'rounded',
        text: line.trim(),
        matches: roundedMatch
      });
    }

    // Search for touch target sizes and padding/height of buttons/inputs
    if (line.includes('TextInput') || line.includes('TouchableOpacity') || line.includes('Pressable') || line.match(/height:\s*\d+/i) || line.match(/paddingVertical:\s*\d+/i)) {
      results.push({
        file: filepath,
        line: index + 1,
        type: 'interactive',
        text: line.trim()
      });
    }

    // Search for Dimensions or responsive scaling
    if (line.includes('Dimensions.get') || line.includes('useWindowDimensions') || line.includes('scale(') || line.includes('Platform.OS')) {
      results.push({
        file: filepath,
        line: index + 1,
        type: 'responsive',
        text: line.trim()
      });
    }
  });
});

fs.writeFileSync('e:\\posa\\.agents\\teamwork_preview_explorer_apple_ui_3\\search_results.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Search results written successfully.');
