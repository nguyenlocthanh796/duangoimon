import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Campaign } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';

const API = '/api/v1/quan-ly';

// Override Campaign with runtime fields not in the type
interface CampaignEx extends Campaign {
  content?: string;
  open_count?: number;
  click_count?: number;
}

export default function MarketingScreen() {
  const { openSidebar } = useSidebar();
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
    if (!form.name) { Alert.alert('Lỗi', 'Tên chiến dịch bắt buộc'); return; }
    try {
      const body = { name: form.name, type: form.type, content: form.content, is_active: form.is_active };
      if (editing) await request(`${API}/campaigns/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/campaigns`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.is_active).length,
    sent: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
  };

  const columns: Column<CampaignEx>[] = [
    {
      key: 'name',
      title: 'Chiến dịch',
      flex: 1,
      sortable: true,
      sortValue: (c) => c.name || '',
      render: (c) => (
        <View style={{ flex: 1 }}>
          <Text style={styles.cellPrimary} numberOfLines={1}>{c.name}</Text>
          <Text style={{ ...font.sm, color: '#737373' }}>{c.type}</Text>
        </View>
      ),
    },
    {
      key: 'sent_count',
      title: 'Đã gửi',
      width: 75,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.sent_count || 0,
      render: (c) => <Text style={styles.cellNumber}>{c.sent_count || 0}</Text>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 75,
      align: 'center',
      sortable: true,
      sortValue: (c) => c.is_active ? 1 : 0,
      render: (c) => (
        <View style={[styles.chipSmall, { backgroundColor: c.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
          <Text style={{ ...font.sm, fontWeight: '600', color: c.is_active ? '#2E7D32' : '#C62828' }}>{c.is_active ? 'ON' : 'OFF'}</Text>
        </View>
      ),
    },
  ];

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}><Icon name="bullhorn" size={18} color={'#F97316'} /><Text style={styles.panelHeaderText}>{selected.name}</Text></View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ alignItems: 'center', flex: 1 }}><Text style={styles.panelStatValue}>{selected.sent_count || 0}</Text><Text style={styles.panelStatLabel}>Đã gửi</Text></View>
          <View style={styles.panelDividerV} />
          <View style={{ alignItems: 'center', flex: 1 }}><Text style={styles.panelStatValue}>{selected.open_count || 0}</Text><Text style={styles.panelStatLabel}>Đã mở</Text></View>
          <View style={styles.panelDividerV} />
          <View style={{ alignItems: 'center', flex: 1 }}><Text style={styles.panelStatValue}>{selected.click_count || 0}</Text><Text style={styles.panelStatLabel}>Click</Text></View>
        </View>
        <View style={styles.panelDivider} />
        <Text style={{ ...font.sm, fontWeight: '600', color: '#171717', marginBottom: 4 }}>Nội dung</Text>
        <Text style={{ ...font.sm, color: '#404040' }} numberOfLines={4}>{selected.content || '—'}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: '#F97316' }]}><Icon name="pencil" size={14} color="#fff" /><Text style={styles.panelBtnText}>Sửa</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Marketing" subtitle={`${stats.active} đang chạy`}
        onMenuPress={openSidebar} compact
        right={<TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="bullhorn" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Chiến dịch</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="check-circle" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.active}</Text>
          </View>
          <Text style={styles.statLabel}>Đang chạy</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="send" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.sent}</Text>
          </View>
          <Text style={styles.statLabel}>Đã gửi</Text>
        </View>
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
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
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
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
      )}
      <FormModal visible={showForm} title={editing ? 'Sửa chiến dịch' : 'Chiến dịch mới'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Tạo'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Khuyến mãi tháng 7" />
          <Text style={styles.fieldLabel}>Loại</Text>
          <View style={{ flexDirection: 'row', gap: 8}}>
            {['email', 'sms', 'push'].map(t => (
              <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))}
                style={[styles.typeChip, form.type === t && styles.typeChipActive]}>
                <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Nội dung</Text>
          <TextInput value={form.content} onChangeText={v => setForm(p => ({ ...p, content: v }))} style={[styles.fieldInput, { minHeight: 80 }]} multiline placeholder="Nội dung chiến dịch" />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? '#16A34A' : '#737373'} />
            <Text style={{ ...font.sm, color: '#171717' }}>{form.is_active ? 'Kích hoạt' : 'Tạm dừng'}</Text>
          </TouchableOpacity>
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.mdBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.sm, color: '#737373', lineHeight: 12 },
  cellPrimary: { ...font.sm, fontWeight: '600', color: '#171717' },
  cellNumber: { ...font.sm, color: '#171717', textAlign: 'right' },
  chipSmall: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'center' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelDividerV: { width: 1, backgroundColor: '#F0F0F0' },
  panelStatLabel: { ...font.sm, color: '#737373', marginTop: 2 },
  panelStatValue: { ...font.lg, fontWeight: '600', color: '#171717' },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8},
  panelBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },
  fieldLabel: { ...font.smBold, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.md, color: '#171717', backgroundColor: '#FAFAFA' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F5F5F5' },
  typeChipActive: { backgroundColor: '#F97316' },
  typeChipText: { ...font.smBold, fontWeight: '600', color: '#737373' },
  typeChipTextActive: { color: colors.text.inverse },
});