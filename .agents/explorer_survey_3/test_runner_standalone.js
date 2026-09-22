const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testsDir = path.resolve('d:/duanpos-ongchu/frontend/tests');
const filesToTest = [
  'adversarial_theme_tokens.test.ts',
  'adversarial_m2_stress.ts',
  'adversarial_tabular_nums.ts',
  'adversarial_apptext_audit.ts',
  'adversarial_m1_theme_stress.ts',
  'adversarial_discount_guard.test.ts',
  'adversarial_kds_clock_isolation.test.ts',
  'adversarial_m3_challenger.ts',
  'adversarial_m3_forensic_audit.ts',
  'challenger_apptext_stress.ts',
  'challenger_m3_comprehensive_audit.ts',
  'challenger_nav_hig.ts',
  'scan_adversarial.ts'
];

const results = [];

for (const f of filesToTest) {
  console.log(`\nTesting ${f}...`);
  try {
    const out = execSync(`npx ts-node tests/${f}`, {
      cwd: path.resolve('d:/duanpos-ongchu/frontend'),
      encoding: 'utf8',
      timeout: 20000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    console.log(`  ✅ PASS`);
    results.push({ file: f, status: 'PASS', error: null });
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message.split('\n')[0]}`);
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    const errOutput = (stderr || stdout).split('\n').slice(-10).join('\n');
    results.push({ file: f, status: 'FAIL', error: errOutput });
  }
}

console.log('\n====================================================');
console.log('STANDALONE TEST RESULTS SUMMARY:');
console.log('====================================================');
results.forEach(r => {
  console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.file}: ${r.status}`);
  if (r.error) {
    console.log('   Error excerpt:');
    console.log(r.error.split('\n').map(l => '     ' + l).join('\n'));
  }
});
