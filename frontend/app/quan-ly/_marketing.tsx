import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

interface CampaignEx {
  id: string;
  name: string;
  type?: string;
  sent_count?: number;
  open_rate?: number;
  status?: string;
  is_active?: boolean;
  content?: string;
}

export default function MarketingScreen() {
  const { isWide } = useResponsive();
  const [campaigns, setCampaigns] = useState<CampaignEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CampaignEx | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CampaignEx | null>(null);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState({ name: '', type: 'email', content: '', is_active: true });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/marketing/campaigns`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setCampaigns(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.is_active ?? true).length;
    const sent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
    return { total, active, sent };
  }, [campaigns]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', type: 'email', content: '', is_active: true });
    setShowForm(true);
  };

  const openEdit = (c: CampaignEx) => {
    setEditing(c);
    setForm({
      name: c.name,
      type: c.type || 'email',
      content: c.content || '',
      is_active: c.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên chiến dịch là bắt buộc'); return; }
    try {
      if (editing) {
        await request(`${API}/marketing/campaigns/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await request(`${API}/marketing/campaigns`, { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu chiến dịch'); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xóa chiến dịch', `Bạn có chắc muốn xóa "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`${API}/marketing/campaigns/${id}`, { method: 'DELETE' });
            load();
          } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
        },
      },
    ]);
  };

  const handleSend = async (c: CampaignEx) => {
    try {
      await request(`${API}/marketing/campaigns/${c.id}/send`, { method: 'POST' });
      Alert.alert('Thành công', `Đã phát chiến dịch "${c.name}" tới khách hàng`);
      load();
    } catch { Alert.alert('Lỗi', 'Không thể phát chiến dịch'); }
  };

  const columns: Column<CampaignEx>[] = [
    {
      key: 'name',
      title: 'Chiến dịch',
      flex: 1,
      render: (c) => (
        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{c.name}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Kênh: {(c.type || 'email').toUpperCase()}</AppText>
        </View>
      ),
    },
    {
      key: 'sent_count',
      title: 'Đã gửi',
      width: 80,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.sent_count || 0,
      render: (c) => <AppText variant="sm" color={colors.text.secondary}>{c.sent_count || 0}</AppText>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 90,
      render: (c) => (
        <View style={[styles.statusBadge, { backgroundColor: (c.is_active ?? true) ? '#ECFDF5' : colors.surface.app }]}>
          <AppText variant="sm" weight="bold" color={(c.is_active ?? true) ? colors.status.success : colors.text.muted}>
            {(c.is_active ?? true) ? 'Bật' : 'Tắt'}
          </AppText>
        </View>
      ),
    },
  ];

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="bullhorn" size={20} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>{selected.name}</AppText>
          <View style={[styles.statusBadge, { backgroundColor: (selected.is_active ?? true) ? '#ECFDF5' : colors.surface.app }]}>
            <AppText variant="sm" weight="bold" color={(selected.is_active ?? true) ? colors.status.success : colors.text.muted}>
              {(selected.is_active ?? true) ? 'Đang chạy' : 'Đã dừng'}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <AppText variant="sm" color={colors.text.secondary}>Kênh phát: <AppText variant="sm" weight="bold" color={colors.text.primary}>{(selected.type || 'email').toUpperCase()}</AppText></AppText>
          <AppText variant="sm" color={colors.text.secondary}>Số người nhận: <AppText variant="sm" weight="bold" color={colors.brand.primary}>{selected.sent_count || 0} lượt</AppText></AppText>
          {selected.content ? <AppText variant="sm" color={colors.text.secondary}>Nội dung: {selected.content}</AppText> : null}
        </View>

        <View style={styles.panelDivider} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => handleSend(selected)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary, flex: 1 }]}>
            <Icon name="send" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Phát chiến dịch</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: colors.surface.app }]}>
            <Icon name="pencil" size={14} color={colors.text.primary} />
            <AppText variant="sm" color={colors.text.primary}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(selected.id, selected.name)} style={[styles.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete" size={14} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMobileCampaignCard = ({ item: c }: { item: CampaignEx }) => (
    <View style={styles.itemMobile}>
      <TouchableOpacity style={styles.cardHeaderRow} onPress={() => setSelected(c)} activeOpacity={0.8}>
        <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Icon name="bullhorn" size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" weight="bold" color="#050505">{c.name}</AppText>
            <View style={[styles.statusBadge, { backgroundColor: (c.is_active ?? true) ? '#ECFDF5' : colors.surface.app }]}>
              <AppText variant="sm" weight="bold" color={(c.is_active ?? true) ? colors.status.success : colors.text.muted}>
                {(c.is_active ?? true) ? 'Bật' : 'Tắt'}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <AppText variant="sm" color="#65676B">Kênh: {(c.type || 'email').toUpperCase()}</AppText>
            <AppText variant="sm" color="#65676B">· {c.sent_count || 0} đã gửi</AppText>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnPrimary} onPress={() => handleSend(c)}>
          <Icon name="send" size={14} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Gửi tin</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => openEdit(c)}>
          <Icon name="pencil" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Sửa</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnDanger} onPress={() => handleDelete(c.id, c.name)}>
          <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
          <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{stats.total} chiến dịch</AppText>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo chiến dịch</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="bullhorn" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{stats.total}</AppText>
            <AppText variant="sm" color="#65676B">Tổng chiến dịch</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-circle" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color="#65676B">Đang chạy</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="send" size={18} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{stats.sent}</AppText>
            <AppText variant="sm" color="#65676B">Đã phát</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<CampaignEx>
              columns={columns}
              data={campaigns}
              getRowId={(c) => c.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRowPress={setSelected}
              selectedRowId={selected?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="bullhorn"
              emptyTitle="Chưa có chiến dịch"
              emptySubtitle="Tạo chiến dịch marketing đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>
            {selected ? renderPanel() : (
              <View style={[styles.panelBox, { alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 8 }]}>
                <Icon name="hand-pointing-up" size={32} color={colors.icon.muted} />
                <AppText variant="sm" color={colors.text.muted}>Chọn một chiến dịch để xem chi tiết</AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          renderItem={renderMobileCampaignCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="bullhorn"
                title="Chưa có chiến dịch"
                subtitle="Tạo chiến dịch marketing đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Tạo mới'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên chiến dịch *</AppText>
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Tri ân khách hàng tháng 7" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Kênh gửi</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['email', 'sms', 'push'].map(t => (
              <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))}
                style={[styles.typeChip, form.type === t && styles.typeChipActive]}>
                <AppText variant="sm" color={form.type === t ? colors.brand.primary : colors.text.secondary} weight={form.type === t ? 'bold' : 'normal'}>{t.toUpperCase()}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Nội dung thông điệp</AppText>
          <TextInput value={form.content} onChangeText={v => setForm(p => ({ ...p, content: v }))} style={[styles.fieldInput, { minHeight: 70 }]} multiline placeholder="Nhập nội dung tin nhắn gửi khách hàng..." placeholderTextColor={colors.text.muted} />
          
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={24} color={form.is_active ? colors.status.success : colors.icon.muted} />
            <AppText variant="sm" color={colors.text.primary}>{form.is_active ? 'Kích hoạt' : 'Tạm dừng'}</AppText>
          </TouchableOpacity>
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 520,
  },
  fbMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fbMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
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
  panelBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
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

  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light, marginVertical: 4 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, paddingHorizontal: 12 },
  typeChip: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  typeChipActive: { backgroundColor: colors.brand.primaryBg },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});