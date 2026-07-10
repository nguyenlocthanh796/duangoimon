/**
 * Unit tests for usePayment hook
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePayment } from '../usePayment';

jest.mock('../../api', () => ({
  api: {
    processPayment: jest.fn().mockResolvedValue({ id: 'pay-123', status: 'completed' }),
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

const mockCart = [
  {
    id: 'prod-1', name: 'Trà Chanh', price: 15000, category: 'tra-chanh',
    cartItemId: 'cart_1', qty: 2, unitPrice: 15000,
    isSent: false, serviceType: 'dine_in' as const,
  },
  {
    id: 'prod-2', name: 'Kem', price: 10000, category: 'kem',
    cartItemId: 'cart_2', qty: 1, unitPrice: 10000,
    isSent: false, serviceType: 'dine_in' as const,
  },
];

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePayment(mockCart, 40000, 'order-1', 'Bàn 5', 'table-5'));
    expect(result.current.payMethod).toBe('cash');
    expect(result.current.amountGiven).toBe(0);
    expect(result.current.change).toBe(0);
  });

  it('should calculate total correctly', () => {
    const { result } = renderHook(() => usePayment(mockCart, 40000, 'order-1', 'Bàn 5', 'table-5'));
    expect(result.current.total).toBe(40000);
  });

  it('should calculate change when amountGiven > total', () => {
    const { result } = renderHook(() => usePayment(mockCart, 40000, 'order-1', 'Bàn 5', 'table-5'));
    act(() => { result.current.setAmountGiven(50000); });
    expect(result.current.change).toBe(10000);
  });

  it('should switch payment method', () => {
    const { result } = renderHook(() => usePayment(mockCart, 40000, 'order-1', 'Bàn 5', 'table-5'));
    act(() => { result.current.selectMethod('card'); });
    expect(result.current.payMethod).toBe('card');
    act(() => { result.current.selectMethod('qr'); });
    expect(result.current.payMethod).toBe('qr');
    act(() => { result.current.selectMethod('transfer'); });
    expect(result.current.payMethod).toBe('transfer');
    act(() => { result.current.selectMethod('cash'); });
    expect(result.current.payMethod).toBe('cash');
  });

  it('should provide smart cash suggestions', () => {
    const { result } = renderHook(() => usePayment(mockCart, 40000, 'order-1', 'Bàn 5', 'table-5'));
    expect(result.current.getSmartCashSuggestions()).toEqual([40000, 50000, 100000, 200000]);
  });

  it('should provide smart suggestions for smaller amounts', () => {
    const { result } = renderHook(() => usePayment(mockCart, 17000, 'order-1', 'Bàn 5', 'table-5'));
    const suggestions = result.current.getSmartCashSuggestions();
    expect(suggestions).toContain(20000);
    expect(suggestions).toContain(50000);
  });

  it('should call handlePay with cash method', async () => {
    const { result } = renderHook(() => usePayment(mockCart, 40000, 'order-1', 'Bàn 5', 'table-5'));
    act(() => { result.current.setAmountGiven(50000); });
    let success = false;
    await act(async () => {
      success = await result.current.handlePay();
    });
    expect(success).toBe(true);
  });
});
