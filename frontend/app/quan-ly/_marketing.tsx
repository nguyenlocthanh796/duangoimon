import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Campaign } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

interface CampaignEx extends Campaign {
  content?: string;
  open_count?: number;
  click_count?: number;
}

export default function MarketingScreen() {
  const { isWide } = useResponsive();
  const [campaigns, setCampaigns] = useState<CampaignEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CampaignEx | null>(null);
  const [selected, setSelected] = useState<CampaignEx | null>(null);
  const [form, setForm] = useState({ name: '', type: 'email', content: '', is_active: true });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/campaigns`); setCampaigns(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: '', type: 'email', content: '', is_active: true }); setShowForm(true); };
  const openEdit = (c: CampaignEx) => { setEditing(c); setForm({ name: c.name, type: c.type, content: c.content || '', is_active: c.is_active ?? true }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên chiến dịch là bắt buộc'); return; }
    try {
      const body = { name: form.name, type: form.type, content: form.content, is_active: form.is_active };
      if (editing) await request(`${API}/campaigns/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/campaigns`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu chiến dịch'); }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.is_active).length,
    sent: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
  };

  const columns: Column<CampaignEx>[] = [
    {
      key: 'name',
      title: 'Tên chiến dịch',
      flex: 1,
      sortable: true,
      sortValue: (c) => c.name || '',
      render: (c) => (
        <View style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{c.name}</AppText>
          <AppText variant="sm" color={colors.text.muted}>{c.type.toUpperCase()}</AppText>
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
      render: (c) => <AppText variant="sm" weight="bold" color={colors.text.primary}>{c.sent_count || 0}</AppText>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 80,
      align: 'center',
      sortable: true,
      sortValue: (c) => c.is_active ? 1 : 0,
      render: (c) => (
        <View style={[styles.chipSmall, { backgroundColor: c.is_active ? colors.brand.primaryBg : colors.surface.app }]}>
          <AppText variant="sm" weight="bold" color={c.is_active ? colors.status.success : colors.text.muted}>{c.is_active ? 'ON' : 'OFF'}</AppText>
        </View>
      ),
    },
  ];

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="bullhorn" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>{selected.name}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.text.primary}>{selected.sent_count || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã gửi</AppText>
          </View>
          <View style={styles.panelDividerV} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{selected.open_count || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã mở</AppText>
          </View>
          <View style={styles.panelDividerV} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{selected.click_count || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Lượt click</AppText>
          </View>
        </View>
        <View style={styles.panelDivider} />
        <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Nội dung thông điệp</AppText>
        <AppText variant="sm" color={colors.text.secondary} numberOfLines={4}>{selected.content || '—'}</AppText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa chiến dịch</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="bullhorn" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Chiến dịch</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="check-circle" size={16} color={colors.status.success} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đang chạy</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="send" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.sent}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã gửi</AppText>
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
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  statItem: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  chipSmall: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: shape.radius.sm },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
  typeChip: { flex: 1, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  typeChipActive: { backgroundColor: colors.brand.primaryBg },
});