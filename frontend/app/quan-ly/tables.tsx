import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, palette } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { api } from '../../lib/api';
import type { Table } from '../../lib/types';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';

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
        borderRadius: shape.radius.md,
        borderWidth: 1.5,
        borderColor: isOccupied ? colors.brand.primary : colors.border.default,
        backgroundColor: isOccupied ? colors.brand.primary + '05' : colors.surface.card,
        padding: shape.spacing.md,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ ...font.h2, color: colors.text.primary }}>{table.name}</Text>
        {isOccupied && (
          <View style={{ width: 8, height: 8, borderRadius: shape.radius.full, backgroundColor: colors.brand.primary, marginTop: 4 }} />
        )}
      </View>

      <View>
        <Text style={{ ...font.caption, color: colors.text.muted }}>
          {isOccupied ? 'Có khách' : 'Trống'}
        </Text>
        <Text style={{ ...font.bodySmall, color: colors.text.primary, fontWeight: '700' }}>
          {isOccupied ? '310k' : table.area}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function TablesScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getQuanLyTables();
      setTables(data);
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

  const renderInlineForm = () => {
    return (
      <View style={[styles.panelBox, { flex: 1, marginHorizontal: 12 }]}>
        <View style={styles.panelHeader}>
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
          <Text style={styles.panelHeaderText}>{editingId ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.label, color: colors.text.primary, marginBottom: 8 }}>Tên bàn *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: A01, Bàn 1..."
              placeholderTextColor={colors.text.muted}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.label, color: colors.text.primary, marginBottom: 8 }}>Khu vực</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {AREAS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4,
                    borderWidth: 1, 
                    borderColor: form.area === a ? colors.brand.primary : colors.border.default, 
                    backgroundColor: form.area === a ? colors.brand.primary : colors.surface.card,
                  }}
                  onPress={() => setForm(f => ({ ...f, area: f.area === a ? '' : a }))}
                >
                  <Text style={{ ...font.bodySmall, fontWeight: '600', color: form.area === a ? colors.text.inverse : colors.text.secondary }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Hoặc nhập khu vực tùy chỉnh..."
              placeholderTextColor={colors.text.muted}
              value={form.area}
              onChangeText={v => setForm(f => ({ ...f, area: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.label, color: colors.text.primary, marginBottom: 8 }}>Sức chứa (người)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[2, 4, 6, 8, 10, 12].map(n => (
                <TouchableOpacity
                  key={n}
                  style={{
                    width: 44, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, 
                    borderColor: form.capacity === String(n) ? colors.brand.primary : colors.border.default, 
                    backgroundColor: form.capacity === String(n) ? colors.brand.primary : colors.surface.card,
                  }}
                  onPress={() => setForm(f => ({ ...f, capacity: String(n) }))}
                >
                  <Text style={{ ...font.body, fontWeight: '700', color: form.capacity === String(n) ? colors.text.inverse : colors.text.secondary }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <Text style={{ ...font.button, color: colors.text.secondary }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            onPress={handleSave}
            disabled={saving}
          >
            {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
            <Text style={{ ...font.button, color: colors.text.inverse }}>{editingId ? 'Cập nhật' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Sơ đồ bàn"
        subtitle={`${tables.length} bàn`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        right={isWide ? (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm bàn</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm bàn</Text>
          </TouchableOpacity>
        )}
      />

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingVertical: 12 }}>
          <View style={{ flex: 0.55 }}>
            {/* Area Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ backgroundColor: colors.surface.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.strong, flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: shape.spacing.lg, paddingVertical: shape.spacing.sm, gap: shape.spacing.sm, alignItems: 'center' }}>
              {['Tất cả', 'Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'].map((area, index) => {
                const active = index === 0;
                return (
                  <TouchableOpacity key={area} style={{ flexDirection: 'row', alignItems: 'center', gap: shape.spacing.sm, paddingHorizontal: shape.spacing.md, height: 34, borderRadius: shape.radius.full, backgroundColor: active ? colors.brand.primary : colors.surface.card, borderWidth: 1, borderColor: active ? colors.brand.primary : colors.border.default }}>
                    <Text style={{ ...font.button, color: active ? colors.text.inverse : colors.text.primary }}>{area}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Grid */}
            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 }}>
                <ActivityIndicator size="large" color={colors.brand.primary} />
                <Text style={{...font.bodySmall, color: colors.text.secondary, marginTop: 8}}>Đang tải...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: '1%' }}>
                {tables.map(table => (
                  <TableCard key={table.id} table={table} onPress={() => openEdit(table)} />
                ))}
              </ScrollView>
            )}
            
            <FAB onPress={openAdd} />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.45, backgroundColor: colors.surface.app }}>
            {showForm ? renderInlineForm() : (
              <View style={styles.panelBox}>
                <View style={styles.panelHeader}>
                  <Icon name="table-furniture" size={18} color={colors.brand.primary} />
                  <Text style={styles.panelHeaderText}>Bàn</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.panelStatValue}>{tables.length}</Text>
                    <Text style={styles.panelStatLabel}>Tổng</Text>
                  </View>
                  <View style={styles.panelDividerV} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: colors.status.success }]}>{counts.trong}</Text>
                    <Text style={styles.panelStatLabel}>Trống</Text>
                  </View>
                  <View style={styles.panelDividerV} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: colors.brand.primary }]}>{counts.co_khach}</Text>
                    <Text style={styles.panelStatLabel}>Có khách</Text>
                  </View>
                </View>
                <View style={styles.panelDivider} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: '#D97706' }]}>{counts.da_dat}</Text>
                    <Text style={styles.panelStatLabel}>Đã đặt</Text>
                  </View>
                  <View style={styles.panelDividerV} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: '#64748B' }]}>{counts.dang_don}</Text>
                    <Text style={styles.panelStatLabel}>Đang dọn</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          {/* Area Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ backgroundColor: colors.surface.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.strong, flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: shape.spacing.lg, paddingVertical: shape.spacing.sm, gap: shape.spacing.sm, alignItems: 'center' }}>
            {['Tất cả', 'Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'].map((area, index) => {
              const active = index === 0;
              return (
                <TouchableOpacity key={area} style={{ flexDirection: 'row', alignItems: 'center', gap: shape.spacing.sm, paddingHorizontal: shape.spacing.md, height: 34, borderRadius: shape.radius.full, backgroundColor: active ? colors.brand.primary : colors.surface.card, borderWidth: 1, borderColor: active ? colors.brand.primary : colors.border.default }}>
                  <Text style={{ ...font.button, color: active ? colors.text.inverse : colors.text.primary }}>{area}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Summary row (mobile) */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.surface.app }}>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 8, borderWidth: 1, borderColor: colors.border.light }}>
              <Text style={[styles.panelStatValue, { fontSize: 20 }]}>{tables.length}</Text>
              <Text style={styles.panelStatLabel}>Tổng</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 8, borderWidth: 1, borderColor: colors.border.light }}>
              <Text style={[styles.panelStatValue, { fontSize: 20, color: colors.status.success }]}>{counts.trong}</Text>
              <Text style={styles.panelStatLabel}>Trống</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 8, borderWidth: 1, borderColor: colors.border.light }}>
              <Text style={[styles.panelStatValue, { fontSize: 20, color: colors.brand.primary }]}>{counts.co_khach}</Text>
              <Text style={styles.panelStatLabel}>Có khách</Text>
            </View>
          </View>

          {/* Grid */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 }}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text style={{...font.bodySmall, color: colors.text.secondary, marginTop: 8}}>Đang tải...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: '1%' }}>
              {tables.map(table => (
                <TableCard key={table.id} table={table} onPress={() => openEdit(table)} />
              ))}
            </ScrollView>
          )}
          
          <FAB onPress={openAdd} />
        </>
      )}
      
      {!isWide && (
        <FormModal
          visible={showForm}
          title={editingId ? 'Cập nhật bàn' : 'Thêm bàn mới'}
          subtitle={editingId ? `Đang sửa ${form.name}` : undefined}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saveLabel={editingId ? 'Cập nhật' : 'Thêm bàn'}
          saving={saving}
        >
          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.label, color: colors.text.primary, marginBottom: 8 }}>Tên bàn *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: A01, Bàn 1..."
              placeholderTextColor={colors.text.muted}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.label, color: colors.text.primary, marginBottom: 8 }}>Khu vực</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {AREAS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4,
                    borderWidth: 1, 
                    borderColor: form.area === a ? colors.brand.primary : colors.border.default, 
                    backgroundColor: form.area === a ? colors.brand.primary : colors.surface.card,
                  }}
                  onPress={() => setForm(f => ({ ...f, area: f.area === a ? '' : a }))}
                >
                  <Text style={{ ...font.bodySmall, fontWeight: '600', color: form.area === a ? colors.text.inverse : colors.text.secondary }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Hoặc nhập khu vực tùy chỉnh..."
              placeholderTextColor={colors.text.muted}
              value={form.area}
              onChangeText={v => setForm(f => ({ ...f, area: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.label, color: colors.text.primary, marginBottom: 8 }}>Sức chứa (người)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[2, 4, 6, 8, 10, 12].map(n => (
                <TouchableOpacity
                  key={n}
                  style={{
                    width: 44, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, 
                    borderColor: form.capacity === String(n) ? colors.brand.primary : colors.border.default, 
                    backgroundColor: form.capacity === String(n) ? colors.brand.primary : colors.surface.card,
                  }}
                  onPress={() => setForm(f => ({ ...f, capacity: String(n) }))}
                >
                  <Text style={{ ...font.body, fontWeight: '700', color: form.capacity === String(n) ? colors.text.inverse : colors.text.secondary }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FormModal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelStatValue: { ...font.h3, fontWeight: '900', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelLabel: { ...font.caption, color: colors.text.muted },
  separator: { width: 1, backgroundColor: colors.border.light },

  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: shape.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...font.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.input,
  },
})
