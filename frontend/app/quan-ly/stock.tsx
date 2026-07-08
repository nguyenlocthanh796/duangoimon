"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';
function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

function stockLevel(stock: number, min: number) {
  if (min <= 0) return { bg: '#EFF6FF', text: '#2563EB', label: 'Không ngưỡng' };
  const ratio = stock / min;
  if (ratio > 2) return { bg: '#F3F4F6', text: '#16A34A', label: 'Ổn định' };
  if (ratio > 1) return { bg: '#FEF3C7', text: '#D97706', label: 'Sắp hết' };
  return { bg: '#FEE2E2', text: '#DC2626', label: 'Cảnh báo' };
}

export default function StockScreen() {
  const { openSidebar } = useSidebar();
  const { isWide, containerWidth, gutter, hPad } = useResponsive();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('disconnected');

  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = (window.location.port === '8081' || window.location.port === '19006') ? '8000' : window.location.port;
    const url = `${protocol}//${host}:${port}/ws/inventory?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === 'stock_alert') {
          Alert.alert('⚠️ Cảnh báo tồn kho', msg.data.map((d: any) =>
            `${d.raw_material}: còn ${d.current_stock} (tối thiểu ${d.min_stock})`
          ).join('\n'));
          load();
        }
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [token]);

  const load = useCallback(async () => {
    try { setLoading(true); setMaterials(await request<any[]>(API + '/raw-materials')); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { setMaterials(await request<any[]>(API + '/raw-materials')); }
    catch { } finally { setRefreshing(false); }
  }, []);

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    materials.forEach(m => { if (m.category) cats.add(m.category); });
    return ['all', ...Array.from(cats).sort()];
  }, [materials]);

  const filtered = useMemo(() => {
    let list = materials;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
    }
    if (catFilter !== 'all') list = list.filter(m => m.category === catFilter);
    return list;
  }, [materials, search, catFilter]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return materials.find(m => m.id === selectedItemId);
  }, [materials, selectedItemId]);

  // Stats
  const stats = useMemo(() => ({
    total: materials.length,
    critical: materials.filter(m => m.min_stock > 0 && m.current_stock <= m.min_stock).length,
    totalValue: materials.reduce((s, m) => s + (m.current_stock * (m.default_cost || 0)), 0),
  }), [materials]);

  const [formFields, setFormFields] = useState({
    code: '', name: '', category: '', unit: 'kg',
    default_cost: '0', current_stock: '0', min_stock: '0',
  });

  const openAdd = () => {
    setEditing(null);
    setFormFields({ code: '', name: '', category: '', unit: 'kg', default_cost: '0', current_stock: '0', min_stock: '0' });
    setShowForm(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setFormFields({
      code: m.code, name: m.name, category: m.category || '', unit: m.unit || 'kg',
      default_cost: String(m.default_cost || 0), current_stock: String(m.current_stock || 0), min_stock: String(m.min_stock || 0),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const { code, name, category, unit, default_cost, current_stock, min_stock } = formFields;
    if (!code || !name) { Alert.alert('Thiếu thông tin', 'Mã và tên là bắt buộc.'); return; }
    try {
      const body = {
        code, name, category: category || undefined, unit,
        default_cost: parseFloat(default_cost) || 0,
        current_stock: parseFloat(current_stock) || 0,
        min_stock: parseFloat(min_stock) || 0,
      };
      if (editing) await request(`${API}/raw-materials/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(API + '/raw-materials', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); setEditing(null); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu nguyên liệu.'); }
  };

  const deleteMaterial = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá nguyên liệu này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        setSelectedItemId(null);
        load();
      }},
    ]);
  };

  // ── Detail panel (iPad right) ──
  const renderDetail = () => {
    if (!selectedItem) return null;
    const lv = stockLevel(selectedItem.current_stock, selectedItem.min_stock);

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={[s.panelIconBox, { backgroundColor: lv.bg }]}>
            <Icon name="package-variant" size={20} color={lv.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle} numberOfLines={1}>{selectedItem.name}</Text>
            <Text style={s.panelSub}>{selectedItem.code}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: lv.bg }]}>
            <Text style={{ ...font.micro, fontWeight: '700', color: lv.text }}>{lv.label}</Text>
          </View>
        </View>

        <View style={s.detailRow}>
          <View style={s.detailItem}>
            <Text style={s.detailValue}>{selectedItem.current_stock}</Text>
            <Text style={s.detailLabel}>{selectedItem.unit} tồn</Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailItem}>
            <Text style={s.detailValue}>{selectedItem.min_stock}</Text>
            <Text style={s.detailLabel}>Tối thiểu</Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailItem}>
            <Text style={s.detailValue}>{formatVND(selectedItem.default_cost)}</Text>
            <Text style={s.detailLabel}>Giá mua</Text>
          </View>
        </View>

        {/* Stock bar */}
        {selectedItem.min_stock > 0 && (
          <View>
            <View style={s.stockBar}>
              <View style={[s.stockBarFill, {
                width: `${Math.min(150, (selectedItem.current_stock / selectedItem.min_stock) * 100)}%`,
                backgroundColor: lv.text,
              }]} />
            </View>
            <Text style={{ ...font.micro, color: colors.text.muted, marginTop: 2 }}>
              {selectedItem.current_stock >= selectedItem.min_stock
                ? 'Đạt ngưỡng tối thiểu'
                : `Thiếu ${(selectedItem.min_stock - selectedItem.current_stock).toFixed(1)} ${selectedItem.unit}`}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity onPress={() => openEdit(selectedItem)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil-outline" size={14} color="#fff" />
            <Text style={s.panelBtnText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteMaterial(selectedItem.id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete-outline" size={14} color={colors.status.danger} />
            <Text style={{ ...s.panelBtnText, color: colors.status.danger }}>Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Stats bar ──
  const numCols = useMemo(() => {
    if (!isWide) return 1;
    return calcGridCols(containerWidth, 280, hPad, gutter);
  }, [isWide, containerWidth, hPad, gutter]);

  // ── Card ──
  const renderCard = (item: any) => {
    const lv = stockLevel(item.current_stock, item.min_stock);
    const isSelected = selectedItemId === item.id;
    const barRatio = item.min_stock > 0 ? Math.min(100, (item.current_stock / item.min_stock) * 100) : 100;

    return (
      <TouchableOpacity
        onPress={() => setSelectedItemId(isSelected ? null : item.id)}
        style={[s.card, isSelected && { borderColor: colors.brand.primary }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[s.cardIcon, { backgroundColor: lv.bg }]}>
              <Icon name="package-variant" size={18} color={lv.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.cardCode}>{item.code} · {item.unit}</Text>
            </View>
          </View>
          <View style={[s.badge, { backgroundColor: lv.bg }]}>
            <Text style={[s.badgeText, { color: lv.text }]}>{lv.label}</Text>
          </View>
        </View>

        <View style={s.stockBar}>
          <View style={[s.stockBarFill, { width: `${barRatio}%`, backgroundColor: lv.text }]} />
        </View>

        <View style={s.cardStats}>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{item.current_stock}</Text>
            <Text style={s.cardStatLabel}>Tồn</Text>
          </View>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{item.min_stock}</Text>
            <Text style={s.cardStatLabel}>Min</Text>
          </View>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{formatVND(item.default_cost)}</Text>
            <Text style={s.cardStatLabel}>Giá</Text>
          </View>
          <View style={s.cardStatItem}>
            <Text style={s.cardStatValue}>{formatVND(item.current_stock * (item.default_cost || 0))}</Text>
            <Text style={s.cardStatLabel}>Trị giá</Text>
          </View>
        </View>

        {/* Always-visible actions */}
        <View style={s.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={15} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteMaterial(item.id)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={15} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Filter area ──
  const renderFilters = () => (
    <View style={s.filterBar}>
      <View style={s.searchBox}>
        <Icon name="magnify" size={16} color={colors.text.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Tìm nguyên liệu..."
          placeholderTextColor={colors.text.muted}
          style={{ flex: 1, ...font.caption, color: colors.text.primary, paddingVertical: 0 }} />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={colors.text.muted} /></TouchableOpacity>
        )}
      </View>
      {categories.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setCatFilter(cat)}
              style={[s.chip, catFilter === cat && s.chipActive]}>
              <Text style={[s.chipText, catFilter === cat && s.chipTextActive]}>
                {cat === 'all' ? 'Tất cả' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={filtered} keyExtractor={item => item.id}
        key={`cols-${numCols}`}
        numColumns={numCols}
        renderItem={({ item }) => renderCard(item as any)}
        contentContainerStyle={{ padding: 4, gap: 8 }}
        columnWrapperStyle={numCols > 1 ? { gap: 8, marginBottom: 8 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        ListHeaderComponent={renderFilters}
        ListEmptyComponent={<EmptyState icon="package-variant" title="Chưa có nguyên liệu" subtitle="Nhấn + để thêm nguyên liệu đầu tiên" />}
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Kho hàng"
        subtitle={`${stats.total} mặt hàng · ${stats.critical} cảnh báo`}
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={load} style={s.headerBtn}>
              <Icon name="refresh" size={18} color={colors.icon.default} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openAdd} style={s.addBtn}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              {isWide && <Text style={s.addBtnText}>Thêm</Text>}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatItem icon="package-variant" label="Mặt hàng" value={stats.total} />
        <View style={s.barDivider} />
        <StatItem icon="alert-circle-outline" label="Cảnh báo" value={stats.critical} valueColor={stats.critical > 0 ? colors.status.danger : colors.status.success} />
        <View style={s.barDivider} />
        <StatItem icon="currency-usd" label="Tổng giá trị" value={formatVND(stats.totalValue)} />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            {renderList()}
          </View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, paddingTop: 8, paddingLeft: 8, paddingRight: 12 }}>
            {selectedItem ? renderDetail() : (
              <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
                <Icon name="hand-pointing-up" size={36} color={colors.text.muted} />
                <Text style={{ ...font.body, color: colors.text.muted }}>Chọn nguyên liệu để xem chi tiết</Text>
              </View>
            )}
          </View>
        </View>
      ) : renderList()}

      {!isWide && <FAB onPress={openAdd} />}

      <FormModal
        visible={showForm}
        title={editing ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        saveLabel={editing ? 'Cập nhật' : 'Thêm'}
        saving={false}
      >
        <View style={{ gap: 12, paddingTop: 4 }}>
          <TextInputField label="Mã" value={formFields.code} onChange={(v) => setFormFields({...formFields, code: v})} placeholder="VD: BOTL001" />
          <TextInputField label="Tên" value={formFields.name} onChange={(v) => setFormFields({...formFields, name: v})} placeholder="VD: Thịt bò" />
          <TextInputField label="Danh mục" value={formFields.category} onChange={(v) => setFormFields({...formFields, category: v})} placeholder="Thịt, Rau, Gia vị..." />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInputField label="ĐVT" value={formFields.unit} onChange={(v) => setFormFields({...formFields, unit: v})} placeholder="kg" flex={1} />
            <TextInputField label="Giá mua" value={formFields.default_cost} onChange={(v) => setFormFields({...formFields, default_cost: v})} placeholder="0" keyboard="decimal-pad" flex={1} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInputField label="Tồn hiện tại" value={formFields.current_stock} onChange={(v) => setFormFields({...formFields, current_stock: v})} placeholder="0" keyboard="decimal-pad" flex={1} />
            <TextInputField label="Tồn tối thiểu" value={formFields.min_stock} onChange={(v) => setFormFields({...formFields, min_stock: v})} placeholder="0" keyboard="decimal-pad" flex={1} />
          </View>
        </View>
      </FormModal>
    </SafeAreaView>
  );
}

// ── Sub-components ──
function StatItem({ icon, label, value, valueColor }: { icon: string; label: string; value: string | number; valueColor?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={colors.brand.primary} />
      <View>
        <Text style={[s.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TextInputField({ label, value, onChange, placeholder, keyboard, flex }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; flex?: number;
}) {
  return (
    <View style={{ flex: flex ?? undefined }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor="#94A3B8" keyboardType={keyboard || 'default'}
        style={s.fieldInput} />
    </View>
  );
}

const FAB = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={s.fab}>
    <Icon name="plus" size={24} color="#fff" />
  </TouchableOpacity>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  headerBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  // Filters
  filterBar: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface.app, gap: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: colors.border.light },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { ...font.micro, fontWeight: '600', color: colors.text.muted },
  chipTextActive: { color: colors.text.inverse },

  // Card
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border.light },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardIcon: { width: 36, height: 36, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  cardName: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },
  cardCode: { ...font.micro, color: colors.text.muted, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: shape.radius.full },
  badgeText: { ...font.micro, fontWeight: '700' },

  // Stock bar
  stockBar: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 2.5, overflow: 'hidden' },
  stockBarFill: { height: '100%', borderRadius: 2.5, minWidth: 3 },

  // Card stats
  cardStats: { flexDirection: 'row', gap: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8 },
  cardStatItem: { flex: 1, alignItems: 'center' },
  cardStatValue: { ...font.caption, fontWeight: '700', color: colors.text.primary },
  cardStatLabel: { ...font.micro, color: colors.text.muted },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionBtn: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.default },

  // Panel (iPad detail)
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelIconBox: { width: 40, height: 40, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelSub: { ...font.caption, color: colors.text.muted, marginTop: 1 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelBtnText: { ...font.caption, color: '#fff', fontWeight: '700' },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailItem: { flex: 1, alignItems: 'center' },
  detailValue: { ...font.bodySmall, fontWeight: '900', color: colors.text.primary },
  detailLabel: { ...font.micro, color: colors.text.muted },
  detailDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 4 },

  // Form
  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 4 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
