import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScreenHeader
        title="Sơ đồ bàn"
        subtitle={`${tables.length} bàn`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
      />

      {/* Area Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: colors.surface.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.strong, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: shape.spacing.lg, paddingVertical: shape.spacing.sm, gap: shape.spacing.sm, alignItems: 'center' }}
      >
        {['Tất cả', 'Trong nhà', 'VIP', 'Ngoài Trời', 'Tầng 1', 'Tầng 2'].map((area, index) => {
          const active = index === 0;
          return (
            <TouchableOpacity key={area} style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: shape.spacing.sm,
              paddingHorizontal: shape.spacing.md,
              height: 34,
              borderRadius: shape.radius.full,
              backgroundColor: active ? colors.brand.primary : colors.surface.card,
              borderWidth: 1,
              borderColor: active ? colors.brand.primary : colors.border.default,
            }}>
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
            style={tableStyles.input}
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
            style={tableStyles.input}
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

    </SafeAreaView>
  );
}

const tableStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...font.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.input,
  },
});

