/**
 * Unit tests for useOrder hook
 */
import { renderHook, act } from '@testing-library/react';
import { useOrder } from '../useOrder';

jest.mock('../../api', () => ({
  api: {
    createOrder: jest.fn().mockResolvedValue({ id: 'order-123' }),
    updateOrderItems: jest.fn().mockResolvedValue({ id: 'order-123' }),
    updateOrderStatus: jest.fn().mockResolvedValue({}),
    getActiveOrderForTable: jest.fn().mockRejectedValue(new Error('No active order')),
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

describe('useOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useOrder());
    expect(result.current.submitting).toBe(false);
    expect(result.current.submitCount).toBe(0);
  });

  it('should submit a new order', async () => {
    const { result } = renderHook(() => useOrder());
    const mockCart = [
      { id: 'prod-1', name: 'Trà Chanh', qty: 2, unitPrice: 15000, cartItemId: 'cart_1', serviceType: 'dine_in' as const, isSent: false },
    ];
    let orderId;
    await act(async () => {
      orderId = await result.current.submitOrder(mockCart, 'table-5', null);
    });
    expect(orderId).toBe('order-123');
    expect(result.current.submitCount).toBe(1);
  });

  it('should send to kitchen', async () => {
    const { result } = renderHook(() => useOrder());
    const mockCart = [
      { id: 'prod-1', name: 'Trà Chanh', qty: 2, unitPrice: 15000, cartItemId: 'cart_1', serviceType: 'dine_in' as const, isSent: false },
    ];
    let id;
    await act(async () => {
      id = await result.current.sendToKitchen(mockCart, 'table-5', 'order-123');
    });
    expect(id).toBe('order-123');
  });
});
