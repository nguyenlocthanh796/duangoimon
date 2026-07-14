import { useCallback, useEffect, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, User } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import UserFormContent from '../../lib/components/quan-ly/users/UserFormContent';

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
  { key: 'manager',    label: 'Quản lý',  color: '#EF4444', bg: '#DC2626', icon: 'account-tie' },
  { key: 'cashier',    label: 'Thu ngân', color: '#F97316', bg: '#F97316', icon: 'cash-register' },
  { key: 'accountant', label: 'Kế toán',  color: '#10B981', bg: '#ECFDF5', icon: 'calculator-variant' },
  { key: 'kitchen',    label: 'Bếp',      color: '#F59E0B', bg: '#FEF3C7', icon: 'silverware-fork-knife' },
];

function getRoleConfig(role: string) {
  return ROLES.find(r => r.key === role) ?? { key: role, label: role, color: '#737373', bg: '#F1F5F9', icon: 'person' };
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
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); const d = await api.getUsers(); setUsers(d); }
    catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể tải nhân viên'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowPassword(false); setShowForm(true); setSelectedUser(null); };
  const openEdit = (u: User) => { setEditingId(u.id); setForm({ username: u.username, password: '', full_name: u.full_name ?? '', role: u.role, is_active: u.is_active }); setShowPassword(false); setShowForm(true); setSelectedUser(u); };

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

  // ── Stats Panel (iPad right) ──
  const renderStatsPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="account-group" size={18} color={'#F97316'} />
        <Text style={styles.panelHeaderText}>Nhân sự</Text>
      </View>
      <View style={styles.panelStatRow}>
        <Text style={styles.panelStatLabel}>Tổng nhân viên</Text>
        <Text style={styles.panelStatValue}>{users.length}</Text>
      </View>
      <View style={styles.panelDivider} />
      {ROLES.filter(r => { const c = users.filter(u => u.role === r.key).length; return c > 0; }).map(r => {
        const count = users.filter(u => u.role === r.key).length;
        const active = users.filter(u => u.role === r.key && u.is_active).length;
        return (
          <View key={r.key} style={styles.panelRow}>
            <View style={[styles.panelDot, { backgroundColor: r.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.panelLabel}>{r.label}</Text>
              <Text style={[styles.panelCount, { color: r.color }]}>{count} người</Text>
            </View>
            <Text style={[styles.panelPct, { color: '#737373' }]}>{active}/{count} active</Text>
          </View>
        );
      })}
      <View style={styles.panelDivider} />
      <View style={styles.panelFooter}>
        <View style={{ flexDirection: 'row', gap: 12}}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <View style={[styles.statusDotSmall, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.panelFooterText}>{users.filter(u => u.is_active).length} hoạt động</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <View style={[styles.statusDotSmall, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.panelFooterText}>{users.filter(u => !u.is_active).length} khóa</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
          <Icon name="plus" size={14} color="#fff" />
          <Text style={styles.panelCtaText}>Thêm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInlineForm = () => {
    return (
      <View style={[styles.panelBox, { flex: 1, marginHorizontal: 12 }]}>
        <View style={styles.panelHeader}>
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={'#F97316'} />
          <Text style={styles.panelHeaderText}>{editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          <UserFormContent
            form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
            editingId={editingId} showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <Text style={{ ...font.button, color: '#404040' }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, minHeight: 44, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12}}
            onPress={handleSave}
            disabled={saving}
          >
            {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
            <Text style={{ ...font.button, color: colors.text.inverse }}>{editingId ? 'Cập nhật' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── User row ──
  const renderUser = ({ item }: { item: User }) => {
    const rc = getRoleConfig(item.role);
    return (
      <TouchableOpacity style={styles.userItem} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(item.username) }]}>
          <Text style={styles.avatarText}>{getInitials(item.full_name, item.username)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.full_name || item.username}</Text>
          <Text style={styles.userMeta}>@{item.username}</Text>
        </View>
        <View style={styles.userRight}>
          <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
            <Icon name={rc.icon as any} size={11} color={rc.color} />
            <Text style={[styles.roleText, { color: rc.color }]}>{rc.label}</Text>
          </View>
          <View style={[styles.activePill, { backgroundColor: item.is_active ? '#16A34A' : '#DC2626' }]}>
            <View style={[styles.activeDot, { backgroundColor: item.is_active ? '#16A34A' : '#DC2626' }]} />
            <Text style={[styles.activeText, { color: item.is_active ? '#16A34A' : '#DC2626' }]}>
              {item.is_active ? 'Hoạt động' : 'Khóa'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { role: typeof ROLES[0]; data: User[] } }) => (
    <View style={[styles.sectionHeader, { borderLeftColor: section.role.color }]}>
      <Icon name={section.role.icon as any} size={16} color={section.role.color} />
      <Text style={[styles.sectionTitle, { color: section.role.color }]}>{section.role.label}</Text>
      <View style={[styles.sectionCount, { backgroundColor: section.role.bg }]}>
        <Text style={[styles.sectionCountText, { color: section.role.color }]}>{section.data.length}</Text>
      </View>
    </View>
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.loadingBox}>
        <TableSkeleton rowCount={5} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
    if (users.length === 0) return <EmptyState icon="account-group" title="Chưa có nhân viên" subtitle="Nhấn + để thêm người đầu tiên" />;
    return (
      <SectionList
        sections={sections}
        keyExtractor={u => u.id}
        renderItem={renderUser}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={{ paddingBottom: isWide ? 16 : 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Nhân viên"
        subtitle={`${users.length} người`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        right={isWide ? (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        )}
      />
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingVertical: 16}}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={styles.separator} />
          <View style={{ flex: 0.45, backgroundColor: '#FAFAFA' }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : (
        renderList()
      )}
      {!isWide && <FAB onPress={openAdd} />}
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
    </ScreenContainer>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 38, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },

  /* Right panel */
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12, boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelStatLabel: { ...font.caption, color: '#737373' },
  panelStatValue: { ...font.sectionTitle, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  panelDot: { width: 8, height: 8, borderRadius: 12 },
  panelLabel: { ...font.caption, color: '#737373' },
  panelCount: { ...font.bodySmall, fontWeight: '600', marginTop: 1 },
  panelPct: { ...font.micro },
  panelFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  panelFooterText: { ...font.micro, color: '#737373' },
  panelCta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, minHeight: 32 },
  panelCtaText: { ...font.buttonSmall, color: colors.text.inverse },

  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },

  /* List */
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...font.bodySmall, color: '#737373' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginHorizontal: 12, marginTop: 16, marginBottom: 6,
    paddingLeft: 10, borderLeftWidth: 3,
  },
  sectionTitle: { ...font.caption, color: '#404040' },
  sectionCount: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 4},
  sectionCountText: { ...font.badge, fontWeight: '600' },

  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 6,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3,
  },
  avatar: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text.inverse, ...font.sectionTitle },
  userName: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  userMeta: { ...font.caption, color: '#404040', marginTop: 1 },
  userRight: { alignItems: 'flex-end', gap: 5 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999},
  roleText: { ...font.badge, fontWeight: '600' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999},
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { ...font.badge, fontWeight: '600' },

  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

