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
  assert.strictEqual(font.body.fontFamily, 'BeVietnamPro_500Medium');
  assert.strictEqual(font.body.fontWeight, '500');

  assert.strictEqual(font.bodyBold.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.bodyBold.fontWeight, '600');

  // Check prices
  assert.strictEqual(font.price.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.price.fontWeight, '600');

  assert.strictEqual(font.priceLarge.fontFamily, 'BeVietnamPro_700Bold');
  assert.strictEqual(font.priceLarge.fontWeight, '700');

  // Check buttons
  assert.strictEqual(font.button.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.button.fontWeight, '600');

  assert.strictEqual(font.buttonSmall.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.buttonSmall.fontWeight, '600');

  // Check labels, tabs, badges
  assert.strictEqual(font.label.fontFamily, 'BeVietnamPro_500Medium');
  assert.strictEqual(font.label.fontWeight, '500');

  assert.strictEqual(font.tab.fontFamily, 'BeVietnamPro_600SemiBold');
  assert.strictEqual(font.tab.fontWeight, '600');

  assert.strictEqual(font.badge.fontFamily, 'BeVietnamPro_500Medium');
  assert.strictEqual(font.badge.fontWeight, '500');
});
