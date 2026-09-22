const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testsDir = path.resolve('d:/duanpos-ongchu/frontend/tests');
const runAllFile = fs.readFileSync(path.join(testsDir, 'run_all_tests.ts'), 'utf8');

const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

const inRunner = [];
const notInRunner = [];

files.forEach(f => {
  const base = f.replace(/\.ts$/, '');
  if (runAllFile.includes(base)) {
    inRunner.push(f);
  } else {
    notInRunner.push(f);
  }
});

console.log('Total test files in frontend/tests:', files.length);
console.log('Included in run_all_tests.ts:', inRunner.length);
console.log('NOT included in run_all_tests.ts:', notInRunner.length);

console.log('\nFiles NOT in run_all_tests.ts:');
notInRunner.forEach(f => console.log('  -', f));
