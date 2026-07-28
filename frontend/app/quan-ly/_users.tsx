import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, SectionList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, User } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import UserFormContent from '../../lib/components/quan-ly/users/UserFormContent';
import AppText from '../../lib/components/ui/AppText';
import StatusBadge from '../../lib/components/ui/StatusBadge';
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

export default function UsersScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
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
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch { Alert.alert('Lỗi', 'Không thể đổi trạng thái'); }
  };

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

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const sections = ROLES.map(r => ({ role: r, data: filteredUsers.filter(u => u.role === r.key) })).filter(s => s.data.length > 0);

  const renderStatsPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <AppText variant="md" weight="bold" color="#050505">Thống kê nhân sự</AppText>
      </View>
      <View style={styles.panelStatRow}>
        <AppText variant="sm" color={colors.text.muted}>Tổng nhân viên</AppText>
        <AppText variant="md" weight="bold" color="#050505">{users.length}</AppText>
      </View>
      <View style={styles.panelDivider} />
      {ROLES.filter(r => users.some(u => u.role === r.key)).map(r => {
        const count = users.filter(u => u.role === r.key).length;
        const active = users.filter(u => u.role === r.key && u.is_active).length;
        return (
          <View key={r.key} style={styles.panelRow}>
            <View style={[styles.panelDot, { backgroundColor: r.color }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color="#050505">{r.label}</AppText>
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
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm nhân viên</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">{editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</AppText>
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
          <AppText variant="sm" color={colors.text.secondary}>Hủy</AppText>
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
      <View style={ss.listRow} key={item.id}>
        {/* Flat Avatar with Initials */}
        <View style={[styles.avatarCircleMini, { backgroundColor: avatarColor(item.username) }]}>
          <AppText variant="sm" color="#FFFFFF">
            {getInitials(item.full_name, item.username)}
          </AppText>
        </View>

        {/* User Details */}
        <TouchableOpacity
          style={{ flex: 1, paddingRight: 8 }}
          onPress={() => setSelectedId(item.id)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="sm" color="#0F172A" numberOfLines={1}>
              {item.full_name || item.username}
            </AppText>
            <View style={{ backgroundColor: rc.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
              <AppText variant="sm" color={rc.color} style={{ fontSize: 11 }}>{rc.label}</AppText>
            </View>
          </View>
          <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ marginTop: 2, fontSize: 11 }}>
            @{item.username}
          </AppText>
        </TouchableOpacity>

        {/* Status Chip */}
        <View style={{ marginRight: 6 }}>
          <StatusBadge
            label={item.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
            severity={item.is_active ? 'success' : 'danger'}
          />
        </View>

        {/* Eye Action Btn */}
        <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedId(item.id)}>
          <Icon name="eye-outline" size={16} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { role: typeof ROLES[0]; data: User[] } }) => (
    <View style={styles.flatSectionHeader}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: section.role.color }} />
      <AppText variant="md" weight="bold" color="#050505" style={styles.sectionTitleText}>{section.role.label}</AppText>
      <View style={styles.sectionBadgeCount}>
        <AppText variant="sm" color={section.role.color} style={{ fontSize: 11, lineHeight: 15 }}>{section.data.length}</AppText>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={{ gap: 8 }}>
      {/* Top Mobile Action Bar */}
      {!isWide && (
        <View style={ss.topActionBar}>
          <View style={ss.searchInputWrap}>
            <Icon name="magnify" size={16} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm theo tên, username..."
              placeholderTextColor="#94A3B8"
              style={ss.searchTextInput}
            />
          </View>

          <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Icon name="plus" size={16} color="#FFFFFF" />
            <AppText variant="sm" weight="bold" color="#FFFFFF">
              Thêm nhân viên
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* KPI Cards Strip */}
      <View style={ss.metricContainer}>
        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="account-group-outline" size={14} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#0F172A">{users.length}</AppText>
            <AppText variant="sm" color="#64748B">Tổng nhân sự</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-circle-outline" size={14} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>
              {users.filter(u => u.is_active !== false).length}
            </AppText>
            <AppText variant="sm" color="#64748B">Đang hoạt động</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="shield-account-outline" size={14} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">Phân quyền</AppText>
            <AppText variant="sm" color="#64748B">Hệ thống</AppText>
          </View>
        </View>
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

    if (!isWide) {
      return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {renderHeader()}

          {sections.map((sec) => (
            <View style={ss.sectionWrap} key={sec.role.key}>
              <View style={ss.sectionHeader}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sec.role.color, marginRight: 6 }} />
                <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                  {sec.role.label.toUpperCase()} ({sec.data.length})
                </AppText>
              </View>

              <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                {sec.data.map(item => renderUser({ item }))}
              </View>
            </View>
          ))}
        </ScrollView>
      );
    }

    return (
      <SectionList
        sections={sections}
        keyExtractor={u => u.id}
        renderItem={renderUser}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
            <View style={{ flex: 0.55 }}>{renderList()}</View>
            <View style={{ flex: 0.45 }}>
              {showForm ? renderInlineForm() : renderStatsPanel()}
            </View>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {renderList()}
        </View>
      )}

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

      {/* Mobile Detail Modal at Root level */}
      {!isWide && (
        <DetailModal
          visible={!!selectedUser}
          title={selectedUser?.full_name || selectedUser?.username || ''}
          subtitle={selectedUser ? `@${selectedUser.username} · ${getRoleConfig(selectedUser.role).label}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedUser ? () => { const u = selectedUser; setSelectedId(null); openEdit(u); } : undefined}
          actions={
            selectedUser
              ? [
                  {
                    label: selectedUser.is_active ? 'Khóa tài khoản' : 'Mở khóa',
                    icon: selectedUser.is_active ? 'lock-outline' : 'lock-open-variant-outline',
                    variant: selectedUser.is_active ? 'danger' : 'primary',
                    onPress: async () => {
                      try {
                        await toggleUserActive(selectedUser);
                        setSelectedId(null);
                      } catch {
                        Alert.alert('Lỗi', 'Không thể đổi trạng thái');
                      }
                    },
                  },
                ]
              : []
          }
        >
          {selectedUser && (() => {
            const rc = getRoleConfig(selectedUser.role);
            return (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Tên tài khoản (Username)</AppText>
                  <AppText variant="sm" color="#0F172A">@{selectedUser.username}</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Họ và tên</AppText>
                  <AppText variant="sm" color="#0F172A">{selectedUser.full_name || 'Chưa cập nhật'}</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Chức vụ / Vai trò</AppText>
                  <View style={{ backgroundColor: rc.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <AppText variant="sm" color={rc.color}>{rc.label}</AppText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Trạng thái tài khoản</AppText>
                  <StatusBadge
                    label={selectedUser.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                    severity={selectedUser.is_active ? 'success' : 'danger'}
                  />
                </View>
              </View>
            );
          })()}
        </DetailModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Flat Metric Bar - 100% Seamless Flat Style */
  flatMetricBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  flatMetricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  flatMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
  },

  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 6, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light, marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 6, backgroundColor: colors.brand.primary },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelDot: { width: 8, height: 8, borderRadius: 4 },
  panelFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  panelCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: 999, paddingHorizontal: 16, height: 44 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1.5, height: 44, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 8, paddingHorizontal: 12 },
  sectionTitleText: { ...font.mdBold, color: '#050505' },

  /* Mobile Full-Width Edge-to-Edge Facebook Post Block */
  userCardFbFullWidth: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
  },
  userCardWide: {
    backgroundColor: colors.surface.card,
    marginBottom: 8,
    borderRadius: 16,
    padding: 12,
  },

  fbPostTitle: { ...font.mdBold, color: '#050505' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarContainer: { position: 'relative', width: 42, height: 42 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  fbOnlineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.surface.card, position: 'absolute', bottom: 0, right: 0 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  actionCircleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },

  /* Facebook Equal Bottom Action Bar */
  cardActionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8, marginTop: 10 },
  cardActionItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  cardActionDivider: { width: 1, height: 16, backgroundColor: colors.border.light },

  /* POS Flat Edge-to-Edge List Design */
  posFlatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  flatSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  avatarContainerMini: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  avatarCircleMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbOnlineDotMini: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  roleBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  statusChipMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  miniEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeCount: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  posTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  mobileSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  mobileSearchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  mobileAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
  posCatSectionWrap: {
    marginBottom: 16,
  },
  posCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  catIconMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatItemsGroup: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
});
