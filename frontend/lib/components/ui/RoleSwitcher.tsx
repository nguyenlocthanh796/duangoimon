import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { AppModal } from './AppModal';
import { playTapSound } from '../../utils/sound';
import { useAuthStore, UserRole, ROLE_LABELS } from '../../store/useAuthStore';
import { ManagerPinModal } from '../pos/ManagerPinModal';

export interface RoleSwitcherProps {
  compact?: boolean;
  onRoleChanged?: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  compact = false,
  onRoleChanged,
}) => {
  const { theme } = useTheme();
  const currentRole = useAuthStore((s) => s.currentRole);
  const setRole = useAuthStore((s) => s.setRole);

  const [modalVisible, setModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  const activeRoleConfig = ROLE_LABELS[currentRole];

  const handleSelectRole = (role: UserRole) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    if (role === currentRole) {
      setModalVisible(false);
      return;
    }

    // If upgrading to Manager or Owner role from server/cashier, require manager PIN
    if ((role === 'owner' || role === 'manager') && currentRole !== 'owner' && currentRole !== 'manager') {
      setPendingRole(role);
      setModalVisible(false);
      setPinModalVisible(true);
      return;
    }

    setRole(role);
    setModalVisible(false);
    if (onRoleChanged) onRoleChanged(role);
  };

  const handlePinSuccess = () => {
    if (pendingRole) {
      setRole(pendingRole);
      if (onRoleChanged) onRoleChanged(pendingRole);
      setPendingRole(null);
    }
  };

  const roles: UserRole[] = ['server', 'cashier', 'manager', 'owner'];

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          playTapSound();
          if (Platform.OS !== 'web') {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          }
          setModalVisible(true);
        }}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={[
          compact ? s.compactTrigger : s.fullTrigger,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.default,
          },
        ]}
      >
        <View
          style={[
            s.badgeDot,
            { backgroundColor: activeRoleConfig.color },
          ]}
        />
        <AppText
          variant="xs"
          weight="medium"
          color={theme.text.primary}
          numberOfLines={1}
        >
          {compact ? activeRoleConfig.short : activeRoleConfig.label}
        </AppText>
        <Icon name="chevron-down" size={14} color={theme.text.muted} />
      </TouchableOpacity>

      {/* Role Picker Modal */}
      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Đổi Vai Trò"
        width={400}
      >
        {/* Role Options */}
        <View style={{ gap: 8, paddingVertical: 4 }}>
          {roles.map((role) => {
            const isSelected = role === currentRole;
            const info = ROLE_LABELS[role];
            return (
              <TouchableOpacity
                key={role}
                activeOpacity={0.7}
                onPress={() => handleSelectRole(role)}
                style={[
                  s.roleOption,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(13, 148, 136, 0.08)'
                      : theme.surface.header,
                    borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <View style={[s.roleIconBox, { backgroundColor: info.color + '20' }]}>
                  <Icon
                    name={
                      role === 'owner'
                        ? 'crown'
                        : role === 'manager'
                        ? 'shield-account'
                        : role === 'cashier'
                        ? 'cash-register'
                        : 'account-tie'
                    }
                    size={20}
                    color={info.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText
                      variant="sm"
                      weight={isSelected ? 'medium' : 'normal'}
                      color={isSelected ? theme.brand.primary : theme.text.primary}
                    >
                      {info.label}
                    </AppText>
                    {(role === 'owner' || role === 'manager') && (
                      <AppText variant="xs" color={theme.brand.warning} weight="medium">
                        (PIN)
                      </AppText>
                    )}
                  </View>
                  <AppText variant="xs" color={theme.text.muted}>
                    {info.desc}
                  </AppText>
                </View>
                {isSelected && (
                  <Icon name="check-circle" size={20} color={theme.brand.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </AppModal>

      {/* Manager PIN verification for Owner escalation */}
      <ManagerPinModal
        visible={pinModalVisible}
        title="Xác Thực Chủ"
        subtitle="Nhập mã PIN để chuyển sang Chủ Quán"
        action="switch_to_owner"
        onSuccess={handlePinSuccess}
        onClose={() => {
          setPinModalVisible(false);
          setPendingRole(null);
        }}
      />
    </>
  );
};

const s = StyleSheet.create({
  compactTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  fullTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
