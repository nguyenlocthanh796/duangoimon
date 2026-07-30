import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, SectionList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, User } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, ss } from '../../lib/theme';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import UserFormContent from '../../lib/components/quan-ly/users/UserFormContent';
import AppText from '../../lib/components/ui/AppText';
import StatusBadge from '../../lib/components/ui/StatusBadge';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';

type FormState = { username: string; password: string; full_name: string; role: string; is_active: boolean };
const EMPTY_FORM: FormState = { username: '', password: '', full_name: '', role: 'cashier', is_active: true };
const ROLES = [
  { key: 'admin', label: 'Admin', color: '#8B5CF6', bg: '#F5F3FF', icon: 'shield-account' },
  { key: 'manager', label: 'Quản lý', color: '#EF4444', bg: '#FEF2F2', icon: 'account-tie' },
  { key: 'cashier', label: 'Thu ngân', color: '#F97316', bg: '#FFF7ED', icon: 'cash-register' },
  { key: 'accountant', label: 'Kế toán', color: '#10B981', bg: '#ECFDF5', icon: 'calculator-variant' },
  { key: 'kitchen', label: 'Bếp', color: '#D97706', bg: '#FEF3C7', icon: 'silverware-fork-knife' },
];
function getRoleConfig(role: string) { return ROLES.find(r => r.key === role) ?? { key: role, label: role, color: colors.text.muted, bg: colors.surface.app, icon: 'person' }; }
function getInitials(name: string | null, username: string): string {
  const str = name || username; const parts = str.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : str.slice(0, 2).toUpperCase();
}
const AVATAR_COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B'];
function avatarColor(username: string) {
  let h = 0; for (let i = 0; i < username.length; i++) h = username.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function UsersScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedId), [users, selectedId]);

  const load = useCallback(async () => {
    try { setLoading(true); const d = await api.getUsers(); setUsers(Array.isArray(d) ? d : []); }
    catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể tải nhân viên'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowPassword(false); setShowForm(true); };
  const openEdit = (u: User) => { setEditingId(u.id); setForm({ username: u.username, password: '', full_name: u.full_name ?? '', role: u.role, is_active: u.is_active }); setShowPassword(false); setShowForm(true); };

  const toggleUserActive = async (u: User) => {
    try { await api.updateUser(u.id, { is_active: !u.is_active }); load(); }
    catch { Alert.alert('Lỗi', 'Không thể đổi trạng thái'); }
  };

  const handleSave = async () => {
    if (!form.username.trim()) { Alert.alert('Lỗi', 'Tài khoản trống'); return; }
    if (!editingId && !form.password.trim()) { Alert.alert('Lỗi', 'Mật khẩu bắt buộc khi thêm mới'); return; }
    const payload: any = { username: form.username, full_name: form.full_name, role: form.role, is_active: form.is_active };
    if (!editingId || form.password.trim()) payload.password = form.password;
    setSaving(true);
    try {
      if (editingId) await api.updateUser(editingId, payload); else await api.createUser(payload);
      setShowForm(false); load();
    } catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể lưu'); }
    finally { setSaving(false); }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u => (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q));
  }, [users, searchQuery]);

  const sections = ROLES.map(r => ({ role: r, data: filteredUsers.filter(u => u.role === r.key) })).filter(s => s.data.length > 0);

  const renderStatsPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}><AppText variant="md" color="#050505">Thống kê nhân sự</AppText></View>
      <View style={s.panelStatRow}><AppText variant="md" color={colors.text.muted}>Tổng nhân viên</AppText><AppText variant="md" color="#050505">{users.length}</AppText></View>
      <View style={s.panelDivider} />
      {ROLES.filter(r => users.some(u => u.role === r.key)).map(r => {
        const count = users.filter(u => u.role === r.key).length;
        const active = users.filter(u => u.role === r.key && u.is_active).length;
        return (<View key={r.key} style={s.panelRow}>
          <View style={[s.panelDot, { backgroundColor: r.color }]} />
          <View style={{ flex: 1 }}><AppText variant="md" color="#050505">{r.label}</AppText><AppText variant="md" color={r.color}>{count} người</AppText></View>
          <AppText variant="md" color={colors.text.muted}>{active}/{count} hoạt động</AppText>
        </View>);
      })}
      <View style={s.panelDivider} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={[s.statusDot, { backgroundColor: colors.status.success }]} /><AppText variant="md" color={colors.text.muted}>{users.filter(u => u.is_active).length} hoạt động</AppText></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={[s.statusDot, { backgroundColor: colors.status.danger }]} /><AppText variant="md" color={colors.text.muted}>{users.filter(u => !u.is_active).length} khóa</AppText></View>
        </View>
        <TouchableOpacity style={ss.panelCta} onPress={openAdd}><Icon name="plus" size={14} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Thêm</AppText></TouchableOpacity>
      </View>
    </View>
  );

  const renderUser = ({ item }: { item: User }) => {
    const rc = getRoleConfig(item.role);
    return (
      <View style={ss.listRow} key={item.id}>
        <View style={[s.avatarMini, { backgroundColor: avatarColor(item.username) }]}><AppText variant="md" color="#FFF">{getInitials(item.full_name, item.username)}</AppText></View>
        <TouchableOpacity style={{ flex: 1, paddingRight: 8 }} onPress={() => setSelectedId(item.id)} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" color="#0F172A" numberOfLines={1}>{item.full_name || item.username}</AppText>
            <View style={{ backgroundColor: rc.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}><AppText variant="md" color={rc.color}>{rc.label}</AppText></View>
          </View>
          <AppText variant="md" color="#64748B">@{item.username}</AppText>
        </TouchableOpacity>
        <StatusBadge label={item.is_active ? 'Hoạt động' : 'Khóa'} severity={item.is_active ? 'success' : 'danger'} />
        <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedId(item.id)}><Icon name="eye-outline" size={16} color={colors.brand.primary} /></TouchableOpacity>
      </View>
    );
  };

  const content = () => {
    if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><TableSkeleton rowCount={5} /></View>;
    if (users.length === 0) return <EmptyState icon="account-group" title="Chưa có nhân viên" subtitle="Nhấn + để thêm" />;

    const mobileList = (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
        {sections.map(sec => (
          <View style={ss.sectionWrap} key={sec.role.key}>
            <View style={ss.sectionHeader}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sec.role.color, marginRight: 6 }} />
              <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>{sec.role.label.toUpperCase()} ({sec.data.length})</AppText>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>{sec.data.map(item => renderUser({ item }))}</View>
          </View>
        ))}
      </ScrollView>
    );

    if (!isWide) return mobileList;

    return (
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
        <View style={{ flex: 0.55 }}>
          <SectionList sections={sections} keyExtractor={u => u.id} renderItem={renderUser}
            renderSectionHeader={({ section }) => (
              <View style={s.sectionHdr}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: section.role.color }} />
                <AppText variant="md" color="#050505">{section.role.label}</AppText>
                <View style={s.badgeCount}><AppText variant="md" color={section.role.color}>{section.data.length}</AppText></View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} />
        </View>
        <View style={{ flex: 0.45 }}>
          {showForm ? (
            <View style={s.panelBox}>
              <View style={s.panelHeader}><Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} /><AppText variant="md" color="#050505">{editingId ? 'Sửa NV' : 'Thêm NV'}</AppText></View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <UserFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} editingId={editingId} showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowForm(false)}><AppText variant="md" color={colors.text.secondary}>Hủy</AppText></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1.5, height: 44, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }} onPress={handleSave} disabled={saving}>{saving && <ActivityIndicator size="small" color={colors.text.inverse} />}<AppText variant="md" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText></TouchableOpacity>
              </View>
            </View>
          ) : renderStatsPanel()}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {!isWide && (() => {
        const [search, setSearch] = React.useState('');
        return (
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}><Icon name="magnify" size={20} color="#64748B" /><TextInput value={search} onChangeText={setSearchQuery} onChange={undefined} placeholder="Tìm tên, username..." placeholderTextColor="#94A3B8" style={ss.searchTextInput} /></View>
            <TouchableOpacity style={ss.addBtn} onPress={openAdd}><Icon name="plus" size={16} color="#FFF" /><AppText variant="md" color="#FFF">Thêm NV</AppText></TouchableOpacity>
          </View>
        );
      })()}

      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: '#FEF3C7' }]}><Icon name="account-group-outline" size={14} color="#D97706" /></View><View><AppText variant="md" color="#0F172A">{users.length}</AppText><AppText variant="md" color="#64748B">Tổng NV</AppText></View></View>
          <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}><Icon name="check-circle-outline" size={14} color={colors.status.success} /></View><View><AppText variant="md" color={colors.status.success}>{users.filter(u => u.is_active !== false).length}</AppText><AppText variant="md" color="#64748B">Hoạt động</AppText></View></View>
        </View>
      )}

      {isWide ? content() : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {sections.map(sec => (
            <View style={ss.sectionWrap} key={sec.role.key}>
              <View style={ss.sectionHeader}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sec.role.color, marginRight: 6 }} />
                <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>{sec.role.label.toUpperCase()} ({sec.data.length})</AppText>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>{sec.data.map(item => renderUser({ item }))}</View>
            </View>
          ))}
        </ScrollView>
      )}

      <FormModal visible={showForm} title={editingId ? 'Sửa nhân viên' : 'Thêm nhân viên'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editingId ? 'Cập nhật' : 'Thêm'} saving={saving}>
        <UserFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} editingId={editingId} showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />
      </FormModal>

      {!isWide && (
        <DetailModal visible={!!selectedUser} title={selectedUser?.full_name || selectedUser?.username || ''}
          subtitle={selectedUser ? `@${selectedUser.username} · ${getRoleConfig(selectedUser.role).label}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedUser ? () => { const u = selectedUser; setSelectedId(null); openEdit(u); } : undefined}
          actions={selectedUser ? [{ label: selectedUser.is_active ? 'Khóa' : 'Mở khóa', icon: selectedUser.is_active ? 'lock-outline' : 'lock-open-variant-outline', variant: selectedUser.is_active ? 'danger' : 'primary', onPress: async () => { try { await toggleUserActive(selectedUser); setSelectedId(null); } catch { Alert.alert('Lỗi', 'Đổi trạng thái thất bại'); } } }] : []}>
          {selectedUser && (() => {
            const rc = getRoleConfig(selectedUser.role);
            return (<View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Username</AppText><AppText variant="md" color="#0F172A">@{selectedUser.username}</AppText></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Họ tên</AppText><AppText variant="md" color="#0F172A">{selectedUser.full_name || '—'}</AppText></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Vai trò</AppText><View style={{ backgroundColor: rc.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><AppText variant="md" color={rc.color}>{rc.label}</AppText></View></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Trạng thái</AppText><StatusBadge label={selectedUser.is_active ? 'Hoạt động' : 'Khóa'} severity={selectedUser.is_active ? 'success' : 'danger'} /></View>
            </View>);
          })()}
        </DetailModal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelDot: { width: 8, height: 8, borderRadius: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  avatarMini: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 6 },
  badgeCount: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
