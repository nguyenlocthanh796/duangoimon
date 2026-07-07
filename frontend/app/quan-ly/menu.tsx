import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import { ASSETS } from '../../lib/assets';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';
import type { Product } from '../../lib/api';


type FormState = {
  code: string;
  name: string;
  category: string;
  price: string;
  cost_price: string;
  unit: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  category: '',
  price: '0',
  cost_price: '0',
  unit: 'phần',
  is_active: true,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Đồ ăn': { bg: '#FEF3C7', text: '#D97706' },
  'Đồ uống': { bg: '#EFF6FF', text: '#2563EB' },
  'Tráng miệng': { bg: '#FCE7F3', text: '#DB2777' },
  'Snack': { bg: '#F0FDF4', text: '#16A34A' },
  'Khác': { bg: '#F1F5F9', text: '#64748B' },
};

function getCategoryStyle(cat: string | null) {
  const key = cat && CATEGORY_COLORS[cat] ? cat : 'Khác';
  return CATEGORY_COLORS[key];
}

function formatVND(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

export default function MenuScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getQuanLyProducts();
      setProducts(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải danh sách món');
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

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      code: p.code,
      name: p.name,
      category: p.category ?? '',
      price: String(p.price),
      cost_price: String(p.cost_price),
      unit: p.unit,
      is_active: p.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      Alert.alert('Lỗi', 'Mã và tên món không được để trống');
      return;
    }
    const price = parseFloat(form.price) || 0;
    const cost_price = parseFloat(form.cost_price) || 0;
    const payload = { ...form, price, cost_price };

    setSaving(true);
    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
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

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Xóa món "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProduct(id);
            load();
          } catch (e: any) {
            Alert.alert('Lỗi', e.message);
          }
        },
      },
    ]);
  };

  const filtered = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Product }) => {
    const catStyle = getCategoryStyle(item.category);
    return (
      <TouchableOpacity style={styles.item} onPress={() => openEdit(item)} activeOpacity={0.8}>
        <View style={styles.itemLeft}>
          <View style={styles.codeTag}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.catText, { color: catStyle.text }]}>
                  {item.category || 'Khác'}
                </Text>
              </View>
              <Text style={styles.metaText}>{item.unit}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.priceText}>{formatVND(item.price)}</Text>
          <View style={[styles.activeDot, { backgroundColor: item.is_active ? '#10B981' : '#CBD5E1' }]} />
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="trash-can-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Quản lý món"
        subtitle={`${products.length} món`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã món..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          ListEmptyComponent={
            <EmptyState
              image={ASSETS.images.emptyStateMenu}
              title="Chưa có món nào"
              subtitle="Nhấn + để thêm món đầu tiên"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB onPress={openAdd} />

      <FormModal
        visible={showForm}
        title={editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}
        subtitle={editingId ? 'Cập nhật thông tin món' : 'Điền thông tin bên dưới'}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm món'}
        saving={saving}
      >
        <MenuFormContent
          form={form}
          onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
        />
      </FormModal>
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface.card, margin: 12, borderRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border.default,
    ...CARD_SHADOW,
  },
  searchInput: { flex: 1, ...font.body, color: colors.text.primary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  loadingText: { ...font.bodySmall, color: colors.text.secondary, marginTop: 8 },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface.card, marginHorizontal: 12,
    marginBottom: 8, borderRadius: 4, padding: 14,
    ...CARD_SHADOW,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  codeTag: { backgroundColor: colors.surface.disabled, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 },
  codeText: { ...font.micro, fontWeight: '700', color: colors.text.body },
  itemName: { ...font.body, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  catText: { ...font.badge, fontWeight: '700' },
  metaText: { ...font.caption, color: colors.text.secondary },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceText: { ...font.price, color: colors.brand.primary },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  deleteBtn: { padding: 4 },
});
