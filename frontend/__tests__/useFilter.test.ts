import { renderHook, act } from '@testing-library/react';
import { useFilter } from '../lib/hooks/useFilter';

const items = [
  { id: '1', name: 'Trà sữa', status: 'active', price: 35000 },
  { id: '2', name: 'Cà phê sữa', status: 'active', price: 25000 },
  { id: '3', name: 'Bánh mì', status: 'inactive', price: 15000 },
];

describe('useFilter', () => {
  it('returns all data by default', () => {
    const { result } = renderHook(() => useFilter({ data: items, searchFields: ['name'] }));
    expect(result.current.filteredData).toHaveLength(3);
  });

  it('filters by search', () => {
    const { result } = renderHook(() => useFilter({ data: items, searchFields: ['name'] }));
    act(() => result.current.setSearch('trà'));
    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].id).toBe('1');
  });

  it('filters by filterField', () => {
    const { result } = renderHook(() => useFilter({ data: items, filterField: 'status' }));
    act(() => result.current.setFilterValue('active'));
    expect(result.current.filteredData).toHaveLength(2);
  });

  it('combines search + filter', () => {
    const { result } = renderHook(() => useFilter({ data: items, searchFields: ['name'], filterField: 'status' }));
    act(() => { result.current.setSearch('bánh'); result.current.setFilterValue('active'); });
    expect(result.current.filteredData).toHaveLength(0);
  });

  it('clearSearch resets search', () => {
    const { result } = renderHook(() => useFilter({ data: items, searchFields: ['name'] }));
    act(() => result.current.setSearch('trà'));
    act(() => result.current.clearSearch());
    expect(result.current.search).toBe('');
    expect(result.current.filteredData).toHaveLength(3);
  });

  it('case-insensitive search', () => {
    const { result } = renderHook(() => useFilter({ data: items, searchFields: ['name'] }));
    act(() => result.current.setSearch('BÁNH'));
    expect(result.current.filteredData).toHaveLength(1);
  });

  it('uses custom filterFn', () => {
    const { result } = renderHook(() => useFilter({
      data: items,
      filterFn: (item: any, val) => val === 'over_20k' ? (item as any).price > 20000 : true,
    }));
    act(() => result.current.setFilterValue('over_20k'));
    expect(result.current.filteredData).toHaveLength(2);
  });
});
