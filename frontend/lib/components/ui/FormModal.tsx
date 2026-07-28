import { ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { useSidebar } from '../../context/SidebarContext';
import { colors, font, ss } from '../../theme';
import ScreenHeader from './ScreenHeader';

interface FormModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
  children: ReactNode;
}

export default function FormModal({
  visible,
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel = 'Lưu',
  saving = false,
  children,
}: FormModalProps) {
  const { isWide } = useResponsive();
  const { openSidebar } = useSidebar();

  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, { top: isWide ? 0 : -45, zIndex: 10000, backgroundColor: colors.surface.app || '#F8FAFC' }]}>
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          showBack
          onBackPress={onClose}
          onMenuPress={openSidebar}
          compact
          right={
            onSave ? (
              <TouchableOpacity
                onPress={onSave}
                disabled={saving}
                activeOpacity={0.7}
                style={[styles.saveBtn, saving && { opacity: 0.65 }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{saveLabel}</Text>
                )}
              </TouchableOpacity>
            ) : undefined
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: isWide ? 24 : 6,
            paddingTop: 6,
            gap: 8,
            paddingBottom: 40,
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

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.surface.app || '#F8FAFC' }}
      >
        <View style={{ flex: 1, backgroundColor: colors.surface.app || '#F8FAFC' }}>
          <ScreenHeader
            title={title}
            subtitle={subtitle}
            showBack
            onBackPress={onClose}
            onMenuPress={openSidebar}
            compact
            right={
              onSave ? (
                <TouchableOpacity
                  onPress={onSave}
                  disabled={saving}
                  activeOpacity={0.7}
                  style={[styles.saveBtn, saving && { opacity: 0.65 }]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>{saveLabel}</Text>
                  )}
                </TouchableOpacity>
              ) : undefined
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: isWide ? 24 : 6,
              paddingTop: 6,
              gap: 8,
              paddingBottom: 40,
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
      </KeyboardAvoidingView>
    </Modal>
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
    gap: 8,
  },
  cancelBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelText: {
    ...font.sm,
    fontWeight: '600',
    fontSize: 13,
    color: '#475569',
  },
  saveBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.brand.primary || '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...font.sm,
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

