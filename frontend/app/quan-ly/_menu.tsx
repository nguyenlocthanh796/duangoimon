import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Product } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import StatusBadge from '../../lib/components/ui/StatusBadge';
import { colors, font, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import SearchBar from '../../lib/components/ui/SearchBar';
import EmptyState from '../../lib/components/ui/EmptyState';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import FAB from '../../lib/components/ui/FAB';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';
import DataTable, { Column, FooterColumn } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';

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

const CATEGORIES = [
  { key: 'Đồ ăn', icon: 'food', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Đồ uống', icon: 'cup-water', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Tráng miệng', icon: 'ice-cream', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'Snack', icon: 'candy', color: '#16A34A', bg: '#ECFDF5' },
  { key: 'Khác', icon: 'dots-horizontal', color: '#737373', bg: '#F1F5F9' },
];

function getCatStyle(cat: string | null) {
  return CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[4];
}

function generateFallbackProducts(): Product[] {
  return [
    { id: 'p1', code: 'SP01', name: 'Phở Bò Đặc Biệt', category: 'Đồ ăn', price: 65000, cost_price: 25000, unit: 'Tô', is_active: true },
    { id: 'p2', code: 'SP02', name: 'Cà Phê Sữa Đá Sài Gòn', category: 'Đồ uống', price: 35000, cost_price: 12000, unit: 'Ly', is_active: true },
    { id: 'p3', code: 'SP03', name: 'Trà Đào Cam Sả', category: 'Đồ uống', price: 45000, cost_price: 15000, unit: 'Ly', is_active: true },
    { id: 'p4', code: 'SP04', name: 'Bánh Mì Thịt Nướng', category: 'Đồ ăn', price: 30000, cost_price: 10000, unit: 'Ổ', is_active: true },
    { id: 'p5', code: 'SP05', name: 'Kem Matcha Dừa', category: 'Tráng miệng', price: 40000, cost_price: 14000, unit: 'Ly', is_active: true },
    { id: 'p6', code: 'SP06', name: 'Snack Khoai Tây Phô Mai', category: 'Snack', price: 25000, cost_price: 8000, unit: 'Gói', is_active: true },
  ] as Product[];
}

export default function MenuScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api.getProducts();
      if (Array.isArray(d) && d.length > 0) {
        setProducts(d);
      } else {
        const fallbacks = generateFallbackProducts();
        setProducts(fallbacks);
        if (isWide && !selectedId && fallbacks.length > 0) setSelectedId(fallbacks[0].id);
      }
    } catch {
      const fallbacks = generateFallbackProducts();
      setProducts(fallbacks);
      if (isWide && !selectedId && fallbacks.length > 0) setSelectedId(fallbacks[0].id);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isWide, selectedId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      code: p.code || '',
      name: p.name || '',
      category: p.category || 'Đồ ăn',
      price: String(p.price ?? 0),
      cost_price: String(p.cost_price ?? 0),
      unit: p.unit || 'phần',
      is_active: p.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Tên món không được để trống');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category || null,
        price: parseFloat(form.price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        unit: form.unit,
        is_active: form.is_active,
      };
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }
      setShowForm(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu món');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xóa món ăn', `Bạn có chắc muốn xóa món "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProduct(id);
            if (selectedId === id) setSelectedId(null);
            loadData();
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể xóa');
          }
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (catFilter && p.category !== catFilter) return false;
      const q = search.trim().toLowerCase();
      if (q && !(p.name || '').toLowerCase().includes(q) && !(p.code || '').toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [products, catFilter, search]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const groupedProducts = useMemo(() => {
    const groups: { [cat: string]: Product[] } = {};
    filtered.forEach((p) => {
      const cat = p.category || 'Chưa phân nhóm';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.keys(groups).map((cat) => ({
      category: cat,
      data: groups[cat],
    }));
  }, [filtered]);

  const selectedItem = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );

  const avgPrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.round(products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length);
  }, [products]);

  // ── Master Detail Right Inspector Panel ──
  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" weight="bold" color="#050505">
            Chi Tiết Món Ăn
          </AppText>
          <AppText variant="sm" color="#65676B" style={{ textAlign: 'center' }}>
            Chọn một món ăn từ danh sách bên trái để xem chi tiết & điều chỉnh
          </AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openNew}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="sm" weight="bold" color="#FFF">
              Thêm món mới
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    const item = selectedItem;
    const catStyle = getCatStyle(item.category);
    const profit = (item.price || 0) - (item.cost_price || 0);

    return (
      <View style={ss.detailPanel}>
        <View style={s.detailHeader}>
          <View style={[s.avatarCircle, { backgroundColor: catStyle.bg, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color={catStyle.color} style={{ fontSize: 13 }}>
              {(item.category || '??').slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">
              {item.name}
            </AppText>
            <AppText variant="sm" color={colors.text.secondary}>
              Mã món: {item.code || 'N/A'} · Đơn vị: {item.unit || 'phần'}
            </AppText>
          </View>
        </View>

        <View style={s.detailBody}>
          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">
              Giá bán niêm yết
            </AppText>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {formatVND(item.price || 0)}
            </AppText>
          </View>

          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">
              Giá vốn ước tính (BOM)
            </AppText>
            <AppText variant="md" weight="bold" color="#050505">
              {formatVND(item.cost_price || 0)}
            </AppText>
          </View>

          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">
              Lợi nhuận gộp / món
            </AppText>
            <AppText variant="md" weight="bold" color={profit >= 0 ? colors.status.success : colors.status.danger}>
              {formatVND(profit)}
            </AppText>
          </View>

          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">
              Trạng thái kinh doanh
            </AppText>
            <StatusBadge
              label={item.is_active ? 'Đang bán' : 'Ngưng bán'}
              severity={item.is_active ? 'success' : 'danger'}
            />
          </View>
        </View>

        <View style={s.detailActions}>
          <TouchableOpacity style={ss.panelBtnSecondary} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>
              Chỉnh sửa
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={ss.panelBtnDanger} onPress={() => handleDelete(item.id, item.name)}>
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
            <AppText variant="sm" color={colors.status.danger}>
              Xóa
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCard = ({ item }: { item: Product }) => {
    const isSelected = selectedId === item.id;
    const catStyle = getCatStyle(item.category);

    if (!isWide) {
      return (
        <TouchableOpacity
          onPress={() => setSelectedId(item.id)}
          activeOpacity={0.7}
          style={ss.listRow}
        >
          <View style={s.posCodeBadge}>
            <AppText variant="sm" weight="normal" color="#64748B" numberOfLines={1}>
              {item.code || 'SP'}
            </AppText>
          </View>

          <View style={{ flex: 1, paddingRight: 8 }}>
            <AppText variant="md" weight="bold" color="#0F172A" numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="sm" weight="normal" color="#64748B" numberOfLines={1} style={{ marginTop: 1 }}>
              {item.category || 'Khác'} · {item.unit || 'phần'}
            </AppText>
          </View>

          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="md" weight="normal" color="#0F172A">
              {formatVND(item.price || 0)}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={async (e) => {
              e.stopPropagation?.();
              try {
                await api.updateProduct(item.id, { ...item, is_active: !item.is_active });
                loadData();
              } catch (err: any) {
                Alert.alert('Lỗi', err.message || 'Không thể đổi trạng thái');
              }
            }}
            style={[
              s.posStatusPill,
              { backgroundColor: item.is_active ? '#ECFDF5' : '#FEE2E2' },
            ]}
          >
            <View
              style={[
                s.activeDot,
                { backgroundColor: item.is_active ? colors.status.success : colors.status.danger },
              ]}
            />
            <AppText
              variant="sm"
              weight="normal"
              color={item.is_active ? colors.status.success : colors.status.danger}
            >
              {item.is_active ? 'Bán' : 'Ngưng'}
            </AppText>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => setSelectedId(isSelected ? null : item.id)}
        style={[s.cardWide, isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[s.avatarCircle, { backgroundColor: catStyle.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color={catStyle.color} style={{ fontSize: 12 }}>
              {(item.category || '??').slice(0, 2).toUpperCase()}
            </AppText>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="sm" color="#65676B">
                ({item.code || 'SP'})
              </AppText>
            </View>
            <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
              {item.category || 'Chưa gắn nhóm'} · {item.unit || 'phần'}
            </AppText>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {formatVND(item.price || 0)}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <View
                style={[
                  s.activeDot,
                  { backgroundColor: item.is_active ? colors.status.success : colors.status.danger },
                ]}
              />
              <AppText variant="sm" color="#65676B">
                {item.is_active ? 'Đang bán' : 'Tạm ngưng'}
              </AppText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const columns: Column<Product>[] = [
    {
      key: 'code',
      title: 'Mã',
      width: 80,
      sortable: true,
      sortValue: (p) => p.code || '',
      render: (p) => <AppText variant="sm" weight="bold" color="#65676B">{p.code || 'SP'}</AppText>,
    },
    {
      key: 'name',
      title: 'Tên món ăn',
      flex: 1.5,
      sortable: true,
      sortValue: (p) => p.name || '',
      render: (p) => {
        const catStyle = getCatStyle(p.category);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.avatarCircle, { backgroundColor: catStyle.bg, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}>
              <AppText variant="sm" weight="bold" color={catStyle.color} style={{ fontSize: 10 }}>
                {(p.category || '??').slice(0, 2).toUpperCase()}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{p.name}</AppText>
              <AppText variant="sm" color="#65676B">{p.unit || 'phần'}</AppText>
            </View>
          </View>
        );
      },
    },
    {
      key: 'category',
      title: 'Nhóm',
      width: 110,
      sortable: true,
      sortValue: (p) => p.category || '',
      render: (p) => {
        const catStyle = getCatStyle(p.category);
        return (
          <View style={[s.badge, { backgroundColor: catStyle.bg }]}>
            <AppText variant="sm" weight="bold" color={catStyle.color} numberOfLines={1}>{p.category || 'Khác'}</AppText>
          </View>
        );
      },
    },
    {
      key: 'price',
      title: 'Giá bán',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (p) => p.price || 0,
      render: (p) => <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(p.price || 0)}</AppText>,
    },
    {
      key: 'cost_price',
      title: 'Giá vốn',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (p) => p.cost_price || 0,
      render: (p) => <AppText variant="md" color="#65676B">{formatVND(p.cost_price || 0)}</AppText>,
    },
    {
      key: 'profit',
      title: 'Lợi nhuận gộp',
      width: 150,
      align: 'right',
      sortable: true,
      sortValue: (p) => (p.price || 0) - (p.cost_price || 0),
      render: (p) => {
        const profit = (p.price || 0) - (p.cost_price || 0);
        const margin = p.price ? Math.round((profit / p.price) * 100) : 0;
        const color = margin >= 60 ? '#16A34A' : margin >= 20 ? '#D97706' : '#DC2626';
        const bgColor = margin >= 60 ? '#DCFCE7' : margin >= 20 ? '#FEF3C7' : '#FEE2E2';

        return (
          <View style={{ alignItems: 'flex-end', width: '100%' }}>
            <AppText variant="md" weight="bold" color={color}>
              {formatVND(profit)}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <View style={{ flex: 1, width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, Math.max(0, margin))}%`, height: '100%', backgroundColor: color }} />
              </View>
              <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: bgColor }}>
                <AppText variant="sm" weight="bold" color={color}>
                  {margin}%
                </AppText>
              </View>
            </View>
          </View>
        );
      },
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 110,
      align: 'center',
      sortable: true,
      sortValue: (p) => (p.is_active ? 1 : 0),
      render: (p) => (
        <TouchableOpacity
          onPress={async () => {
            try {
              await api.updateProduct(p.id, { ...p, is_active: !p.is_active });
              loadData();
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể đổi trạng thái');
            }
          }}
          style={[s.badge, { backgroundColor: p.is_active ? '#ECFDF5' : '#FEE2E2' }]}
        >
          <AppText variant="sm" weight="bold" color={p.is_active ? colors.status.success : colors.status.danger}>
            {p.is_active ? 'Đang bán' : 'Ngưng bán'}
          </AppText>
        </TouchableOpacity>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      width: 90,
      align: 'center',
      render: (p) => (
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => openEdit(p)} style={{ padding: 4 }}>
            <Icon name="pencil" size={18} color="#F97316" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(p.id, p.name)} style={{ padding: 4 }}>
            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const renderHeaderSection = () => (
    <View>
      {!isWide && (
        <View style={s.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">
            Danh Sách Món Ăn
          </AppText>
          <TouchableOpacity style={s.addBtn} onPress={openNew}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="sm" weight="bold" color="#FFF">
              Thêm món
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={ss.metricContainer}>
        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#FEF3C7' }]}>
            <AppText variant="sm" weight="bold" color="#D97706" style={{ fontSize: 11 }}>món</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">
              {products.length} món
            </AppText>
            <AppText variant="sm" color="#65676B">
              Tổng thực đơn
            </AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
            <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 11 }}>đ</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>
              {formatVND(avgPrice)}
            </AppText>
            <AppText variant="sm" color="#65676B">
              Giá trung bình
            </AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
            <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 11 }}>nhóm</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">
              {CATEGORIES.length} nhóm
            </AppText>
            <AppText variant="sm" color="#65676B">
              Danh mục món
            </AppText>
          </View>
        </View>
      </View>

      <View style={s.toolbarRow}>
        <View style={{ paddingHorizontal: 12, marginBottom: 6 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm món theo tên hoặc mã món..." />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: 46 }}
          contentContainerStyle={{ alignItems: 'center', backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
          <TouchableOpacity
            onPress={() => setCatFilter(null)}
            style={[s.pillChip, !catFilter && s.pillChipActive]}
          >
            <AppText
              variant="sm"
              weight="bold"
              color={!catFilter ? colors.brand.primary : '#334155'}
            >
              Tất cả ({products.length})
            </AppText>
          </TouchableOpacity>

          {CATEGORIES.map((c) => {
            const active = catFilter === c.key;
            const count = products.filter((p) => p.category === c.key).length;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCatFilter(active ? null : c.key)}
                style={[s.pillChip, active && s.pillChipActive]}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {c.key} ({count})
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );



  return (
    <View style={s.container}>
      {/* Unified Top Action Bar: Search Input + Add Button */}
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm món, mã món..."
            placeholderTextColor="#94A3B8"
            style={ss.searchTextInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={ss.addBtn} onPress={openNew} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <AppText variant="sm" weight="bold" color="#FFFFFF">
            Thêm món
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Unified Horizontal Category Chips Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 46 }}
        contentContainerStyle={ss.filterChipsContainer}
      >
        <TouchableOpacity
          onPress={() => setCatFilter(null)}
          style={[ss.filterChip, !catFilter && ss.filterChipActive]}
        >
          <AppText
            variant="sm"
            weight="bold"
            color={!catFilter ? colors.brand.primary : '#334155'}
          >
            Tất cả ({products.length})
          </AppText>
        </TouchableOpacity>
        {categories.map((c) => {
          const count = products.filter((p) => p.category === c).length;
          const isActive = catFilter === c;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setCatFilter(isActive ? null : c)}
              style={[ss.filterChip, isActive && ss.filterChipActive]}
            >
              <AppText
                variant="sm"
                weight="bold"
                color={isActive ? colors.brand.primary : '#334155'}
              >
                {c} ({count})
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.58 }}>
            <DataTable<Product>
              columns={columns}
              data={filtered}
              getRowId={(p) => p.id}
              loading={loading}
              onRefresh={onRefresh}
              refreshing={refreshing}
              onRowPress={(p) => setSelectedId(p.id)}
              selectedRowId={selectedId}
              emptyIcon="food-off"
              emptyTitle="Chưa có món ăn nào"
              emptySubtitle="Nhấn + Thêm món để tạo món ăn mới"
            />
          </View>
          <View style={{ flex: 0.42 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {groupedProducts.length === 0 ? (
              <View style={s.mobileEmptyWrap}>
                <AppText variant="md" weight="bold" color="#0F172A" style={{ marginTop: 12 }}>
                  Chưa có món ăn nào
                </AppText>
                <AppText variant="sm" color="#64748B" style={{ marginTop: 4 }}>
                  Nhấn + Thêm món để tạo món ăn mới
                </AppText>
              </View>
            ) : (
              groupedProducts.map((group) => {
                const catStyle = getCatStyle(group.category);
                return (
                  <View key={group.category} style={ss.sectionWrap}>
                    <View style={ss.sectionHeader}>
                      <View style={[ss.iconCircleSm, { backgroundColor: catStyle.bg, alignItems: 'center', justifyContent: 'center' }]}>
                        <AppText variant="sm" weight="bold" color={catStyle.color} style={{ fontSize: 9 }}>
                          {(group.category || '??').slice(0, 2).toUpperCase()}
                        </AppText>
                      </View>
                      <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                        {group.category.toUpperCase()}
                      </AppText>
                      <View style={s.catBadgeCount}>
                        <AppText variant="sm" weight="normal" color="#64748B">
                          {group.data.length} món
                        </AppText>
                      </View>
                    </View>
                    <View style={ss.sectionItems}>
                      {group.data.map((item) => (
                        <React.Fragment key={item.id}>
                          {renderCard({ item })}
                        </React.Fragment>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* Mobile Detail Modal at Root level */}
      {!isWide && (
        <DetailModal
          visible={!!selectedItem}
          title={selectedItem?.name || ''}
          subtitle={selectedItem ? `Mã: ${selectedItem.code || 'N/A'} · ${selectedItem.category || 'Khác'}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedItem ? () => { const item = selectedItem; setSelectedId(null); openEdit(item); } : undefined}
          onDelete={selectedItem ? () => { const item = selectedItem; setSelectedId(null); handleDelete(item.id, item.name); } : undefined}
          actions={
            selectedItem
              ? [
                  {
                    label: selectedItem.is_active ? 'Ngưng bán' : 'Mở bán',
                    icon: 'swap-horizontal',
                    variant: selectedItem.is_active ? 'danger' : 'primary',
                    onPress: async () => {
                      try {
                        await api.updateProduct(selectedItem.id, { ...selectedItem, is_active: !selectedItem.is_active });
                        loadData();
                        setSelectedId(null);
                      } catch (err: any) {
                        Alert.alert('Lỗi', err.message || 'Không thể đổi trạng thái');
                      }
                    },
                  },
                ]
              : []
          }
        >
          {renderDetailPanel()}
        </DetailModal>
      )}

      <FormModal
        visible={showForm}
        title={editingId ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm món'}
        saving={saving}
      >
        <MenuFormContent form={form} onChange={(updates) => setForm((f) => ({ ...f, ...updates }))} />
      </FormModal>
    </View>
  );
}

// ── Styles (Matching Suppliers Standard 100%) ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
    position: 'relative',
  },
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRow: {
    gap: 6,
  },
  pillChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  pillChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
  mainBody: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  cardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  detailEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailBody: {
    gap: 10,
  },
  detailStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 10,
  },
  btnOrangePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  btnRedPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  panelCta: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  posTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  posCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
    minWidth: 48,
    alignItems: 'center',
  },
  posStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 999,
  },
  fullFormContainer: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  fullFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  fullFormBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullFormSaveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
  fullFormFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  fullFormCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullFormSubmitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  catBadgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  mobileActionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E9F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 8,
  },
  mobileActionEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primaryBg,
  },
  mobileActionToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    backgroundColor: '#F8FAFC',
  },
  mobileActionDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
  },
});
