import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVietQREMVCo,
  generateMBSoundboxDynamicQR,
  calculateCRC16,
  formatTLV,
} from '../lib/utils/vietqrParser';

describe('MB Bank Soundbox VietQR Engine', () => {
  const userSampleRawQR =
    '00020101021138570010A000000727012700069704220113VQRQAIPRU11760208QRIBFTTA53037045802VN62400107NPS68690825VQRLOAMB202604281109255826304FCDF';

  it('1. Giải mã chính xác 100% chuỗi QR Loa MB Bank từ ngân hàng', () => {
    const parsed = parseVietQREMVCo(userSampleRawQR);

    assert.equal(parsed.isValid, true, 'Chuỗi QR phải hợp lệ');
    assert.equal(parsed.isMBSoundbox, true, 'Phải nhận diện đúng Loa MB Bank');
    assert.equal(parsed.bankBin, '970422', 'BIN phải là 970422 (MB Bank)');
    assert.equal(parsed.merchantId, 'VQRQAIPRU1176', 'Merchant ID phải là VQRQAIPRU1176');
    assert.equal(parsed.soundboxId, 'VQRLOAMB20260428110925582', 'Soundbox ID phải khớp');
    assert.equal(parsed.refPrefix, 'NPS6869', 'Ref prefix phải là NPS6869');
    assert.equal(parsed.serviceCode, 'QRIBFTTA', 'Service code phải là QRIBFTTA');
    assert.equal(parsed.currency, '704', 'Tiền tệ phải là 704 (VND)');
    assert.equal(parsed.country, 'VN', 'Quốc gia phải là VN');
    assert.equal(parsed.crc, 'FCDF', 'Mã CRC gốc phải là FCDF');
  });

  it('2. Tái tạo chuỗi QR gốc khớp chính xác 100% từng byte với CRC FCDF', () => {
    const reconstructed = generateMBSoundboxDynamicQR({
      merchantId: 'VQRQAIPRU1176',
      soundboxId: 'VQRLOAMB20260428110925582',
      refPrefix: 'NPS6869',
      amount: 0,
      isDynamic: false,
    });

    assert.equal(reconstructed, userSampleRawQR, 'Chuỗi tái tạo phải khớp 100% chuỗi gốc của ngân hàng');
  });

  it('3. Sinh mã QR Động chứa đúng số tiền hóa đơn và kích hoạt Loa MB Bank', () => {
    const orderAmount = 45000;
    const dynamicQR = generateMBSoundboxDynamicQR({
      merchantId: 'VQRQAIPRU1176',
      soundboxId: 'VQRLOAMB20260428110925582',
      refPrefix: 'NPS6869',
      amount: orderAmount,
      isDynamic: true,
    });

    // Tag 01: Dynamic = 12
    assert.match(dynamicQR, /^000201010212/);
    // Tag 54: Amount 45000
    assert.ok(dynamicQR.includes('540545000'), 'Phải chứa tag 54 với số tiền 45000');
    // Tag 62: Subtag 08 Soundbox ID
    assert.ok(dynamicQR.includes('VQRLOAMB20260428110925582'), 'Phải giữ nguyên mã Loa MB vật lý');
    // Tag 63: CRC16 kiểm tra
    const payloadWithoutCRC = dynamicQR.substring(0, dynamicQR.length - 4);
    const expectedCRC = calculateCRC16(payloadWithoutCRC);
    assert.equal(dynamicQR.slice(-4), expectedCRC, 'Mã CRC16 phải khớp thuật toán');

    // Parse lại chuỗi vừa sinh
    const parsed = parseVietQREMVCo(dynamicQR);
    assert.equal(parsed.isValid, true);
    assert.equal(parsed.amount, 45000);
    assert.equal(parsed.soundboxId, 'VQRLOAMB20260428110925582');
  });

  it('4. Kiểm tra mã CRC16 CCITT thuật toán chuẩn EMVCo', () => {
    const data = userSampleRawQR.substring(0, userSampleRawQR.length - 4);
    const crc = calculateCRC16(data);
    assert.equal(crc, 'FCDF');
  });
});
