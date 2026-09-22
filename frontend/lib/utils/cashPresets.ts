/**
 * 👑 OngChu Lean POS - Cash Presets & Denominations Algorithms
 * Thiết kế cho tốc độ 0ms, chính xác tuyệt đối, hỗ trợ thu ngân 1-chạm không cần mở numpad.
 */

// 9 Mệnh giá tiền giấy lưu hành chính thức tại Việt Nam (từ lớn đến nhỏ)
export const CASH_DENOMINATIONS = [
  500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000,
] as const;

export type CashDenomination = (typeof CASH_DENOMINATIONS)[number];

export type CashPresetType = 'exact' | 'set' | 'add' | 'toggle_numpad';

export interface SmartPreset {
  id: string;
  label: string;
  sub: string;
  value: number;
  type: CashPresetType;
}

export interface ShiftCashParameters {
  startingCash: number;
  totalCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
}

export interface ShiftVarianceResult {
  expectedCash: number;
  actualCash: number;
  diffAmount: number;
  isBalanced: boolean;
  isOver: boolean;
  isShort: boolean;
}

/**
 * Tính tổng tiền mặt từ bản đồ đếm tờ tiền theo mệnh giá
 */
export function calculateCashTotal(counts: Record<number, number>): number {
  let total = 0;
  for (const denom of CASH_DENOMINATIONS) {
    const qty = counts[denom] || 0;
    if (qty > 0) {
      total += denom * qty;
    }
  }
  return total;
}

/**
 * Tính toán chênh lệch kiểm két giao ca
 * Tiền lý thuyết trong két = Tiền đầu ca + Tiền mặt bán được + Tiền thu thêm ngoài ca - Tiền chi chợ/ứng lương
 */
export function calculateShiftVariance(
  shift: ShiftCashParameters,
  actualCash: number
): ShiftVarianceResult {
  const expectedCash =
    shift.startingCash + shift.totalCashSales + shift.totalCashIn - shift.totalCashOut;
  const diffAmount = actualCash - expectedCash;
  return {
    expectedCash,
    actualCash,
    diffAmount,
    isBalanced: diffAmount === 0,
    isOver: diffAmount > 0,
    isShort: diffAmount < 0,
  };
}

/**
 * Định dạng rút gọn số tiền: 50.000 -> 50k, 1.500.000 -> 1.5 triệu
 */
export function formatCashShort(val: number): string {
  if (val >= 1000000) {
    const tr = val / 1000000;
    return `${Number.isInteger(tr) ? tr : tr.toFixed(1)} triệu`;
  }
  return `${Math.round(val / 1000)}k`;
}

/**
 * 🌟 Thuật toán tính toán 6 nút mệnh giá tiền mặt thông minh (Smart Cash Presets)
 * Tự động phân tích giá trị đơn hàng để gợi ý các mốc tiền chẵn thu ngân thường nhận từ khách.
 */
export function calculateSmartPresets(
  totalAmount: number,
  showNumpad: boolean = false
): SmartPreset[] {
  const candidateSteps = [
    10000, 20000, 50000, 100000, 200000, 500000,
    1000000, 1500000, 2000000, 3000000, 5000000,
  ];
  const milestones: number[] = [];

  // Làm tròn theo các bước tiền lẻ/chẵn 10k, 50k, 100k, 200k, 500k
  const stepRounds = [10000, 50000, 100000, 200000, 500000];
  for (const step of stepRounds) {
    if (totalAmount % step !== 0) {
      const rounded = Math.ceil(totalAmount / step) * step;
      if (rounded > totalAmount && !milestones.includes(rounded)) {
        milestones.push(rounded);
      }
    }
  }

  // Các mệnh giá tờ tiền chẵn lớn hơn tổng tiền
  for (const bill of candidateSteps) {
    if (bill > totalAmount && !milestones.includes(bill)) {
      milestones.push(bill);
    }
  }

  milestones.sort((a, b) => a - b);
  const picked = milestones.slice(0, 4);

  // Bổ sung các mốc chẵn tiếp theo nếu chưa đủ 4 mốc gợi ý
  while (picked.length < 4) {
    const last = picked.length > 0 ? picked[picked.length - 1] : totalAmount;
    picked.push(last + (totalAmount >= 500000 ? 500000 : 100000));
  }

  const addValue = totalAmount >= 500000 ? 50000 : 10000;
  const addLabel = totalAmount >= 500000 ? '+50.000 đ' : '+10.000 đ';
  const addSub = totalAmount >= 500000 ? 'Thêm 50k' : 'Thêm 10k';

  return [
    {
      id: 'exact',
      label: 'Đưa đủ',
      sub: '',
      value: totalAmount,
      type: 'exact',
    },
    {
      id: 'round_1',
      label: `${picked[0].toLocaleString('vi-VN')} đ`,
      sub: '',
      value: picked[0],
      type: 'set',
    },
    {
      id: 'round_2',
      label: `${picked[1].toLocaleString('vi-VN')} đ`,
      sub: '',
      value: picked[1],
      type: 'set',
    },
    {
      id: 'round_3',
      label: `${picked[2].toLocaleString('vi-VN')} đ`,
      sub: '',
      value: picked[2],
      type: 'set',
    },
    {
      id: 'round_4',
      label: `${picked[3].toLocaleString('vi-VN')} đ`,
      sub: '',
      value: picked[3],
      type: 'set',
    },
    {
      id: 'add',
      label: addLabel,
      sub: '',
      value: addValue,
      type: 'add',
    },
  ];
}

// Alias thuận tiện cho screen/test
export const smartPresets = calculateSmartPresets;
