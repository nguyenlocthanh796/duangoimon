import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

export default function SuppliersScreen() {
  const { openSidebar } = useSidebar();
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
    if (!form.code || !form.name) { Alert.alert('Lỗi', 'Mã và tên bắt buộc'); return; }
    try {
      if (editing) await request(API + `/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await request(API + '/suppliers', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const deleteSupplier = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá nhà cung cấp này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        setSelectedId(null);
        load();
      }},
    ]);
  };

  // ── Detail panel (iPad right) ──
  const renderDetail = () => {
    if (!selected) return null;
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={[s.panelIconBox, { backgroundColor: colors.brand.primaryBg }]}>
            <Icon name="truck" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle} numberOfLines={1}>{selected.name}</Text>
            <Text style={s.panelSub}>{selected.code}</Text>
          </View>
        </View>

        <ContactRow icon="account-outline" label="Liên hệ" value={selected.contact_person} />
        <ContactRow icon="phone" label="SĐT" value={selected.phone} />
        <ContactRow icon="email-outline" label="Email" value={selected.email} />
        <ContactRow icon="receipt" label="Mã số thuế" value={selected.tax_code} />
        <ContactRow icon="calendar-text" label="Điều khoản TT" value={selected.payment_terms} />
        <ContactRow icon="map-marker-outline" label="Địa chỉ" value={selected.address} multiline />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil-outline" size={14} color="#fff" />
            <Text style={s.panelBtnText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteSupplier(selected.id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete-outline" size={14} color={colors.status.danger} />
            <Text style={{ ...s.panelBtnText, color: colors.status.danger }}>Xoá</Text>
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
        style={[s.card, isSelected && { borderColor: colors.brand.primary }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={[s.cardIcon, { backgroundColor: colors.brand.primaryBg }]}>
            <Icon name="truck" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.cardCode}>{item.code}</Text>
            </View>
            {item.contact_person && (
              <Text style={s.cardMeta}>
                <Icon name="account-outline" size={11} color={colors.text.muted} /> {item.contact_person}
              </Text>
            )}
            {(item.phone || item.email) && (
              <Text style={s.cardMeta} numberOfLines={1}>
                <Icon name="phone" size={11} color={colors.text.muted} /> {item.phone || ''}
                {item.phone && item.email ? ' · ' : ''}
                {item.email || ''}
              </Text>
            )}
          </View>
        </View>

        {/* Always-visible actions */}
        <View style={s.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={15} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteSupplier(item.id)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={15} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Filters ──
  const renderSearch = () => (
    <View style={s.searchBox}>
      <Icon name="magnify" size={16} color={colors.text.muted} />
      <TextInput value={search} onChangeText={setSearch} placeholder="Tìm NCC..."
        placeholderTextColor={colors.text.muted}
        style={{ flex: 1, ...font.caption, color: colors.text.primary, paddingVertical: 0 }} />
      {search !== '' && (
        <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={colors.text.muted} /></TouchableOpacity>
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
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={<EmptyState icon="truck" title="Chưa có NCC" subtitle="Thêm nhà cung cấp đầu tiên" />}
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Nhà cung cấp"
        subtitle={`${suppliers.length} NCC`}
        onMenuPress={openSidebar} compact
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={load} style={s.headerBtn}>
              <Icon name="refresh" size={18} color={colors.icon.default} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openNew} style={s.addBtn}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              {isWide && <Text style={s.addBtnText}>Thêm</Text>}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatItem icon="truck" label="Nhà cung cấp" value={suppliers.length} />
        <View style={s.barDivider} />
        <StatItem icon="phone" label="Có SĐT" value={suppliers.filter(s => s.phone).length} />
        <View style={s.barDivider} />
        <StatItem icon="email-outline" label="Có Email" value={suppliers.filter(s => s.email).length} />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            {renderList()}
          </View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, paddingTop: 8, paddingLeft: 8, paddingRight: 12 }}>
            {selected ? renderDetail() : (
              <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
                <Icon name="hand-pointing-up" size={36} color={colors.text.muted} />
                <Text style={{ ...font.body, color: colors.text.muted }}>Chọn NCC để xem chi tiết</Text>
              </View>
            )}
          </View>
        </View>
      ) : renderList()}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa NCC' : 'Thêm NCC'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Label>Mã NCC *</Label><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.fieldInput} placeholder="VD: NCC001" /></View>
            <View style={{ flex: 2 }}><Label>Tên NCC *</Label><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="VD: Công ty ABC" /></View>
          </View>
          <Label>Người liên hệ</Label>
          <TextInput value={form.contact_person} onChangeText={v => setForm(p => ({ ...p, contact_person: v }))} style={s.fieldInput} placeholder="Tên người LH" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Label>SĐT</Label><TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" style={s.fieldInput} placeholder="SĐT" /></View>
            <View style={{ flex: 1 }}><Label>Email</Label><TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" style={s.fieldInput} placeholder="Email" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Label>Mã số thuế</Label><TextInput value={form.tax_code} onChangeText={v => setForm(p => ({ ...p, tax_code: v }))} style={s.fieldInput} placeholder="MST" /></View>
            <View style={{ flex: 1 }}><Label>Điều khoản TT</Label><TextInput value={form.payment_terms} onChangeText={v => setForm(p => ({ ...p, payment_terms: v }))} style={s.fieldInput} placeholder="COD/30 ngày" /></View>
          </View>
          <Label>Địa chỉ</Label>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={[s.fieldInput, { minHeight: 60 }]} multiline placeholder="Địa chỉ" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

// ── Sub-components ──
function Label({ children }: { children: string }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={colors.brand.primary} />
      <View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ContactRow({ icon, label, value, multiline }: { icon: string; label: string; value?: string | null; multiline?: boolean }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: multiline ? 'flex-start' : 'center' }}>
      <Icon name={icon as any} size={14} color={colors.text.muted} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...font.micro, color: colors.text.muted }}>{label}</Text>
        <Text style={{ ...font.caption, color: colors.text.primary }}>{value}</Text>
      </View>
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.fab}>
      <Icon name="plus" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

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

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: colors.border.light, marginBottom: 6 },

  // Card
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border.light },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 40, height: 40, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  cardName: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },
  cardCode: { ...font.micro, color: colors.text.muted },
  cardMeta: { ...font.micro, color: colors.text.muted, marginTop: 2 },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionBtn: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.default },

  // Panel (iPad detail)
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border.light, gap: 8 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelIconBox: { width: 40, height: 40, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelSub: { ...font.caption, color: colors.text.muted, marginTop: 1 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelBtnText: { ...font.caption, color: '#fff', fontWeight: '700' },

  // Form
  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, boxShadow: "0px 4px 8px rgba(249,115,22,0.3)" },
});


