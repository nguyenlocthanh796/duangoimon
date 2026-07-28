import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Branch } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

export default function BranchesScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', is_active: true });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); const d: any = await request(`${API}/branches`); setData(Array.isArray(d) ? d : (d?.items || [])); }
    catch { setData([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let va: any = (a as any)[sortKey];
      let vb: any = (b as any)[sortKey];
      if (sortKey === 'is_active') { va = a.is_active ? 1 : 0; vb = b.is_active ? 1 : 0; }
      if (va == null) va = ''; if (vb == null) vb = '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const stats = {
    total: data.length,
    active: data.filter(b => b.is_active).length,
    inactive: data.filter(b => !b.is_active).length,
  };

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      title: 'Tên chi nhánh',
      flex: 1,
      sortable: true,
      sortValue: (b) => b.name || '',
      render: (b) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.branchAvatarCircle, { alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 10 }}>
              {b.code?.slice(0, 2) || 'CN'}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{b.name}</AppText>
            {b.address ? <AppText variant="sm" color={colors.text.muted} numberOfLines={1}>📍 {b.address}</AppText> : null}
          </View>
        </View>
      ),
    },
    {
      key: 'code',
      title: 'Mã',
      width: 70,
      sortable: true,
      sortValue: (b) => b.code || '',
      render: (b) => <AppText variant="sm" color={colors.text.muted}>{b.code}</AppText>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 95,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.is_active ? 1 : 0,
      render: (b) => (
        <View style={[styles.statusChip, { backgroundColor: b.is_active ? colors.brand.primaryBg : colors.surface.app }]}>
          <View style={[styles.statusDot, { backgroundColor: b.is_active ? colors.status.success : colors.status.danger }]} />
          <AppText variant="sm" weight="bold" color={b.is_active ? colors.status.success : colors.status.danger}>{b.is_active ? 'Hoạt động' : 'Tắt'}</AppText>
        </View>
      ),
    },
  ];

  const toggleBranchActive = async (b: Branch) => {
    try {
      await request(`${API}/branches`, { method: 'PUT', body: JSON.stringify({ id: b.id, is_active: !b.is_active }) });
      load();
    } catch { Alert.alert('Lỗi', 'Không thể đổi trạng thái'); }
  };

  const renderMobileCard = (b: Branch) => (
    <View style={styles.posTableRow} key={b.id}>
      <View style={[styles.posAvatarMiniCircle, { backgroundColor: b.is_active ? '#ECFDF5' : '#FEF2F2', alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.is_active ? colors.status.success : colors.status.danger }} />
      </View>

      <TouchableOpacity
        style={{ flex: 1, paddingRight: 8 }}
        onPress={() => setSelected(b)}
        activeOpacity={0.7}
      >
        <AppText variant="sm" color="#0F172A" numberOfLines={1}>
          {b.name} ({b.code})
        </AppText>
        <AppText variant="sm" color="#64748B" numberOfLines={1}>
          📍 {b.address || 'Chưa địa chỉ'} · 📱 {b.phone || 'Chưa SĐT'}
        </AppText>
      </TouchableOpacity>

      <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
        <AppText variant="sm" color={b.is_active ? colors.status.success : colors.status.danger}>
          {b.is_active ? 'Đang hoạt động' : 'Tạm đóng cửa'}
        </AppText>
      </View>

      <TouchableOpacity
        style={styles.miniActionBtn}
        onPress={() => setSelected(b)}
      >
        <Icon name="pencil" size={16} color={colors.brand.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderPanel = () => {
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <AppText variant="md" weight="bold" color="#050505">
            {selected ? selected.name : 'Thống kê chi nhánh'}
          </AppText>
        </View>

        {selected ? (
          <>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={colors.text.muted}>Mã chi nhánh</AppText>
                <AppText variant="sm" color="#050505">{selected.code}</AppText>
              </View>
              <View style={styles.panelDivider} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={colors.text.muted}>Trạng thái</AppText>
                <AppText variant="sm" color={selected.is_active ? colors.status.success : colors.status.danger}>
                  {selected.is_active ? 'Đang hoạt động' : 'Tạm đóng cửa'}
                </AppText>
              </View>
              <View style={styles.panelDivider} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={colors.text.muted}>Số điện thoại</AppText>
                <AppText variant="sm" color="#050505">{selected.phone || 'Chưa cập nhật'}</AppText>
              </View>
              {selected.address && (
                <>
                  <View style={styles.panelDivider} />
                  <AppText variant="sm" color={colors.text.muted}>Địa chỉ</AppText>
                  <AppText variant="sm" color="#050505">📍 {selected.address}</AppText>
                </>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => { setEditing(selected); setForm({ name: selected.name, code: selected.code, address: selected.address || '', phone: selected.phone || '', is_active: selected.is_active }); setShowForm(true); }} style={styles.panelBtnSecondary}>
                <Icon name="pencil" size={14} color={colors.brand.primary} />
                <AppText variant="sm" color={colors.brand.primary}>Sửa chi nhánh</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => del(selected.id)} style={styles.panelBtnDanger}>
                <Icon name="delete" size={14} color={colors.status.danger} />
                <AppText variant="sm" color={colors.status.danger}>Xoá</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.panelDivider} />
            <TouchableOpacity style={styles.panelCtaSecondary} onPress={() => { setSelected(null); setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }}>
              <Icon name="plus" size={16} color={colors.brand.primary} />
              <AppText variant="sm" color={colors.brand.primary}>Thêm chi nhánh mới</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <AppText variant="md" color="#050505">{stats.total}</AppText>
                <AppText variant="sm" color={colors.text.muted}>Tổng số</AppText>
              </View>
              <View style={styles.barDivider} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <AppText variant="md" color={colors.status.success}>{stats.active}</AppText>
                <AppText variant="sm" color={colors.text.muted}>Đang hoạt động</AppText>
              </View>
              <View style={styles.barDivider} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <AppText variant="md" color={colors.status.danger}>{stats.inactive}</AppText>
                <AppText variant="sm" color={colors.text.muted}>Tạm đóng cửa</AppText>
              </View>
            </View>
            <View style={styles.panelDivider} />
            <TouchableOpacity style={styles.panelCta} onPress={() => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm chi nhánh mới</AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const del = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá chi nhánh này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => { try { await request(`${API}/branches`, { method: 'DELETE', body: JSON.stringify({ id }) }); setSelected(null); load(); } catch { Alert.alert('Lỗi', 'Xoá thất bại'); } } },
    ]);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) { Alert.alert('Lỗi', 'Tên và mã bắt buộc'); return; }
    try {
      const body = JSON.stringify(form);
      if (editing) { await request(`${API}/branches`, { method: 'PUT', body: JSON.stringify({ ...JSON.parse(body), id: editing.id }) }); }
      else { await request(`${API}/branches`, { method: 'POST', body }); }
      setShowForm(false); setEditing(null); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const renderHeader = () => (
    <View>
      {/* Top Action Button on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" color="#050505">{stats.total} chi nhánh</AppText>
          <TouchableOpacity onPress={() => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }} style={styles.addBtn}>
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm chi nhánh</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: colors.brand.primaryBg }]}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 11 }}>CN</AppText>
          </View>
          <View>
            <AppText variant="md" weight="bold" color="#050505">{stats.total}</AppText>
            <AppText variant="sm" color="#65676B">Tổng chi nhánh</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 12 }}>●</AppText>
          </View>
          <View>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color="#65676B">Đang mở</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEE2E2' }]}>
            <AppText variant="sm" weight="bold" color={colors.status.danger} style={{ fontSize: 12 }}>○</AppText>
          </View>
          <View>
            <AppText variant="md" weight="bold" color={colors.status.danger}>{stats.inactive}</AppText>
            <AppText variant="sm" color="#65676B">Tạm ngừng</AppText>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {isWide ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
            <View style={{ flex: 0.55 }}>
              <DataTable<Branch>
                columns={columns}
                data={sorted}
                getRowId={(b: Branch) => b.id}
                loading={loading}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={handleSortChange}
                onRowPress={setSelected}
                selectedRowId={selected?.id ?? null}
                onRefresh={load}
                compact
                emptyIcon="storefront-outline"
                emptyTitle="Chưa có chi nhánh"
                emptySubtitle=""
              />
            </View>
            <View style={{ flex: 0.45 }}>{renderPanel()}</View>
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {renderHeader()}
          <View style={styles.posCatSectionWrap}>
            <View style={styles.posCatHeader}>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                DANH SÁCH CHI NHÁNH ({sorted.length})
              </AppText>
            </View>

            <View style={styles.posCatItemsGroup}>
              {sorted.map(item => (
                <React.Fragment key={item.id}>
                  {renderMobileCard(item)}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <FormModal visible={showForm} title={editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên *</AppText>
              <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="CN Hà Nội" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Mã *</AppText>
              <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} placeholder="HN" placeholderTextColor={colors.text.muted} />
            </View>
          </View>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Địa chỉ</AppText>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={styles.fieldInput} placeholder="Số nhà, đường, thành phố" placeholderTextColor={colors.text.muted} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Số điện thoại</AppText>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} placeholder="090..." keyboardType="phone-pad" placeholderTextColor={colors.text.muted} />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={styles.toggleChip}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? colors.status.success : colors.text.muted} />
            <AppText variant="sm" color={colors.text.primary}>{form.is_active ? 'Đang hoạt động' : 'Tạm ngừng'}</AppText>
          </TouchableOpacity>
        </View>
      </FormModal>

      {!isWide && (
        <DetailModal
          visible={!!selected}
          title={selected?.name || 'Chi Tiết Chi Nhánh'}
          subtitle={selected?.code ? `Mã: ${selected.code}` : undefined}
          onClose={() => setSelected(null)}
          onEdit={() => {
            if (selected) {
              setEditing(selected);
              setForm({
                name: selected.name,
                code: selected.code,
                address: selected.address || '',
                phone: selected.phone || '',
                is_active: selected.is_active,
              });
              setShowForm(true);
            }
          }}
          onDelete={selected ? () => del(selected.id) : undefined}
        >
          {selected && (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color={colors.text.muted}>Mã chi nhánh</AppText>
                  <AppText variant="sm" weight="bold" color="#050505">{selected.code}</AppText>
                </View>
                <View style={styles.panelDivider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color={colors.text.muted}>Trạng thái</AppText>
                  <AppText variant="sm" weight="bold" color={selected.is_active ? colors.status.success : colors.status.danger}>
                    {selected.is_active ? 'Đang hoạt động' : 'Tạm đóng cửa'}
                  </AppText>
                </View>
                <View style={styles.panelDivider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color={colors.text.muted}>Số điện thoại</AppText>
                  <AppText variant="sm" color="#050505">{selected.phone || 'Chưa cập nhật'}</AppText>
                </View>
                {selected.address && (
                  <>
                    <View style={styles.panelDivider} />
                    <AppText variant="sm" color={colors.text.muted}>Địa chỉ</AppText>
                    <AppText variant="sm" color="#050505">📍 {selected.address}</AppText>
                  </>
                )}
              </View>
            </View>
          )}
        </DetailModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 6, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 6, backgroundColor: colors.brand.primary },
  branchAvatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' },

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
    maxWidth: 560,
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
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  codeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.surface.app },

  /* Mobile Full-Width Edge-to-Edge Facebook Post Block */
  branchCardFbFullWidth: {
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

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, backgroundColor: colors.brand.primaryBg },
  panelBtnDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, backgroundColor: '#FEE2E2' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: 999, height: 46 },
  panelCtaSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand.primaryBg, borderRadius: 999, height: 44 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
  toggleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.surface.app },

  posTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatSectionWrap: {
    marginBottom: 16,
  },
  posCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  catIconMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatItemsGroup: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
});
