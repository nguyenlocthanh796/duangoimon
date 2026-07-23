import { useState, useCallback, useEffect } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, palette } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { api } from '../../lib/api';
import type { Table } from '../../lib/types';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
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
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: isOccupied ? '#F97316' : '#E5E5E5',
        backgroundColor: isOccupied ? '#F97316' + '05' : '#FFFFFF',
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ ...font.lg, color: '#171717' }}>{table.name}</Text>
        {isOccupied && (
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: '#F97316', marginTop: 4 }} />
        )}
      </View>

      <View>
        <Text style={{ ...font.sm, color: '#737373' }}>
          {isOccupied ? 'Có khách' : 'Trống'}
        </Text>
        <Text style={{ ...font.sm, color: '#171717', fontWeight: '600' }}>
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
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={'#F97316'} />
          <Text style={styles.panelHeaderText}>{editingId ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.smBold, color: '#171717', marginBottom: 8 }}>Tên bàn *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: A01, Bàn 1..."
              placeholderTextColor={'#737373'}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.smBold, color: '#171717', marginBottom: 8 }}>Khu vực</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
              {AREAS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
                    borderWidth: 1, 
                    borderColor: form.area === a ? '#F97316' : '#E5E5E5', 
                    backgroundColor: form.area === a ? '#F97316' : '#FFFFFF',
                  }}
                  onPress={() => setForm(f => ({ ...f, area: f.area === a ? '' : a }))}
                >
                  <Text style={{ ...font.sm, fontWeight: '600', color: form.area === a ? colors.text.inverse : '#404040' }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Hoặc nhập khu vực tùy chỉnh..."
              placeholderTextColor={'#737373'}
              value={form.area}
              onChangeText={v => setForm(f => ({ ...f, area: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.smBold, color: '#171717', marginBottom: 8 }}>Sức chứa (người)</Text>
            <View style={{ flexDirection: 'row', gap: 16}}>
              {[2, 4, 6, 8, 10, 12].map(n => (
                <TouchableOpacity
                  key={n}
                  style={{
                    width: 44, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, 
                    borderColor: form.capacity === String(n) ? '#F97316' : '#E5E5E5', 
                    backgroundColor: form.capacity === String(n) ? '#F97316' : '#FFFFFF',
                  }}
                  onPress={() => setForm(f => ({ ...f, capacity: String(n) }))}
                >
                  <Text style={{ ...font.md, fontWeight: '600', color: form.capacity === String(n) ? colors.text.inverse : '#404040' }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <Text style={{ ...font.mdBold, color: '#404040' }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, minHeight: 44, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12}}
            onPress={handleSave}
            disabled={saving}
          >
            {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
            <Text style={{ ...font.mdBold, color: colors.text.inverse }}>{editingId ? 'Cập nhật' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Sơ đồ bàn"
        subtitle={`${tables.length} bàn`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        compact
        right={
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm bàn</Text>
          </TouchableOpacity>
        }
      />

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.55 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.strong, flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' }}>
              {['Tất cả', 'Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'].map((area, index) => {
                const active = index === 0;
                return (
                  <TouchableOpacity key={area} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: active ? '#F97316' : '#FFFFFF', borderWidth: 1, borderColor: active ? '#F97316' : '#E5E5E5' }}>
                    <Text style={{ ...font.mdBold, color: active ? colors.text.inverse : '#171717' }}>{area}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Grid */}
            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16}}>
                <TableSkeleton rowCount={5} />
                <Text style={{...font.sm, color: '#404040', marginTop: 8}}>Đang tải...</Text>
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
          <View style={{ flex: 0.45, backgroundColor: '#FAFAFA' }}>
            {showForm ? renderInlineForm() : (
              <View style={styles.panelBox}>
                <View style={styles.panelHeader}>
                  <Icon name="table-furniture" size={18} color={'#F97316'} />
                  <Text style={styles.panelHeaderText}>Bàn</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12}}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.panelStatValue}>{tables.length}</Text>
                    <Text style={styles.panelStatLabel}>Tổng</Text>
                  </View>
                  <View style={styles.panelDividerV} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: '#16A34A' }]}>{counts.trong}</Text>
                    <Text style={styles.panelStatLabel}>Trống</Text>
                  </View>
                  <View style={styles.panelDividerV} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: '#F97316' }]}>{counts.co_khach}</Text>
                    <Text style={styles.panelStatLabel}>Có khách</Text>
                  </View>
                </View>
                <View style={styles.panelDivider} />
                <View style={{ flexDirection: 'row', gap: 12}}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: '#D97706' }]}>{counts.da_dat}</Text>
                    <Text style={styles.panelStatLabel}>Đã đặt</Text>
                  </View>
                  <View style={styles.panelDividerV} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.panelStatValue, { color: '#737373' }]}>{counts.dang_don}</Text>
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
            style={{ backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.strong, flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' }}>
            {['Tất cả', 'Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'].map((area, index) => {
              const active = index === 0;
              return (
                <TouchableOpacity key={area} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: active ? '#F97316' : '#FFFFFF', borderWidth: 1, borderColor: active ? '#F97316' : '#E5E5E5' }}>
                  <Text style={{ ...font.mdBold, color: active ? colors.text.inverse : '#171717' }}>{area}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Summary row (mobile) */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, gap: 16, backgroundColor: '#FAFAFA' }}>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#F0F0F0' }}>
              <Text style={[styles.panelStatValue, { fontSize: 20 }]}>{tables.length}</Text>
              <Text style={styles.panelStatLabel}>Tổng</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#F0F0F0' }}>
              <Text style={[styles.panelStatValue, { fontSize: 20, color: '#16A34A' }]}>{counts.trong}</Text>
              <Text style={styles.panelStatLabel}>Trống</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#F0F0F0' }}>
              <Text style={[styles.panelStatValue, { fontSize: 20, color: '#F97316' }]}>{counts.co_khach}</Text>
              <Text style={styles.panelStatLabel}>Có khách</Text>
            </View>
          </View>

          {/* Grid */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16}}>
              <TableSkeleton rowCount={5} />
              <Text style={{...font.sm, color: '#404040', marginTop: 8}}>Đang tải...</Text>
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
            <Text style={{ ...font.smBold, color: '#171717', marginBottom: 8 }}>Tên bàn *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: A01, Bàn 1..."
              placeholderTextColor={'#737373'}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.smBold, color: '#171717', marginBottom: 8 }}>Khu vực</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16}}>
              {AREAS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
                    borderWidth: 1, 
                    borderColor: form.area === a ? '#F97316' : '#E5E5E5', 
                    backgroundColor: form.area === a ? '#F97316' : '#FFFFFF',
                  }}
                  onPress={() => setForm(f => ({ ...f, area: f.area === a ? '' : a }))}
                >
                  <Text style={{ ...font.sm, fontWeight: '600', color: form.area === a ? colors.text.inverse : '#404040' }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Hoặc nhập khu vực tùy chỉnh..."
              placeholderTextColor={'#737373'}
              value={form.area}
              onChangeText={v => setForm(f => ({ ...f, area: v }))}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ ...font.smBold, color: '#171717', marginBottom: 8 }}>Sức chứa (người)</Text>
            <View style={{ flexDirection: 'row', gap: 16}}>
              {[2, 4, 6, 8, 10, 12].map(n => (
                <TouchableOpacity
                  key={n}
                  style={{
                    width: 44, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, 
                    borderColor: form.capacity === String(n) ? '#F97316' : '#E5E5E5', 
                    backgroundColor: form.capacity === String(n) ? '#F97316' : '#FFFFFF',
                  }}
                  onPress={() => setForm(f => ({ ...f, capacity: String(n) }))}
                >
                  <Text style={{ ...font.md, fontWeight: '600', color: form.capacity === String(n) ? colors.text.inverse : '#404040' }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FormModal>
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 38, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },

  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12, boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717' },
  panelStatLabel: { ...font.sm, color: '#737373', marginTop: 2 },
  panelStatValue: { ...font.lg, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelDividerV: { width: 1, backgroundColor: '#F0F0F0' },
  panelLabel: { ...font.sm, color: '#737373' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },

  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 32,
    ...font.md,
    color: '#171717',
    backgroundColor: '#F5F5F5',
  },
})
