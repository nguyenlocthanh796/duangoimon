import { MenuItemWithModifiers, SelectedModifierData } from '../components/pos';

export interface CartItem {
  cartItemId: string;
  item: MenuItemWithModifiers;
  qty: number;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  selectedToppings: string[];
  note: string;
  unitPrice: number;
  isTakeaway?: boolean;
  sentToKitchen?: boolean;
  sentAt?: string;
  roundIndex?: number;
  configSignature?: string;
}

/**
 * Tạo chữ ký cấu hình chuẩn hóa (Canonical Signature) O(M).
 * Dùng để tra cứu và gộp món trùng trong giỏ hàng trong O(1).
 */
export function getModifierConfigSignature(
  itemId: string,
  unitPrice: number,
  selectedSize?: string,
  sugarLevel?: string,
  iceLevel?: string,
  selectedToppings?: string[],
  note?: string,
  isTakeaway?: boolean
): string {
  const tops = selectedToppings && selectedToppings.length > 0
    ? (selectedToppings.length > 1 ? selectedToppings.slice().sort().join(',') : selectedToppings[0])
    : '';
  return `${itemId}_${unitPrice}_${selectedSize || ''}_${sugarLevel || ''}_${iceLevel || ''}_${tops}_${(note || '').trim()}_${isTakeaway ? 'takeaway' : 'dinein'}`;
}

/**
 * Kiểm tra xem món trong giỏ và món mới chọn có cùng cấu hình hay không.
 * Bất biến F&B quan trọng:
 * 1. Nếu món đã gửi bếp (`a.sentToKitchen === true`), KHÔNG gộp vào để tránh làm sai lệch phiếu in bếp.
 * 2. Cùng hình thức phục vụ (Tại chỗ vs Mang về).
 * 3. Cùng size, mức đường, mức đá, danh sách topping (không phân biệt thứ tự), ghi chú và đơn giá.
 */
export function isSameModifierConfig(a: CartItem, b: SelectedModifierData): boolean {
  if (a.item.id !== b.item.id) return false;
  if (a.unitPrice !== b.unitPrice) return false;
  if (Boolean(a.isTakeaway) !== Boolean(b.isTakeaway)) return false;
  if ((a.selectedSize || '') !== (b.selectedSize || '')) return false;
  if ((a.sugarLevel || '') !== (b.sugarLevel || '')) return false;
  if ((a.iceLevel || '') !== (b.iceLevel || '')) return false;
  if ((a.note || '').trim() !== (b.note || '').trim()) return false;

  const topsA = a.selectedToppings || [];
  const topsB = b.selectedToppings || [];
  if (topsA.length !== topsB.length) return false;
  if (topsA.length === 0) return true;
  if (topsA.length === 1) return topsA[0] === topsB[0];

  // Nếu đã có signature cache
  if (a.configSignature && (b as any).configSignature) {
    return a.configSignature === (b as any).configSignature;
  }

  // So sánh mảng topping với O(M) nếu cùng độ dài
  const setA = new Set(topsA);
  for (let i = 0; i < topsB.length; i++) {
    if (!setA.has(topsB[i])) return false;
  }
  return true;
}

/**
 * Tính tổng số lượng món trong giỏ hàng
 */
export function calculateCartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Tính tổng tiền tạm tính của giỏ hàng
 */
export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

/**
 * Đếm số lượng món mới chưa gửi bếp
 */
