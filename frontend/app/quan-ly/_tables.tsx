import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { api } from '../../lib/api';
import type { Table } from '../../lib/types';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';
import SummaryRow from '../../lib/components/layout/SummaryRow';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';

interface FormState { name: string; area: string; capacity: string; }
const EMPTY_FORM: FormState = { name: '', area: '', capacity: '4' };

const AREA_FILTER_CONFIG: Array<{ key: string; label: string; icon: string }> = [
  { key: 'Tất cả', label: 'Tất cả', icon: 'view-grid-outline' },
  { key: 'Trong nhà', label: 'Trong nhà', icon: 'home-outline' },
  { key: 'VIP', label: 'VIP', icon: 'crown-outline' },
  { key: 'Ngoài Trời', label: 'Ngoài trời', icon: 'tree-outline' },
  { key: 'Tầng 1', label: 'Tầng 1', icon: 'numeric-1-box-outline' },
  { key: 'Tầng 2', label: 'Tầng 2', icon: 'numeric-2-box-outline' },
];

const FORM_AREAS = ['Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'];

export default function TablesScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedArea, setSelectedArea] = useState('Tất cả');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedId), [tables, selectedId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getQuanLyTables();
      setTables(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải danh sách bàn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (t: Table) => {
    setEditingId(t.id);
    setForm({ name: t.name, area: t.area ?? '', capacity: String(t.capacity) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Tên bàn không được để trống');
      return;
    }
    const payload = { ...form, capacity: parseInt(form.capacity) || 4 };
    setSaving(true);
    try {
      if (editingId) {
        await api.updateTable(editingId, payload);
      } else {
        await api.createTable(payload);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const counts = { trong: 0, co_khach: 0, da_dat: 0, dang_don: 0 };
  tables.forEach(t => { if (t.status in counts) counts[t.status as keyof typeof counts]++; });

  const getAreaCount = (areaKey: string) => {
    if (areaKey === 'Tất cả') return tables.length;
    return tables.filter(t => (t.area || 'Trong nhà') === areaKey).length;
  };

  const filteredTables = useMemo(() => {
    let list = selectedArea === 'Tất cả'
      ? tables
      : tables.filter(t => (t.area || 'Trong nhà') === selectedArea);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.area || 'Trong nhà').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tables, selectedArea, searchQuery]);

  const renderMobileCard = (table: Table) => {
    const isOccupied = table.status === 'co_khach';
    const statusColor = isOccupied ? colors.brand.primary : colors.status.success;
    const statusBg = isOccupied ? '#FFF7ED' : '#ECFDF5';

    return (
      <View style={ss.listRow} key={table.id}>
        <View style={[styles.tableAvatarCircle, { backgroundColor: statusBg, alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
        </View>

        <TouchableOpacity
          style={{ flex: 1, paddingRight: 8 }}
          onPress={() => setSelectedId(table.id)}
          activeOpacity={0.7}
        >
          <AppText variant="sm" color="#0F172A" numberOfLines={1}>
            {table.name}
          </AppText>
          <AppText variant="sm" color="#64748B" numberOfLines={1}>
            Khu vực: {table.area || 'Trong nhà'} · Sức chứa: {table.capacity || 4} người
          </AppText>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
            <AppText variant="sm" color={statusColor}>
              {isOccupied ? 'Có khách' : 'Bàn trống'}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          style={ss.miniActionBtn}
          onPress={() => setSelectedId(table.id)}
        >
          <Icon name="eye-outline" size={16} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">{editingId ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 8 }}>
        <View style={{ marginBottom: 12 }}>
          <AppText variant="sm" color={colors.text.primary} style={{ marginBottom: 6 }}>Tên bàn *</AppText>
          <TextInput
            style={styles.fieldInput}
            placeholder="VD: A01, Bàn 1..."
            placeholderTextColor={colors.text.muted}
            value={form.name}
            onChangeText={v => setForm(f => ({ ...f, name: v }))}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          <AppText variant="sm" color={colors.text.primary} style={{ marginBottom: 6 }}>Khu vực</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {FORM_AREAS.map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.areaChip, form.area === a && styles.areaChipActive]}
                onPress={() => setForm(f => ({ ...f, area: f.area === a ? '' : a }))}
              >
                <AppText variant="sm" color={form.area === a ? colors.brand.primary : colors.text.secondary} weight={form.area === a ? 'bold' : 'normal'}>{a}</AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.fieldInput}
            placeholder="Nhập khu vực..."
            placeholderTextColor={colors.text.muted}
            value={form.area}
            onChangeText={v => setForm(f => ({ ...f, area: v }))}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          <AppText variant="sm" color={colors.text.primary} style={{ marginBottom: 6 }}>Sức chứa (người)</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[2, 4, 6, 8, 10, 12].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.capChip, form.capacity === String(n) && styles.capChipActive]}
                onPress={() => setForm(f => ({ ...f, capacity: String(n) }))}
              >
                <AppText variant="sm" color={form.capacity === String(n) ? colors.brand.primary : colors.text.secondary} weight={form.capacity === String(n) ? 'bold' : 'normal'}>{n}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
          <AppText variant="sm" color={colors.text.secondary}>Hủy</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={{ gap: 8 }}>
      {/* Top Mobile Action Bar */}
      {!isWide && (
        <View style={ss.topActionBar}>
          <View style={ss.searchInputWrap}>
            <Icon name="magnify" size={16} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm tên bàn, khu vực..."
              placeholderTextColor="#94A3B8"
              style={ss.searchTextInput}
            />
          </View>

          <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Icon name="plus" size={16} color="#FFFFFF" />
            <AppText variant="sm" weight="bold" color="#FFFFFF">
              Thêm bàn
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* KPI Cards Strip */}
      <View style={ss.metricContainer}>
        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="table-furniture" size={14} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#0F172A">{tables.length}</AppText>
            <AppText variant="sm" color="#64748B">Tổng số bàn</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-circle-outline" size={14} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{counts.trong}</AppText>
            <AppText variant="sm" color="#64748B">Bàn trống</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="account-group-outline" size={14} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{counts.co_khach}</AppText>
            <AppText variant="sm" color="#64748B">Đang phục vụ</AppText>
          </View>
        </View>
      </View>

      {/* Area filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}
        >
          {AREA_FILTER_CONFIG.map((item) => {
            const active = selectedArea === item.key;
            const count = getAreaCount(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSelectedArea(item.key)}
                activeOpacity={0.7}
                style={[
                  ss.filterChip,
                  active && ss.filterChipActive,
                ]}
              >
                <AppText
                  variant="sm"
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {item.label} ({count})
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
            <View style={{ flex: 0.55 }}>
              {loading ? (
                <TableSkeleton rowCount={5} />
              ) : (
                <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: '1%' }}>
                  {filteredTables.map(table => {
                    const isOccupied = table.status === 'co_khach';
                    return (
                      <TouchableOpacity
                        key={table.id}
                        onPress={() => openEdit(table)}
                        activeOpacity={0.8}
                        style={{
                          width: '31.3%',
                          aspectRatio: 1,
                          margin: '1%',
                          borderRadius: 16,
                          backgroundColor: isOccupied ? colors.brand.primaryBg : colors.surface.card,
                          padding: 12,
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <AppText variant="md" weight="bold" color={isOccupied ? colors.brand.primary : '#050505'}>{table.name}</AppText>
                          {isOccupied && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.primary }} />
                          )}
                        </View>

                        <View>
                          <AppText variant="sm" color={isOccupied ? colors.brand.primary : colors.text.muted}>
                            {isOccupied ? 'Có khách' : 'Trống'}
                          </AppText>
                          <AppText variant="sm" color={colors.text.secondary}>
                            {table.area || 'Trong nhà'}
                          </AppText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
            <View style={{ flex: 0.45 }}>
              {showForm ? renderInlineForm() : (
                <View style={styles.panelBox}>
                  <View style={styles.panelHeader}>
                    <AppText variant="md" weight="bold" color="#050505">Thống kê sơ đồ bàn</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText variant="md" weight="bold" color="#050505">{tables.length}</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tổng số bàn</AppText>
                    </View>
                    <View style={styles.barDivider} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText variant="md" weight="bold" color={colors.status.success}>{counts.trong}</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Bàn trống</AppText>
                    </View>
                    <View style={styles.barDivider} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText variant="md" weight="bold" color={colors.brand.primary}>{counts.co_khach}</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Có khách</AppText>
                    </View>
                  </View>
                  <View style={styles.panelDivider} />
                  <TouchableOpacity style={styles.saveBtn} onPress={openAdd}>
                    <Icon name="plus" size={16} color={colors.text.inverse} />
                    <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm bàn mới</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          {loading ? (
            <TableSkeleton rowCount={5} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              {renderHeader()}

              <View style={ss.sectionWrap}>
                <View style={ss.sectionHeader}>
                  <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                    DANH SÁCH SƠ ĐỒ BÀN ({filteredTables.length})
                  </AppText>
                </View>

                <View style={{ paddingHorizontal: 10, paddingVertical: filteredTables.length ? 4 : 16 }}>
                  {filteredTables.map(renderMobileCard)}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {!isWide && (
        <>
          <FormModal
            visible={showForm}
            title={editingId ? 'Cập nhật bàn' : 'Thêm bàn mới'}
            onClose={() => setShowForm(false)}
            onSave={handleSave}
            saveLabel={editingId ? 'Cập nhật' : 'Thêm bàn'}
            saving={saving}
          >
            <View style={{ gap: 10, paddingTop: 4 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên bàn *</AppText>
              <TextInput
                style={styles.fieldInput}
                placeholder="VD: A01, Bàn 1..."
                placeholderTextColor={colors.text.muted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Khu vực</AppText>
              <TextInput
                style={styles.fieldInput}
                placeholder="Nhập khu vực..."
                placeholderTextColor={colors.text.muted}
                value={form.area}
                onChangeText={v => setForm(f => ({ ...f, area: v }))}
              />
            </View>
          </FormModal>

          <DetailModal
            visible={!!selectedTable}
            title={selectedTable?.name || ''}
            subtitle={selectedTable ? `Khu vực: ${selectedTable.area || 'Trong nhà'} · Sức chứa: ${selectedTable.capacity || 4} người` : undefined}
            onClose={() => setSelectedId(null)}
            onEdit={selectedTable ? () => { const t = selectedTable; setSelectedId(null); openEdit(t); } : undefined}
          >
            {selectedTable && (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Tên bàn</AppText>
                  <AppText variant="sm" color="#0F172A">{selectedTable.name}</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Khu vực bài trí</AppText>
                  <AppText variant="sm" color="#0F172A">{selectedTable.area || 'Trong nhà'}</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Sức chứa tối đa</AppText>
                  <AppText variant="sm" color="#0F172A">{selectedTable.capacity || 4} người</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Trạng thái hiện tại</AppText>
                  <View style={{ backgroundColor: selectedTable.status === 'co_khach' ? colors.brand.primaryBg : '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <AppText variant="sm" color={selectedTable.status === 'co_khach' ? colors.brand.primary : colors.status.success}>
                      {selectedTable.status === 'co_khach' ? 'Có khách' : 'Bàn trống'}
                    </AppText>
                  </View>
                </View>
              </View>
            )}
          </DetailModal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 6, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 6, backgroundColor: colors.brand.primary },

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
    maxWidth: 600,
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

  filterRow: { marginBottom: 6 },
  areaTab: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  areaTabActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.surface.app,
    marginLeft: 2,
  },
  countBadgeActive: {
    backgroundColor: '#FFEDD5',
  },

  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light },

  /* Mobile Full-Width Edge-to-Edge Facebook Table Card */
  tableCardFbFullWidth: {
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
  tableAvatarCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  actionCircleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },

  /* Facebook Equal Bottom Action Bar */
  cardActionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8, marginTop: 10 },
  cardActionItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  cardActionDivider: { width: 1, height: 16, backgroundColor: colors.border.light },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },

  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
  areaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface.app },
  areaChipActive: { backgroundColor: colors.brand.primaryBg },
  capChip: { width: 40, height: 34, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  capChipActive: { backgroundColor: colors.brand.primaryBg },

  cancelBtn: { flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1.5, height: 40, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
});
