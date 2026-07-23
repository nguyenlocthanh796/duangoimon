import { test } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

// Mock react-native BEFORE typography is imported/required
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'react-native') {
    return {
      Dimensions: {
        get: () => ({ width: 375, height: 812 }),
      },
      Platform: {
        OS: 'ios',
        isPad: false,
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

// Now import typography
import { font, scale } from '../typography';

test('typography scale factor works correctly', () => {
  // Since we mocked Platform.OS === 'ios' and Platform.isPad === false,
  // the scaleFactor is 1.12.
  const expectedValue = Math.round(15 * 1.12);
  assert.strictEqual(scale(15), expectedValue);
});

test('typography font definitions have correct weights and font families', () => {
  // Check headers
  assert.strictEqual(font.h1.fontFamily, 'BeVietnamPro_700Bold');
  assert.strictEqual(font.h1.fontWeight, '700');

  assert.strictEqual(font.h2.fontFamily, 'BeVietnamPro_700Bold');
  assert.strictEqual(font.h2.fontWeight, '700');

  assert.strictEqual(font.h3.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.h3.fontWeight, '600');

  // Check new h4 token
  assert.strictEqual(font.h4.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.h4.fontWeight, '600');
  assert.strictEqual(font.h4.fontSize, scale(15));

  // Check bodies
  assert.strictEqual(font.md.fontFamily, 'BeVietnamPro_500Medium');
  assert.strictEqual(font.md.fontWeight, '500');

  assert.strictEqual(font.mdBold.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.mdBold.fontWeight, '600');

  // Check prices
  assert.strictEqual(font.mdBold.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.mdBold.fontWeight, '600');

  assert.strictEqual(font.mdBoldLarge.fontFamily, 'BeVietnamPro_700Bold');
  assert.strictEqual(font.mdBoldLarge.fontWeight, '700');

  // Check buttons
  assert.strictEqual(font.mdBold.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.mdBold.fontWeight, '600');

  assert.strictEqual(font.smBold.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.smBold.fontWeight, '600');

  // Check labels, tabs, badges
  assert.strictEqual(font.smBold.fontFamily, 'BeVietnamPro_500Medium');
  assert.strictEqual(font.smBold.fontWeight, '500');

  assert.strictEqual(font.tab.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.tab.fontWeight, '600');

  assert.strictEqual(font.smBold.fontFamily, 'BeVietnamPro_500Medium');
  assert.strictEqual(font.smBold.fontWeight, '500');
});
