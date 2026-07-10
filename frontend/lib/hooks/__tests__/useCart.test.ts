/**
 * Unit tests for useCart hook
 */
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../useCart';

// Mock api module
jest.mock('../../api', () => ({
  api: {
    cancelOrderItem: jest.fn().mockResolvedValue({}),
  },
}));

const mockItem = {
  id: 'prod-1',
  name: 'Trà Chanh',
  price: 15000,
  category: 'tra-chanh',
  sizes: [],
  toppings: [],
};

describe('useCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.activeOrderId).toBeNull();
  });

  it('should add item with quickAdd', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].name).toBe('Trà Chanh');
    expect(result.current.cart[0].qty).toBe(1);
    expect(result.current.total).toBe(15000);
  });

  it('should merge duplicate items on quickAdd', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickAdd(mockItem); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].qty).toBe(2);
    expect(result.current.total).toBe(30000);
  });

  it('should subtract item with quickSubtract', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickSubtract(mockItem); });
    expect(result.current.cart[0].qty).toBe(1);
    expect(result.current.total).toBe(15000);
  });

  it('should remove item when quickSubtract reaches 0', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickSubtract(mockItem); });
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('should update qty with updateQty', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.updateQty(cartItemId, 2); });
    expect(result.current.cart[0].qty).toBe(3);
  });

  it('should remove item when updateQty delta makes qty <= 0', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.updateQty(cartItemId, -1); });
    expect(result.current.cart).toHaveLength(0);
  });

  it('should set qty with setQty', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.setQty(cartItemId, 5); });
    expect(result.current.cart[0].qty).toBe(5);
  });

  it('should remove item with removeItem', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.removeItem(cartItemId); });
    expect(result.current.cart).toHaveLength(0);
  });

  it('should edit note with editNote', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.editNote(cartItemId, 'Ít đường')); });
    expect(result.current.cart[0].note).toBe('Ít đường');
  });

  it('should cancel item with reason and set isSent', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.cancelItem(cartItemId, 'Hết nguyên liệu'); });
    expect(result.current.cart[0].cancelReason).toBe('Hết nguyên liệu');
    expect(result.current.cart[0].isSent).toBe(true);
  });

  it('should toggle service type', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    expect(result.current.cart[0].serviceType).toBe('dine_in');
    act(() => { result.current.toggleServiceType(cartItemId); });
    expect(result.current.cart[0].serviceType).toBe('takeaway');
    act(() => { result.current.toggleServiceType(cartItemId); });
    expect(result.current.cart[0].serviceType).toBe('dine_in');
  });

  it('should update item with partial updates', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    const cartItemId = result.current.cart[0].cartItemId;
    act(() => { result.current.updateItem(cartItemId, { qty: 3, note: 'Đá riêng' }); });
    expect(result.current.cart[0].qty).toBe(3);
    expect(result.current.cart[0].note).toBe('Đá riêng');
  });

  it('should filter out selected items', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    // Add a second item
    act(() => { result.current.quickAdd({ ...mockItem, id: 'prod-2', name: 'Sữa Chua' }); });
    expect(result.current.cart).toHaveLength(2);
    const firstId = result.current.cart[0].cartItemId;
    act(() => { result.current.filterOut([firstId]); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].name).toBe('Sữa Chua');
  });

  it('should replace all items', () => {
    const { result } = renderHook(() => useCart());
    const newItems = [
      { ...mockItem, id: 'new-1', name: 'Cà Phê', cartItemId: 'cart_new_1', qty: 2, unitPrice: 20000, isSent: true, serviceType: 'dine_in' as const },
    ];
    act(() => { result.current.replaceAll(newItems, 'order-999'); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].name).toBe('Cà Phê');
    expect(result.current.activeOrderId).toBe('order-999');
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.setActiveOrderId('order-1'); });
    act(() => { result.current.reset(); });
    expect(result.current.cart).toEqual([]);
    expect(result.current.activeOrderId).toBeNull();
    expect(result.current.total).toBe(0);
  });

  it('should calculate itemCount correctly', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickAdd({ ...mockItem, id: 'prod-3', name: 'Kem' }); });
    expect(result.current.itemCount).toBe(3); // 2 + 1
  });

  it('should get item cart count', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.quickAdd(mockItem); });
    act(() => { result.current.quickAdd(mockItem); });
    expect(result.current.getItemCartCount('prod-1')).toBe(2);
    expect(result.current.getItemCartCount('nonexistent')).toBe(0);
  });
});
