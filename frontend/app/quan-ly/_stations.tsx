import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Station } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import AppText from '../../lib/components/ui/AppText';
import { getKitchenModuleEnabled, setKitchenModuleEnabled } from '../../lib/utils/kitchenSettings';

const API = '/api/v1/quan-ly';

export default function StationsScreen() {
  const { isWide } = useResponsive();
  const [kitchenEnabled, setKitchenEnabled] = useState(getKitchenModuleEnabled());
  const [items, setItems] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const handleToggleKitchen = (val: boolean) => {
    setKitchenEnabled(val);
    setKitchenModuleEnabled(val);
  };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [form, setForm] = useState({ name: '', code: '', categories: '', printer_name: '' });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/stations`);
      setItems(Array.isArray(data) ? data : (data?.items || []));
    }
    catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const del = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá trạm này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/stations/${id}`, { method: 'DELETE' }); setSelected(null); load(); } catch {} } }
    ]);
  };

  const stats = { total: items.length, hasPrinter: items.filter(i => i.printer_name).length };

  const columns: Column<Station>[] = [
    {
      key: 'name',
      title: 'Tên trạm bếp',
      flex: 1,
      sortable: true,
      sortValue: (s) => s.name || '',
      render: (s) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.stationAvatarCircle}>
            <Icon name="stove" size={16} color={colors.brand.primary} />
          </View>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{s.name}</AppText>
        </View>
      ),
    },
    {
      key: 'code',
      title: 'Mã',
      width: 70,
      sortable: true,
      sortValue: (s) => s.code || '',
      render: (s) => <AppText variant="sm" color={colors.text.muted}>{s.code}</AppText>,
    },
    {
      key: 'printer',
      title: 'Máy in',
      width: 90,
      align: 'center',
      sortable: true,
      sortValue: (s) => s.printer_name ? 1 : 0,
      render: (s) => s.printer_name ? (
        <View style={styles.chipSmall}>
          <Icon name="printer" size={12} color={colors.status.success} />
          <AppText variant="sm" weight="bold" color={colors.status.success}>Có</AppText>
        </View>
      ) : <AppText variant="sm" color={colors.text.muted}>—</AppText>,
    },
  ];

  const renderMobileCard = (s: Station) => (
    <View style={styles.stationCardFbFullWidth} key={s.id}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.stationAvatarCircle}>
          <Icon name="stove" size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{s.name}</AppText>
            <View style={styles.codeBadge}>
              <AppText variant="sm" color={colors.text.muted}>{s.code}</AppText>
            </View>
          </View>
          {(s.categories || []).length > 0 ? (
            <AppText variant="sm" color="#65676B" numberOfLines={1} style={{ marginTop: 2 }}>
              Danh mục: {(s.categories || []).join(', ')}
            </AppText>
          ) : (
            <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>Tất cả món ăn</AppText>
          )}
        </View>
        {s.printer_name ? (
          <View style={styles.chipSmall}>
            <Icon name="printer" size={12} color={colors.status.success} />
            <AppText variant="sm" weight="bold" color={colors.status.success}>Có máy in</AppText>
          </View>
        ) : (
          <AppText variant="sm" color={colors.text.muted}>—</AppText>
        )}
      </View>

      {/* Facebook Equal Bottom Action Bar */}
      <View style={styles.cardActionBar}>
        <TouchableOpacity style={styles.cardActionItem} onPress={() => openEdit(s)}>
          <Icon name="pencil-outline" size={16} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Sửa trạm bếp</AppText>
        </TouchableOpacity>
        <View style={styles.cardActionDivider} />
        <TouchableOpacity style={styles.cardActionItem} onPress={() => del(s.id)}>
          <Icon name="delete-outline" size={16} color={colors.status.danger} />
          <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa trạm</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={[styles.toggleBanner, { backgroundColor: kitchenEnabled ? colors.brand.primaryBg : colors.surface.app }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <AppText variant="sm" weight="bold" color={kitchenEnabled ? colors.brand.primary : colors.text.secondary}>
            {kitchenEnabled ? 'Bật Module Bếp / Bar' : 'Tắt Module Bếp'}
          </AppText>
          <AppText variant="sm" color={colors.text.muted}>
            {kitchenEnabled ? 'Bắt buộc gửi đơn xuống Bếp' : 'Bỏ qua Bếp, tính tiền trực tiếp'}
          </AppText>
        </View>
        <Switch value={kitchenEnabled} onValueChange={handleToggleKitchen} trackColor={{ false: colors.border.light, true: colors.brand.primary }} thumbColor={colors.surface.card} />
      </View>

      <View style={styles.panelHeader}>
        <Icon name="stove" size={18} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">Thống kê khu vực bếp</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505">{stats.total}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Tổng trạm</AppText>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="md" weight="bold" color={colors.status.success}>{stats.hasPrinter}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Có máy in</AppText>
        </View>
      </View>
      <View style={styles.panelDivider} />
      {selected ? (
        <View style={{ gap: 8 }}>
          <AppText variant="md" weight="bold" color="#050505">{selected.name}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Mã trạm: {selected.code}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Danh mục: {(selected.categories || []).join(', ') || 'Tất cả'}</AppText>
          {selected.printer_name && <AppText variant="sm" color={colors.status.success}>🖨️ {selected.printer_name}</AppText>}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary }]}>
              <Icon name="pencil" size={14} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => del(selected.id)} style={[styles.panelBtn, { backgroundColor: colors.status.danger }]}>
              <Icon name="delete" size={14} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Xoá</AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.panelCta} onPress={openNew}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm trạm bếp mới</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{stats.total} trạm bếp</AppText>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm trạm</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Module Kitchen Switch Banner on Mobile */}
      {!isWide && (
        <View style={styles.fbSwitchBannerFullWidth}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <AppText variant="md" weight="bold" color="#050505">
              {kitchenEnabled ? 'Bật Module Bếp / Bar' : 'Tắt Module Bếp'}
            </AppText>
            <AppText variant="sm" color="#65676B">
              {kitchenEnabled ? 'Tự động truyền đơn hàng sang trạm bếp' : 'Thanh toán trực tiếp bỏ qua trạm bếp'}
            </AppText>
          </View>
          <Switch
            value={kitchenEnabled}
            onValueChange={handleToggleKitchen}
            trackColor={{ false: colors.border.light, true: colors.brand.primary }}
            thumbColor={colors.surface.card}
          />
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: colors.brand.primaryBg }]}>
            <Icon name="stove" size={18} color={colors.brand.primary} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color="#050505">{stats.total}</AppText>
            <AppText variant="sm" color="#65676B">Tổng trạm bếp</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="printer" size={18} color={colors.status.success} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.hasPrinter}</AppText>
            <AppText variant="sm" color="#65676B">Có máy in</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<Station>
              columns={columns}
              data={items}
              getRowId={(s) => s.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRowPress={setSelected}
              selectedRowId={selected?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="stove"
              emptyTitle="Chưa có trạm bếp"
              emptySubtitle=""
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <DataTable<Station>
            columns={columns}
            data={items}
            getRowId={(s) => s.id}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onRowPress={setSelected}
            selectedRowId={selected?.id ?? null}
            onRefresh={load}
            renderMobileCard={renderMobileCard}
            compact
            emptyIcon="stove"
            emptyTitle="Chưa có trạm bếp"
            emptySubtitle=""
          />
        </View>
      )}

      <FormModal visible={showForm} title={editing ? 'Sửa trạm bếp' : 'Thêm trạm bếp'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên trạm *</AppText>
              <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Bếp chính" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Mã *</AppText>
              <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} placeholder="B1" placeholderTextColor={colors.text.muted} />
            </View>
          </View>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Danh mục (phân cách bằng dấu phẩy)</AppText>
          <TextInput value={form.categories} onChangeText={v => setForm(p => ({ ...p, categories: v }))} style={styles.fieldInput} placeholder="Món khai vị, Món chính" placeholderTextColor={colors.text.muted} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên máy in</AppText>
          <TextInput value={form.printer_name} onChangeText={v => setForm(p => ({ ...p, printer_name: v }))} style={styles.fieldInput} placeholder="Tên máy in" placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: 999, backgroundColor: colors.brand.primary },
  stationAvatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' },
  codeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.surface.app },

  /* Facebook Setting Switch Banner Full-Width */
  fbSwitchBannerFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    maxWidth: 480,
  },
  fbMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fbMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Mobile Full-Width Edge-to-Edge Facebook Post Block */
  stationCardFbFullWidth: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  /* Facebook Equal Bottom Action Bar */
  cardActionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8, marginTop: 10 },
  cardActionItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  cardActionDivider: { width: 1, height: 16, backgroundColor: colors.border.light },

  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  statItem: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  chipSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.brand.primaryBg },
  toggleBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999 },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: 999, height: 44 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
