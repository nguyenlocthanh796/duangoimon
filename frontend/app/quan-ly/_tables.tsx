import React, { useState, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { api } from '../../lib/api';
import type { Table } from '../../lib/types';
import FormModal from '../../lib/components/ui/FormModal';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';

interface FormState { name: string; area: string; capacity: string; }
const EMPTY_FORM: FormState = { name: '', area: '', capacity: '4' };
const AREAS = ['Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'];

const TableCard = ({ table, onPress }: { table: Table; onPress: () => void }) => {
  const isOccupied = table.status === 'co_khach';

  return (
    <TouchableOpacity
      onPress={onPress}
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
        <AppText variant="md" weight="bold" color={isOccupied ? colors.brand.primary : colors.text.primary}>{table.name}</AppText>
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
};

export default function TablesScreen() {
  const { isWide } = useResponsive();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedArea, setSelectedArea] = useState('Tất cả');

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

  const filteredTables = selectedArea === 'Tất cả'
    ? tables
    : tables.filter(t => (t.area || 'Trong nhà') === selectedArea);

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>{editingId ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 8 }}>
        <View style={{ marginBottom: 12 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 6 }}>Tên bàn *</AppText>
          <TextInput
            style={styles.fieldInput}
            placeholder="VD: A01, Bàn 1..."
            placeholderTextColor={colors.text.muted}
            value={form.name}
            onChangeText={v => setForm(f => ({ ...f, name: v }))}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 6 }}>Khu vực</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {AREAS.map(a => (
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
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 6 }}>Sức chứa (người)</AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
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
          <AppText variant="sm" weight="bold" color={colors.text.secondary}>Hủy</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="sm" color={colors.text.muted}>{tables.length} bàn ăn</AppText>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm bàn</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Area filter tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {['Tất cả', 'Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'].map((area) => {
            const active = selectedArea === area;
            return (
              <TouchableOpacity key={area} onPress={() => setSelectedArea(area)} style={[styles.areaTab, active && styles.areaTabActive]}>
                <AppText variant="sm" color={active ? colors.brand.primary : colors.text.secondary} weight={active ? 'bold' : 'normal'}>{area}</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>{tables.length}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Tổng</AppText>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <AppText variant="sm" weight="bold" color={colors.status.success}>{counts.trong}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Trống</AppText>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>{counts.co_khach}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Có khách</AppText>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: '1%' }}>
                {filteredTables.map(table => (
                  <TableCard key={table.id} table={table} onPress={() => openEdit(table)} />
                ))}
              </ScrollView>
            )}
          </View>
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : (
              <View style={styles.panelBox}>
                <View style={styles.panelHeader}>
                  <Icon name="table-furniture" size={18} color={colors.brand.primary} />
                  <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê sơ đồ bàn</AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <AppText variant="md" weight="bold" color={colors.text.primary}>{tables.length}</AppText>
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
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          {loading ? (
            <TableSkeleton rowCount={5} />
          ) : (
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: '1%', paddingBottom: 24 }}>
              {filteredTables.map(table => (
                <TableCard key={table.id} table={table} onPress={() => openEdit(table)} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {!isWide && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.brand.primary },

  filterRow: { paddingHorizontal: 8, marginVertical: 4 },
  areaTab: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  areaTabActive: { backgroundColor: colors.brand.primaryBg },

  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light },

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
