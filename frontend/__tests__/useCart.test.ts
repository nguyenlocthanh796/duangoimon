import { renderHook, act } from '@testing-library/react';
import { useCart } from '../lib/hooks/useCart';

jest.mock('../lib/api/serverConfig', () => ({
  CLOUDFLARE_TUNNEL_BASE: 'https://mock',
  getApiBaseUrl: jest.fn().mockReturnValue('https://mock'),
  getServerUrl: jest.fn().mockReturnValue('https://mock'),
}));
jest.mock('../lib/api/client', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() },
  ApiError: class extends Error {},
}));
jest.mock('../lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  ApiError: class extends Error {},
  ExpectedNotFoundError: class extends Error {},
}));

const mockMenuItem = { id: 'prod-1', name: 'Trà sữa', price: 35000, category: 'sua-chua' };

const createCartItem = (overrides: Record<string, any> = {}) => ({
  id: 'prod-1', name: 'Trà sữa', price: 35000, category: 'sua-chua',
  cartItemId: 'cart_test_1', qty: 2, unitPrice: 35000, isSent: false,
  serviceType: 'dine_in' as const, ...overrides,
});

describe('useCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('quickAdd adds item', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.quickAdd(mockMenuItem));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].name).toBe('Trà sữa');
    expect(result.current.itemCount).toBe(1);
  });

  it('quickAdd increments qty for same product', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockMenuItem); });
    act(() => { result.current.quickAdd(mockMenuItem); });
    expect(result.current.cart[0].qty).toBe(2);
    expect(result.current.total).toBe(70000);
  });

  it('quickSubtract decreases or removes item', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockMenuItem); });
    act(() => { result.current.quickAdd(mockMenuItem); });
    act(() => result.current.quickSubtract(mockMenuItem));
    expect(result.current.cart[0].qty).toBe(1);
    act(() => result.current.quickSubtract(mockMenuItem));
    expect(result.current.cart).toHaveLength(0);
  });

  it('updateQty adds delta', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(createCartItem({ cartItemId: 'cart_1', qty: 1 })));
    act(() => result.current.updateQty('cart_1', 2));
    expect(result.current.cart[0].qty).toBe(3);
  });

  it('removeItem removes item', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(createCartItem({ cartItemId: 'cart_1' })));
    act(() => result.current.removeItem('cart_1'));
    expect(result.current.cart).toHaveLength(0);
  });

  it('cancelItem marks isSent and stores reason', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(createCartItem({ cartItemId: 'cart_1', isSent: false })));
    act(() => result.current.cancelItem('cart_1', 'Hết nguyên liệu'));
    expect(result.current.cart[0].isSent).toBe(true);
    expect(result.current.cart[0].cancelReason).toBe('Hết nguyên liệu');
  });

  it('editNote updates note', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(createCartItem({ cartItemId: 'cart_1' })));
    act(() => result.current.editNote('cart_1', 'Ít đường'));
    expect(result.current.cart[0].note).toBe('Ít đường');
  });

  it('reset clears cart and activeOrderId', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.quickAdd(mockMenuItem));
    act(() => result.current.setActiveOrderId('order-1'));
    expect(result.current.cart).toHaveLength(1);
    act(() => result.current.reset());
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.activeOrderId).toBeNull();
  });

  it('markSent sets isSent on all items', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(createCartItem({ cartItemId: 'cart_1', isSent: false })));
    act(() => result.current.markSent());
    expect(result.current.cart[0].isSent).toBe(true);
  });

  it('getItemCartCount sums qty across items', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(createCartItem({ id: 'prod-1', cartItemId: 'c1', qty: 2 })));
    act(() => result.current.addItem(createCartItem({ id: 'prod-1', cartItemId: 'c2', qty: 3 })));
    expect(result.current.getItemCartCount('prod-1')).toBe(5);
  });
});
