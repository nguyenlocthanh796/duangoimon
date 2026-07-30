import React, { useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, ss } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { api } from '../../lib/api';
import { request } from '../../lib/api/client';
import type { Table } from '../../lib/types';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';

interface FormState { name: string; area: string; capacity: string; }
const EMPTY_FORM: FormState = { name: '', area: '', capacity: '4' };

const AREA_FILTERS = [
  { key: 'Tất cả', label: 'Tất cả', icon: 'view-grid-outline' },
  { key: 'Trong nhà', label: 'Trong nhà', icon: 'home-outline' },
  { key: 'VIP', label: 'VIP', icon: 'crown-outline' },
  { key: 'Ngoài trời', label: 'Ngoài trời', icon: 'tree-outline' },
  { key: 'Tầng 1', label: 'Tầng 1', icon: 'numeric-1-box-outline' },
  { key: 'Tầng 2', label: 'Tầng 2', icon: 'numeric-2-box-outline' },
];

const FORM_AREAS = ['Trong nhà', 'VIP', 'Ngoài trời', 'Tầng 1', 'Tầng 2'];

export default function TablesScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();

  const {
    data: tables, loading, saving,
    showForm, setShowForm, selectedId, setSelectedId,
    selectedItem: selectedTable, editingId, form, setForm,
    loadData, openAdd, openEdit, handleSave, handleDelete,
  } = useCrud<Table, FormState>({
    fetchFn: () => request('/api/v1/tables') as Promise<Table[]>,
    createFn: (payload) => request('/api/v1/tables', { method: 'POST', body: JSON.stringify(payload) }) as Promise<Table>,
    updateFn: (id, payload) => request('/api/v1/tables', { method: 'PUT', body: JSON.stringify({ ...payload, id }) }) as Promise<Table>,
    deleteFn: (id) => request('/api/v1/tables', { method: 'DELETE', body: JSON.stringify({ id }) }),
    fallbackData: [],
    formState: EMPTY_FORM,
    formFromItem: (t) => ({ name: t.name, area: t.area ?? '', capacity: String(t.capacity) }),
    buildPayload: (f) => ({ ...f, capacity: parseInt(f.capacity) || 4 }),
    nameLabel: 'bàn',
  });

  const [selectedArea, setSelectedArea] = React.useState('Tất cả');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filtered = useMemo(() => {
    let arr = tables;
    if (selectedArea !== 'Tất cả') arr = arr.filter(t => t.area === selectedArea);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(t => t.name.toLowerCase().includes(q));
    }
    return arr;
  }, [tables, selectedArea, searchQuery]);

  const isFree = (st: string) => st === 'free' || st === 'trong';
  const isBusy = (st: string) => st === 'occupied' || st === 'busy' || st === 'co_khach';
  const isReserved = (st: string) => st === 'reserved' || st === 'da_dat';

  const statusCounts = useMemo(() => {
    const free = tables.filter(t => isFree(t.status as string)).length;
    const busy = tables.filter(t => isBusy(t.status as string)).length;
    const reserved = tables.filter(t => isReserved(t.status as string)).length;
    return { free, busy, reserved };
  }, [tables]);

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Tìm bàn..."
            placeholderTextColor="#94A3B8" style={ss.searchTextInput} />
        </View>
        <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFF" />
          <AppText variant="md" color="#FFF">Thêm bàn</AppText>
        </TouchableOpacity>
      </View>

      {/* Area filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 48 }}
        contentContainerStyle={ss.filterChipsContainer}>
        {AREA_FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setSelectedArea(f.key)}
            style={[ss.filterChip, selectedArea === f.key && ss.filterChipActive]}>
            <Icon name={f.icon as any} size={14} color={selectedArea === f.key ? colors.brand.primary : '#64748B'} />
            <AppText variant="md" color={selectedArea === f.key ? colors.brand.primary : '#334155'}>{f.label}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status bar */}
      <View style={s.statusBar}>
        <View style={s.statusItem}><View style={[s.dot, { backgroundColor: colors.status.success }]} /><AppText variant="md" color="#64748B">{statusCounts.free} Trống</AppText></View>
        <View style={s.statusItem}><View style={[s.dot, { backgroundColor: colors.status.danger }]} /><AppText variant="md" color="#64748B">{statusCounts.busy} Có khách</AppText></View>
        <View style={s.statusItem}><View style={[s.dot, { backgroundColor: '#F59E0B' }]} /><AppText variant="md" color="#64748B">{statusCounts.reserved} Đặt trước</AppText></View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.58 }}>
            <View style={s.tableGrid}>
              {filtered.map(t => (
                <TouchableOpacity key={t.id} onPress={() => setSelectedId(t.id === selectedId ? null : t.id)}
                  style={[s.tableCard, t.id === selectedId && s.tableCardSelected,
                    isBusy(t.status as string) ? s.tableCardBusy :
                    isReserved(t.status as string) ? s.tableCardReserved : s.tableCardFree]}>
                  <AppText variant="md" color="#0F172A">{t.name}</AppText>
                  <AppText variant="md" color="#64748B">{t.area || 'Khác'}</AppText>
                  <View style={[s.tableStatusDot, { backgroundColor: isFree(t.status as string) ? colors.status.success : isReserved(t.status as string) ? '#F59E0B' : colors.status.danger }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 0.42 }}>
            {selectedTable ? (
              <View style={ss.detailPanel}>
                <AppText variant="md" color="#050505">{selectedTable.name}</AppText>
                <View style={{ gap: 8, marginTop: 8 }}>
                  <AppText variant="md" color="#64748B">Khu vực: {selectedTable.area || 'Khác'}</AppText>
                  <AppText variant="md" color="#64748B">Sức chứa: {selectedTable.capacity} người</AppText>
                  <AppText variant="md" color="#64748B">Trạng thái: {isFree(selectedTable.status as string) ? 'Trống' : isReserved(selectedTable.status as string) ? 'Đặt trước' : 'Có khách'}</AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={ss.panelBtnSecondary} onPress={() => openEdit(selectedTable)}>
                    <Icon name="pencil" size={16} color={colors.brand.primary} />
                    <AppText variant="md" color={colors.brand.primary}>Sửa</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={ss.panelBtnDanger} onPress={() => handleDelete(selectedTable.id)}>
                    <Icon name="delete" size={16} color={colors.status.danger} />
                    <AppText variant="md" color={colors.status.danger}>Xóa</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={ss.detailPanelEmpty}>
                <AppText variant="md" color="#050505">Chi Tiết Bàn</AppText>
                <AppText variant="md" color="#65676B">Chọn bàn để xem chi tiết</AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>DANH SÁCH BÀN ({filtered.length})</AppText>
            </View>
            <View style={ss.sectionItems}>
              {filtered.map(t => (
                <View key={t.id} style={[s.mobileRow, { borderLeftWidth: 4, borderLeftColor: isFree(t.status as string) ? colors.status.success : isReserved(t.status as string) ? '#F59E0B' : colors.status.danger }]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedId(t.id === selectedId ? null : t.id)}>
                    <AppText variant="md" color="#0F172A">{t.name} · {t.area || 'Khác'}</AppText>
                    <AppText variant="md" color="#64748B">{t.capacity} người · {isFree(t.status as string) ? 'Trống' : isReserved(t.status as string) ? 'Đặt trước' : 'Có khách'}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={ss.miniActionBtn} onPress={() => openEdit(t)}>
                    <Icon name="pencil" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <DetailModal visible={!!selectedTable} title={selectedTable?.name || ''}
          subtitle={selectedTable?.area || undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedTable ? () => { openEdit(selectedTable); setSelectedId(null); } : undefined}
          onDelete={selectedTable ? () => { handleDelete(selectedTable.id); setSelectedId(null); } : undefined}>
          {selectedTable && (
            <View style={{ gap: 12 }}>
              <AppText variant="md" color="#64748B">Khu vực: {selectedTable.area || 'Khác'}</AppText>
              <AppText variant="md" color="#64748B">Sức chứa: {selectedTable.capacity} người</AppText>
              <AppText variant="md" color="#64748B">Trạng thái: {isFree(selectedTable.status as string) ? 'Trống' : isReserved(selectedTable.status as string) ? 'Đặt trước' : 'Có khách'}</AppText>
            </View>
          )}
        </DetailModal>
      )}

      <FormModal visible={showForm} title={editingId ? 'Sửa bàn' : 'Thêm bàn mới'}
        onClose={() => setShowForm(false)}
        onSave={() => handleSave(() => !form.name.trim() ? 'Tên bàn không được để trống' : null)}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm'} saving={saving}>
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Tên bàn (VD: B01)" value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="Sức chứa" keyboardType="number-pad" value={form.capacity}
            onChangeText={(v) => setForm(f => ({ ...f, capacity: v }))} />
          <AppText variant="md" color="#64748B">Khu vực</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {FORM_AREAS.map(a => (
              <TouchableOpacity key={a} onPress={() => setForm(f => ({ ...f, area: f.area === a ? '' : a }))}
                style={[s.areaChip, form.area === a && s.areaChipActive]}>
                <AppText variant="md" color={form.area === a ? colors.brand.primary : '#334155'}>{a}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app, position: 'relative' },
  statusBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 16, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 8 },
  tableCard: { width: '30%', aspectRatio: 1, borderRadius: 12, padding: 10, justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  tableCardFree: { backgroundColor: '#FFFFFF' },
  tableCardBusy: { backgroundColor: '#FEF2F2' },
  tableCardReserved: { backgroundColor: '#FFFBEB' },
  tableCardSelected: { borderColor: colors.brand.primary, borderWidth: 2 },
  tableStatusDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', top: 8, right: 8 },
  mobileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  input: { height: 44, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, color: '#0F172A', backgroundColor: '#FFFFFF' },
  areaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  areaChipActive: { backgroundColor: '#FFF7ED', borderColor: colors.brand.primary },
});
