import React, { memo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  StyleProp,
  ViewStyle,
  DimensionValue,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { ModalDragIndicator } from './ModalDragIndicator';
import { playTapSound } from '../../utils/sound';

export interface AppModalAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'accent' | 'danger' | 'secondary' | 'outline';
  icon?: string;
}

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: string | React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
  primaryAction?: AppModalAction;
  secondaryAction?: AppModalAction;
  footer?: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  width?: DimensionValue;
  presentation?: 'sheet' | 'dialog';
  showCloseButton?: boolean;
  showDragIndicator?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 👑 AppModal - Khung Modal Dialog / Sheet Chuẩn Vị Chủ Quán AGENTS.md
 * - Tự động xử lý backdrop tap dismiss (nhấn ra ngoài tự đóng).
 * - Đệm an toàn safeAreaInsets và chống che lấp bởi bàn phím ảo KeyboardAvoidingView.
 * - Hỗ trợ cả 2 kiểu hiển thị: bottom sheet (cho di động) hoặc floating dialog (cho tablet/desktop).
 * - Tuân thủ triệt để bảng màu Dual-Theme, Typography 7 cấp và Tabular Nums.
 */
function AppModalComponent({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  children,
  primaryAction,
  secondaryAction,
  footer,
  scrollable = true,
  maxHeight,
  maxWidth,
  width,
  presentation = 'dialog',
  showCloseButton = true,
  showDragIndicator,
  containerStyle,
  contentContainerStyle,
  testID,
}: AppModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const isSheet = presentation === 'sheet';
  const shouldShowIndicator = showDragIndicator ?? isSheet;
  const effectiveMaxWidth = maxWidth ?? width;

  // Tính toán numeric maxHeight an toàn theo viewport để flex layout không bị vỡ trên Blink/WebKit
  const numericMaxHeight = maxHeight ?? (isSheet
    ? Math.round(windowHeight * 0.88)
    : Math.round(windowHeight * 0.85));

  const handleClose = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    onClose();
  };

  const handleAction = (action?: AppModalAction) => {
    if (!action || action.disabled || action.loading) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    action.onPress();
  };

  const hasHeader = Boolean(title || subtitle || icon || showCloseButton);
  const hasFooter = Boolean(footer || primaryAction || secondaryAction);

  return (
    <Modal
      testID={testID}
      visible={visible}
      animationType={isSheet ? 'slide' : 'fade'}
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        style={[
          styles.backdrop,
          isSheet ? styles.sheetBackdrop : styles.dialogBackdrop,
          { backgroundColor: theme.surface.backdrop || 'rgba(0, 0, 0, 0.65)' },
        ]}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            isSheet ? styles.sheetKeyboardWrap : styles.dialogKeyboardWrap,
            effectiveMaxWidth ? { maxWidth: effectiveMaxWidth } : undefined,
          ]}
        >
          <Pressable
            style={[
              styles.cardBase,
              isSheet ? styles.sheetCard : styles.dialogCard,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
                maxHeight: numericMaxHeight,
              },
              containerStyle,
            ]}
            onPress={(e) => {
              if (typeof e?.stopPropagation === 'function') {
                e.stopPropagation();
              }
            }}
          >
            {/* Sheet Drag Handle */}
            {shouldShowIndicator && <ModalDragIndicator />}

            {/* Header */}
            {hasHeader && (
              <View
                style={[
                  styles.headerRow,
                  { borderBottomColor: theme.border.subtle },
                ]}
              >
                <View style={styles.headerTitleWrap}>
                  {icon && (
                    typeof icon === 'string' ? (
                      <View
                        style={[
                          styles.iconBox,
                          {
                            backgroundColor:
                              iconBg ||
                              (isDark ? theme.surface.header : `${theme.brand.accent}18`),
                          },
                        ]}
                      >
                        <Icon
                          name={icon as any}
                          size={20}
                          color={iconColor || theme.brand.accent}
                        />
                      </View>
                    ) : (
                      icon
                    )
                  )}
                  <View style={styles.textWrap}>
                    {title ? (
                      <AppText
                        variant="md"
                        weight="bold"
                        color={theme.text.primary}
                        numberOfLines={1}
                      >
                        {title}
                      </AppText>
                    ) : null}
                    {subtitle ? (
                      <AppText
                        variant="xs"
                        color={theme.text.muted}
                        numberOfLines={1}
                        style={{ marginTop: 2 }}
                      >
                        {subtitle}
                      </AppText>
                    ) : null}
                  </View>
                </View>

                {showCloseButton && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Đóng modal"
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <Icon name="close" size={20} color={theme.text.muted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Body */}
            {scrollable ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={[
                  styles.scrollBody,
                  Platform.OS === 'web' && ({ minHeight: 0 } as any),
                ]}
                contentContainerStyle={[
                  styles.scrollContent,
                  !hasFooter && styles.noFooterScrollContent,
                  contentContainerStyle,
                ]}
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.staticBody,
                  !hasFooter && styles.noFooterScrollContent,
                  contentContainerStyle,
                ]}
              >
                {children}
              </View>
            )}

            {/* Sticky Footer */}
            {hasFooter && (
              <View
                style={[
                  styles.footerRow,
                  {
                    borderTopColor: theme.border.subtle,
                    paddingBottom: Math.max(insets.bottom, 14),
                  },
                ]}
              >
                {footer ? (
                  footer
                ) : (
                  <>
                    {secondaryAction && (
                      <Button
                        variant={
                          secondaryAction.variant === 'danger'
                            ? 'destructive'
                            : secondaryAction.variant === 'primary'
                            ? 'default'
                            : secondaryAction.variant === 'accent'
                            ? 'accent'
                            : secondaryAction.variant === 'secondary'
                            ? 'secondary'
                            : 'outline'
                        }
                        title={secondaryAction.label}
                        onPress={() => handleAction(secondaryAction)}
                        disabled={secondaryAction.disabled || secondaryAction.loading}
                        loading={secondaryAction.loading}
                        leadingIcon={
                          secondaryAction.icon ? (
                            <Icon
                              name={secondaryAction.icon as any}
                              size={18}
                              color={
                                secondaryAction.variant === 'primary' ||
                                secondaryAction.variant === 'accent' ||
                                secondaryAction.variant === 'danger'
                                  ? theme.text.onBrand
                                  : theme.text.primary
                              }
                            />
                          ) : undefined
                        }
                        style={styles.footerBtn}
                      />
                    )}
                    {primaryAction && (
                      <Button
                        variant={
                          primaryAction.variant === 'danger'
                            ? 'destructive'
                            : primaryAction.variant === 'primary'
                            ? 'default'
                            : primaryAction.variant === 'secondary'
                            ? 'secondary'
                            : primaryAction.variant === 'outline'
                            ? 'outline'
                            : 'accent'
                        }
                        title={primaryAction.label}
                        onPress={() => handleAction(primaryAction)}
                        disabled={primaryAction.disabled || primaryAction.loading}
                        loading={primaryAction.loading}
                        leadingIcon={
                          primaryAction.icon ? (
                            <Icon
                              name={primaryAction.icon as any}
                              size={18}
                              color={
                                primaryAction.variant === 'outline' || primaryAction.variant === 'secondary'
                                  ? theme.text.primary
                                  : theme.text.onBrand
                              }
                            />
                          ) : undefined
                        }
                        style={styles.footerBtn}
                      />
                    )}
                  </>
                )}
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export const AppModal = memo(AppModalComponent);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  dialogBackdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetBackdrop: {
    justifyContent: 'flex-end',
  },
  dialogKeyboardWrap: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetKeyboardWrap: {
    width: '100%',
    maxHeight: '100%',
  },
  cardBase: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dialogCard: {
    borderRadius: 16,
  },
  sheetCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  noFooterScrollContent: {
    paddingBottom: 24,
  },
  staticBody: {
    padding: 16,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  footerBtn: {
    flex: 1,
    minHeight: 44,
  },
});
