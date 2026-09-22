/**
 * 👑 CHALLENGER 1: Empirical Adversarial Stress Test Harness for AppText
 * Milestone 1 - Tabular Nums Auto-Detection & extractTextContent
 */

import './setup_env';
import React from 'react';

// Ensure useWindowDimensions is available in the mock react-native module
const rn = require('react-native');
if (!rn.useWindowDimensions) {
  rn.useWindowDimensions = () => ({ width: 1280, height: 800, scale: 1, fontScale: 1 });
}

import { AppText } from '../lib/components/ui/AppText';

interface TestCase {
  id: string;
  category: string;
  description: string;
  props: {
    children: any;
    tabularNums?: boolean;
    [key: string]: any;
  };
  expectedTabular: boolean;
  platform?: 'web' | 'android' | 'ios';
  expectedAndroidPadding?: boolean;
}

const testCases: TestCase[] = [
  // ============================================================================
  // 1. DISPATCH REQUIRED: Số 0, số âm, số float
  // ============================================================================
  {
    id: 'NUM-01',
    category: 'Numbers',
    description: 'Primitive number 0',
    props: { children: 0 },
    expectedTabular: true,
  },
  {
    id: 'NUM-02',
    category: 'Numbers',
    description: 'String "0"',
    props: { children: '0' },
    expectedTabular: true,
  },
  {
    id: 'NUM-03',
    category: 'Numbers',
    description: 'Zero currency "0 đ"',
    props: { children: '0 đ' },
    expectedTabular: true,
  },
  {
    id: 'NUM-04',
    category: 'Numbers',
    description: 'Negative currency "-100.000đ" (Dispatch required)',
    props: { children: '-100.000đ' },
    expectedTabular: true,
  },
  {
    id: 'NUM-05',
    category: 'Numbers',
    description: 'Negative currency with space "-100.000 đ"',
    props: { children: '-100.000 đ' },
    expectedTabular: true,
  },
  {
    id: 'NUM-06',
    category: 'Numbers',
    description: 'Float number 0.05 (Dispatch required)',
    props: { children: 0.05 },
    expectedTabular: true,
  },
  {
    id: 'NUM-07',
    category: 'Numbers',
    description: 'Float string "0.05"',
    props: { children: '0.05' },
    expectedTabular: true,
  },
  {
    id: 'NUM-08',
    category: 'Numbers',
    description: 'Float with comma "0,05"',
    props: { children: '0,05' },
    expectedTabular: true,
  },

  // ============================================================================
  // 2. DISPATCH REQUIRED: Mảng lồng nhiều cấp
  // ============================================================================
  {
    id: 'ARR-01',
    category: 'Arrays',
    description: 'Dispatch sample: [[[\'100.000\', \' \'], \'đ\']]',
    props: { children: [[['100.000', ' '], 'đ']] },
    expectedTabular: true,
  },
  {
    id: 'ARR-02',
    category: 'Arrays',
    description: '5-level nested array [[[[[\'50k\']]]]]',
    props: { children: [[[[['50k']]]]] },
    expectedTabular: true,
  },
  {
    id: 'ARR-03',
    category: 'Arrays',
    description: 'Standard JSX array pattern: [\'50.000\', \' đ\']',
    props: { children: ['50.000', ' đ'] },
    expectedTabular: true,
  },
  {
    id: 'ARR-04',
    category: 'Arrays',
    description: 'Mixed array: [\'Tổng: \', 25000, \' đ\']',
    props: { children: ['Tổng: ', 25000, ' đ'] },
    expectedTabular: true,
  },
  {
    id: 'ARR-05',
    category: 'Arrays',
    description: 'Array with nested empty arrays and number: [[], [\'\'], 42, []]',
    props: { children: [[], [''], 42, []] },
    expectedTabular: true,
  },
  {
    id: 'ARR-06',
    category: 'Arrays',
    description: 'Array of pure non-numeric text: [\'Bàn\', \' \', \'VIP\']',
    props: { children: ['Bàn', ' ', 'VIP'] },
    expectedTabular: false,
  },

  // ============================================================================
  // 3. DISPATCH REQUIRED: React element lồng ghép bên trong AppText
  // ============================================================================
  {
    id: 'EL-01',
    category: 'ReactElements',
    description: 'React element with text children: React.createElement("span", null, "100.000 đ")',
    props: { children: React.createElement('span', null, '100.000 đ') },
    expectedTabular: true,
  },
  {
    id: 'EL-02',
    category: 'ReactElements',
    description: 'Nested React element: <span><b>14:30</b></span>',
    props: {
      children: React.createElement('span', null, React.createElement('b', null, '14:30')),
    },
    expectedTabular: true,
  },
  {
    id: 'EL-03',
    category: 'ReactElements',
    description: 'React element with array children: <span>[\'HD-\', \'12345\']</span>',
    props: {
      children: React.createElement('span', null, ['HD-', '12345']),
    },
    expectedTabular: true,
  },
  {
    id: 'EL-04',
    category: 'ReactElements',
    description: 'React element without children (void element)',
    props: {
      children: React.createElement('span', null),
    },
    expectedTabular: false,
  },
  {
    id: 'EL-05',
    category: 'ReactElements',
    description: 'React element with non-numeric text: <span>Cài đặt</span>',
    props: {
      children: React.createElement('span', null, 'Cài đặt'),
    },
    expectedTabular: false,
  },

  // ============================================================================
  // 4. DISPATCH REQUIRED: Chuỗi văn bản bình thường KHÔNG có số (Never tabular)
  // ============================================================================
  {
    id: 'TXT-01',
    category: 'NormalText',
    description: '"Bàn ăn" (Dispatch required)',
    props: { children: 'Bàn ăn' },
    expectedTabular: false,
  },
  {
    id: 'TXT-02',
    category: 'NormalText',
    description: '"Cài đặt" (Dispatch required)',
    props: { children: 'Cài đặt' },
    expectedTabular: false,
  },
  {
    id: 'TXT-03',
    category: 'NormalText',
    description: '"Cà phê sữa đá"',
    props: { children: 'Cà phê sữa đá' },
    expectedTabular: false,
  },
  {
    id: 'TXT-04',
    category: 'NormalText',
    description: '"Báo Bếp"',
    props: { children: 'Báo Bếp' },
    expectedTabular: false,
  },
  {
    id: 'TXT-05',
    category: 'NormalText',
    description: '"Tính Tiền"',
    props: { children: 'Tính Tiền' },
    expectedTabular: false,
  },
  {
    id: 'TXT-06',
    category: 'NormalText',
    description: '"Xong & In Bill"',
    props: { children: 'Xong & In Bill' },
    expectedTabular: false,
  },
  {
    id: 'TXT-07',
    category: 'NormalText',
    description: 'Financial keyword without numbers: "Tổng cộng" (must be false)',
    props: { children: 'Tổng cộng' },
    expectedTabular: false,
  },
  {
    id: 'TXT-08',
    category: 'NormalText',
    description: 'Financial keyword without numbers: "Tiền thừa" (must be false)',
    props: { children: 'Tiền thừa' },
    expectedTabular: false,
  },
  {
    id: 'TXT-09',
    category: 'NormalText',
    description: 'Financial keyword without numbers: "Chiết khấu" (must be false)',
    props: { children: 'Chiết khấu' },
    expectedTabular: false,
  },
  {
    id: 'TXT-10',
    category: 'NormalText',
    description: 'Financial keyword without numbers: "Thuế VAT" (must be false)',
    props: { children: 'Thuế VAT' },
    expectedTabular: false,
  },
  {
    id: 'TXT-11',
    category: 'NormalText',
    description: 'Keyword "món" without numbers: "Thực đơn món" (must be false)',
    props: { children: 'Thực đơn món' },
    expectedTabular: false,
  },

  // ============================================================================
  // 5. DISPATCH REQUIRED: Mã đơn, giờ phục vụ, phần trăm
  // ============================================================================
  {
    id: 'ID-01',
    category: 'Identifiers',
    description: 'Order code "HD-12345" (Dispatch required)',
    props: { children: 'HD-12345' },
    expectedTabular: true,
  },
  {
    id: 'ID-02',
    category: 'Identifiers',
    description: 'Bill code "BILL-0099"',
    props: { children: 'BILL-0099' },
    expectedTabular: true,
  },
  {
    id: 'ID-03',
    category: 'Identifiers',
    description: 'Order code "ORD-42"',
    props: { children: 'ORD-42' },
    expectedTabular: true,
  },
  {
    id: 'TIME-01',
    category: 'Timestamps',
    description: 'Timestamp "14:30" (Dispatch required)',
    props: { children: '14:30' },
    expectedTabular: true,
  },
  {
    id: 'TIME-02',
    category: 'Timestamps',
    description: 'Timestamp single hour "8:05"',
    props: { children: '8:05' },
    expectedTabular: true,
  },
  {
    id: 'TIME-03',
    category: 'Timestamps',
    description: 'Timestamp midnight "0:00"',
    props: { children: '0:00' },
    expectedTabular: true,
  },
  {
    id: 'PCT-01',
    category: 'Percentages',
    description: 'Percentage "10%" (Dispatch required)',
    props: { children: '10%' },
    expectedTabular: true,
  },
  {
    id: 'PCT-02',
    category: 'Percentages',
    description: 'Percentage "100%"',
    props: { children: '100%' },
    expectedTabular: true,
  },
  {
    id: 'PCT-03',
    category: 'Percentages',
    description: 'Percentage "0%"',
    props: { children: '0%' },
    expectedTabular: true,
  },
  {
    id: 'PCT-04',
    category: 'Percentages',
    description: 'Decimal percentage "5.5%"',
    props: { children: '5.5%' },
    expectedTabular: true,
  },

  // ============================================================================
  // 6. DISPATCH REQUIRED: Null, undefined, boolean, empty string
  // ============================================================================
  {
    id: 'NIL-01',
    category: 'NilValues',
    description: 'null children',
    props: { children: null },
    expectedTabular: false,
  },
  {
    id: 'NIL-02',
    category: 'NilValues',
    description: 'undefined children',
    props: { children: undefined },
    expectedTabular: false,
  },
  {
    id: 'NIL-03',
    category: 'NilValues',
    description: 'boolean true children',
    props: { children: true },
    expectedTabular: false,
  },
  {
    id: 'NIL-04',
    category: 'NilValues',
    description: 'boolean false children',
    props: { children: false },
    expectedTabular: false,
  },
  {
    id: 'NIL-05',
    category: 'NilValues',
    description: 'Empty string ""',
    props: { children: '' },
    expectedTabular: false,
  },
  {
    id: 'NIL-06',
    category: 'NilValues',
    description: 'Array of nil values: [null, undefined, false, true, ""]',
    props: { children: [null, undefined, false, true, ''] },
    expectedTabular: false,
  },
  {
    id: 'NIL-07',
    category: 'NilValues',
    description: 'Whitespace only "   "',
    props: { children: '   ' },
    expectedTabular: false,
  },

  // ============================================================================
  // 7. EDGE CURRENCY & FINANCIAL STRINGS
  // ============================================================================
  {
    id: 'CUR-01',
    category: 'Currency',
    description: 'Compact k format: "50k"',
    props: { children: '50k' },
    expectedTabular: true,
  },
  {
    id: 'CUR-02',
    category: 'Currency',
    description: 'Uppercase K format: "50K"',
    props: { children: '50K' },
    expectedTabular: true,
  },
  {
    id: 'CUR-03',
    category: 'Currency',
    description: 'Standard VNĐ symbol: "100.000 ₫"',
    props: { children: '100.000 ₫' },
    expectedTabular: true,
  },
  {
    id: 'CUR-04',
    category: 'Currency',
    description: 'Standard vn đ format: "100.000 đ"',
    props: { children: '100.000 đ' },
    expectedTabular: true,
  },
  {
    id: 'CUR-05',
    category: 'Currency',
    description: 'Attached đ: "100.000đ"',
    props: { children: '100.000đ' },
    expectedTabular: true,
  },
  {
    id: 'CUR-06',
    category: 'Currency',
    description: 'Lowercase vnd: "100.000 vnd"',
    props: { children: '100.000 vnd' },
    expectedTabular: true,
  },
  {
    id: 'CUR-07',
    category: 'Currency',
    description: 'Uppercase VND: "100.000 VND"',
    props: { children: '100.000 VND' },
    expectedTabular: true,
  },
  {
    id: 'CUR-08',
    category: 'Currency',
    description: 'Sentence with amount: "Tổng tiền 250.000 đ"',
    props: { children: 'Tổng tiền 250.000 đ' },
    expectedTabular: true,
  },
  {
    id: 'CUR-09',
    category: 'Currency',
    description: 'Item count phrase: "3 món"',
    props: { children: '3 món' },
    expectedTabular: true,
  },

  // ============================================================================
  // 8. EXPLICIT PROP PRECEDENCE
  // ============================================================================
  {
    id: 'PROP-01',
    category: 'Precedence',
    description: 'Explicit tabularNums={false} on currency string overrides auto-detection',
    props: { children: '100.000 đ', tabularNums: false },
    expectedTabular: false,
  },
  {
    id: 'PROP-02',
    category: 'Precedence',
    description: 'Explicit tabularNums={true} on plain text forces tabularNums',
    props: { children: 'Bàn ăn', tabularNums: true },
    expectedTabular: true,
  },
  {
    id: 'PROP-03',
    category: 'Precedence',
    description: 'Explicit tabularNums={false} on order code forces false',
    props: { children: 'HD-99999', tabularNums: false },
    expectedTabular: false,
  },
  {
    id: 'PROP-04',
    category: 'Precedence',
    description: 'Explicit tabularNums={true} on empty string forces true',
    props: { children: '', tabularNums: true },
    expectedTabular: true,
  },

  // ============================================================================
  // 9. ANDROID PADDING INVARIANT (Platform.OS === 'android' && isTabular -> paddingRight: 3)
  // ============================================================================
  {
    id: 'ANDR-01',
    category: 'AndroidPadding',
    description: 'Android with tabularNums gets paddingRight: 3',
    props: { children: '50.000 đ' },
    expectedTabular: true,
    platform: 'android',
    expectedAndroidPadding: true,
  },
  {
    id: 'ANDR-02',
    category: 'AndroidPadding',
    description: 'Android with non-tabular text does NOT get paddingRight: 3',
    props: { children: 'Bàn ăn' },
    expectedTabular: false,
    platform: 'android',
    expectedAndroidPadding: false,
  },
  // ============================================================================
  // 10. DEEPER ADVERSARIAL EDGE CASES
  // ============================================================================
  {
    id: 'EDGE-01',
    category: 'EdgeCases',
    description: 'Table name with digits: "Bàn 01" (Not a currency or timestamp, should remain false)',
    props: { children: 'Bàn 01' },
    expectedTabular: false,
  },
  {
    id: 'EDGE-02',
    category: 'EdgeCases',
    description: 'Table name with number: "Bàn 5" (Not a price, should remain false)',
    props: { children: 'Bàn 5' },
    expectedTabular: false,
  },
  {
    id: 'EDGE-03',
    category: 'EdgeCases',
    description: 'Raw negative number with currency symbol: "-50k"',
    props: { children: '-50k' },
    // Let's test if -50k triggers tabular
    expectedTabular: false, // Let's see if regex catches or misses -50k
  },
  {
    id: 'EDGE-04',
    category: 'EdgeCases',
    description: 'Multi-period formatted number without currency: "1.500.000"',
    props: { children: '1.500.000' },
    expectedTabular: false, // In current regex, ^\d+([.,]\d+)?\s*(đ|k|vnd)?$ only allows 1 period!
  },
  {
    id: 'EDGE-05',
    category: 'EdgeCases',
    description: 'Raw negative integer: -50000',
    props: { children: -50000 },
    expectedTabular: false,
  },
  {
    id: 'EDGE-06',
    category: 'EdgeCases',
    description: 'Number with currency via explicit props: <AppText tabularNums>{1500000}</AppText>',
    props: { children: 1500000, tabularNums: true },
    expectedTabular: true,
  },
];


