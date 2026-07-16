import { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl,
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
      } },
    ]);
  };

  // ── Detail panel (iPad right) ──
  const renderDetail = () => {
    if (!selected) return null;
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <View style={[s.panelIconBox, { backgroundColor: '#F97316' }]}>
            <Icon name="truck" size={20} color={'#F97316'} />
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

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[s.panelBtn, { backgroundColor: '#F97316' }]}>
            <Icon name="pencil-outline" size={14} color="#fff" />
            <Text style={s.panelBtnText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteSupplier(selected.id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete-outline" size={14} color={'#DC2626'} />
            <Text style={{ ...s.panelBtnText, color: '#DC2626' }}>Xoá</Text>
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
        style={[s.card, isSelected && { borderColor: '#F97316' }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={[s.cardIcon, { backgroundColor: '#F97316' }]}>
            <Icon name="truck" size={18} color={'#F97316'} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.cardCode}>{item.code}</Text>
            </View>
            {item.contact_person && (
              <Text style={s.cardMeta}>
                <Icon name="account-outline" size={11} color={'#737373'} /> {item.contact_person}
              </Text>
            )}
            {(item.phone || item.email) && (
              <Text style={s.cardMeta} numberOfLines={1}>
                <Icon name="phone" size={11} color={'#737373'} /> {item.phone || ''}
                {item.phone && item.email ? ' · ' : ''}
                {item.email || ''}
              </Text>
            )}
          </View>
        </View>

        {/* Always-visible actions */}
        <View style={s.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={15} color={'#737373'} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteSupplier(item.id)} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={15} color={'#737373'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Filters ──
  const renderSearch = () => (
    <View style={s.searchBox}>
      <Icon name="magnify" size={16} color={'#737373'} />
      <TextInput value={search} onChangeText={setSearch} placeholder="Tìm NCC..."
        placeholderTextColor={'#737373'}
        style={{ flex: 1, ...font.caption, color: '#171717', paddingVertical: 0 }} />
      {search !== '' && (
        <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={'#737373'} /></TouchableOpacity>
      )}
    </View>
  );

  const renderList = () => {
    if (loading) return <TableSkeleton rowCount={5} />;
    return (
      <FlatList data={filtered} keyExtractor={item => item.id}
        key={`cols-${numCols}`}
        numColumns={numCols}
        renderItem={({ item }) => renderCard(item as any)}
        contentContainerStyle={{ padding: 4, gap: 16}}
        columnWrapperStyle={numCols > 1 ? { gap: 16, marginBottom: 8 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#F97316'} />}
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
          <View style={{ flexDirection: 'row', gap: 12}}>
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
              <View style={{ alignItems: 'center', padding: 40, gap: 16}}>
                <Icon name="hand-pointing-up" size={36} color={'#737373'} />
                <Text style={{ ...font.body, color: '#737373' }}>Chọn NCC để xem chi tiết</Text>
              </View>
            )}
          </View>
        </View>
      ) : renderList()}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa NCC' : 'Thêm NCC'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 32}}>
            <View style={{ flex: 1 }}><Label>Mã NCC *</Label><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.fieldInput} placeholder="VD: NCC001" /></View>
            <View style={{ flex: 2 }}><Label>Tên NCC *</Label><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="VD: Công ty ABC" /></View>
          </View>
          <Label>Người liên hệ</Label>
          <TextInput value={form.contact_person} onChangeText={v => setForm(p => ({ ...p, contact_person: v }))} style={s.fieldInput} placeholder="Tên người LH" />
          <View style={{ flexDirection: 'row', gap: 32}}>
            <View style={{ flex: 1 }}><Label>SĐT</Label><TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" style={s.fieldInput} placeholder="SĐT" /></View>
            <View style={{ flex: 1 }}><Label>Email</Label><TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" style={s.fieldInput} placeholder="Email" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 32}}>
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
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={'#F97316'} />
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
    <View style={{ flexDirection: 'row', gap: 16, alignItems: multiline ? 'flex-start' : 'center' }}>
      <Icon name={icon as any} size={14} color={'#737373'} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...font.micro, color: '#737373' }}>{label}</Text>
        <Text style={{ ...font.caption, color: '#171717' }}>{value}</Text>
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 38, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  headerBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 32, height: 36, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 6 },

  // Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardName: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cardCode: { ...font.micro, color: '#737373' },
  cardMeta: { ...font.micro, color: '#737373', marginTop: 2 },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionBtn: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#E5E5E5' },

  // Panel (iPad detail)
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0', gap: 16},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 32, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelIconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...font.body, fontWeight: '600', color: '#171717' },
  panelSub: { ...font.caption, color: '#737373', marginTop: 1 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8},
  panelBtnText: { ...font.caption, color: '#fff', fontWeight: '600' },

  // Form
  fieldLabel: { ...font.label, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.body, color: '#171717', backgroundColor: '#FAFAFA' },

  separator: { width: 1, backgroundColor: '#F0F0F0' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', elevation: 4, boxShadow: "0px 4px 8px rgba(249,115,22,0.3)" },
});


