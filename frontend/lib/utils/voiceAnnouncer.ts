/**
 * 👑 OngChu Lean POS - In-App Voice Announcer Engine (Loa Báo Chuyển Khoản 0đ)
 * Tận dụng Web SpeechSynthesis API chuẩn quốc tế & Web Audio / expo-av.
 * Không cần mua loa ngoài, không tốn SIM 4G, tự động đọc to khi VietQR khớp đơn.
 */

import { Platform } from 'react-native';
import { playSuccessSound } from './sound';

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/**
 * Đọc khối 3 chữ số tiếng Việt (trăm, chục, đơn vị)
 */
function readThreeDigits(n: number, isHighest: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];

  if (h > 0 || !isHighest) {
    parts.push(DIGITS[h] + ' trăm');
  }

  if (t > 1) {
    parts.push(DIGITS[t] + ' mươi');
    if (u === 1) parts.push('mốt');
    else if (u === 4) parts.push('tư');
    else if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 1) {
    parts.push('mười');
    if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 0 && u > 0) {
    if (h > 0 || !isHighest) parts.push('lẻ');
    parts.push(DIGITS[u]);
  }

  return parts.join(' ');
}

/**
 * Chuyển số tiền sang chữ tiếng Việt đọc tự nhiên
 * VD: 45000 -> "bốn mươi lăm nghìn"
 *     150000 -> "một trăm năm mươi nghìn"
 *     1250000 -> "một triệu hai trăm năm mươi nghìn"
 */
export function vietnameseNumberToWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'không';

  const groups: number[] = [];
  let temp = n;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  const words: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val === 0) continue;
    const isHighest = i === groups.length - 1;
    const blockText = readThreeDigits(val, isHighest);
    words.push((blockText + ' ' + (scales[i] || '')).trim());
  }

  return words.join(' ').replace(/\s+/g, ' ').trim();
}

export interface VoiceAnnouncerOptions {
  volume?: number; // 0.0 - 1.0
  rate?: number; // 0.8 - 1.5
  pitch?: number; // 0.8 - 1.2
  voiceGender?: 'female' | 'male';
  lang?: string;
}

/**
 * Kiểm tra thiết bị có hỗ trợ giọng đọc không
 */
export function isVoiceSupported(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
  }
  return false;
}

/**
 * Phát giọng đọc thông báo chuyển khoản thành công (0đ phần cứng)
 */
export function speakPaymentSuccess(
  amount: number,
  orderCode?: string,
  customerName?: string,
  options?: VoiceAnnouncerOptions
): Promise<boolean> {
  playSuccessSound();

  const amountText = vietnameseNumberToWords(amount);
  let phrase = 'Đã nhận ' + amountText + ' đồng';

  if (customerName) {
    phrase += ' từ ' + customerName;
  } else if (orderCode) {
    // Đọc mã đơn hoặc tên bàn gọn gàng
    const cleanCode = orderCode.replace(/^HD-0*/, 'đơn ').replace(/^CHỜ-/, 'chờ ');
    phrase += ' cho ' + cleanCode;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel(); // Dừng câu trước nếu đang đọc dở

      const utter = new window.SpeechSynthesisUtterance(phrase);
      utter.lang = options?.lang || 'vi-VN';
      utter.rate = options?.rate ?? 1.05;
      utter.pitch = options?.pitch ?? 1.0;
      utter.volume = options?.volume ?? 1.0;

      // Ưu tiên chọn voice tiếng Việt nếu hệ thống có sẵn
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(
        (v) => v.lang.includes('vi') || v.name.toLowerCase().includes('vietnam')
      );
      if (viVoice) {
        utter.voice = viVoice;
      }

      window.speechSynthesis.speak(utter);
      return Promise.resolve(true);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  return Promise.resolve(false);
}

/**
 * Thử nghiệm giọng đọc thông báo (cho nút "Thử Loa Báo Có" trong Cài Đặt)
 */
export function testVoicePayment(sampleAmount: number = 45000): Promise<boolean> {
  return speakPaymentSuccess(sampleAmount, 'Bàn 01');
}