export function countUnsentKitchenItems(cart: CartItem[]): number {
  return cart.filter((item) => !item.sentToKitchen).reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Tạo danh sách chuỗi mô tả tóm tắt topping/size cho hiển thị
 */
export function formatModifierSummary(item: CartItem): string {
  const parts: string[] = [];
  if (item.selectedSize) parts.push(item.selectedSize);
  if (item.sugarLevel && item.sugarLevel !== '100%') parts.push(`${item.sugarLevel} Đường`);
  if (item.iceLevel && item.iceLevel !== '100%') parts.push(`${item.iceLevel} Đá`);
  if (item.selectedToppings && item.selectedToppings.length > 0) {
    parts.push(`+${item.selectedToppings.join(', ')}`);
  }
  return parts.join(' · ');
}

export interface AggregatedCartItem {
  key: string;
  item: MenuItemWithModifiers;
  unitPrice: number;
  totalQty: number;
  totalAmount: number;
  sentQty: number;
  newQty: number;
  isTakeaway?: boolean;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  selectedToppings: string[];
  note: string;
  modifiersText: string;
  sourceCartItemIds: string[];
  sourceItems: CartItem[];
}

/**
 * Gom các món trùng trong giỏ hàng thành các dòng tổng hợp (Check nhanh khi trả món / kiểm đồ).
 * Món cùng ID/tên, cùng size, đường, đá, toppings, ghi chú, hình thức phục vụ (tại chỗ / mang về), đơn giá sẽ được gom lại thành 1 dòng.
 */
export function aggregateCartItems(cart: CartItem[]): AggregatedCartItem[] {
  const map = new Map<string, AggregatedCartItem>();

  for (const c of cart) {
    const toppingsSorted = (c.selectedToppings || []).slice().sort();
    const topsKey = toppingsSorted.join(',');
    const key = `${c.item?.id || c.item?.name}_${c.unitPrice}_${c.selectedSize || ''}_${c.sugarLevel || ''}_${c.iceLevel || ''}_${topsKey}_${(c.note || '').trim()}_${c.isTakeaway ? 'takeaway' : 'dinein'}`;

    const sent = c.sentToKitchen ? c.qty : 0;
    const unsent = !c.sentToKitchen ? c.qty : 0;

    const existing = map.get(key);
    if (existing) {
      existing.totalQty += c.qty;
      existing.totalAmount += c.unitPrice * c.qty;
      existing.sentQty += sent;
      existing.newQty += unsent;
      existing.sourceCartItemIds.push(c.cartItemId);
      existing.sourceItems.push(c);
    } else {
      const modsText = formatModifierSummary(c);
      map.set(key, {
        key,
        item: c.item,
        unitPrice: c.unitPrice,
        totalQty: c.qty,
        totalAmount: c.unitPrice * c.qty,
        sentQty: sent,
        newQty: unsent,
        isTakeaway: Boolean(c.isTakeaway),
        selectedSize: c.selectedSize,
        sugarLevel: c.sugarLevel,
        iceLevel: c.iceLevel,
        selectedToppings: c.selectedToppings || [],
        note: c.note || '',
        modifiersText: modsText,
        sourceCartItemIds: [c.cartItemId],
        sourceItems: [c],
      });
    }
  }

  return Array.from(map.values());
}

export interface BatchBadgeInfo {
  isUnsent: boolean;
  roundIndex?: number;
  label: string;
  time?: string;
}

/**
 * Xác định nhãn badge phân đợt gọi món (Đợt 1, Đợt 2, Món mới chưa gửi) cho từng dòng giỏ hàng.
 * Chỉ trả về thông tin badge cho món đầu tiên của mỗi đợt để hiển thị phân nhóm gọn gàng.
 */
export function getBatchInfo(
  cart: CartItem[],
  index: number
): BatchBadgeInfo | null {
  if (index < 0 || index >= cart.length) return null;
  const current = cart[index];
  const prev = index > 0 ? cart[index - 1] : null;

  const currentKey = current.sentToKitchen
    ? (current.roundIndex ? `round_${current.roundIndex}` : (current.sentAt ? `time_${current.sentAt}` : 'sent_default'))
    : 'unsent';
  const prevKey = prev
    ? (prev.sentToKitchen
        ? (prev.roundIndex ? `round_${prev.roundIndex}` : (prev.sentAt ? `time_${prev.sentAt}` : 'sent_default'))
        : 'unsent')
    : null;

  if (!prevKey || currentKey !== prevKey) {
    if (!current.sentToKitchen) {
      return {
        isUnsent: true,
        label: 'Món mới · Chưa gửi bếp',
      };
    }

    let roundNumber = current.roundIndex;
    if (!roundNumber) {
      const distinctSentKeys = Array.from(
        new Set(
          cart
            .filter((c) => c.sentToKitchen)
            .map((c) => c.roundIndex ? `round_${c.roundIndex}` : (c.sentAt ? `time_${c.sentAt}` : 'sent_default'))
        )
      );
      const keyIdx = distinctSentKeys.indexOf(currentKey);
      roundNumber = keyIdx >= 0 ? distinctSentKeys.length - keyIdx : 1;
    }

    const timeStr = current.sentAt ? ` · ${current.sentAt}` : '';
    return {
      isUnsent: false,
      roundIndex: roundNumber,
      label: `Đợt ${roundNumber}${timeStr}`,
      time: current.sentAt,
    };
  }

  return null;
}
