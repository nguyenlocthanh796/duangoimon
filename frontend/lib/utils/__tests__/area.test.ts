import { normalizeAreaName, abbreviateAreaName } from '../area';

describe('area normalizer utils', () => {
  it('normalizes un-accented and mis-cased area names to canonical Vietnamese names', () => {
    expect(normalizeAreaName('Ngoai Troi')).toBe('Ngoài trời');
    expect(normalizeAreaName('ngoài trời')).toBe('Ngoài trời');
    expect(normalizeAreaName('Trong nha')).toBe('Trong nhà');
    expect(normalizeAreaName('phong vip')).toBe('VIP');
    expect(normalizeAreaName('tang 1')).toBe('Tầng 1');
    expect(normalizeAreaName('tang 2')).toBe('Tầng 2');
    expect(normalizeAreaName(null)).toBe('Bàn Khác');
  });

  it('abbreviates area names correctly for mobile view', () => {
    expect(abbreviateAreaName('Ngoai Troi', false)).toBe('N.Trời');
    expect(abbreviateAreaName('Trong nha', false)).toBe('T.Nhà');
    expect(abbreviateAreaName('Ngoai Troi', true)).toBe('Ngoài trời');
  });
});
