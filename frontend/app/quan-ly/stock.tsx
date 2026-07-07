"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';

const API = '/api/v1/quan-ly';

function formatVND(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

function stockColor(stock: number, min: number) {
  if (min <= 0) return { bg: '#EFF6FF', text: '#2563EB' };
  const ratio = stock / min;
  if (ratio > 2) return { bg: '#DCFCE7', text: '#16A34A' };
  if (ratio > 1) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#FEE2E2', text: '#DC2626' };
}

export default function StockScreen() {
  const { openSidebar } = useSidebar();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // WebSocket connection for stock alerts
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/inventory');
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
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request<any[]>(API + '/raw-materials');
      setMaterials(data);
    } catch (e) {
      console.error('Failed to load materials', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? materials.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase())
      )
    : materials;

  const saveMaterial = async (body: any) => {
    try {
      if (editing) {
        await request(`${API}/raw-materials/${editing.id}`, {
          method: 'PUT', body: JSON.stringify(body),
        });
      } else {
        await request(API + '/raw-materials', {
          method: 'POST', body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu nguyên liệu.');
    }
  };

  const edit = (m: any) => {
    setEditing(m);
    setShowForm(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const sc = stockColor(item.current_stock, item.min_stock);
    return (
      <TouchableOpacity onPress={() => edit(item)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCode}>{item.code}</Text>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.cardStats}>
          <View style={[styles.stockBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.stockText, { color: sc.text }]}>
              {item.current_stock} / {item.min_stock} {item.unit}
            </Text>
          </View>
          <Text style={styles.costText}>{formatVND(item.default_cost)}/{item.unit}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <ScreenHeader
        title="Kho hàng"
        subtitle={`${materials.length} mặt hàng`}
        onMenuPress={openSidebar}
        right={
          <TouchableOpacity onPress={() => { setEditing(null); setShowForm(true); }} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text>
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="🔍 Tìm nguyên liệu..."
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="package-variant" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có nguyên liệu</Text>
            </View>
          }
        />
      )}

      <MaterialForm
        visible={showForm}
        editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveMaterial}
      />
    </SafeAreaView>
  );
}

function MaterialForm({ visible, editing, onClose, onSave }: {
  visible: boolean; editing: any | null; onClose: () => void; onSave: (body: any) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('kg');
  const [defaultCost, setDefaultCost] = useState('0');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStock, setMinStock] = useState('0');

  useEffect(() => {
    if (editing) {
      setCode(editing.code);
      setName(editing.name);
      setCategory(editing.category || '');
      setUnit(editing.unit || 'kg');
      setDefaultCost(String(editing.default_cost || 0));
      setCurrentStock(String(editing.current_stock || 0));
      setMinStock(String(editing.min_stock || 0));
    } else {
      setCode(''); setName(''); setCategory('');
      setUnit('kg'); setDefaultCost('0'); setCurrentStock('0'); setMinStock('0');
    }
  }, [editing]);

  const submit = () => {
    if (!code || !name) { Alert.alert('Thiếu thông tin', 'Mã và tên là bắt buộc.'); return; }
    onSave({
      code, name, category: category || undefined,
      unit, default_cost: parseFloat(defaultCost) || 0,
      current_stock: parseFloat(currentStock) || 0,
      min_stock: parseFloat(minStock) || 0,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text>
          </TouchableOpacity>
          <Text style={{ ...font.h2, color: colors.text.primary }}>
            {editing ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'}
          </Text>
          <TouchableOpacity onPress={submit}>
            <Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 16 }}>
          {[
            { l: 'Mã', v: code, s: setCode, p: 'VD: BOTL001' },
            { l: 'Tên', v: name, s: setName, p: 'VD: Thịt bò' },
            { l: 'Danh mục', v: category, s: setCategory, p: 'Thịt, Rau, Gia vị...' },
          ].map(f => (
            <View key={f.l}>
              <Text style={styles.label}>{f.l}</Text>
              <TextInput value={f.v} onChangeText={f.s} placeholder={f.p} style={styles.input} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { l: 'ĐVT', v: unit, s: setUnit, p: 'kg', w: 1 },
              { l: 'Giá mua', v: defaultCost, s: setDefaultCost, p: '0', w: 1, k: true },
              { l: 'Tồn hiện tại', v: currentStock, s: setCurrentStock, p: '0', w: 1, k: true },
              { l: 'Tồn tối thiểu', v: minStock, s: setMinStock, p: '0', w: 1, k: true },
            ].map((f: any) => (
              <View key={f.l} style={{ flex: f.w }}>
                <Text style={styles.label}>{f.l}</Text>
                <TextInput
                  value={f.v} onChangeText={f.s} placeholder={f.p}
                  keyboardType={f.k ? 'decimal-pad' : 'default'}
                  style={styles.input}
                />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.brand.primary,
  },
  searchInput: {
    borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 12,
    padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.card,
  },
  card: {
    backgroundColor: colors.surface.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.border.default,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  cardCode: { ...font.badge, color: colors.text.muted, fontWeight: '700' },
  cardName: { ...font.h3, color: colors.text.primary, flex: 1 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stockText: { ...font.badge, fontWeight: '700' },
  costText: { ...font.caption, color: colors.text.muted },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default,
  },
  label: { ...font.label, color: colors.text.secondary, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10,
    padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app,
  },
});
