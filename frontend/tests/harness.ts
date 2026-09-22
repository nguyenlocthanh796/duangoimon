/**
 * 👑 OngChu Lean POS - Lightweight Zero-Dependency Test Harness
 * Designed for ultra-fast execution (< 100ms), clear assertion reporting, and granular tier tracking.
 */

export interface TestResult {
  tier: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

export interface SuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  tierCounts: Record<string, { total: number; passed: number; failed: number }>;
  results: TestResult[];
}

class TestRunner {
  private results: TestResult[] = [];
  private currentTier: string = 'Default';
  private currentCategory: string = 'General';
  private startTime: number = 0;

  setContext(tier: string, category: string) {
    this.currentTier = tier;
    this.currentCategory = category;
  }

  async test(name: string, fn: () => void | Promise<void>) {
    const start = performance.now();
    try {
      await fn();
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.results.push({
        tier: this.currentTier,
        category: this.currentCategory,
        name,
        passed: true,
        durationMs,
      });
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.results.push({
        tier: this.currentTier,
        category: this.currentCategory,
        name,
        passed: false,
        durationMs,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  getSummary(): SuiteSummary {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const durationMs = this.results.reduce((acc, r) => acc + r.durationMs, 0);

    const tierCounts: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const r of this.results) {
      if (!tierCounts[r.tier]) {
        tierCounts[r.tier] = { total: 0, passed: 0, failed: 0 };
      }
      tierCounts[r.tier].total++;
      if (r.passed) tierCounts[r.tier].passed++;
      else tierCounts[r.tier].failed++;
    }

    return {
      total,
      passed,
      failed,
      durationMs: Math.round(durationMs * 100) / 100,
      tierCounts,
      results: this.results,
    };
  }

  printSummary(): boolean {
    const summary = this.getSummary();
    console.log('\n' + '='.repeat(80));
    console.log('👑 ONGCHU LEAN POS — 4-TIER AUTOMATED TEST SUITE REPORT');
    console.log('='.repeat(80));

    let currentTier = '';
    let currentCategory = '';

    for (const r of summary.results) {
      if (r.tier !== currentTier) {
        currentTier = r.tier;
        console.log(`\n📌 [${currentTier.toUpperCase()}]`);
      }
      if (r.category !== currentCategory) {
        currentCategory = r.category;
        console.log(`  📂 ${currentCategory}:`);
      }
      const icon = r.passed ? '  ✅' : '  ❌';
      console.log(`   ${icon} ${r.name} (${r.durationMs}ms)`);
      if (!r.passed && r.error) {
        console.log(`      💥 Error: ${r.error.message}`);
        if (r.error.stack) {
          const lines = r.error.stack.split('\n').slice(1, 4);
          console.log(`      Stack:\n${lines.map((l) => '        ' + l.trim()).join('\n')}`);
        }
      }
    }

    if (summary.failed > 0) {
      console.log('\n❌ FAILED TESTS SUMMARY:');
      for (const r of summary.results) {
        if (!r.passed) {
          console.log(`  • [${r.tier}] ${r.category} -> ${r.name}`);
          console.log(`    💥 Error: ${r.error?.message}`);
        }
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log('📊 TIER BREAKDOWN:');
    for (const [tier, counts] of Object.entries(summary.tierCounts)) {
      const status = counts.failed === 0 ? 'PASS' : 'FAIL';
      console.log(
        `  • ${tier.padEnd(20)}: ${counts.passed}/${counts.total} passed (${counts.failed} failed) [${status}]`
      );
    }
    console.log('-'.repeat(80));
    console.log(
      `🎯 TOTAL: ${summary.passed}/${summary.total} tests passed (${summary.failed} failed) in ${summary.durationMs}ms`
    );
    console.log('='.repeat(80) + '\n');

    return summary.failed === 0;
  }
}

export const runner = new TestRunner();

export interface AssertHelper {
  ok(value: any, msg?: string): void;
  strictEqual(actual: any, expected: any, msg?: string): void;
  deepStrictEqual(actual: any, expected: any, msg?: string): void;
  isTrue(value: boolean, msg?: string): void;
  isFalse(value: boolean, msg?: string): void;
  greaterThan(actual: number, threshold: number, msg?: string): void;
  greaterThanOrEqual(actual: number, threshold: number, msg?: string): void;
  lessThan(actual: number, threshold: number, msg?: string): void;
  lessThanOrEqual(actual: number, threshold: number, msg?: string): void;
  includes(arrayOrString: any, element: any, msg?: string): void;
  throws(fn: () => void, msg?: string): void;
  isDefined<T>(val: T | undefined | null, msg?: string): asserts val is T;
}

// Custom Assertions
export const assert: AssertHelper = {
  ok(value: any, msg?: string) {
    if (!value) {
      throw new Error(`${msg || 'Assertion failed'}: Expected truthy value, got ${value}`);
    }
  },

  strictEqual(actual: any, expected: any, msg?: string) {
    if (actual !== expected) {
      throw new Error(
        `${msg || 'Assertion failed'}: Expected ${JSON.stringify(expected)} (type ${typeof expected}), got ${JSON.stringify(actual)} (type ${typeof actual})`
      );
    }
  },

  deepStrictEqual(actual: any, expected: any, msg?: string) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(
        `${msg || 'Assertion failed'}: Expected deep equality.\nExpected: ${e}\nActual:   ${a}`
      );
    }
  },

  isTrue(value: boolean, msg?: string) {
    if (value !== true) {
      throw new Error(`${msg || 'Assertion failed'}: Expected true, got ${value}`);
    }
  },

  isFalse(value: boolean, msg?: string) {
    if (value !== false) {
      throw new Error(`${msg || 'Assertion failed'}: Expected false, got ${value}`);
    }
  },

  greaterThan(actual: number, threshold: number, msg?: string) {
    if (actual <= threshold) {
      throw new Error(
        `${msg || 'Assertion failed'}: Expected ${actual} > ${threshold}`
      );
    }
  },

  greaterThanOrEqual(actual: number, threshold: number, msg?: string) {
    if (actual < threshold) {
      throw new Error(
        `${msg || 'Assertion failed'}: Expected ${actual} >= ${threshold}`
      );
    }
  },

  lessThan(actual: number, threshold: number, msg?: string) {
    if (actual >= threshold) {
      throw new Error(
        `${msg || 'Assertion failed'}: Expected ${actual} < ${threshold}`
      );
    }
  },

  lessThanOrEqual(actual: number, threshold: number, msg?: string) {
    if (actual > threshold) {
      throw new Error(
        `${msg || 'Assertion failed'}: Expected ${actual} <= ${threshold}`
      );
    }
  },

  includes<T>(arrayOrString: T[] | string, element: any, msg?: string) {
    if (typeof arrayOrString === 'string') {
      if (!arrayOrString.includes(element)) {
        throw new Error(
          `${msg || 'Assertion failed'}: String "${arrayOrString}" does not contain "${element}"`
        );
      }
    } else {
      if (!arrayOrString.includes(element)) {
        throw new Error(
          `${msg || 'Assertion failed'}: Array does not include item: ${JSON.stringify(element)}`
        );
      }
    }
  },

  throws(fn: () => void, msg?: string) {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(`${msg || 'Assertion failed'}: Expected function to throw an error, but it did not.`);
    }
  },

  isDefined<T>(val: T | undefined | null, msg?: string): asserts val is T {
    if (val === undefined || val === null) {
      throw new Error(`${msg || 'Assertion failed'}: Expected defined value, got ${val}`);
    }
  },
};
