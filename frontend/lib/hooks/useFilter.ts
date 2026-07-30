import { useMemo, useState } from 'react';

export function useFilter<T extends Record<string, any>>({
  data,
  searchFields,
  filterField,
  filterFn,
}: {
  data: T[];
  searchFields?: (keyof T)[];
  filterField?: keyof T;
  filterFn?: (item: T, filterValue: string | null) => boolean;
}) {
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const searchLower = search.trim().toLowerCase();

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Category / status filter
      if (filterValue) {
        if (filterFn) {
          if (!filterFn(item, filterValue)) return false;
        } else if (filterField) {
          if (item[filterField] !== filterValue) return false;
        }
      }

      // Search
      if (!searchLower) return true;
      if (searchFields) {
        for (const field of searchFields) {
          const val = item[field];
          if (val && String(val).toLowerCase().includes(searchLower)) return true;
        }
        return false;
      }
      return true;
    });
  }, [data, filterField, filterValue, filterFn, searchFields, searchLower]);

  const clearSearch = () => setSearch('');

  return {
    search,
    setSearch,
    filterValue,
    setFilterValue,
    filteredData,
    clearSearch,
  };
}
