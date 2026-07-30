import React, { useMemo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, ss } from '../../lib/theme';
import { useCrud } from '../../lib/hooks/useCrud';
import { request } from '../../lib/api/client';
import type { Station } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';
import { getKitchenModuleEnabled, setKitchenModuleEnabled } from '../../lib/utils/kitchenSettings';

const API = '/api/v1/quan-ly';
type FormState = { name: string; code: string; categories: string; printer_name: string };
const EMPTY_FORM: FormState = { name: '', code: '', categories: '', printer_name: '' };

export default function StationsScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [kitchenEnabled, setKitchenEnabled] = React.useState(getKitchenModuleEnabled());
  const handleToggleKitchen = (val: boolean) => { setKitchenEnabled(val); setKitchenModuleEnabled(val); };
  const {
    data: items, loading, showForm, setShowForm, selectedItem: selected,
    setSelectedId: setSelected, editingId, form, setForm, loadData, openAdd, openEdit, handleSave, handleDelete,
  } = useCrud<Station, FormState>({
    fetchFn: () => request(`${API}/stations`) as Promise<Station[]>,
    createFn: (p) => request(`${API}/stations`, { method: 'POST', body: JSON.stringify(p) }) as Promise<Station>,
    updateFn: (id, p) => request(`${API}/stations/${id}`, { method: 'PUT', body: JSON.stringify(p) }) as Promise<Station>,
    fallbackData: [],
    formState: EMPTY_FORM,
    formFromItem: (s) => ({ name: s.name, code: s.code, categories: (s.categories || []).join(', '), printer_name: s.printer_name || '' }),
    buildPayload: (f, editingId) => {
      if (!f.name || !f.code) return {};
      return { name: f.name, code: f.code, categories: f.categories.split(',').map((s: string) => s.trim()).filter(Boolean), printer_name: f.printer_name || undefined };
    },
    nameLabel: 'trạm',
  });

  const stats = { total: items.length, hasPrinter: items.filter(i => i.printer_name).length };

  const columns: Column<Station>[] = [
    { key: 'name', title: 'Tên trạm', flex: 1, sortable: true, sortValue: (st) => st.name || '',
      render: (st) => (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={s.avatar}><AppText variant="md" color={colors.brand.primary}>{st.code?.slice(0, 2) || 'BK'}</AppText></View>
        <AppText variant="md" color="#050505">{st.name}</AppText>
      </View>) },
    { key: 'code', title: 'Mã', width: 70, sortable: true,
      render: (st) => <AppText variant="md" color={colors.text.muted}>{st.code}</AppText> },
    { key: 'printer', title: 'Máy in', width: 90, align: 'center' as const, sortable: true,
      render: (st) => st.printer_name ? <View style={s.chip}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.success }} /><AppText variant="md" color={colors.status.success}>Có</AppText></View> : <AppText variant="md" color={colors.text.muted}>—</AppText> },
  ];

  const renderMobileCard = (st: Station) => (
    <View style={s.card} key={st.id}>
      <View style={s.cardHeader}>
        <View style={s.avatar}><AppText variant="md" color={colors.brand.primary}>{st.code?.slice(0, 2) || 'BK'}</AppText></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" color="#050505">{st.name}</AppText>
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.surface.app }}><AppText variant="md" color={colors.text.muted}>{st.code}</AppText></View>
          </View>
          <AppText variant="md" color="#65676B">{(st.categories || []).join(', ') || 'Tất cả món'}</AppText>
        </View>
        {st.printer_name ? <View style={s.chip}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.success }} /><AppText variant="md" color={colors.status.success}>In</AppText></View> : <AppText variant="md" color={colors.text.muted}>—</AppText>}
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionItem} onPress={() => openEdit(st)}><Icon name="pencil" size={16} color={colors.brand.primary} /><AppText variant="md" color={colors.brand.primary}>Sửa</AppText></TouchableOpacity>
        <View style={{ width: 1, height: 16, backgroundColor: colors.border.light }} />
        <TouchableOpacity style={s.actionItem} onPress={() => handleDelete(st.id, st.name)}><Icon name="delete" size={16} color={colors.status.danger} /><AppText variant="md" color={colors.status.danger}>Xóa</AppText></TouchableOpacity>
      </View>
    </View>
  );

  const renderPanel = () => (
    <View style={s.panel}>
      <View style={[s.toggleBanner, { backgroundColor: kitchenEnabled ? colors.brand.primaryBg : colors.surface.app }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="md" color={kitchenEnabled ? colors.brand.primary : colors.text.secondary}>{kitchenEnabled ? 'Bật Module Bếp' : 'Tắt Module Bếp'}</AppText>
          <AppText variant="md" color={colors.text.muted}>{kitchenEnabled ? 'Gửi đơn xuống Bếp' : 'Bỏ qua Bếp'}</AppText>
        </View>
        <Switch value={kitchenEnabled} onValueChange={handleToggleKitchen} trackColor={{ false: colors.border.light, true: colors.brand.primary }} thumbColor={colors.surface.card} />
      </View>
      <View style={s.panelHdr}><AppText variant="md" color="#050505">Thống kê</AppText></View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ alignItems: 'center', flex: 1 }}><AppText variant="md" color="#050505">{stats.total}</AppText><AppText variant="md" color={colors.text.muted}>Tổng trạm</AppText></View>
        <View style={{ width: 1, backgroundColor: colors.border.light }} />
        <View style={{ alignItems: 'center', flex: 1 }}><AppText variant="md" color={colors.status.success}>{stats.hasPrinter}</AppText><AppText variant="md" color={colors.text.muted}>Có máy in</AppText></View>
      </View>
      <View style={s.divider} />
      {selected ? (
        <View style={{ gap: 8 }}>
          <AppText variant="md" color="#050505">{selected.name}</AppText>
          <AppText variant="md" color={colors.text.muted}>Mã: {selected.code} · Danh mục: {(selected.categories || []).join(', ') || 'Tất cả'}</AppText>
          {selected.printer_name && <AppText variant="md" color={colors.status.success}>🖨️ {selected.printer_name}</AppText>}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, backgroundColor: colors.brand.primary }}><Icon name="pencil" size={14} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Sửa</AppText></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(selected.id, selected.name)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, backgroundColor: colors.status.danger }}><Icon name="delete" size={14} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Xóa</AppText></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={ss.panelCta} onPress={openAdd}><Icon name="plus" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Thêm trạm</AppText></TouchableOpacity>
      )}
    </View>
  );

  const [sortKey, setSortKey] = React.useState<string>('name');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {!isWide && (
        <>
          <View style={ss.topActionBar}>
            <AppText variant="md" color="#050505">{stats.total} trạm</AppText>
            <TouchableOpacity onPress={openAdd} style={ss.addBtn}><Icon name="plus" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Thêm</AppText></TouchableOpacity>
          </View>
          <View style={s.switchBanner}>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#050505">{kitchenEnabled ? 'Bật Trạm Chế Biến' : 'Tắt Trạm Chế Biến'}</AppText>
              <AppText variant="md" color="#65676B">{kitchenEnabled ? 'Tự động truyền đơn sang trạm bếp' : 'Thanh toán bỏ qua trạm bếp'}</AppText>
            </View>
            <Switch value={kitchenEnabled} onValueChange={handleToggleKitchen} trackColor={{ false: colors.border.light, true: colors.brand.primary }} thumbColor={colors.surface.card} />
          </View>
        </>
      )}

      <View style={ss.metricContainer}>
        <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: colors.brand.primaryBg }]}><Icon name="silverware-fork-knife" size={14} color={colors.brand.primary} /></View><View><AppText variant="md" color="#0F172A">{stats.total}</AppText><AppText variant="md" color="#64748B">Tổng trạm</AppText></View></View>
        <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}><Icon name="printer" size={14} color={colors.status.success} /></View><View><AppText variant="md" color={colors.status.success}>{stats.hasPrinter}</AppText><AppText variant="md" color="#64748B">Có máy in</AppText></View></View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<Station> columns={columns} data={items} getRowId={(s) => s.id} loading={loading}
              sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
              onRowPress={(st) => setSelected(st.id)} selectedRowId={selected?.id ?? null} onRefresh={loadData} compact
              emptyIcon="stove" emptyTitle="Chưa có trạm bếp" emptySubtitle="" />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <DataTable<Station> columns={columns} data={items} getRowId={(s) => s.id} loading={loading}
          sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
          onRowPress={(st) => setSelected(st.id)} selectedRowId={selected?.id ?? null} onRefresh={loadData}
          renderMobileCard={renderMobileCard} compact
          emptyIcon="stove" emptyTitle="Chưa có trạm bếp" emptySubtitle="" />
      )}

      {!isWide && (
        <DetailModal visible={!!selected} title={selected?.name || 'Chi Tiết'}
          subtitle={selected?.code ? `Mã: ${selected.code}` : undefined}
          onClose={() => setSelected(null)} onEdit={selected ? () => openEdit(selected) : undefined}>
          {renderPanel()}
        </DetailModal>
      )}

      <FormModal visible={showForm} title={editingId ? 'Sửa' : 'Thêm'} onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editingId ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><AppText variant="md" color={colors.text.primary}>Tên *</AppText><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.input} placeholder="VD: Bếp chính" placeholderTextColor={colors.text.muted} /></View>
            <View style={{ flex: 1 }}><AppText variant="md" color={colors.text.primary}>Mã *</AppText><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.input} placeholder="B1" placeholderTextColor={colors.text.muted} /></View>
          </View>
          <AppText variant="md" color={colors.text.primary}>Danh mục (phân cách bằng ,)</AppText>
          <TextInput value={form.categories} onChangeText={v => setForm(p => ({ ...p, categories: v }))} style={s.input} placeholder="Khai vị, Món chính" placeholderTextColor={colors.text.muted} />
          <AppText variant="md" color={colors.text.primary}>Tên máy in</AppText>
          <TextInput value={form.printer_name} onChangeText={v => setForm(p => ({ ...p, printer_name: v }))} style={s.input} placeholder="Tên máy in" placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.brand.primaryBg },
  card: { backgroundColor: colors.surface.card, width: '100%', marginBottom: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border.light, paddingVertical: 12, paddingHorizontal: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8, marginTop: 10 },
  actionItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  switchBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light, marginBottom: 8 },
  panel: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  divider: { height: 1, backgroundColor: colors.border.light },
  toggleBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
