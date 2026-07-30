import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useResponsive } from './useResponsive';

export interface UseCrudOptions<T extends { id: string }, F> {
  fetchFn: () => Promise<T[]>;
  createFn?: (payload: Record<string, unknown>) => Promise<T>;
  updateFn?: (id: string, payload: Record<string, unknown>) => Promise<T>;
  deleteFn?: (id: string) => Promise<any>;
  fallbackData?: T[];
  formState: F;
  formFromItem: (item: T) => F;
  buildPayload: (form: F, editingId: string | null) => Record<string, unknown>;
  nameLabel?: string;
}

export function useCrud<T extends { id: string }, F>({
  fetchFn,
  createFn,
  updateFn,
  deleteFn,
  fallbackData,
  formState,
  formFromItem,
  buildPayload,
  nameLabel = 'mục',
}: UseCrudOptions<T, F>) {
  const { isWide } = useResponsive();

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<F>(formState);

  const loadData = useCallback(
    async (opts?: { quiet?: boolean }) => {
      try {
        if (!opts?.quiet) setLoading(true);
        const d = await fetchFn();
        if (Array.isArray(d) && d.length > 0) {
          setData(d);
        } else if (fallbackData) {
          setData(fallbackData);
          if (isWide && !selectedId && fallbackData.length > 0)
            setSelectedId(fallbackData[0].id);
        }
      } catch {
        if (fallbackData) {
          setData(fallbackData);
          if (isWide && !selectedId && fallbackData.length > 0)
            setSelectedId(fallbackData[0].id);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchFn, fallbackData, isWide, selectedId]
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ quiet: true });
  }, [loadData]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({ ...formState });
    setShowForm(true);
  }, [formState]);

  const openEdit = useCallback(
    (item: T) => {
      setEditingId(item.id);
      setForm(formFromItem(item));
      setShowForm(true);
    },
    [formFromItem]
  );

  const handleSave = useCallback(
    async (customValidate?: () => string | null) => {
      const err = customValidate?.();
      if (err) {
        Alert.alert('Lỗi', err);
        return;
      }
      try {
        setSaving(true);
        const payload = buildPayload(form, editingId);
        if (editingId && updateFn) {
          await updateFn(editingId, payload);
        } else if (createFn) {
          await createFn(payload);
        }
        setShowForm(false);
        loadData({ quiet: true });
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || `Không thể lưu ${nameLabel}`);
      } finally {
        setSaving(false);
      }
    },
    [form, editingId, buildPayload, createFn, updateFn, loadData, nameLabel]
  );

  const handleDelete = useCallback(
    (id: string, name: string = '') => {
      if (!deleteFn) return;
      Alert.alert(
        `Xóa ${nameLabel}`,
        `Bạn có chắc muốn xóa "${name}"?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteFn(id);
                if (selectedId === id) setSelectedId(null);
                loadData({ quiet: true });
              } catch (e: any) {
                Alert.alert('Lỗi', e?.message || 'Không thể xóa');
              }
            },
          },
        ]
      );
    },
    [deleteFn, selectedId, loadData, nameLabel]
  );

  const selectedItem = data.find((d) => d.id === selectedId) ?? null;

  return {
    data,
    setData,
    loading,
    refreshing,
    saving,
    showForm,
    setShowForm,
    selectedId,
    setSelectedId,
    selectedItem,
    editingId,
    form,
    setForm,
    loadData,
    onRefresh,
    openAdd,
    openEdit,
    handleSave,
    handleDelete,
  };
}
