# Handoff Report - Payment Screen Exploration

## 1. Observation

### payment.tsx Analysis
- **Payment Method Selection**:
  The screen defines a static array of payment methods at lines 11-16:
  ```typescript
  const PAY_METHODS = [
    { id: 'tien_mat',    label: 'Tiền mặt',       icon: 'payments',         color: '#10B981', bg: '#ECFDF5' },
    { id: 'card',        label: 'Quẹt thẻ',        icon: 'credit-card',      color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'qr',          label: 'QR Code',          icon: 'qr-code-scanner',  color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'chuyen_khoan',label: 'Chuyển khoản',    icon: 'account-balance',  color: '#F59E0B', bg: '#FFFBEB' },
  ];
  ```
  It handles selection using state `method` initialized to `'tien_mat'` (line 37):
  ```typescript
  const [method, setMethod] = useState('tien_mat');
  ```
  The selector is rendered at lines 187-218 with hardcoded background, border, checkmark icon overlay, and active text colors.

- **Cash Received Numpad**:
  Rendered conditionally at lines 221-297 only if `method === 'tien_mat'`. The state `cashInput` is a string (line 38):
  ```typescript
  const [cashInput, setCashInput] = useState('');
  ```
  Keys are processed via `handleKey` at lines 45-50:
  ```typescript
  const handleKey = (key: typeof NUMPAD_KEYS[number]) => {
    if (key.type === 'clear') { setCashInput(''); return; }
    if (key.type === 'back')  { setCashInput(prev => prev.slice(0, -1)); return; }
    if (cashInput.length < 12) setCashInput(prev => prev + key.value);
  };
  ```
  Quick amounts selection is implemented at lines 254-267 using a predefined list `[50000, 100000, 200000, 500000]` and an "Exact amount" button setting `cashInput` to `String(total)`.

- **Auto-calculated Change**:
  Change is computed at line 43:
  ```typescript
  const change = cash - total;
  ```
  It renders a status card (lines 238-252) showing the change in green if `change >= 0` (using background `#ECFDF5` and text `#10B981`), or displaying the missing amount in red if `change < 0` (using background `#FEF2F2`, border `#FECACA` and text `#EF4444`).

- **Confirm Payment API Submit**:
  The confirmation submit calls the backend endpoint `/ban-hang/payments` using `api.processPayment` (lines 53-68):
  ```typescript
  const handlePay = async () => {
    if (!orderId || paying) return;
    setPaying(true);
    try {
      await api.processPayment({
        order_id: orderId,
        payment_method: method,
        amount_received: method === 'tien_mat' ? cash : undefined,
      });
      setPaid(true);
    } catch {
      setPaid(true); // Optimistic — show success anyway
    } finally {
      setPaying(false);
    }
  };
  ```

- **Navigation Back on Success**:
  When `paid` is `true`, it early-returns the success screen (lines 72-133). The navigation button calls `router.replace` to return to the table selection map (lines 117-129):
  ```typescript
  <TouchableOpacity
    onPress={() => router.replace('/ban-hang')}
    ...
  >
    <MaterialIcons name="table-restaurant" size={20} color="#FFFFFF" />
    <Text ...>Về sơ đồ bàn</Text>
  </TouchableOpacity>
  ```

### theme.ts Comparison
The design tokens in `theme.ts` are defined as:
```typescript
export const COLORS = {
  primary: '#F97316', primaryHover: '#EA580C', success: '#10B981',
  warning: '#F59E0B', danger: '#EF4444', bg: '#F8FAFC', card: '#FFFFFF',
  text: '#1E293B', muted: '#94A3B8', border: '#E2E8F0',
};

export const formatPrice = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}đ`;
```

In `payment.tsx`, there are significant deviations from these tokens:
- Hardcoded screen background (`#F8FAFC`), card background (`#FFFFFF`), primary colors (`#F97316`), and success colors (`#10B981`).
- Arbitrary Slate shades (`#64748B`, `#475569`, `#334155`, `#CBD5E1`, `#F1F5F9`) used for secondary text, buttons, and borders instead of standard theme tokens.
- Hardcoded payment method colors (`#3B82F6` for card, `#8B5CF6` for QR) not defined in `theme.ts`.

---

## 2. Logic Chain

1. **Design Token Violation**:
   The payment screen relies heavily on raw hex color strings. For example, instead of using `COLORS.bg` and `COLORS.card`, it hardcodes `#F8FAFC` and `#FFFFFF`. This breaks the centralized theme control defined in `POS_DESIGN_REF.md` and makes it difficult to implement updates.
