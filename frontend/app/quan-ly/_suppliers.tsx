import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import AppText from '../../lib/components/ui/AppText';
import FAB from '../../lib/components/ui/FAB';

const API = '/api/v1/quan-ly';

export default function SuppliersScreen() {
  const { isWide, containerWidth, hPad, gutter } = useResponsive();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    code: '', name: '', phone: '', email: '',
    contact_person: '', address: '', tax_code: '', payment_terms: '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request<any>(API + '/suppliers');
      setSuppliers(Array.isArray(data) ? data : data?.items || []);
    }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await request<any>(API + '/suppliers');
      setSuppliers(Array.isArray(data) ? data : data?.items || []);
    }
    catch { } finally { setRefreshing(false); }
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.phone || '').includes(q)
    );
  }, [suppliers, search]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return suppliers.find(s => s.id === selectedId);
  }, [suppliers, selectedId]);

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', name: '', phone: '', email: '', contact_person: '', address: '', tax_code: '', payment_terms: '' });
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      code: s.code, name: s.name, phone: s.phone || '', email: s.email || '',
      contact_person: s.contact_person || '', address: s.address || '',
      tax_code: s.tax_code || '', payment_terms: s.payment_terms || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { Alert.alert('Lỗi', 'Mã và tên nhà cung cấp là bắt buộc'); return; }
    try {
      if (editing) await request(API + `/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await request(API + '/suppliers', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu nhà cung cấp'); }
  };

  const deleteSupplier = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá nhà cung cấp này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        setSelectedId(null);
        load();
      } },
    ]);
  };

  // ── Detail panel (iPad right) ──
  const renderDetail = () => {
    if (!selected) return null;
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={s.panelIconBox}>
            <Icon name="truck" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{selected.name}</AppText>
            <AppText variant="sm" color={colors.text.muted}>{selected.code}</AppText>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <ContactRow icon="account-outline" label="Người liên hệ" value={selected.contact_person} />
          <ContactRow icon="phone" label="Số điện thoại" value={selected.phone} />
          <ContactRow icon="email-outline" label="Email" value={selected.email} />
          <ContactRow icon="receipt" label="Mã số thuế" value={selected.tax_code} />
          <ContactRow icon="calendar-text" label="Điều khoản thanh toán" value={selected.payment_terms} />
          <ContactRow icon="map-marker-outline" label="Địa chỉ" value={selected.address} multiline />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil-outline" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteSupplier(selected.id)} style={[s.panelBtn, { backgroundColor: colors.status.dangerBg }]}>
            <Icon name="delete-outline" size={14} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Grid cols ──
  const numCols = useMemo(() => {
    if (!isWide) return 1;
    return calcGridCols(containerWidth, 280, hPad, gutter);
  }, [isWide, containerWidth, hPad, gutter]);

  // ── Card ──
  const renderCard = (item: any) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        onPress={() => setSelectedId(isSelected ? null : item.id)}
        style={[s.card, isSelected && { backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={s.cardIcon}>
            <Icon name="truck" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{item.name}</AppText>
              <AppText variant="sm" color={colors.text.muted}>{item.code}</AppText>
            </View>
            {item.contact_person && (
              <AppText variant="sm" color={colors.text.secondary} style={{ marginTop: 2 }}>
                👤 {item.contact_person}
              </AppText>
            )}
            {(item.phone || item.email) && (
              <AppText variant="sm" color={colors.text.muted} numberOfLines={1} style={{ marginTop: 2 }}>
                📞 {item.phone || ''} {item.phone && item.email ? '·' : ''} {item.email || ''}
              </AppText>
            )}
          </View>
        </View>

        {/* Always-visible actions */}
        <View style={s.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={15} color={colors.icon.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteSupplier(item.id)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={15} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Filters ──
  const renderSearch = () => (
    <View style={s.searchBox}>
      <Icon name="magnify" size={18} color={colors.icon.muted} />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm nhà cung cấp theo tên, mã, SĐT..."
        placeholderTextColor={colors.text.muted}
        style={{ flex: 1, ...font.md, color: colors.text.primary, paddingVertical: 0 }}
      />
      {search !== '' && (
        <TouchableOpacity onPress={() => setSearch('')}>
          <Icon name="close-circle" size={16} color={colors.icon.muted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderList = () => {
    if (loading) return <TableSkeleton rowCount={5} />;
    return (
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        key={`cols-${numCols}`}
        numColumns={numCols}
        renderItem={({ item }) => renderCard(item as any)}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 4, gap: 8 }}
        columnWrapperStyle={numCols > 1 ? { gap: 8, marginBottom: 6 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={<EmptyState icon="truck" title="Chưa có nhà cung cấp nào" subtitle="Nhấn nút + để thêm NCC đầu tiên" />}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {renderList()}
          </View>
          <View style={{ flex: 0.45 }}>
            {selected ? renderDetail() : (
              <View style={[s.panelBox, { alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 8 }]}>
                <Icon name="hand-pointing-up" size={32} color={colors.icon.muted} />
                <AppText variant="sm" color={colors.text.muted}>Chọn một NCC để xem chi tiết</AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          {renderList()}
        </View>
      )}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal
        visible={showForm}
        title={editing ? 'Sửa NCC' : 'Thêm NCC'}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saveLabel={editing ? 'Cập nhật' : 'Thêm'}
      >
        <View style={{ gap: 10, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label>Mã NCC *</Label>
              <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.fieldInput} placeholder="VD: NCC001" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 2 }}>
              <Label>Tên NCC *</Label>
              <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="VD: Công ty Thực phẩm ABC" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <Label>Người liên hệ</Label>
          <TextInput value={form.contact_person} onChangeText={v => setForm(p => ({ ...p, contact_person: v }))} style={s.fieldInput} placeholder="Tên người đại diện liên hệ" placeholderTextColor={colors.text.muted} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label>Số điện thoại</Label>
              <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" style={s.fieldInput} placeholder="SĐT liên hệ" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Email</Label>
              <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" style={s.fieldInput} placeholder="Email công ty" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label>Mã số thuế</Label>
              <TextInput value={form.tax_code} onChangeText={v => setForm(p => ({ ...p, tax_code: v }))} style={s.fieldInput} placeholder="MST" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Điều khoản TT</Label>
              <TextInput value={form.payment_terms} onChangeText={v => setForm(p => ({ ...p, payment_terms: v }))} style={s.fieldInput} placeholder="COD / 30 ngày" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <Label>Địa chỉ trụ sở</Label>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={[s.fieldInput, { minHeight: 50 }]} multiline placeholder="Địa chỉ giao dịch" placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
    </View>
  );
}

// ── Sub-components ──
function Label({ children }: { children: string }) {
  return <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>{children}</AppText>;
}

function ContactRow({ icon, label, value, multiline }: { icon: string; label: string; value?: string | null; multiline?: boolean }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: multiline ? 'flex-start' : 'center' }}>
      <Icon name={icon as any} size={14} color={colors.icon.muted} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="sm" color={colors.text.muted}>{label}</AppText>
        <AppText variant="sm" color={colors.text.primary}>{value}</AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, paddingHorizontal: 10, height: 42, marginBottom: 8 },

  // Card
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionBtn: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.light },

  // Panel (iPad detail)
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelIconBox: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },

  // Form
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
