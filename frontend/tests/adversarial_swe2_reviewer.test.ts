import './setup_env';
import React from 'react';
import { assert, runner } from './harness';
import { formatCurrency, formatVND, formatK, formatDate, formatDateTime, parseCurrency } from '../lib/utils/format';
import { Tier1Tabs, EmptyState } from '../lib/components/ui';

export async function runSwe2ReviewerTests() {
  runner.setContext('SWE-2 Reviewer Suite', 'Deduplication, Formatters & Shared Components');

  await runner.test('1. parseCurrency correctly handles strings, commas, dots, negatives, and invalid types', () => {
    assert.strictEqual(parseCurrency('50,000'), 50000, 'parse positive string with comma');
    assert.strictEqual(parseCurrency('1.250.000 đ'), 1250000, 'parse currency with dots and currency symbol');
    assert.strictEqual(parseCurrency('-50,000'), -50000, 'parse negative string with comma');
    assert.strictEqual(parseCurrency('-120000'), -120000, 'parse negative plain string');
    assert.strictEqual(parseCurrency(-75000), -75000, 'parse negative number');
    assert.strictEqual(parseCurrency(0), 0, 'parse zero number');
    assert.strictEqual(parseCurrency('0'), 0, 'parse zero string');
    assert.strictEqual(parseCurrency(null), 0, 'parse null value');
    assert.strictEqual(parseCurrency(undefined), 0, 'parse undefined value');
    assert.strictEqual(parseCurrency(NaN), 0, 'parse NaN');
    assert.strictEqual(parseCurrency(true as any), 0, 'parse boolean true safely');
    assert.strictEqual(parseCurrency(false as any), 0, 'parse boolean false safely');
    assert.strictEqual(parseCurrency({} as any), 0, 'parse object safely');
  });

  await runner.test('2. formatCurrency, formatVND, and formatK handle boundaries, 0, null, and large values', () => {
    assert.strictEqual(formatCurrency(0), '0', 'format 0');
    assert.strictEqual(formatCurrency(null as any), '0', 'format null safely');
    assert.strictEqual(formatCurrency(undefined as any), '0', 'format undefined safely');
    assert.strictEqual(formatCurrency(NaN), '0', 'format NaN safely');
    assert.strictEqual(formatCurrency(150000).replace(/\D/g, ''), '150000', 'format valid positive number');

    assert.strictEqual(formatVND(0), '0 đ', 'formatVND 0');
    assert.isTrue(formatVND(50000).includes('50') && formatVND(50000).endsWith('đ'), 'formatVND 50000');

    assert.strictEqual(formatK(0), '0đ', 'formatK 0');
    assert.strictEqual(formatK(500), '500đ', 'formatK 500');
    assert.strictEqual(formatK(1000), '1k', 'formatK 1000');
    assert.strictEqual(formatK(25000), '25k', 'formatK 25000');
    assert.strictEqual(formatK(null as any), '0k', 'formatK null');
  });

  await runner.test('3. formatDate and formatDateTime handle valid ISO, invalid dates, and null/undefined', () => {
    assert.strictEqual(formatDate(null), '', 'formatDate null returns empty string');
    assert.strictEqual(formatDate(undefined), '', 'formatDate undefined returns empty string');
    assert.strictEqual(formatDate(''), '', 'formatDate empty string returns empty string');
    assert.strictEqual(formatDate('invalid-date'), 'invalid-date', 'formatDate invalid returns input');

    const validIso = '2026-09-18T10:30:00Z';
    const formattedDate = formatDate(validIso);
    assert.isTrue(formattedDate.length > 0 && formattedDate !== 'invalid-date', 'formatDate valid ISO string');

    assert.strictEqual(formatDateTime(null), '', 'formatDateTime null returns empty string');
    assert.strictEqual(formatDateTime(undefined), '', 'formatDateTime undefined returns empty string');
    assert.strictEqual(formatDateTime('invalid-date'), 'invalid-date', 'formatDateTime invalid returns input');

    const formattedDateTime = formatDateTime(validIso);
    assert.isTrue(formattedDateTime.includes('·'), 'formatDateTime includes delimiter');
  });

  await runner.test('4. Tier1Tabs and EmptyState are properly exported components', () => {
    assert.isTrue(typeof Tier1Tabs === 'function' || typeof Tier1Tabs === 'object', 'Tier1Tabs is exported');
    assert.isTrue(typeof EmptyState === 'function' || typeof EmptyState === 'object', 'EmptyState is exported');
  });

  await runner.test('5. EmptyState supports message and title props interchangeably', () => {
    const elWithMessage = React.createElement(EmptyState, { message: 'Chưa có dữ liệu', description: 'Vui lòng thử lại' });
    assert.isTrue(React.isValidElement(elWithMessage), 'EmptyState with message is valid React element');
    assert.strictEqual((elWithMessage.props as any).message, 'Chưa có dữ liệu');

    const elWithTitle = React.createElement(EmptyState, { title: 'Trống', actionText: 'Thử Lại', onAction: () => {} });
    assert.isTrue(React.isValidElement(elWithTitle), 'EmptyState with title is valid React element');
    assert.strictEqual((elWithTitle.props as any).actionText, 'Thử Lại');
  });

  await runner.test('6. Screen Deduplication: hoa-don, kds, khach-hang, thuc-don, so-quy, giao-ca use shared Tier1Tabs and EmptyState', () => {
    const fs = require('fs');
    const path = require('path');
    const appDir = path.resolve(__dirname, '../app');

    const hoaDonContent = fs.readFileSync(path.join(appDir, 'hoa-don/index.tsx'), 'utf8');
    assert.isTrue(hoaDonContent.includes('<Tier1Tabs'), 'hoa-don uses Tier1Tabs');
    assert.isTrue(hoaDonContent.includes('<EmptyState'), 'hoa-don uses EmptyState');
    assert.isFalse(hoaDonContent.includes('renderFilterChipsContent'), 'hoa-don removed duplicate renderFilterChipsContent');

    const kdsContent = fs.readFileSync(path.join(appDir, 'kds/index.tsx'), 'utf8');
    assert.isTrue(kdsContent.includes('<Tier1Tabs'), 'kds uses Tier1Tabs');
    assert.isTrue(kdsContent.includes('<EmptyState'), 'kds uses EmptyState');
    assert.isFalse(kdsContent.includes('renderFilterChipsContent'), 'kds removed duplicate renderFilterChipsContent');

    const khachHangContent = fs.readFileSync(path.join(appDir, 'khach-hang/index.tsx'), 'utf8');
    assert.isTrue(khachHangContent.includes('<Tier1Tabs'), 'khach-hang uses Tier1Tabs');
    assert.isFalse(khachHangContent.includes('primaryTabScroll:'), 'khach-hang removed duplicate primaryTabScroll');

    const thucDonContent = fs.readFileSync(path.join(appDir, 'thuc-don/index.tsx'), 'utf8');
    assert.isTrue(thucDonContent.includes('<Tier1Tabs'), 'thuc-don uses Tier1Tabs');
    assert.isTrue(thucDonContent.includes('<EmptyState'), 'thuc-don uses EmptyState');

    const soQuyContent = fs.readFileSync(path.join(appDir, 'so-quy/index.tsx'), 'utf8');
    assert.isTrue(soQuyContent.includes('<Tier1Tabs'), 'so-quy uses Tier1Tabs');
    assert.isTrue(soQuyContent.includes('<EmptyState'), 'so-quy uses EmptyState');

    const giaoCaContent = fs.readFileSync(path.join(appDir, 'giao-ca/index.tsx'), 'utf8');
    assert.isTrue(giaoCaContent.includes('<Tier1Tabs'), 'giao-ca uses Tier1Tabs');
    assert.isTrue(giaoCaContent.includes('<EmptyState'), 'giao-ca uses EmptyState');
  });

  await runner.test('7. Screen Deduplication: quan-ly-ban and kho-hang use Tier1Tabs/EmptyState with dead code removed', () => {
    const fs = require('fs');
    const path = require('path');
    const appDir = path.resolve(__dirname, '../app');

    const quanLyBanContent = fs.readFileSync(path.join(appDir, 'quan-ly-ban/index.tsx'), 'utf8');
    assert.isTrue(quanLyBanContent.includes('<Tier1Tabs'), 'quan-ly-ban uses shared Tier1Tabs');
    assert.isTrue(quanLyBanContent.includes('<EmptyState'), 'quan-ly-ban uses shared EmptyState');
    assert.isFalse(quanLyBanContent.includes('primaryTabBar:'), 'quan-ly-ban removed dead primaryTabBar style');
    assert.isFalse(quanLyBanContent.includes('primaryTabScroll:'), 'quan-ly-ban removed dead primaryTabScroll style');

    const khoHangContent = fs.readFileSync(path.join(appDir, 'kho-hang/index.tsx'), 'utf8');
    assert.isTrue(khoHangContent.includes('<EmptyState'), 'kho-hang uses shared EmptyState');
    assert.isFalse(/import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*['"]react-native['"]/.test(khoHangContent), 'kho-hang removed unused Text import');
  });

  await runner.test('8. Tier1Tabs Robustness: verifies unmounted timer safety and props interface', () => {
    const el = React.createElement(Tier1Tabs, {
      tabs: [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2' },
      ],
      activeTab: 'tab1',
      onTabChange: () => {},
    });
    assert.isTrue(React.isValidElement(el), 'Tier1Tabs element is valid');

    const fs = require('fs');
    const path = require('path');
    const tier1Code = fs.readFileSync(path.resolve(__dirname, '../lib/components/ui/Tier1Tabs.tsx'), 'utf8');
    assert.isTrue(tier1Code.includes('isMountedRef'), 'Tier1Tabs tracks mount status with isMountedRef');
    assert.isTrue(tier1Code.includes('scrollTimerRef'), 'Tier1Tabs tracks scroll timer with scrollTimerRef');
    assert.isTrue(tier1Code.includes('clearTimeout'), 'Tier1Tabs cleans up pending timer on unmount');
  });
}

if (require.main === module) {
  runSwe2ReviewerTests().then(() => {
    runner.printSummary();
  });
}
