import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, font, ss } from '../../theme';
import ScreenHeader from './ScreenHeader';
import { useSidebar } from '../../context/SidebarContext';

export interface DetailAction {
  label: string;
  icon?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface DetailModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: DetailAction[];
  children: ReactNode;
}

export default function DetailModal({
  visible,
  title,
  subtitle,
  onClose,
  onEdit,
  onDelete,
  actions = [],
  children,
}: DetailModalProps) {
  const { isWide } = useResponsive();
  const { openSidebar } = useSidebar();

  if (!visible) return null;

  const combinedActions: DetailAction[] = [...actions];
  if (onEdit) {
    combinedActions.unshift({
      label: 'Sửa',
      icon: 'square-edit-outline',
      onPress: onEdit,
      variant: 'primary',
    });
  }
  if (onDelete) {
    combinedActions.push({
      label: 'Xóa',
      icon: 'trash-can-outline',
      onPress: onDelete,
      variant: 'danger',
    });
  }

  return (
    <View style={[StyleSheet.absoluteFill, { top: isWide ? 0 : -45, zIndex: 9999, backgroundColor: colors.surface.app || '#F8FAFC' }]}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        showBack
        onBackPress={onClose}
        onMenuPress={openSidebar}
        compact
        right={
          combinedActions.length > 0 ? (
            <View style={styles.headerActionRow}>
              {combinedActions.map((act, idx) => {
                const isPrimary = act.variant === 'primary';
                const isDanger = act.variant === 'danger';
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={act.onPress}
                    activeOpacity={0.75}
                    style={[
                      styles.actionBtn,
                      isPrimary && styles.actionBtnPrimary,
                      isDanger && styles.actionBtnDanger,
                    ]}
                  >
                    {act.icon && (
                      <Icon
                        name={act.icon as any}
                        size={15}
                        color={isPrimary || isDanger ? '#FFF' : colors.brand.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.actionText,
                        isPrimary && styles.actionTextPrimary,
                        isDanger && styles.actionTextDanger,
                      ]}
                    >
                      {act.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 6,
          paddingTop: 6,
          gap: 8,
          paddingBottom: 100,
        }}
        style={{ flex: 1 }}
      >
        <View style={ss.sectionWrap}>
          <View style={{ padding: 12 }}>
            {children}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
  },

  // ── Header Layout ──────────────────────────────────────────
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light || '#E5E9F0',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    ...font.mdBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    ...font.sm,
    fontSize: 12,
    color: colors.text.muted || '#64748B',
    marginTop: 1,
  },

  // ── Action Buttons Header ─────────────────────────────────
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnPrimary: {
    backgroundColor: colors.brand.primary || '#F97316',
    borderColor: colors.brand.primary || '#F97316',
  },
  actionBtnDanger: {
    backgroundColor: colors.status.danger || '#EF4444',
    borderColor: colors.status.danger || '#EF4444',
  },
  actionText: {
    ...font.sm,
    fontWeight: '600',
    fontSize: 13,
    color: colors.brand.primary || '#F97316',
  },
  actionTextPrimary: {
    color: '#FFFFFF',
  },
  actionTextDanger: {
    color: '#FFFFFF',
  },
});
