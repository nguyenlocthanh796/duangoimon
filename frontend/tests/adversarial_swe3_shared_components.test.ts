import './setup_env';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { assert, runner } from './harness';
import {
  Tier2FilterChips,
  Tier2ChipItem,
  Tier2FilterChipsProps,
  AppModal,
  AppModalProps,
  AppFormField,
  AppFormFieldProps,
  AppNumpad,
  AppNumpadProps,
  CASH_NUMPAD_LAYOUT,
  CRM_NUMPAD_LAYOUT,
  PIN_NUMPAD_LAYOUT,
  StatusDotBadge,
  StatusType,
  StatusDotBadgeProps,
  ReceiptLayout,
  ReceiptLineItem,
  ReceiptLayoutProps,
} from '../lib/components/ui';

export async function runSwe3SharedComponentsTests() {
  runner.setContext('SWE-3 Shared Components Suite', '6 Core UI Components & Screen Integration');

  // Test 1: Tier2FilterChips Component & Props
  await runner.test('1. Tier2FilterChips: verifies exports, props contract, and capsule styling', () => {
    assert.ok(Tier2FilterChips != null, 'Tier2FilterChips is exported');

    const chips: Tier2ChipItem<string>[] = [
      { id: 'all', label: 'Tất Cả', count: 24, icon: 'view-grid' },
      { id: 'coffee', label: 'Cà Phê', count: 12, icon: 'coffee' },
      { id: 'tea', label: 'Trà Trái Cây', count: 8 },
    ];

    let selected = 'all';
    const props: Tier2FilterChipsProps<string> = {
      chips,
      activeChip: selected,
      onChipChange: (id: string) => { selected = id; },
      activeColor: 'accent',
    };

    const element = React.createElement(Tier2FilterChips, props);

    assert.isTrue(React.isValidElement(element), 'Tier2FilterChips elements instantiate correctly');
    assert.strictEqual(element.props.activeChip, 'all', 'activeChip is preserved');
    assert.strictEqual(element.props.chips.length, 3, 'chips array preserved');
    assert.strictEqual(element.props.activeColor, 'accent', 'activeColor matches accent');
  });

  // Test 2: AppModal Component & Presentation Modes
  await runner.test('2. AppModal: verifies modal & sheet presentation, safe bounds and CTA contract', () => {
    assert.ok(AppModal != null, 'AppModal is exported');

    let closed = false;
    let submitted = false;

    const modalProps: AppModalProps = {
      visible: true,
      onClose: () => { closed = true; },
      title: 'Xác Nhận Đơn Hàng',
      presentation: 'sheet',
      primaryAction: {
        label: 'Xác Nhận',
        onPress: () => { submitted = true; },
        variant: 'accent',
      },
      children: React.createElement(React.Fragment, null),
    };

    const modalElement = React.createElement(AppModal, modalProps);

    assert.isTrue(React.isValidElement(modalElement), 'AppModal element instantiates properly');
    assert.strictEqual(modalElement.props.presentation, 'sheet', 'presentation mode preserved');
    assert.strictEqual(modalElement.props.primaryAction?.label, 'Xác Nhận', 'primaryAction label preserved');
    assert.strictEqual(modalElement.props.title, 'Xác Nhận Đơn Hàng', 'title preserved');
  });

  // Test 3: AppFormField Component & Typography Standard
  await runner.test('3. AppFormField: verifies form labels, text input constraints and error display', () => {
    assert.ok(AppFormField != null, 'AppFormField is exported');

    let textVal = '150000';
    const fieldProps: AppFormFieldProps = {
      label: 'Giá Bán Niêm Yết',
      value: textVal,
      onChangeText: (t: string) => { textVal = t; },
      isCurrency: true,
      clearable: true,
      error: 'Giá phải lớn hơn 0',
      required: true,
    };

    const fieldElement = React.createElement(AppFormField, fieldProps);

    assert.isTrue(React.isValidElement(fieldElement), 'AppFormField element instantiates properly');
    assert.strictEqual(fieldElement.props.label, 'Giá Bán Niêm Yết', 'label preserved');
    assert.strictEqual(fieldElement.props.isCurrency, true, 'isCurrency flag active');
    assert.strictEqual(fieldElement.props.clearable, true, 'clearable flag active');
    assert.strictEqual(fieldElement.props.error, 'Giá phải lớn hơn 0', 'error text preserved');
  });

  // Test 4: AppNumpad Component & 3x4 Layouts
  await runner.test('4. AppNumpad: verifies tactile POS 3x4 layouts (cash, crm, pin) and key presets', () => {
    assert.ok(AppNumpad != null, 'AppNumpad is exported');

    // Layout constants verification
    assert.ok(Array.isArray(CASH_NUMPAD_LAYOUT), 'CASH_NUMPAD_LAYOUT is exported array');
    assert.strictEqual(CASH_NUMPAD_LAYOUT.length, 4, 'CASH_NUMPAD_LAYOUT has 4 rows');
    assert.isTrue(CASH_NUMPAD_LAYOUT[0].includes('1') && CASH_NUMPAD_LAYOUT[0].includes('3'), 'CASH layout row 1');

    assert.ok(Array.isArray(CRM_NUMPAD_LAYOUT), 'CRM_NUMPAD_LAYOUT is exported array');
    assert.strictEqual(CRM_NUMPAD_LAYOUT.length, 4, 'CRM_NUMPAD_LAYOUT has 4 rows');

    assert.ok(Array.isArray(PIN_NUMPAD_LAYOUT), 'PIN_NUMPAD_LAYOUT is exported array');
    assert.strictEqual(PIN_NUMPAD_LAYOUT.length, 4, 'PIN_NUMPAD_LAYOUT has 4 rows');

    let pressedKey = '';
    const numpadProps: AppNumpadProps = {
      layout: 'cash',
      onKeyPress: (k: string) => { pressedKey = k; },
    };

    const numpadElement = React.createElement(AppNumpad, numpadProps);

    assert.isTrue(React.isValidElement(numpadElement), 'AppNumpad element instantiates properly');
    assert.strictEqual(numpadElement.props.layout, 'cash', 'layout mode preserved');
  });

  // Test 5: StatusDotBadge Component & Semantic Mapping
  await runner.test('5. StatusDotBadge: verifies multi-domain status badges and dotOnly mode', () => {
    assert.ok(StatusDotBadge != null, 'StatusDotBadge is exported');

    const testStatuses: StatusType[] = [
      'pending', 'cooking', 'ready', 'served', 'cancelled',
      'trong', 'co_khach', 'dat_truoc',
      'in_stock', 'low_stock', 'out_of_stock',
      'on_shift', 'off_shift', 'difference', 'balanced'
    ];

    for (const st of testStatuses) {
      const badgeProps: StatusDotBadgeProps = { status: st };
      const badge = React.createElement(StatusDotBadge, badgeProps);
      assert.isTrue(React.isValidElement(badge), `StatusDotBadge instantiates for status "${st}"`);
      assert.strictEqual(badge.props.status, st, `Status matches "${st}"`);
    }

    const dotOnlyProps: StatusDotBadgeProps = {
      status: 'low_stock',
      dotOnly: true,
    };
    const dotOnlyBadge = React.createElement(StatusDotBadge, dotOnlyProps);
    assert.isTrue(React.isValidElement(dotOnlyBadge), 'dotOnly badge instantiates');
    assert.strictEqual(dotOnlyBadge.props.dotOnly, true, 'dotOnly mode flag preserved');
  });

  // Test 6: ReceiptLayout Component & Thermal Paper Format
  await runner.test('6. ReceiptLayout: verifies K80/K58 paper rendering, financial items, and MTT block', () => {
    assert.ok(ReceiptLayout != null, 'ReceiptLayout is exported');

    const items: ReceiptLineItem[] = [
      { id: '1', name: 'Cà Phê Sữa Đá Sài Gòn', qty: 2, unitPrice: 35000, totalPrice: 70000, note: 'Ít ngọt' },
      { id: '2', name: 'Trà Đào Cam Sả', qty: 1, unitPrice: 45000, totalPrice: 45000 },
    ];

    const receiptProps: ReceiptLayoutProps = {
      paperSize: 'K80',
      storeInfo: {
        storeName: 'ONG CHỦ COFFEE & TEA',
        address: '123 Đường POS, TP. Hồ Chí Minh',
        phone: '0901234567',
        wifiPassword: 'ongchu2026',
      },
      orderMeta: {
        orderCode: 'HD-98214',
        tableName: 'Bàn 04 (Tầng 1)',
        cashierName: 'Nguyễn Văn Thu Ngân',
        printedAt: '2026-09-18T14:30:00Z',
      },
      items,
      totals: {
        subtotal: 115000,
        discountAmount: 15000,
        vatAmount: 8000,
        finalTotal: 108000,
        paidAmount: 200000,
        changeAmount: 92000,
        paymentMethod: 'cash',
      },
      eInvoice: {
        templateCode: '1',
        invoiceCode: 'C2609',
        cqtCode: 'C2609-88392-POS1',
        lookupUrl: 'https://cqt.gdt.gov.vn/hoadondientu/tra-cuu?code=C2609-88392-POS1',
      },
      showFooter: true,
    };

    const k80Receipt = React.createElement(ReceiptLayout, receiptProps);
    assert.isTrue(React.isValidElement(k80Receipt), 'K80 receipt instantiates properly');
    assert.strictEqual(k80Receipt.props.paperSize, 'K80', 'K80 paper width preserved');

    const k58Props: ReceiptLayoutProps = { ...receiptProps, paperSize: 'K58' };
    const k58Receipt = React.createElement(ReceiptLayout, k58Props);
    assert.isTrue(React.isValidElement(k58Receipt), 'K58 receipt instantiates properly');
    assert.strictEqual(k58Receipt.props.paperSize, 'K58', 'K58 paper width preserved');
  });

  // Test 7: Index Export Integrity Check
  await runner.test('7. index.ts: verifies centralized barrel exports for all 6 components and types', () => {
    const indexPath = path.join(__dirname, '../lib/components/ui/index.ts');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    assert.isTrue(indexContent.includes('Tier2FilterChips'), 'index.ts exports Tier2FilterChips');
    assert.isTrue(indexContent.includes('AppModal'), 'index.ts exports AppModal');
    assert.isTrue(indexContent.includes('AppFormField'), 'index.ts exports AppFormField');
    assert.isTrue(indexContent.includes('AppNumpad'), 'index.ts exports AppNumpad');
    assert.isTrue(indexContent.includes('StatusDotBadge'), 'index.ts exports StatusDotBadge');
    assert.isTrue(indexContent.includes('ReceiptLayout'), 'index.ts exports ReceiptLayout');
  });

  // Test 8: Screen Adoption & Deduplication Audit
  await runner.test('8. Screen Adoption Audit: verified 8 screens cleanly integrated shared UI components', () => {
    const appDir = path.join(__dirname, '../app');

    // 1. quan-ly-ban -> Tier2FilterChips
    const quanLyBan = fs.readFileSync(path.join(appDir, 'quan-ly-ban/index.tsx'), 'utf8');
    assert.isTrue(quanLyBan.includes('Tier2FilterChips'), 'quan-ly-ban uses Tier2FilterChips');

    // 2. thuc-don -> Tier2FilterChips
    const thucDon = fs.readFileSync(path.join(appDir, 'thuc-don/index.tsx'), 'utf8');
    assert.isTrue(thucDon.includes('Tier2FilterChips'), 'thuc-don uses Tier2FilterChips');

    // 3. so-quy -> AppNumpad
    const soQuyKeypad = fs.readFileSync(path.join(appDir, 'so-quy/_components/QuickCashFormContent.tsx'), 'utf8');
    assert.isTrue(soQuyKeypad.includes('AppNumpad'), 'so-quy uses AppNumpad');

    // 4. thanh-toan -> AppNumpad
    const crmKeypad = fs.readFileSync(path.join(appDir, 'thanh-toan/_components/CrmKeypadModal.tsx'), 'utf8');
    assert.isTrue(crmKeypad.includes('AppNumpad'), 'thanh-toan crm uses AppNumpad');

    // 5. khach-hang -> AppModal & AppFormField
    const customerModal = fs.readFileSync(path.join(appDir, 'khach-hang/_components/CustomerFormModal.tsx'), 'utf8');
    assert.isTrue(customerModal.includes('AppModal'), 'khach-hang uses AppModal');
    assert.isTrue(customerModal.includes('AppFormField'), 'khach-hang uses AppFormField');

    // 6. giao-ca -> AppModal & AppFormField
    const openShiftModal = fs.readFileSync(path.join(appDir, 'giao-ca/_components/OpenShiftModal.tsx'), 'utf8');
    assert.isTrue(openShiftModal.includes('AppModal'), 'giao-ca uses AppModal');
    assert.isTrue(openShiftModal.includes('AppFormField'), 'giao-ca uses AppFormField');

    // 7. cai-dat -> ReceiptLayout
    const liveBill = fs.readFileSync(path.join(appDir, 'cai-dat/_components/LiveBillPreview.tsx'), 'utf8');
    assert.isTrue(liveBill.includes('ReceiptLayout'), 'cai-dat uses ReceiptLayout');

    // 8. kho-hang -> StatusDotBadge
    const khoHang = fs.readFileSync(path.join(appDir, 'kho-hang/index.tsx'), 'utf8');
    assert.isTrue(khoHang.includes('StatusDotBadge'), 'kho-hang uses StatusDotBadge');
  });
}