2. **Lossy Price Formatting**:
   The `formatPrice` function in `theme.ts` rounds amounts dynamically to `k` (e.g., `14500` -> `15k`, `1500` -> `2k`). While acceptable for compact list displays, this rounding logic causes a **critical bug** on the payment screen. Exact financial amounts are required for cash calculation to avoid incorrect change calculations and cashier invoicing mismatches.
3. **UX Display Abbreviation while Typing**:
   Using `formatPrice(cash)` to display the cash input dynamically (line 233) results in confusing transitions (e.g., typing `50000` translates to `5đ` -> `50đ` -> `500đ` -> `5k` -> `50k`). This prevents the cashier from seeing the exact count of zeros typed and increases the risk of input mistakes.
4. **Optimistic Error Fallback Flaw**:
   Line 64 handles failures by executing `setPaid(true)`. If the database payment endpoint (`POST /ban-hang/payments`) fails due to a network drop, server error, or database conflict, the cashier is still shown "Thanh toán thành công!" and can clear/release the table. This results in direct loss of revenue and corrupted database states.
5. **No-op Confirm Button for Failed Orders**:
   If order creation in `pos.tsx` fails, the user is navigated to `/ban-hang/payment` without `orderId` (line 136). In `payment.tsx`, `handlePay` has a guard `if (!orderId || paying) return;` (line 54), while the confirmation button remains fully enabled and clickable. Clicking it fails silently and leaves the cashier in a silent deadlock state.
6. **Numpad Input Sanitation Gaps**:
   The handler `handleKey` (lines 45-50) does not filter out leading zeros (e.g., typing `0` then `5` gives `"05"`). It also allows appending `"000"` when the length is 11, resulting in a 14-digit string, bypassing the `< 12` check.

---

## 3. Caveats

- We did not modify or write code to resolve these issues, maintaining a read-only investigation.
- We assumed that the API route `POST /ban-hang/payments` is functional and expects a valid `order_id` and `amount_received`.
- We only analyzed layout behavior statically; physical screen scaling issues on tablet vs mobile were not tested in runtime.

---

## 4. Conclusion

The current payment screen has critical functional and UX gaps:
- It ignores central theme design tokens.
- It rounds currency amounts lossily (e.g., `1500đ` becomes `2k`), which is unacceptable for billing and change calculation.
- It optimistically hides payment API submission failures, creating silent database sync issues.
- It allows a silent UI deadlock when `orderId` is missing.

### Proposed Fix Strategy

1. **Extend Theme Tokens**:
   Update `theme.ts` to include auxiliary colors (such as slate gray variations, card/QR brand colors, and light status backgrounds).
2. **Implement Precise Price Formatting**:
   Add a `formatPriceFull` helper to `theme.ts` that outputs precise numbers with thousands separators (e.g., `14.500đ` or `1,500đ`) without any rounding. Use this helper across the payment screen.
3. **Show Un-abbreviated Cash Input**:
   Render the exact numeric input inside the cash input box (e.g., `50.000 đ`) instead of the abbreviated `50k` value.
4. **Fix API Failure Handling**:
   Remove the optimistic `setPaid(true)` from the catch block in `payment.tsx`. Instead, use `Alert.alert` to display the actual error to the user and allow retrying the transaction.
5. **Add Order Validation Guard**:
   On screen load, check if `orderId` is missing. If it is, display an error banner informing the user that the order details could not be created, disable the confirmation button, and provide a button to return to the POS cart screen.
6. **Improve Numpad Input Parsing**:
   Sanitize the `handleKey` string builder: prevent leading zeros (e.g., ignore `0` or `000` if the input is empty or `"0"`) and limit the absolute character length to 12 digits regardless of whether single or triple zeros are appended.

---

## 5. Verification Method

To verify the proposed fix strategy:

- **Check Test Coverage**:
  Run the test suite using `npx tsx --test lib/__tests__/auth-helpers.test.ts lib/__tests__/security-challenge.test.ts` to verify no regressions in route guards or security policies.
- **Manual Verification Steps**:
  1. Navigate to `/ban-hang` and choose a table. Add products with total amounts not divisible by 1000 (e.g. `14.500đ`). Verify the payment screen total amount is exactly `14.500đ` (not rounded to `15k`).
  2. Input money using the numpad: type `1`, `0`, `0`, `000`. Verify the input box displays `100.000đ` (not `100k`) and the change calculates accurately. Check that typing `0` first does not lead to leading zeros like `000`.
  3. Simulate a network failure (or shut down the backend server) and click "Hoàn tất thanh toán". Verify that the app shows an error message and does **not** proceed to the "Success" screen.
  4. Force a failed order creation and verify the payment screen presents a warning banner and disables the confirm button instead of silently locking up.
