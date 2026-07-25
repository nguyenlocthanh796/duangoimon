import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import SearchBar from '../../lib/components/ui/SearchBar';
import EmptyState from '../../lib/components/ui/EmptyState';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import { request } from '../../lib/api/client';

export default function SuppliersScreen() {
  const { isWide } = useResponsive();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '', name: '', contact_person: '', phone: '', email: '', address: '', note: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await request('/api/v1/quan-ly/suppliers');
      const list = Array.isArray(res) ? res : (res?.items || []);
      setSuppliers(list);
    } catch { /* ignore */ } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      s => (s.name || '').toLowerCase().includes(q) ||
           (s.code || '').toLowerCase().includes(q) ||
           (s.phone || '').includes(q)
    );
  }, [suppliers, search]);

  const selectedItem = useMemo(
    () => suppliers.find(s => s.id === selectedId) || null,
    [suppliers, selectedId]
  );

  const openAdd = () => {
    setEditingItem(null);
    setForm({ code: '', name: '', contact_person: '', phone: '', email: '', address: '', note: '' });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      code: item.code || '',
      name: item.name || '',
      contact_person: item.contact_person || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      note: item.note || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Tên nhà cung cấp không được để trống'); return;
    }
    try {
      setSaving(true);
      if (editingItem?.id) {
        await request(`/api/v1/quan-ly/suppliers/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await request('/api/v1/quan-ly/suppliers', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false); loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu nhà cung cấp');
    } finally { setSaving(false); }
  };

  const deleteSupplier = (id: string) => {
    Alert.alert('Xóa nhà cung cấp', 'Bạn có chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`/api/v1/quan-ly/suppliers/${id}`, { method: 'DELETE' });
            if (selectedId === id) setSelectedId(null);
            loadData();
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể xóa');
          }
        },
      },
    ]);
  };

  const renderCard = ({ item }: { item: any }) => {
    const isSelected = selectedId === item.id;

    if (!isWide) {
      // 📱 Facebook Mobile Feed Card (Full Width)
      return (
        <View style={s.itemMobile}>
          <TouchableOpacity style={s.cardHeaderRow} onPress={() => setSelectedId(isSelected ? null : item.id)} activeOpacity={0.8}>
            <View style={[s.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
              <Icon name="truck-delivery" size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{item.name}</AppText>
                <AppText variant="sm" color="#65676B">({item.code || 'NCC'})</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {item.contact_person ? <AppText variant="sm" color="#65676B">👤 {item.contact_person}</AppText> : null}
                {item.phone ? <AppText variant="sm" color="#65676B">📱 {item.phone}</AppText> : null}
              </View>
              {item.address ? <AppText variant="sm" color="#65676B" numberOfLines={1} style={{ marginTop: 2 }}>📍 {item.address}</AppText> : null}
            </View>
          </TouchableOpacity>

          <View style={s.cardActionDivider} />

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
            <TouchableOpacity style={s.panelBtnSecondary} onPress={() => openEdit(item)}>
              <Icon name="pencil" size={14} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chỉnh sửa</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={s.panelBtnDanger} onPress={() => deleteSupplier(item.id)}>
              <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
              <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // 💻 Wide Screen Card
    return (
      <TouchableOpacity
        onPress={() => setSelectedId(isSelected ? null : item.id)}
        style={[s.cardWide, isSelected && { backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={s.cardIcon}>
            <Icon name="truck-delivery" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{item.name}</AppText>
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

  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={s.panelBox}>
          <View style={s.panelHeader}>
            <Icon name="truck-delivery" size={18} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.text.primary}>Thông tin nhà cung cấp</AppText>
          </View>
          <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn một nhà cung cấp để xem chi tiết
          </AppText>
        </View>
      );
    }
    const sItem = selectedItem;
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="truck-check" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>{sItem.name}</AppText>
          <AppText variant="sm" color={colors.text.muted}>{sItem.code}</AppText>
        </View>

        <View style={{ gap: 6 }}>
          {sItem.contact_person ? <AppText variant="sm" color={colors.text.secondary}>👤 Người liên hệ: <AppText variant="sm" weight="bold" color={colors.text.primary}>{sItem.contact_person}</AppText></AppText> : null}
          {sItem.phone ? <AppText variant="sm" color={colors.text.secondary}>📱 SĐT: <AppText variant="sm" weight="bold" color={colors.text.primary}>{sItem.phone}</AppText></AppText> : null}
          {sItem.email ? <AppText variant="sm" color={colors.text.secondary}>✉️ Email: {sItem.email}</AppText> : null}
          {sItem.address ? <AppText variant="sm" color={colors.text.secondary}>📍 Địa chỉ: {sItem.address}</AppText> : null}
          {sItem.note ? <AppText variant="sm" color={colors.text.secondary}>📝 Ghi chú: {sItem.note}</AppText> : null}
        </View>

        <View style={s.panelDivider} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => openEdit(sItem)} style={[s.panelBtn, { backgroundColor: colors.brand.primary, flex: 1 }]}>
            <Icon name="pencil" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteSupplier(sItem.id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete" size={14} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={s.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{suppliers.length} nhà cung cấp</AppText>
          <TouchableOpacity onPress={openAdd} style={s.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm mới</AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ paddingHorizontal: 12, marginVertical: 6 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm nhà cung cấp theo tên, SĐT..." />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 80 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
              ListEmptyComponent={loading ? <TableSkeleton rowCount={5} /> : <EmptyState icon="truck" title="Chưa có nhà cung cấp" subtitle="Nhấn nút + để thêm NCC đầu tiên" />}
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          ListEmptyComponent={loading ? <TableSkeleton rowCount={5} /> : <EmptyState icon="truck" title="Chưa có nhà cung cấp" subtitle="Nhấn nút + để thêm NCC đầu tiên" />}
        />
      )}

      {!isWide && <FAB onPress={openAdd} />}

      <FormModal visible={showForm} title={editingItem ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editingItem ? "Cập nhật" : "Thêm"} saving={saving}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Mã NCC</AppText>
          <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.fieldInput} placeholder="VD: NCC001" placeholderTextColor={colors.text.muted} />

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên nhà cung cấp *</AppText>
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="VD: Công ty Thực phẩm ABC" placeholderTextColor={colors.text.muted} />

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Người liên hệ</AppText>
          <TextInput value={form.contact_person} onChangeText={v => setForm(p => ({ ...p, contact_person: v }))} style={s.fieldInput} placeholder="Anh Tuấn" placeholderTextColor={colors.text.muted} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Số điện thoại</AppText>
              <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={s.fieldInput} placeholder="090..." keyboardType="phone-pad" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Email</AppText>
              <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={s.fieldInput} placeholder="email@abc.com" keyboardType="email-address" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Địa chỉ</AppText>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={s.fieldInput} placeholder="Số 123 Đường X..." placeholderTextColor={colors.text.muted} />

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Ghi chú</AppText>
          <TextInput value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} style={s.fieldInput} placeholder="Ghi chú về NCC..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
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

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
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
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justify: 'center',
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },

  /* 💻 Wide Screen Card */
  cardWide: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.app, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, gap: 6 },
  actionBtn: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.default },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, paddingHorizontal: 10 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
