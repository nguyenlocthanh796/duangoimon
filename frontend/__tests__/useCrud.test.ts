import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrud } from '../lib/hooks/useCrud';

const testData = [{ id: '1', name: 'Item A' }, { id: '2', name: 'Item B' }];

const createOpts = (overrides: Record<string, any> = {}) => ({
  fetchFn: jest.fn().mockResolvedValue(testData),
  createFn: jest.fn().mockResolvedValue({ id: '3', name: 'Item C' }),
  updateFn: jest.fn().mockResolvedValue({ id: '1', name: 'Item A Updated' }),
  deleteFn: jest.fn().mockResolvedValue({}),
  formState: { name: '' },
  formFromItem: (item: any) => ({ name: item.name }),
  buildPayload: (form: any, _id: any) => ({ name: form.name }),
  nameLabel: 'item',
  ...overrides,
});

describe('useCrud', () => {
  it('loads data on mount', async () => {
    const opts = createOpts();
    const { result } = renderHook(() => useCrud(opts));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(testData);
  });

  it('uses fallbackData on fetch error', async () => {
    const opts = createOpts({ fetchFn: jest.fn().mockRejectedValue(new Error('fail')) });
    const { result } = renderHook(() => useCrud({ ...opts, fallbackData: testData }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(testData);
  });

  it('openAdd resets form', () => {
    const opts = createOpts();
    const { result } = renderHook(() => useCrud(opts));
    act(() => result.current.openAdd());
    expect(result.current.showForm).toBe(true);
    expect(result.current.editingId).toBeNull();
    expect(result.current.form).toEqual({ name: '' });
  });

  it('openEdit fills form', () => {
    const opts = createOpts();
    const { result } = renderHook(() => useCrud(opts));
    act(() => result.current.openEdit({ id: '1', name: 'Item A' }));
    expect(result.current.showForm).toBe(true);
    expect(result.current.editingId).toBe('1');
    expect(result.current.form).toEqual({ name: 'Item A' });
  });

  it('handleSave calls createFn', async () => {
    const createFn = jest.fn().mockResolvedValue({ id: '3', name: 'Item C' });
    const opts = createOpts({ createFn });
    const { result } = renderHook(() => useCrud(opts));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openAdd());
    act(() => result.current.setForm({ name: 'Item C' }));
    await act(async () => result.current.handleSave());
    expect(createFn).toHaveBeenCalledWith({ name: 'Item C' });
  });

  it('selectedItem returns correct item', async () => {
    const opts = createOpts();
    const { result } = renderHook(() => useCrud(opts));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSelectedId('1'));
    expect(result.current.selectedItem).toEqual({ id: '1', name: 'Item A' });
  });
});
