import React, { useCallback, useEffect, useState } from 'react';
import {
  View, SectionList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, User } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import UserFormContent from '../../lib/components/quan-ly/users/UserFormContent';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';

type FormState = {
  username: string;
  password: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  username: '',
  password: '',
  full_name: '',
  role: 'cashier',
  is_active: true,
};

const ROLES: Array<{ key: string; label: string; color: string; bg: string; icon: string }> = [
  { key: 'admin',      label: 'Admin',    color: '#8B5CF6', bg: '#F5F3FF', icon: 'shield-account' },
  { key: 'manager',    label: 'Quản lý',  color: '#EF4444', bg: '#FEF2F2', icon: 'account-tie' },
  { key: 'cashier',    label: 'Thu ngân', color: '#F97316', bg: '#FFF7ED', icon: 'cash-register' },
  { key: 'accountant', label: 'Kế toán',  color: '#10B981', bg: '#ECFDF5', icon: 'calculator-variant' },
  { key: 'kitchen',    label: 'Bếp',      color: '#D97706', bg: '#FEF3C7', icon: 'silverware-fork-knife' },
];

function getRoleConfig(role: string) {
  return ROLES.find(r => r.key === role) ?? { key: role, label: role, color: colors.text.muted, bg: colors.surface.app, icon: 'person' };
}

function getInitials(name: string | null, username: string): string {
  const str = name || username;
  const parts = str.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B'];
function avatarColor(username: string) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = username.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function UsersScreen() {
  const { isWide } = useResponsive();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const d = await api.getUsers(); setUsers(Array.isArray(d) ? d : []); }
    catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể tải nhân viên'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowPassword(false); setShowForm(true); };
  const openEdit = (u: User) => { setEditingId(u.id); setForm({ username: u.username, password: '', full_name: u.full_name ?? '', role: u.role, is_active: u.is_active }); setShowPassword(false); setShowForm(true); };

  const handleSave = async () => {
    if (!form.username.trim()) { Alert.alert('Lỗi', 'Tài khoản không được để trống'); return; }
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

  const sections = ROLES.map(r => ({ role: r, data: users.filter(u => u.role === r.key) })).filter(s => s.data.length > 0);

  const renderStatsPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="account-group" size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê nhân sự</AppText>
      </View>
      <View style={styles.panelStatRow}>
        <AppText variant="sm" color={colors.text.muted}>Tổng nhân viên</AppText>
        <AppText variant="md" weight="bold" color={colors.text.primary}>{users.length}</AppText>
      </View>
      <View style={styles.panelDivider} />
      {ROLES.filter(r => users.some(u => u.role === r.key)).map(r => {
        const count = users.filter(u => u.role === r.key).length;
        const active = users.filter(u => u.role === r.key && u.is_active).length;
        return (
          <View key={r.key} style={styles.panelRow}>
            <View style={[styles.panelDot, { backgroundColor: r.color }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="sm" color={colors.text.primary}>{r.label}</AppText>
              <AppText variant="sm" weight="bold" color={r.color}>{count} người</AppText>
            </View>
            <AppText variant="sm" color={colors.text.muted}>{active}/{count} hoạt động</AppText>
          </View>
        );
      })}
      <View style={styles.panelDivider} />
      <View style={styles.panelFooter}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusDotSmall, { backgroundColor: colors.status.success }]} />
            <AppText variant="sm" color={colors.text.muted}>{users.filter(u => u.is_active).length} hoạt động</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.statusDotSmall, { backgroundColor: colors.status.danger }]} />
            <AppText variant="sm" color={colors.text.muted}>{users.filter(u => !u.is_active).length} khóa</AppText>
          </View>
        </View>
        <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
          <Icon name="plus" size={14} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>{editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 8 }}>
        <UserFormContent
          form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
          editingId={editingId} showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
          <AppText variant="sm" weight="bold" color={colors.text.secondary}>Hủy</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUser = ({ item }: { item: User }) => {
    const rc = getRoleConfig(item.role);
    return (
      <TouchableOpacity style={styles.userItem} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(item.username) }]}>
          <AppText variant="md" weight="bold" color={colors.text.inverse}>{getInitials(item.full_name, item.username)}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>{item.full_name || item.username}</AppText>
          <AppText variant="sm" color={colors.text.muted}>@{item.username}</AppText>
        </View>
        <View style={styles.userRight}>
          <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
            <Icon name={rc.icon as any} size={11} color={rc.color} />
            <AppText variant="sm" weight="bold" color={rc.color}>{rc.label}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={[styles.activeDot, { backgroundColor: item.is_active ? colors.status.success : colors.status.danger }]} />
            <AppText variant="sm" color={item.is_active ? colors.status.success : colors.status.danger}>
              {item.is_active ? 'Hoạt động' : 'Khóa'}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { role: typeof ROLES[0]; data: User[] } }) => (
    <View style={[styles.sectionHeader, { borderLeftColor: section.role.color }]}>
      <Icon name={section.role.icon as any} size={16} color={section.role.color} />
      <AppText variant="sm" weight="bold" color={section.role.color}>{section.role.label}</AppText>
      <View style={[styles.sectionCount, { backgroundColor: section.role.bg }]}>
        <AppText variant="sm" weight="bold" color={section.role.color}>{section.data.length}</AppText>
      </View>
    </View>
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.loadingBox}>
        <TableSkeleton rowCount={5} />
      </View>
    );
    if (users.length === 0) return <EmptyState icon="account-group" title="Chưa có nhân viên" subtitle="Nhấn + để thêm người đầu tiên" />;
    return (
      <SectionList
        sections={sections}
        keyExtractor={u => u.id}
        renderItem={renderUser}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="sm" color={colors.text.muted}>{users.length} nhân viên</AppText>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm nhân viên</AppText>
          </TouchableOpacity>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          {renderList()}
        </View>
      )}
      {!isWide && (
        <FormModal
          visible={showForm}
          title={editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saveLabel={editingId ? 'Cập nhật' : 'Thêm nhân viên'}
          saving={saving}
        >
          <UserFormContent
            form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
            editingId={editingId} showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
        </FormModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.brand.primary },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelDot: { width: 8, height: 8, borderRadius: 4 },
  panelFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  panelCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: 999, paddingHorizontal: 14, height: 34 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  cancelBtn: { flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1.5, height: 40, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4, paddingLeft: 8, borderLeftWidth: 3 },
  sectionCount: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },

  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface.card, marginBottom: 8,
    borderRadius: 16, padding: 12,
  },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userRight: { alignItems: 'flex-end', gap: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
});
