import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, User } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
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
  { key: 'admin',      label: 'Admin',    color: '#8B5CF6', bg: '#F5F3FF', icon: 'admin-panel-settings' },
  { key: 'manager',    label: 'Quản lý',  color: '#EF4444', bg: '#FEF2F2', icon: 'manage-accounts' },
  { key: 'cashier',    label: 'Thu ngân', color: '#F97316', bg: '#FFF7ED', icon: 'cash-register' },
  { key: 'accountant', label: 'Kế toán',  color: '#10B981', bg: '#ECFDF5', icon: 'calculate' },
  { key: 'kitchen',    label: 'Bếp',      color: '#F59E0B', bg: '#FEF3C7', icon: 'restaurant' },
];

function getRoleConfig(role: string) {
  return ROLES.find(r => r.key === role) ?? { key: role, label: role, color: colors.text.muted, bg: colors.surface.avatar, icon: 'person' };
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
        <Icon name="account-group" size={18} color={colors.brand.primary} />
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
            <Text style={[styles.panelPct, { color: colors.text.muted }]}>{active}/{count} active</Text>
          </View>
        );
      })}
      <View style={styles.panelDivider} />
      <View style={styles.panelFooter}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={[styles.statusDotSmall, { backgroundColor: colors.status.success }]} />
            <Text style={styles.panelFooterText}>{users.filter(u => u.is_active).length} hoạt động</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={[styles.statusDotSmall, { backgroundColor: colors.status.danger }]} />
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
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
          <Text style={styles.panelHeaderText}>{editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          <UserFormContent
            form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
            editingId={editingId} showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <Text style={{ ...font.button, color: colors.text.secondary }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
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
          <View style={[styles.activePill, { backgroundColor: item.is_active ? colors.status.successBg : '#FEF2F2' }]}>
            <View style={[styles.activeDot, { backgroundColor: item.is_active ? colors.status.success : colors.status.danger }]} />
            <Text style={[styles.activeText, { color: item.is_active ? colors.status.success : colors.status.danger }]}>
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
        <ActivityIndicator size="large" color={colors.brand.primary} />
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
    <SafeAreaView style={styles.container}>
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
        <View style={{ flex: 1, flexDirection: 'row', paddingVertical: 12 }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={styles.separator} />
          <View style={{ flex: 0.45, backgroundColor: colors.surface.app }}>
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
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '700', color: colors.text.inverse },

  /* Right panel */
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelStatLabel: { ...font.caption, color: colors.text.muted },
  panelStatValue: { ...font.h2, fontWeight: '900', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelDot: { width: 8, height: 8, borderRadius: 4 },
  panelLabel: { ...font.caption, color: colors.text.muted },
  panelCount: { ...font.bodySmall, fontWeight: '700', marginTop: 1 },
  panelPct: { ...font.micro },
  panelFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  panelFooterText: { ...font.micro, color: colors.text.muted },
  panelCta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingHorizontal: 12, paddingVertical: 7, minHeight: 32 },
  panelCtaText: { ...font.buttonSmall, color: colors.text.inverse },

  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },

  /* List */
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...font.bodySmall, color: colors.text.muted },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 16, marginBottom: 6,
    paddingLeft: 10, borderLeftWidth: 3,
  },
  sectionTitle: { ...font.caption, color: colors.text.secondary },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.radius.sm },
  sectionCountText: { ...font.badge, fontWeight: '700' },

  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface.card, marginHorizontal: 12, marginBottom: 6,
    borderRadius: shape.radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border.light,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: { width: 44, height: 44, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text.inverse, ...font.h3 },
  userName: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },
  userMeta: { ...font.caption, color: colors.text.secondary, marginTop: 1 },
  userRight: { alignItems: 'flex-end', gap: 5 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: shape.radius.full },
  roleText: { ...font.badge, fontWeight: '700' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: shape.radius.full },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { ...font.badge, fontWeight: '600' },

  separator: { width: 1, backgroundColor: colors.border.light },
});
