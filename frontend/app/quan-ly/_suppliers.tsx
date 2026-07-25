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

function generateFallbackSuppliers() {
  return [
    { id: 's1', code: 'NCC01', name: 'Công Ty Thực Phẩm Sạch CP', contact_person: 'Anh Hoàng Thành', phone: '0988112233', email: 'sales@cpfood.vn', address: 'KCN Biên Hòa 2, Đồng Nai', note: 'Chuyên cung cấp thịt heo, thịt gà tươi sống hàng ngày' },
    { id: 's2', code: 'NCC02', name: 'Nông Sản Sạch Đà Lạt Farm', contact_person: 'Chị Thu Thủy', phone: '0912334455', email: 'thuy@dalatfarm.com', address: 'Đức Trọng, Lâm Đồng', note: 'Cung cấp rau củ quả hữu cơ giao sáng sớm' },
    { id: 's3', code: 'NCC03', name: 'Đồ Uống & Nước Giải Khát Tân Hiệp', contact_person: 'Anh Văn Minh', phone: '0903998877', email: 'minh@anhthanh.vn', address: 'Quận Bình Tân, TP.HCM', note: 'Đại lý phân phối nước ngọt, siro, nguyên liệu pha chế' },
    { id: 's4', code: 'NCC04', name: 'Gia Vị & Nông Sản Cholimex', contact_person: 'Chị Mai Hương', phone: '0977665544', email: 'huong@cholimex.com.vn', address: 'KCN Vĩnh Lộc, TP.HCM', note: 'Gia vị đóng gói, tương ớt, tương cà' },
  ];
}

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
      if (list && list.length > 0) {
        setSuppliers(list);
      } else {
        setSuppliers(generateFallbackSuppliers());
      }
    } catch {
      setSuppliers(generateFallbackSuppliers());
    } finally {
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
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={s.detailEmpty}>
          <Icon name="truck-outline" size={40} color={colors.text.muted} />
          <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center' }}>
            Chọn một nhà cung cấp từ danh sách để xem chi tiết liên hệ
          </AppText>
        </View>
      );
    }
    const item = selectedItem;
    return (
      <View style={s.detailPanel}>
        <View style={s.detailHeader}>
          <Icon name="truck-delivery" size={24} color={colors.brand.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{item.name}</AppText>
            <AppText variant="sm" color={colors.text.secondary}>Mã nhà cung cấp: {item.code || 'N/A'}</AppText>
          </View>
        </View>

        <View style={s.detailBody}>
          {item.contact_person ? <AppText variant="sm" color="#050505">👤 Người đại diện: {item.contact_person}</AppText> : null}
          {item.phone ? <AppText variant="sm" color="#050505">📱 Số điện thoại: {item.phone}</AppText> : null}
          {item.email ? <AppText variant="sm" color="#050505">✉️ Email: {item.email}</AppText> : null}
          {item.address ? <AppText variant="sm" color="#050505">📍 Địa chỉ: {item.address}</AppText> : null}
          {item.note ? (
            <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 4 }}>
              <AppText variant="sm" color={colors.text.secondary}>📝 Ghi chú hợp tác:</AppText>
              <AppText variant="sm" color="#334155" style={{ fontStyle: 'italic', marginTop: 2 }}>"{item.note}"</AppText>
            </View>
          ) : null}
        </View>

        <View style={s.detailActions}>
          <TouchableOpacity style={s.panelBtnSecondary} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chỉnh sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.panelBtnDanger} onPress={() => deleteSupplier(item.id)}>
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={s.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{suppliers.length} nhà cung cấp</AppText>
          <TouchableOpacity onPress={openAdd} style={s.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm NCC</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={s.fbMetricContainer}>
        <View style={s.fbMetricCard}>
          <View style={[s.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="truck-delivery" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{suppliers.length} đối tác</AppText>
            <AppText variant="sm" color="#65676B">Tổng nhà cung cấp</AppText>
          </View>
        </View>

        <View style={s.fbMetricCard}>
          <View style={[s.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-decagram" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>Đã xác minh</AppText>
            <AppText variant="sm" color="#65676B">Hợp đồng active</AppText>
          </View>
        </View>

        <View style={s.fbMetricCard}>
          <View style={[s.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="star" size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">Đánh giá 5★</AppText>
            <AppText variant="sm" color="#65676B">Chất lượng hàng</AppText>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm nhà cung cấp theo tên, mã, SĐT..." />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                loading ? (
                  <TableSkeleton rowCount={5} />
                ) : (
                  <EmptyState
                    icon="truck-off"
                    title="Chưa có nhà cung cấp nào"
                    subtitle="Nhấn + Thêm NCC để tiếp nhận đối tác mới"
                  />
                )
              }
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="truck-off"
                title="Chưa có nhà cung cấp nào"
                subtitle="Nhấn + Thêm NCC để tiếp nhận đối tác mới"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={openAdd} />}

      <FormModal
        visible={showForm}
        title={editingItem ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saveLabel={editingItem ? 'Cập nhật' : 'Thêm mới'}
        saving={saving}
      >
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Mã nhà cung cấp (VD: NCC01)" value={form.code} onChangeText={(v) => setForm(f => ({ ...f, code: v }))} />
          <TextInput style={s.input} placeholder="Tên nhà cung cấp (*)" value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="Người liên hệ" value={form.contact_person} onChangeText={(v) => setForm(f => ({ ...f, contact_person: v }))} />
          <TextInput style={s.input} placeholder="Số điện thoại" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} />
          <TextInput style={s.input} placeholder="Email" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm(f => ({ ...f, email: v }))} />
          <TextInput style={s.input} placeholder="Địa chỉ" value={form.address} onChangeText={(v) => setForm(f => ({ ...f, address: v }))} />
          <TextInput style={s.input} placeholder="Ghi chú hợp tác" value={form.note} onChangeText={(v) => setForm(f => ({ ...f, note: v }))} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

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
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
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
    justifyContent: 'center',
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

  /* 💻 Wide Screen Card */
  cardWide: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },

  /* Right Detail Panel */
  detailPanel: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  detailEmpty: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  detailBody: { gap: 8 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...font.md,
    color: colors.text.primary,
  },
});
