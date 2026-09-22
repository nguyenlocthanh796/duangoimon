import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, Tier2FilterChips, StatusDotBadge, EmptyState } from '../../components/ui';
import {
  StaffMember,
  StaffRole,
  ROLE_CONFIG,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface StaffListTabProps {
  staffList: StaffMember[];
  isWide: boolean;
  isDesktopLarge?: boolean;
  onOpenAdd: () => void;
  onSelectStaff: (staff: StaffMember) => void;
}

export function StaffListTab({
  staffList,
  isWide,
  isDesktopLarge,
  onOpenAdd,
  onSelectStaff,
}: StaffListTabProps) {
  const { theme, isDark } = useTheme();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (roleFilter !== 'all' && s.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = s.phone.includes(q);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [staffList, roleFilter, searchQuery]);

  const roleChips = useMemo(() => [
    { id: 'all', label: 'Tất Cả', count: staffList.length },
    { id: 'thu_ngan', label: 'Thu Ngân', count: staffList.filter((s) => s.role === 'thu_ngan').length },
    { id: 'phuc_vu', label: 'Phục Vụ', count: staffList.filter((s) => s.role === 'phuc_vu').length },
    { id: 'pha_che', label: 'Pha Chế', count: staffList.filter((s) => s.role === 'pha_che').length },
    { id: 'quan_ly', label: 'Quản Lý', count: staffList.filter((s) => s.role === 'quan_ly').length },
    { id: 'bep', label: 'Bếp Nấu', count: staffList.filter((s) => s.role === 'bep').length },
    { id: 'tap_vu', label: 'Tạp Vụ', count: staffList.filter((s) => s.role === 'tap_vu').length },
    { id: 'bao_ve', label: 'Bảo Vệ', count: staffList.filter((s) => s.role === 'bao_ve').length },
  ], [staffList]);

  return (
    <View style={{ flex: 1 }}>
      {/* 🌟 DÃY 2: CHIP LỌC CẤP 2 (Apple Jade Capsule Pills - Dính liền ngay sát Tab Cấp 1) */}
      <Tier2FilterChips
        chips={roleChips}
        activeChip={roleFilter}
        onChipChange={setRoleFilter}
        activeColor="primary"
      />

      {/* Ô tìm kiếm nhân sự (Nằm liền dưới Chip Lọc trên cùng nền Card phẳng) */}
      <View
        style={[
          s.searchSection,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View
          style={[
            s.searchBar,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: 8,
            },
          ]}
        >
          <Icon name="magnify" size={16} color={theme.text.muted} />
          <TextInput
            placeholder="Tìm theo tên, SĐT nhân viên..."
            placeholderTextColor={theme.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[s.searchInput, { color: theme.text.primary }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={15} color={theme.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Staff Cards List */}
      <ScrollView
        contentContainerStyle={[
          s.listScroll,
          {
            padding: isWide ? 16 : 0,
            gap: isWide ? 12 : 0,
            paddingBottom: isWide ? 24 : 16,
          },
          isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredStaff.length === 0 ? (
          <EmptyState
            icon="account-search-outline"
            message="Không có nhân sự phù hợp"
            description="Thử tìm kiếm với từ khóa khác hoặc thêm nhân sự mới"
          />
        ) : (
          filteredStaff.map((staff) => {
            const roleInfo = ROLE_CONFIG[staff.role];

            return (
              <View
                key={staff.id}
                style={[
                  isWide && { width: isDesktopLarge ? '32.4%' : '49.2%' },
                  { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    onSelectStaff(staff);
                  }}
                  style={[
                    s.staffCard,
                    {
                      backgroundColor: theme.surface.card,
                      borderColor: theme.border.subtle,
                      borderRadius: isWide ? 14 : 0,
                      borderWidth: isWide ? 1 : 0,
                    },
                  ]}
                >
                  {/* Left: Avatar có chấm trạng thái đang trực */}
                  <View style={s.avatarWrapper}>
                    <View
                      style={[
                        s.avatarCircle,
                        {
                          backgroundColor: `${roleInfo.color}18`,
                        },
                      ]}
                    >
                      <Icon name="account" size={20} color={roleInfo.color} />
                    </View>
                    {staff.isWorking && (
                      <StatusDotBadge
                        status="on_shift"
                        dotOnly
                        style={s.onlineDot}
                      />
                    )}
                  </View>

                  {/* Middle: Tên nhân viên (Dòng 1) & SĐT + Loại Đăng Nhập (Dòng 2) */}
                  <View style={s.middleCol}>
                    <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={1}>
                      {staff.name}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <AppText variant="sm" color={theme.text.muted} tabularNums>
                        {staff.phone || 'Chưa SĐT'}
                      </AppText>
                      {staff.role === 'quan_ly' ? (
                        <View style={[s.roleBadge, { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth }]}>
                          <AppText variant="xxs" color={theme.text.muted}>
                            {staff.password ? 'Mật khẩu' : 'Mã PIN'}
                          </AppText>
                        </View>
                      ) : staff.pinCode ? (
                        <View style={[s.roleBadge, { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth }]}>
                          <AppText variant="xxs" color={theme.text.muted} tabularNums>
                            PIN: ••••
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Right: Badge Role (Dòng 1) & Mức Lương/Phụ cấp (Dòng 2) */}
                  <View style={s.rightCol}>
                    <View style={[s.roleBadge, { backgroundColor: `${roleInfo.color}15` }]}>
                      <AppText variant="xs" color={roleInfo.color}>
                        {roleInfo.label}
                      </AppText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <AppText variant="sm" color={theme.text.primary} tabularNums>
                        {staff.wageType === 'hourly'
                          ? `${formatCurrency(staff.wageRate)} đ/h`
                          : staff.wageType === 'per_shift'
                          ? `${formatCurrency(staff.wageRate)} đ/ca`
                          : `${formatCurrency(staff.wageRate)} đ/th`}
                      </AppText>
                      {staff.allowance > 0 && (
                        <AppText variant="sm" color={theme.brand.accent} tabularNums>
                          +{staff.allowance >= 1000000 ? `${(staff.allowance / 1000000).toFixed(1)}Tr` : `${Math.round(staff.allowance / 1000)}k`}
                        </AppText>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  secondaryFilterBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 6,
    fontSize: 15,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  chipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  chipPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    paddingTop: 0,
  },
  staffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  middleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
});
