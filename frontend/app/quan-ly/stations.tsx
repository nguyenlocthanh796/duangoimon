import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Station } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

type SortKey = 'name' | 'code' | 'printer';

export default function StationsScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [items, setItems] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [form, setForm] = useState({ name: '', code: '', categories: '', printer_name: '' });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/stations`); setItems(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const openNew = () => { setEditing(null); setForm({ name: '', code: '', categories: '', printer_name: '' }); setShowForm(true); };
  const openEdit = (s: Station) => { setEditing(s); setForm({ name: s.name, code: s.code, categories: (s.categories || []).join(', '), printer_name: s.printer_name || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { Alert.alert('Lỗi', 'Tên và mã bắt buộc'); return; }
    try {
      const body = { name: form.name, code: form.code, categories: form.categories.split(',').map(s => s.trim()).filter(Boolean), printer_name: form.printer_name || undefined };
      if (editing) await request(`${API}/stations/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/stations`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const del = (id: string) => { Alert.alert('Xác nhận', 'Xoá trạm này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/stations/${id}`, { method: 'DELETE' }); load(); } catch {} } }]); };

  const stats = { total: items.length, hasPrinter: items.filter(i => i.printer_name).length };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortKey === 'code') return sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
      if (sortKey === 'printer') return sortAsc ? (a.printer_name || '').localeCompare(b.printer_name || '') : (b.printer_name || '').localeCompare(a.printer_name || '');
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }, [items, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SortHeader = ({ label, sort, w }: { label: string; sort: SortKey; w?: number | string }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}><Icon name="stove" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>Trạm bếp</Text></View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatItem icon="stove" value={stats.total} label="Tổng" />
        <View style={s.panelDividerV} />
        <StatItem icon="printer" value={stats.hasPrinter} label="Có máy in" />
      </View>
      <View style={s.panelDivider} />
      {selected ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>{selected.name}</Text>
          <Text style={{ ...font.caption, color: colors.text.muted }}>Mã: {selected.code}</Text>
          <Text style={{ ...font.caption, color: colors.text.muted }}>Danh mục: {(selected.categories || []).join(', ') || 'Tất cả'}</Text>
          {selected.printer_name && <Text style={{ ...font.caption, color: colors.text.muted }}>🖨️ {selected.printer_name}</Text>}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}><Icon name="pencil" size={14} color="#fff" /><Text style={s.panelBtnText}>Sửa</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => del(selected.id)} style={[s.panelBtn, { backgroundColor: colors.status.danger }]}><Icon name="delete" size={14} color="#fff" /><Text style={s.panelBtnText}>Xoá</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.panelCta} onPress={openNew}><Icon name="plus" size={14} color="#fff" /><Text style={s.panelCtaText}>Thêm trạm</Text></TouchableOpacity>
      )}
    </View>
  );

  const TableRow = ({ item }: { item: Station }) => (
    <TouchableOpacity onPress={() => setSelected(item)} style={s.tr} activeOpacity={0.7}>
      <Text style={[s.td, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[s.td, { width: 50, textAlign: 'center', ...font.caption, color: colors.text.muted }]}>{item.code}</Text>
      <View style={{ width: 80, alignItems: 'flex-end' }}>
        {item.printer_name ? (
          <View style={[s.activeChip, { backgroundColor: '#DCFCE7' }]}>
            <Icon name="printer" size={10} color="#16A34A" /><Text style={{ ...font.micro, fontWeight: '700', color: '#16A34A' }}>Có</Text>
          </View>
        ) : (
          <Text style={{ ...font.caption, color: colors.text.muted }}>—</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="stove" title="Chưa có trạm" subtitle="Thêm trạm bếp đầu tiên" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <SortHeader label="Tên trạm" sort="name" w={1} />
            <SortHeader label="Mã" sort="code" w={50} />
            <View style={{ width: 80, alignItems: 'flex-end' }}><Text style={s.thText}>Máy in</Text></View>
          </View>
        }
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Trạm bếp" subtitle={`${stats.total} trạm · ${stats.hasPrinter} có máy in`}
        onMenuPress={openSidebar} compact
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={s.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="stove" value={stats.total} label="Tổng" />
        <View style={s.barDivider} />
        <StatItem icon="printer" value={stats.hasPrinter} label="Có máy in" />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa trạm' : 'Thêm trạm'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="VD: Bếp chính" /></View>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Mã *</Text><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.fieldInput} placeholder="B1" /></View>
          </View>
          <Text style={s.fieldLabel}>Danh mục (phân cách bằng dấu phẩy)</Text>
          <TextInput value={form.categories} onChangeText={v => setForm(p => ({ ...p, categories: v }))} style={s.fieldInput} placeholder="Món khai vị, Món chính" />
          <Text style={s.fieldLabel}>Tên máy in</Text>
          <TextInput value={form.printer_name} onChangeText={v => setForm(p => ({ ...p, printer_name: v }))} style={s.fieldInput} placeholder="Tên máy in" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '800', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 6, borderRadius: shape.radius.full },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.button, color: '#fff' },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },
});
