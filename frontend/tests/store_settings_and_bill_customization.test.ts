import assert from 'assert';
import { runner } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';

export async function runStoreSettingsAndBillCustomizationTests() {
  runner.setContext('Store Settings & Bill Customization', 'Store Info, Bank VietQR & Bill Options');

  // Test 1: Cập nhật thông tin cửa hàng & thương hiệu
  await runner.test('Cập nhật thông tin quán: tên quán, slogan, địa chỉ, hotline, WiFi', () => {
    const store = usePOSStore.getState();

    store.updateStoreSettings({
      storeName: 'Trà Sữa Ông Chủ Chi Nhánh 2',
      slogan: 'Đậm Vị Trà - Chuẩn Vị Sữa',
      address: '789 Đường Lê Lợi, Quận 1, TP.HCM',
      phone: '0988776655',
      openingHours: '07:00 - 23:00',
      wifiName: 'OngChu_VIP_5G',
      wifiPassword: 'ongchuvipkemoi',
      website: 'https://ongchupos.vn',
      facebookPage: 'fb.com/ongchupos',
    });

    const updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.storeName, 'Trà Sữa Ông Chủ Chi Nhánh 2');
    assert.strictEqual(updated.slogan, 'Đậm Vị Trà - Chuẩn Vị Sữa');
    assert.strictEqual(updated.address, '789 Đường Lê Lợi, Quận 1, TP.HCM');
    assert.strictEqual(updated.phone, '0988776655');
    assert.strictEqual(updated.openingHours, '07:00 - 23:00');
    assert.strictEqual(updated.wifiName, 'OngChu_VIP_5G');
    assert.strictEqual(updated.wifiPassword, 'ongchuvipkemoi');
    assert.strictEqual(updated.website, 'https://ongchupos.vn');
    assert.strictEqual(updated.facebookPage, 'fb.com/ongchupos');
  });

  // Test 2: Cập nhật thông tin ngân hàng & tạo URL VietQR Napas247
  await runner.test('Cập nhật thông tin ngân hàng và kiểm tra cú pháp tạo mã VietQR', () => {
    const store = usePOSStore.getState();

    store.updateStoreSettings({
      bankName: 'Vietcombank',
      bankCode: 'VCB',
      accountNumber: '0071001234567',
      accountHolder: 'NGUYEN VAN CHU QUAN',
      bankBranch: 'CN Bến Thành',
      transferSyntax: 'POS [MA_DON]',
      qrPaymentTemplate: 'compact2',
    });

    const updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.bankName, 'Vietcombank');
    assert.strictEqual(updated.accountNumber, '0071001234567');
    assert.strictEqual(updated.accountHolder, 'NGUYEN VAN CHU QUAN');
    assert.strictEqual(updated.bankBranch, 'CN Bến Thành');
    assert.strictEqual(updated.transferSyntax, 'POS [MA_DON]');
    assert.strictEqual(updated.qrPaymentTemplate, 'compact2');

    // Kiểm tra tính hợp lệ của việc format cú pháp chuyển khoản
    const testOrderCode = 'HD-8889';
    const memo = updated.transferSyntax?.replace('[MA_DON]', testOrderCode) || testOrderCode;
    assert.strictEqual(memo, 'POS HD-8889');

    // Kiểm tra cấu trúc URL VietQR Napas247
    const amount = 85000;
    const vietQrUrl = 'https://img.vietqr.io/image/' + updated.bankName + '-' + updated.accountNumber + '-' + updated.qrPaymentTemplate + '.png?amount=' + amount + '&addInfo=' + encodeURIComponent(memo) + '&accountName=' + encodeURIComponent(updated.accountHolder);
    assert.ok(vietQrUrl.includes('Vietcombank-0071001234567-compact2.png'));
    assert.ok(vietQrUrl.includes('amount=85000'));
    assert.ok(vietQrUrl.includes('POS%20HD-8889'));
  });

  // Test 3: Tùy biến mẫu bill in nhiệt K80 vs K58 và các tuỳ chọn in
  await runner.test('Chuyển đổi khổ giấy K80 sang K58 và tùy biến các trường hiển thị trên bill', () => {
    const store = usePOSStore.getState();

    // Thiết lập sang K58 kèm tắt QR và bật barcode
    store.updateStoreSettings({
      paperSize: 'K58',
      receiptTitle: 'PHIẾU THANH TOÁN',
      receiptFooterText: 'Hẹn Gặp Lại Quý Khách!',
      printCopies: 2,
      printQrOnBill: false,
      printWifiOnBill: true,
      printCashierOnBill: true,
      printItemNoteOnBill: true,
      printBarcodeOnBill: true,
      autoCut: false,
      kickDrawer: true,
    });

    let updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.paperSize, 'K58');
    assert.strictEqual(updated.receiptTitle, 'PHIẾU THANH TOÁN');
    assert.strictEqual(updated.receiptFooterText, 'Hẹn Gặp Lại Quý Khách!');
    assert.strictEqual(updated.printCopies, 2);
    assert.strictEqual(updated.printQrOnBill, false);
    assert.strictEqual(updated.printWifiOnBill, true);
    assert.strictEqual(updated.printBarcodeOnBill, true);
    assert.strictEqual(updated.autoCut, false);
    assert.strictEqual(updated.kickDrawer, true);

    // Chuyển lại sang K80 chuẩn nhà hàng và bật QR ở đáy bill
    store.updateStoreSettings({
      paperSize: 'K80',
      printQrOnBill: true,
      autoCut: true,
      printCopies: 1,
    });

    updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.paperSize, 'K80');
    assert.strictEqual(updated.printQrOnBill, true);
    assert.strictEqual(updated.autoCut, true);
    assert.strictEqual(updated.printCopies, 1);
  });

  // Test 4: Cấu hình thuế VAT, Phí Dịch Vụ và Kênh Bán Hàng Mặc Định
  await runner.test('Cấu hình VAT %, Phí dịch vụ % và Kênh bán mặc định', () => {
    const store = usePOSStore.getState();

    store.updateStoreSettings({
      vatRate: 8,
      serviceFeeRate: 5,
      defaultOrderChannel: 'takeaway',
    });

    const updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.vatRate, 8);
    assert.strictEqual(updated.serviceFeeRate, 5);
    assert.strictEqual(updated.defaultOrderChannel, 'takeaway');
  });

  // Test 5: Cấu hình Telegram Bot cảnh báo gian lận & Máy In Bếp LAN
  await runner.test('Cấu hình Telegram Bot chống gian lận và IP máy in bếp', () => {
    const store = usePOSStore.getState();

    store.updateStoreSettings({
      enableTelegramAlerts: true,
      telegramBotToken: '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ',
      telegramChatId: '-100987654321',
      kitchenPrinterIp: '192.168.1.205',
      kitchenPrinterPort: 9100,
      enableKitchenPrinter: true,
    });

    const updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.enableTelegramAlerts, true);
    assert.strictEqual(updated.telegramBotToken, '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ');
    assert.strictEqual(updated.telegramChatId, '-100987654321');
    assert.strictEqual(updated.kitchenPrinterIp, '192.168.1.205');
    assert.strictEqual(updated.kitchenPrinterPort, 9100);
    assert.strictEqual(updated.enableKitchenPrinter, true);
  });

  // Test 6: An ninh & Khóa Hủy Món Sau Khi Gửi Bếp
  await runner.test('Kích hoạt khóa hủy món sau gửi bếp và ngưỡng cảnh báo chiết khấu cao', () => {
    const store = usePOSStore.getState();

    store.updateStoreSettings({
      requirePinForVoid: true,
      highDiscountThreshold: 25,
      kdsAutoCleanupMinutes: 25,
    });

    const updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.requirePinForVoid, true);
    assert.strictEqual(updated.highDiscountThreshold, 25);
    assert.strictEqual(updated.kdsAutoCleanupMinutes, 25);
  });
}
