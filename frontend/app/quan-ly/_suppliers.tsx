import React, { useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, TextInput, ScrollView, FlatList,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { useFilter } from '../../lib/hooks/useFilter';
import { colors, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import EmptyState from '../../lib/components/ui/EmptyState';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import { request } from '../../lib/api/client';

type Supplier = {
  id: string; code: string; name: string;
  contact_person?: string; phone?: string; email?: string; address?: string; note?: string;
};

type FormState = {
  code: string; name: string; contact_person: string; phone: string;
  email: string; address: string; note: string;
};

const EMPTY_FORM: FormState = {
  code: '', name: '', contact_person: '', phone: '', email: '', address: '', note: '',
};

function generateFallbackSuppliers(): Supplier[] {
  return [
    { id: 's1', code: 'NCC01', name: 'Công Ty Thực Phẩm Sạch CP', contact_person: 'Anh Hoàng Thành', phone: '0988112233', email: 'sales@cpfood.vn', address: 'KCN Biên Hòa 2, Đồng Nai', note: 'Chuyên cung cấp thịt heo, thịt gà tươi sống hàng ngày' },
    { id: 's2', code: 'NCC02', name: 'Nông Sản Sạch Đà Lạt Farm', contact_person: 'Chị Thu Thủy', phone: '0912334455', email: 'thuy@dalatfarm.com', address: 'Đức Trọng, Lâm Đồng', note: 'Cung cấp rau củ quả hữu cơ giao sáng sớm' },
    { id: 's3', code: 'NCC03', name: 'Đồ Uống & Nước Giải Khát Tân Hiệp', contact_person: 'Anh Văn Minh', phone: '0903998877', email: 'minh@anhthanh.vn', address: 'Quận Bình Tân, TP.HCM', note: 'Đại lý phân phối nước ngọt, siro, nguyên liệu pha chế' },
    { id: 's4', code: 'NCC04', name: 'Gia Vị & Nông Sản Cholimex', contact_person: 'Chị Mai Hương', phone: '0977665544', email: 'huong@cholimex.com.vn', address: 'KCN Vĩnh Lộc, TP.HCM', note: 'Gia vị đóng gói, tương ớt, tương cà' },
  ];
}

export default function SuppliersScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();

  const {
    data: suppliers, loading, refreshing, saving,
    showForm, setShowForm, selectedId, setSelectedId,
    selectedItem, editingId, form, setForm,
    loadData, onRefresh, openAdd, openEdit, handleSave, handleDelete,
  } = useCrud<Supplier, FormState>({
    fetchFn: () => request('/api/v1/quan-ly/suppliers') as Promise<Supplier[]>,
    createFn: (payload) => request('/api/v1/quan-ly/suppliers', { method: 'POST', body: JSON.stringify(payload) }) as Promise<Supplier>,
    updateFn: (id, payload) => request(`/api/v1/quan-ly/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) as Promise<Supplier>,
    deleteFn: (id) => request(`/api/v1/quan-ly/suppliers/${id}`, { method: 'DELETE' }),
    fallbackData: generateFallbackSuppliers(),
    formState: EMPTY_FORM,
    formFromItem: (s) => ({
      code: s.code || '', name: s.name || '',
      contact_person: s.contact_person || '', phone: s.phone || '',
      email: s.email || '', address: s.address || '', note: s.note || '',
    }),
    buildPayload: (f) => f,
    nameLabel: 'nhà cung cấp',
  });

  const { search, setSearch, filteredData: filtered } = useFilter<Supplier>({
    data: suppliers,
    searchFields: ['name', 'code', 'phone'],
  });

  const renderCard = ({ item }: { item: Supplier }) => {
    const isSelected = selectedId === item.id;
    if (!isWide) {
      return (
        <View style={ss.listRow}>
          <View style={s.posCodeBadge}>
            <AppText variant="md" weight="normal" color="#64748B">{item.code || 'NCC'}</AppText>
          </View>
          <TouchableOpacity style={{ flex: 1, paddingRight: 8 }}
            onPress={() => setSelectedId(isSelected ? null : item.id)} activeOpacity={0.7}>
            <AppText variant="md" color="#0F172A" numberOfLines={1}>{item.name}</AppText>
            <AppText variant="md" color="#64748B" numberOfLines={1}>
              {item.contact_person ? `👤 ${item.contact_person}` : ''} · 📱 {item.phone || 'Chưa có SĐT'}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={ss.miniActionBtn} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => setSelectedId(isSelected ? null : item.id)}
        style={[s.cardWide, isSelected && { backgroundColor: colors.brand.primaryBg }]} activeOpacity={0.7}>
        <View style={s.cardTop}>
          <View style={[s.cardIcon, { alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="md" color={colors.brand.primary}>{item.code?.slice(0, 3) || 'NCC'}</AppText>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="md" color="#050505" numberOfLines={1}>{item.name}</AppText>
              <AppText variant="md" color={colors.text.muted}>{item.code}</AppText>
            </View>
            {item.contact_person && (
              <AppText variant="md" color={colors.text.secondary} style={{ marginTop: 2 }}>👤 {item.contact_person}</AppText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" color="#050505">Chi Tiết Nhà Cung Cấp</AppText>
          <AppText variant="md" color="#65676B" style={{ textAlign: 'center' }}>
            Chọn nhà cung cấp từ danh sách bên trái
          </AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openAdd}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="md" color="#FFF">Thêm nhà cung cấp mới</AppText>
          </TouchableOpacity>
        </View>
      );
    }
    const item = selectedItem;
    return (
      <View style={ss.detailPanel}>
        <View style={s.detailHeader}>
          <View style={[s.cardIcon, { alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="md" color={colors.brand.primary}>{item.code?.slice(0, 3) || 'NCC'}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#050505">{item.name}</AppText>
            <AppText variant="md" color={colors.text.secondary}>Mã: {item.code || 'N/A'}</AppText>
          </View>
        </View>
        <View style={s.detailBody}>
          {item.contact_person ? <AppText variant="md" color="#050505">👤 Người đại diện: {item.contact_person}</AppText> : null}
          {item.phone ? <AppText variant="md" color="#050505">📱 SĐT: {item.phone}</AppText> : null}
          {item.email ? <AppText variant="md" color="#050505">✉️ Email: {item.email}</AppText> : null}
          {item.address ? <AppText variant="md" color="#050505">📍 Địa chỉ: {item.address}</AppText> : null}
          {item.note ? (
            <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 4 }}>
              <AppText variant="md" color={colors.text.secondary}>📝 Ghi chú:</AppText>
              <AppText variant="md" color="#334155" style={{ fontStyle: 'italic', marginTop: 2 }}>"{item.note}"</AppText>
            </View>
          ) : null}
        </View>
        <View style={s.detailActions}>
          <TouchableOpacity style={ss.panelBtnSecondary} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
            <AppText variant="md" color={colors.brand.primary}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={ss.panelBtnDanger} onPress={() => handleDelete(item.id, item.name)}>
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
            <AppText variant="md" color={colors.status.danger}>Xóa</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Tìm NCC, mã, SĐT..."
            placeholderTextColor="#94A3B8" style={ss.searchTextInput} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <AppText variant="md" color="#FFFFFF">Thêm NCC</AppText>
        </TouchableOpacity>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={loading ? <TableSkeleton rowCount={5} /> : (
                <EmptyState icon="truck-off" title="Chưa có nhà cung cấp nào"
                  subtitle="Nhấn + Thêm NCC để tiếp nhận đối tác mới" />
              )} />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={ss.sectionWrap}>
              <View style={ss.sectionHeader}>
                <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                  DANH SÁCH NHÀ CUNG CẤP ({filtered.length})
                </AppText>
              </View>
              <View style={ss.sectionItems}>
                {filtered.map(item => (
                  <React.Fragment key={item.id}>{renderCard({ item })}</React.Fragment>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {!isWide && (
        <DetailModal visible={!!selectedItem} title={selectedItem?.name || ''}
          subtitle={selectedItem ? `SĐT: ${selectedItem.phone || 'N/A'}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedItem ? () => { openEdit(selectedItem); setSelectedId(null); } : undefined}
          onDelete={selectedItem ? () => { handleDelete(selectedItem.id, selectedItem.name); setSelectedId(null); } : undefined}>
          {renderDetailPanel()}
        </DetailModal>
      )}

      <FormModal visible={showForm} title={editingId ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        onClose={() => setShowForm(false)}
        onSave={() => handleSave(() => !form.name.trim() ? 'Tên nhà cung cấp không được để trống' : null)}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm mới'} saving={saving}>
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Mã NCC (VD: NCC01)" value={form.code}
            onChangeText={(v) => setForm(f => ({ ...f, code: v }))} />
          <TextInput style={s.input} placeholder="Tên nhà cung cấp (*)" value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="Người liên hệ" value={form.contact_person}
            onChangeText={(v) => setForm(f => ({ ...f, contact_person: v }))} />
          <TextInput style={s.input} placeholder="SĐT" keyboardType="phone-pad" value={form.phone}
            onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} />
          <TextInput style={s.input} placeholder="Email" keyboardType="email-address" value={form.email}
            onChangeText={(v) => setForm(f => ({ ...f, email: v }))} />
          <TextInput style={s.input} placeholder="Địa chỉ" value={form.address}
            onChangeText={(v) => setForm(f => ({ ...f, address: v }))} />
          <TextInput style={s.input} placeholder="Ghi chú" value={form.note}
            onChangeText={(v) => setForm(f => ({ ...f, note: v }))} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app, position: 'relative' },
  cardWide: { backgroundColor: colors.surface.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  detailBody: { gap: 8 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  posCodeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.brand.primaryBg, marginRight: 10 },
  input: { height: 44, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, color: '#0F172A', backgroundColor: '#FFFFFF' },
});