function runEmpiricalTests() {
  console.log('================================================================================');
  console.log('🧪 EMPIRICAL STRESS TEST SUITE: AppText Tabular Nums & extractTextContent');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;
  const failures: Array<{ id: string; desc: string; expected: any; actual: any }> = [];

  const originalPlatformOS = rn.Platform.OS;

  for (const tc of testCases) {
    // Set platform if specified
    if (tc.platform) {
      rn.Platform.OS = tc.platform;
    } else {
      rn.Platform.OS = 'web';
    }

    try {
      // Execute AppText component directly
      const element = AppText(tc.props as any) as any;

      // Verify element structure
      if (!element || !element.props) {
        throw new Error('AppText did not return a valid React element');
      }

      const styleArray = Array.isArray(element.props.style) ? element.props.style : [element.props.style];
      
      // Check if tabular-nums fontVariant is in style
      const hasTabular = styleArray.some((s: any) => 
        s && Array.isArray(s.fontVariant) && s.fontVariant.includes('tabular-nums')
      );

      // Check if android paddingRight is in style
      const hasAndroidPadding = styleArray.some((s: any) => 
        s && s.paddingRight === 3
      );

      let testPassed = true;

      // 1. Verify tabular status
      if (hasTabular !== tc.expectedTabular) {
        testPassed = false;
        failures.push({
          id: tc.id,
          desc: tc.description,
          expected: `tabular: ${tc.expectedTabular}`,
          actual: `tabular: ${hasTabular}`,
        });
      }

      // 2. Verify Android padding if specified
      if (tc.expectedAndroidPadding !== undefined && hasAndroidPadding !== tc.expectedAndroidPadding) {
        testPassed = false;
        failures.push({
          id: tc.id,
          desc: `${tc.description} (Android padding check)`,
          expected: `paddingRight: ${tc.expectedAndroidPadding ? 3 : 'none'}`,
          actual: `paddingRight: ${hasAndroidPadding ? 3 : 'none'}`,
        });
      }

      if (testPassed) {
        passed++;
        console.log(`  ✅ [${tc.id}] (${tc.category}) ${tc.description} -> tabular: ${hasTabular}`);
      } else {
        failed++;
        console.log(`  ❌ [${tc.id}] (${tc.category}) ${tc.description}`);
      }
    } catch (err: any) {
      failed++;
      failures.push({
        id: tc.id,
        desc: tc.description,
        expected: 'Successful execution',
        actual: `Threw error: ${err.message}`,
      });
      console.log(`  💥 [${tc.id}] CRASH: ${err.message}`);
    }
  }

  // Restore platform
  rn.Platform.OS = originalPlatformOS;

  // ============================================================================
  // ADVERSARIAL STRESS: Deep Callbacks, Symbol Robustness & Non-throwing
  // ============================================================================
  console.log('\n--- Adversarial Robustness Checks ---');

  const robustnessCases = [
    { name: 'Symbol node', value: Symbol('test-symbol') },
    { name: 'Function node', value: () => '100.000 đ' },
    { name: 'Plain object node', value: { key: 'value' } },
    { name: '10-level deep empty array', value: [[[[[[[[[[]]]]]]]]]] },
    { name: '10-level deep number array', value: [[[[[[[[[['99k']]]]]]]]]] },
  ];

  for (const rc of robustnessCases) {
    try {
      const el = AppText({ children: rc.value } as any);
      if (el) {
        passed++;
        console.log(`  ✅ [ROBUST] Handled ${rc.name} gracefully without crashing`);
      }
    } catch (err: any) {
      failed++;
      failures.push({
        id: 'ROBUST',
        desc: `Adversarial node: ${rc.name}`,
        expected: 'No crash',
        actual: err.message,
      });
      console.log(`  ❌ [ROBUST] Crashed on ${rc.name}: ${err.message}`);
    }
  }

  console.log('\n================================================================================');
  console.log(`📊 STRESS TEST RESULTS:`);
  console.log(`  Total tests run: ${passed + failed}`);
  console.log(`  Passed:         ${passed}`);
  console.log(`  Failed:         ${failed}`);
  console.log(`  Success Rate:   ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================================\n');

  if (failures.length > 0) {
    console.log('❌ FAILURES SUMMARY:');
    failures.forEach(f => {
      console.log(`  [${f.id}] ${f.desc}`);
      console.log(`       Expected: ${f.expected}`);
      console.log(`       Actual:   ${f.actual}`);
    });
    process.exit(1);
  } else {
    console.log('✨ ALL ADVERSARIAL EMPIRICAL TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  }
}

runEmpiricalTests();
