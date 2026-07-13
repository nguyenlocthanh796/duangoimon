/**
 * Unit tests for usePayment hook
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePayment } from '../usePayment';

jest.mock('../../api', () => ({
  api: {
    processPayment: jest.fn().mockResolvedValue({ id: 'pay-123', status: 'completed' }),
    get: jest.fn().mockResolvedValue({ items: [] }),
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

const defaultOpts = {
  cart: [],
  total: 40000,
  orderId: 'order-1',
  tableName: 'Bàn 5',
  tableId: 'table-5',
};

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePayment(defaultOpts));
    expect(result.current.payMethod).toBe('cash');
    expect(result.current.amountGiven).toBe(0);
    expect(result.current.change).toBe(0);
  });

  it('should calculate total correctly', () => {
    const { result } = renderHook(() => usePayment(defaultOpts));
    expect(result.current.total).toBe(40000);
  });

  it('should calculate change when amountGiven > total', () => {
    const { result } = renderHook(() => usePayment(defaultOpts));
    act(() => {
      result.current.setAmountGiven(50000);
    });
    expect(result.current.change).toBe(10000);
  });

  it('should switch payment method', () => {
    const { result } = renderHook(() => usePayment(defaultOpts));
    act(() => {
      result.current.selectMethod('card');
    });
    expect(result.current.payMethod).toBe('card');
    act(() => {
      result.current.selectMethod('qr');
    });
    expect(result.current.payMethod).toBe('qr');
    act(() => {
      result.current.selectMethod('transfer');
    });
    expect(result.current.payMethod).toBe('transfer');
    act(() => {
      result.current.selectMethod('cash');
    });
    expect(result.current.payMethod).toBe('cash');
  });
});
