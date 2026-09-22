/**
 * 👑 VIETQR & SOUNDBOX EMVCo TLV PARSER / GENERATOR
 * Hỗ trợ phân tích cú pháp và phát sinh mã VietQR Napas 247 động tích hợp Loa Báo Có (MB Bank Soundbox, VCB, BIDV...)
 */

export interface ParsedVietQR {
  isValid: boolean;
  bankBin?: string;
  accountNo?: string;
  merchantId?: string;
  soundboxId?: string;
  refPrefix?: string;
  serviceCode?: string;
  amount?: number;
  currency?: string;
  country?: string;
  crc?: string;
  raw: string;
  isMBSoundbox: boolean;
}

/**
 * Format tag-length-value theo chuẩn EMVCo
 */
export function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Tính mã CCITT CRC-16 checksum cho chuẩn EMVCo (Poly 0x1021, Init 0xFFFF)
 */
export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parse chuỗi TLV con thành key-value object
 */
export function parseTLV(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= data.length) {
    const tag = data.slice(i, i + 2);
    const len = parseInt(data.slice(i + 2, i + 4), 10);
    if (isNaN(len) || len < 0 || i + 4 + len > data.length) {
      break;
    }
    const val = data.slice(i + 4, i + 4 + len);
    result[tag] = val;
    i += 4 + len;
  }
  return result;
}

/**
 * Phân tích cú pháp chuỗi VietQR EMVCo bất kỳ
 */
export function parseVietQREMVCo(raw: string): ParsedVietQR {
  const cleanRaw = (raw || '').replace(/\s+/g, '');
  if (!cleanRaw || cleanRaw.length < 20) {
    return { isValid: false, raw: cleanRaw, isMBSoundbox: false };
  }

  try {
    const root = parseTLV(cleanRaw);
    if (!root['00'] || root['00'] !== '01') {
      return { isValid: false, raw: cleanRaw, isMBSoundbox: false };
    }

    let bankBin = '';
    let accountNo = '';
    let merchantId = '';
    let serviceCode = '';
    let refPrefix = '';
    let soundboxId = '';
    let amount: number | undefined;

    // Phân tích Tag 38 (Napas 247)
    if (root['38']) {
      const tag38 = parseTLV(root['38']);
      if (tag38['01']) {
        const benef = parseTLV(tag38['01']);
        bankBin = benef['00'] || '';
        accountNo = benef['01'] || '';
        merchantId = benef['01'] || '';
      }
      serviceCode = tag38['02'] || '';
    }

    // Phân tích Tag 54 (Số tiền)
    if (root['54']) {
      const parsedAmt = parseFloat(root['54']);
      if (!isNaN(parsedAmt)) amount = parsedAmt;
    }

    // Phân tích Tag 62 (Dữ liệu bổ sung / Loa)
    if (root['62']) {
      const tag62 = parseTLV(root['62']);
      refPrefix = tag62['01'] || '';
      soundboxId = tag62['08'] || '';
    }

    const isMB = bankBin === '970422';
    const isMBSoundbox = isMB && (
      (soundboxId && soundboxId.startsWith('VQRLOAMB')) ||
      (merchantId && merchantId.startsWith('VQRQ')) ||
      Boolean(soundboxId)
    );

    return {
      isValid: true,
      bankBin,
      accountNo,
      merchantId,
      soundboxId,
      refPrefix,
      serviceCode,
      amount,
      currency: root['53'],
      country: root['58'],
      crc: root['63'],
      raw: cleanRaw,
      isMBSoundbox: Boolean(isMBSoundbox),
    };
  } catch {
    return { isValid: false, raw: cleanRaw, isMBSoundbox: false };
  }
}

/**
 * Tham số sinh mã QR động Loa Báo Có MB Bank
 */
export interface GenerateMBSoundboxOptions {
  merchantId?: string;
  accountNo?: string;
  bankBin?: string;
  soundboxId?: string;
  refPrefix?: string;
  amount?: number;
  orderCode?: string;
  isDynamic?: boolean;
}

/**
 * Phát sinh chuỗi mã VietQR EMVCo động kích hoạt Loa Báo Có MB Bank vật lý
 * Hỗ trợ tạo giữa Số tài khoản / Mã định danh Loa (Merchant ID) + Mã Loa (Soundbox ID)
 */
export function generateMBSoundboxDynamicQR(opts: GenerateMBSoundboxOptions): string {
  const merchantOrAccount = (opts.merchantId || opts.accountNo || '').trim();
  const soundboxId = (opts.soundboxId || '').trim();
  const refPrefix = (opts.refPrefix || 'NPS6869').trim();
  const bankBin = (opts.bankBin || '970422').trim();
  const amount = opts.amount && opts.amount > 0 ? Math.round(opts.amount) : 0;
  const isDynamic = opts.isDynamic !== undefined ? opts.isDynamic : amount > 0;

  // Tag 38: Napas AID + Beneficiary (BIN + Merchant/Account) + Service Code
  const napasAID = formatTLV('00', 'A000000727');
  const binTLV = formatTLV('00', bankBin);
  const mercTLV = formatTLV('01', merchantOrAccount);
  const beneficiary = formatTLV('01', binTLV + mercTLV);
  const serviceCode = formatTLV('02', 'QRIBFTTA');
  const tag38 = formatTLV('38', napasAID + beneficiary + serviceCode);

  // Payload header
  let payload = formatTLV('00', '01') + formatTLV('01', isDynamic ? '12' : '11');
  payload += tag38;
  payload += formatTLV('53', '704'); // VND

  if (amount > 0) {
    payload += formatTLV('54', amount.toString());
  }
  payload += formatTLV('58', 'VN');

  // Tag 62: Additional Data (Subtag 01: Ref Prefix / Bill, Subtag 08: Soundbox ID)
  let tag62Content = '';
  if (refPrefix) {
    tag62Content += formatTLV('01', refPrefix);
  }
  if (soundboxId) {
    tag62Content += formatTLV('08', soundboxId);
  }
  if (tag62Content) {
    payload += formatTLV('62', tag62Content);
  }

  // Tag 63: CRC-16
  const payloadForCRC = payload + '6304';
  const crc = calculateCRC16(payloadForCRC);
  return payloadForCRC + crc;
}
