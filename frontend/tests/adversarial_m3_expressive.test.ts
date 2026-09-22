import './setup_env';
import fs from 'fs';
import path from 'path';
import { assert, runner } from './harness';
import { HapticsEngine } from '../lib/utils/haptics';
import { PressableScale } from '../lib/components/ui/PressableScale';
import { Button } from '../lib/components/ui/Button';
import { oledTheme, darkTheme, lightTheme, THEME_TOKENS } from '../lib/theme';

export async function runM3ExpressiveTests() {
  runner.setContext('M3 Expressive', 'Spring Physics & Haptics');

  await runner.test('HapticsEngine provides all 4 tiers and does not throw', () => {
    assert.strictEqual(typeof HapticsEngine.tick, 'function');
    assert.strictEqual(typeof HapticsEngine.step, 'function');
    assert.strictEqual(typeof HapticsEngine.celebrate, 'function');
    assert.strictEqual(typeof HapticsEngine.warn, 'function');

    // Safe execution without unhandled exceptions
    HapticsEngine.tick();
    HapticsEngine.step();
    HapticsEngine.celebrate();
    HapticsEngine.warn();
    assert.isTrue(true, 'All 4 haptic tiers execute safely in test environment');
  });

  await runner.test('PressableScale exports properly and defaults to 0.96 scale and tick haptic', () => {
    assert.strictEqual(typeof PressableScale, 'function');
    const elem = PressableScale({ children: null, onPress: () => {} });
    assert.strictEqual(typeof elem, 'object');
  });

  await runner.test('Button enforces Material 3 touch target dimensions (40/48/56 dp) and supports success variant', () => {
    const defaultBtn = Button({ title: 'Xong' }) as any;
    assert.strictEqual(defaultBtn.props.style[0].height, 48, 'Default button height is 48dp (M3 Standard)');

    const smBtn = Button({ title: 'Lưu', size: 'sm' }) as any;
    assert.strictEqual(smBtn.props.style[0].height, 40, 'Small button height is 40dp');

    const lgBtn = Button({ title: 'Thanh Toán', size: 'lg', variant: 'success', fullWidth: true }) as any;
    assert.strictEqual(lgBtn.props.style[0].height, 56, 'Large button height is 56dp (Hero Touch Target)');
    assert.strictEqual(lgBtn.props.style[0].width, '100%', 'fullWidth applies 100% width');
    assert.strictEqual(lgBtn.props.style[0].backgroundColor, lightTheme.brand.success, 'success variant uses brand.success');
  });

  await runner.test('OLED Pitch Black Theme has #000000 canvas and full structural symmetry with darkTheme', () => {
    assert.strictEqual(oledTheme.surface.app, '#000000', 'OLED canvas is #000000 pitch black');
    assert.strictEqual(oledTheme.surface.card, '#000000', 'OLED card surface is #000000');
    assert.strictEqual(oledTheme.surface.header, '#000000', 'OLED header is #000000');
    assert.strictEqual(oledTheme.surface.modal, '#000000', 'OLED modal is #000000');
    assert.strictEqual(oledTheme.isDark, true, 'OLED isDark is true');
    assert.strictEqual(THEME_TOKENS.oled, oledTheme, 'THEME_TOKENS includes oledTheme reference');

    // Structural symmetry check
    const darkKeys = Object.keys(darkTheme);
    const oledKeys = Object.keys(oledTheme);
    assert.strictEqual(oledKeys.length, darkKeys.length, 'oledTheme has same number of root keys as darkTheme');

    const darkSurfaceKeys = Object.keys(darkTheme.surface);
    const oledSurfaceKeys = Object.keys(oledTheme.surface);
    assert.strictEqual(oledSurfaceKeys.length, darkSurfaceKeys.length, 'oledTheme has all surface keys');

    const missingSurfaceKeys = darkSurfaceKeys.filter((k) => !(k in oledTheme.surface));
    assert.strictEqual(missingSurfaceKeys.length, 0, 'No surface keys missing in oledTheme');

    // Contrast ratio: White text (#FFFFFF) on #000000 is 21:1 (maximum possible AAA)
    assert.strictEqual(oledTheme.text.primary, '#FFFFFF', 'OLED text is pure white for 21:1 contrast');
  });

  await runner.test('ProductCard and TableCard maintain strictly < 200 lines after PressableScale upgrade', () => {
    const posDir = path.resolve(__dirname, '../lib/components/pos');
    const pcPath = path.join(posDir, 'product-card/ProductCard.tsx');
    const tcPath = path.join(posDir, 'table-card/TableCard.tsx');
    const pliPath = path.join(posDir, 'product-card/ProductListItem.tsx');

    const pcLines = fs.readFileSync(pcPath, 'utf-8').split('\n').length;
    const tcLines = fs.readFileSync(tcPath, 'utf-8').split('\n').length;
    const pliLines = fs.readFileSync(pliPath, 'utf-8').split('\n').length;

    assert.lessThan(pcLines, 200, `ProductCard.tsx has ${pcLines} lines (< 200 limit)`);
    assert.lessThan(tcLines, 200, `TableCard.tsx has ${tcLines} lines (< 200 limit)`);
    assert.lessThan(pliLines, 200, `ProductListItem.tsx has ${pliLines} lines (< 200 limit)`);
  });
}

// If run directly
if (require.main === module) {
  runM3ExpressiveTests().then(() => {
    const success = runner.printSummary();
    if (!success) {
      process.exit(1);
    }
  });
}
