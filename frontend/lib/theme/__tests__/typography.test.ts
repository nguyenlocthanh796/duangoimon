import { font, scale } from '../typography';

describe('typography', () => {
  it('scale factor returns identity for iOS HIG fixed scale', () => {
    expect(scale(15)).toBe(15);
    expect(scale(16)).toBe(16);
  });

  it('font definitions match iOS HIG font tokens', () => {
    // Check xs (12px)
    expect(font.xs.fontFamily).toBe('BeVietnamPro_400Regular');
    expect(font.xs.fontSize).toBe(12);

    // Check sm (14px)
    expect(font.sm.fontFamily).toBe('BeVietnamPro_400Regular');
    expect(font.sm.fontSize).toBe(14);

    // Check md (16px) - Primary body text
    expect(font.md.fontFamily).toBe('BeVietnamPro_400Regular');
    expect(font.md.fontSize).toBe(16);

    // Check mdBold (16px)
    expect(font.mdBold.fontFamily).toBe('BeVietnamPro_700Bold');
    expect(font.mdBold.fontSize).toBe(16);

    // Check headerTitle (18px)
    expect(font.headerTitle.fontFamily).toBe('BeVietnamPro_700Bold');
    expect(font.headerTitle.fontSize).toBe(18);
  });
});
