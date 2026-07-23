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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
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

  // ─── Shared action buttons ─────────────────────────────────
  const ActionButtons = () => (
    <View style={styles.actionRow}>
      <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Hủy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        disabled={saving || !onSave}
        style={[styles.saveBtn, (saving || !onSave) && { opacity: 0.65 }]}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>{saveLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // ─── iPad/Desktop: bottom sheet ───────────────────────────
  if (isWide) {
    return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.sheetOverlay}>
            <View style={styles.sheetContainer}>
              {/* Drag handle */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{title}</Text>
                  {subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Icon name="close" size={20} color={colors.icon.muted} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: isWide ? 32 : 4, paddingBottom: 8 }}
              >
                {children}
              </ScrollView>

              {/* Actions */}
              <View style={styles.sheetActions}>
                <ActionButtons />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ─── iPhone: full-screen with sticky header + footer ──────
  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Sticky top bar */}
          <View style={styles.phoneHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Icon name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.phoneTitle} numberOfLines={1}>{title}</Text>
              {subtitle && <Text style={styles.phoneSubtitle} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <View style={{ width: 38 }} />
          </View>

          {/* Scrollable content — keyboard pushes up */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          >
            {children}
          </ScrollView>

          {/* Sticky footer buttons — stays above keyboard */}
          <View style={styles.phoneFooter}>
            <ActionButtons />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Shared ──────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
    alignItems: 'center',
  },
  cancelText: {
    ...font.smBold,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
  },
  saveText: {
    ...font.smBold,
    color: '#fff',
    fontWeight: '600',
  },

  // ── Bottom Sheet (iPad) ─────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetContainer: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: shape.radius.xl,
    borderTopRightRadius: shape.radius.xl,
    maxHeight: '88%',
    paddingBottom: 32,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sheetTitle: {
    ...font.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sheetSubtitle: {
    ...font.sm,
    color: colors.text.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // ── Full-screen Phone ────────────────────────────────────────
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.brand.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.brand,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: shape.radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneTitle: {
    ...font.mdBold,
    fontWeight: '600',
    color: '#fff',
  },
  phoneSubtitle: {
    ...font.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  phoneFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.surface.card,
  },
});
