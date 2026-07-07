import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, User } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
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
  { key: 'manager',   label: 'Quản lý',  color: '#EF4444', bg: '#FEF2F2', icon: 'manage-accounts' },
  { key: 'cashier',   label: 'Thu ngân', color: '#F97316', bg: '#FFF7ED', icon: 'cash-register' },
  { key: 'accountant',label: 'Kế toán',  color: '#10B981', bg: '#ECFDF5', icon: 'calculate' },
  { key: 'kitchen',   label: 'Bếp',      color: '#F59E0B', bg: '#FEF3C7', icon: 'restaurant' },
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

// Deterministic avatar color from username
const AVATAR_COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B'];
function avatarColor(username: string) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = username.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function UsersScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: '', full_name: u.full_name ?? '', role: u.role, is_active: u.is_active });
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) { Alert.alert('Lỗi', 'Tài khoản không được để trống'); return; }
    if (!editingId && !form.password.trim()) { Alert.alert('Lỗi', 'Mật khẩu bắt buộc khi thêm mới'); return; }

    const payload: any = {
      username: form.username,
      full_name: form.full_name,
      role: form.role,
      is_active: form.is_active,
    };
    if (!editingId || form.password.trim()) payload.password = form.password;

    setSaving(true);
    try {
      if (editingId) {
        await api.updateUser(editingId, payload);
      } else {
        await api.createUser(payload);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  // Group users by role
  const sections = ROLES.map(r => ({
    role: r,
    data: users.filter(u => u.role === r.key),
  })).filter(s => s.data.length > 0);

  const renderUser = ({ item }: { item: User }) => {
    const rc = getRoleConfig(item.role);
    const initials = getInitials(item.full_name, item.username);
    const color = avatarColor(item.username);

    return (
      <TouchableOpacity style={styles.userItem} onPress={() => openEdit(item)} activeOpacity={0.8}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initials}</Text>
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
          <View style={[styles.activePill, { backgroundColor: item.is_active ? colors.status.successBg : colors.status.dangerBg }]}>
            <View style={[styles.activeDot, { backgroundColor: item.is_active ? colors.status.success : colors.text.danger }]} />
            <Text style={[styles.activeText, { color: item.is_active ? colors.status.success : colors.text.danger }]}>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Nhân viên"
        subtitle={`${users.length} người`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={{ ...font.bodySmall, color: colors.text.secondary, marginTop: 8 }}>Đang tải...</Text>
        </View>
      ) : users.length === 0 ? (
        <EmptyState
          icon="account-group"
          title="Chưa có nhân viên"
          subtitle="Nhấn + để thêm người đầu tiên"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={u => u.id}
          renderItem={renderUser}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      <FAB onPress={openAdd} />

      {/* Modal */}
      <FormModal
        visible={showForm}
        title={editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}
        subtitle={editingId ? form.full_name || form.username : 'Điền thông tin bên dưới'}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm nhân viên'}
        saving={saving}
      >
        <UserFormContent
          form={form}
          onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
          editingId={editingId}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      </FormModal>
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },



  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 16, marginBottom: 6,
    paddingLeft: 10, borderLeftWidth: 3,
  },
  sectionTitle: { ...font.label, color: colors.text.secondary },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  sectionCountText: { ...font.badge, fontWeight: '700' },

  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface.card, marginHorizontal: 12, marginBottom: 6,
    borderRadius: 4, padding: 14, ...CARD_SHADOW,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.text.inverse, ...font.h3 },
  userName: { ...font.body, fontWeight: '700', color: colors.text.primary },
  userMeta: { ...font.bodySmall, color: colors.text.secondary, marginTop: 1 },
  userRight: { alignItems: 'flex-end', gap: 5 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  roleText: { ...font.badge, fontWeight: '700' },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { ...font.badge, fontWeight: '600' },
});
