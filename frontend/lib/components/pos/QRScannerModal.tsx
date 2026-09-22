import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { ModalDragIndicator } from '../ui/ModalDragIndicator';
import { playTapSound } from '../../utils/sound';

export interface ScannedToastData {
  name: string;
  price: number;
  code?: string;
}

export interface QRScannerModalProps {
  visible: boolean;
  tableName?: string;
  onClose: () => void;
  onScanItem: (code: string) => ScannedToastData | null;
}

// -------------------------------------------------------------------
// 1. SUB-COMPONENT: KHUNG NGẮM LASER DARK RETICLE (60 FPS GPU UI THREAD)
// -------------------------------------------------------------------
const MemoizedReticle = memo(({ primaryColor, flashSuccess }: { primaryColor: string; flashSuccess: boolean }) => {
  const { theme } = useTheme();
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [laserAnim]);

  const activeColor = flashSuccess ? theme.brand.success : (primaryColor || theme.brand.accent);

  return (
    <View style={[s.reticleBox, flashSuccess && s.reticleSuccessGlow]}>
      {/* 4 Góc Corner Chuyên Nghiệp */}
      <View style={[s.corner, s.topLeft, { borderColor: activeColor }]} />
      <View style={[s.corner, s.topRight, { borderColor: activeColor }]} />
      <View style={[s.corner, s.bottomLeft, { borderColor: activeColor }]} />
      <View style={[s.corner, s.bottomRight, { borderColor: activeColor }]} />

      {/* Tia Laser Quét Động */}
      <Animated.View
        style={[
          s.laser,
          {
            backgroundColor: activeColor,
            ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 12px ${activeColor}` } as any) : {}),
            transform: [
              {
                translateY: laserAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 230],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
});

// -------------------------------------------------------------------
// MAIN COMPONENT: QR SCANNER MODAL (DARK GLASS IMMERSIVE)
// -------------------------------------------------------------------
export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  tableName = 'Bàn 01',
  onClose,
  onScanItem,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [sessionItems, setSessionItems] = useState<ScannedToastData[]>([]);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [flashSuccess, setFlashSuccess] = useState(false);

  // Scan throttling lock
  const lastScanTimestamp = useRef<number>(0);
  const lastScanCode = useRef<string>('');

  const totalSessionAmount = sessionItems.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (visible) {
      setSessionItems([]);
      setTorch(false);
      setManualCode('');
      setFlashSuccess(false);
      setManualModalVisible(false);
      lastScanTimestamp.current = 0;
      lastScanCode.current = '';
    }
  }, [visible]);

  const triggerSuccessFeedback = useCallback(() => {
    playTapSound();
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 450);

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
  }, []);

  const processScanCode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const item = onScanItem(trimmed);
      if (item) {
        triggerSuccessFeedback();
        setSessionItems((prev) => [item, ...prev]);
      }
    },
    [onScanItem, triggerSuccessFeedback]
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      if (data === lastScanCode.current && now - lastScanTimestamp.current < 2000) {
        return;
      }
      lastScanTimestamp.current = now;
      lastScanCode.current = data;
      processScanCode(data);
    },
    [processScanCode]
  );

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    playTapSound();
    processScanCode(manualCode);
    setManualCode('');
    setManualModalVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        {/* 1. CAMERA VIEW TOÀN MÀN HÌNH NỀN TỐI */}
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS !== 'web' && permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'upc_a'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.webFallback, { backgroundColor: theme.surface.card }]}>
              <Icon name="barcode-scan" size={56} color={theme.brand.accent} />
              <AppText
                variant="sm"
                weight="medium"
                color={theme.text.primary}
                style={{ textAlign: 'center', marginTop: 14 }}
              >
                {Platform.OS === 'web'
                  ? 'Web POS: Bấm ⌨️ bên dưới để nhập mã'
                  : 'Cần cấp quyền Camera để quét mã'}
              </AppText>
              {!permission?.granted && Platform.OS !== 'web' && (
                <Button
                  title="Cấp Quyền Camera"
                  variant="default"
                  size="sm"
                  style={{ marginTop: 14, backgroundColor: theme.brand.accent }}
                  onPress={requestPermission}
                />
              )}
            </View>
          )}

          {/* Mask mờ vùng ngoài Reticle để mắt tập trung vào tâm */}
          <View style={s.cameraMaskCenter}>
            <MemoizedReticle primaryColor={theme.brand.accent} flashSuccess={flashSuccess} />
            <AppText variant="xs" weight="medium" color="rgba(255,255,255,0.85)" style={{ marginTop: 20 }}>
              Đặt mã QR hoặc mã vạch vào giữa khung
            </AppText>
          </View>
        </View>

        {/* 2. TOP DARK GLASS HUD BAR (NÉ TAI THỎ / DYNAMIC ISLAND) */}
        <View style={[s.topBar, { paddingTop: Math.max(insets.top + 10, 52) }]}>
          <View style={s.topPill}>
            <View style={s.qrIconCircle}>
              <Icon name="qrcode-scan" size={14} color={theme.brand.accent} />
            </View>
            <AppText variant="xs" weight="medium" color="white">
              Quét {tableName}
            </AppText>
            <View style={s.dividerDot} />
            <AppText
              variant="xs"
              weight="medium"
              color={theme.brand.accent}
              tabularNums
            >
              {sessionItems.length > 0
                ? `${sessionItems.length} món · ${totalSessionAmount.toLocaleString('vi-VN')} đ`
                : 'Đang đợi mã...'}
            </AppText>
          </View>
        </View>

        {/* Khoảng giãn giữa */}
        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* 3. DẢI CHIP MÓN ĐÃ QUÉT (LIVE HUD STRIP) */}
        {sessionItems.length > 0 && (
          <View style={s.liveStripWrapper}>
            <View style={s.liveStripCard}>
              <View style={s.liveStripHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="cart-check" size={14} color={theme.brand.accent} />
                  <AppText variant="xs" weight="medium" color={theme.brand.accent} tabularNums>
                    Vừa thêm {sessionItems.length} món vào giỏ
                  </AppText>
                </View>
                <AppText variant="xs" weight="medium" color="white" tabularNums>
                  {totalSessionAmount.toLocaleString('vi-VN')} đ
                </AppText>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.liveStripScroll}
              >
                {sessionItems.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={s.liveChip}>
                    <View style={[s.liveDot, { backgroundColor: theme.brand.success }]} />
                    <AppText variant="xs" color="white" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText variant="xs" weight="medium" color={theme.brand.accent} tabularNums>
                      {item.price.toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* 4. BOTTOM FLOATING DARK GLASS DOCK (THUMB-ZONE CÔNG THÁI HỌC) */}
        <View style={[s.dockWrapper, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <View style={s.floatingDock}>
            {/* Nút Đèn Pin */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={torch ? 'Tắt đèn pin' : 'Bật đèn pin'}
              onPress={() => {
                playTapSound();
                setTorch(!torch);
              }}
              style={[
                s.dockIconBtn,
                torch && { backgroundColor: 'rgba(245, 158, 11, 0.25)', borderColor: theme.brand.accent },
              ]}
            >
              <Icon
                name={torch ? 'flash' : 'flash-off'}
                size={22}
                color={torch ? theme.brand.accent : 'white'}
              />
            </TouchableOpacity>

            {/* Nút Hoàn Tất / Đóng Quét (Chính Giữa) */}
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={sessionItems.length > 0 ? 'Hoàn tất quét' : 'Đóng quét'}
              onPress={() => {
                playTapSound();
                onClose();
              }}
              style={[
                s.dockCenterBtn,
                sessionItems.length > 0 && { backgroundColor: theme.brand.success },
              ]}
            >
              <Icon
                name={sessionItems.length > 0 ? 'check-bold' : 'close'}
                size={18}
                color="white"
              />
              <AppText variant="xs" weight="medium" color="white" tabularNums style={{ marginLeft: 6 }}>
                {sessionItems.length > 0
                  ? `Xong (${sessionItems.length} món · ${totalSessionAmount.toLocaleString('vi-VN')} đ)`
                  : 'Đóng Quét'}
              </AppText>
            </TouchableOpacity>

            {/* Nút Nhập SKU Bằng Tay */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Nhập mã SKU bằng tay"
              onPress={() => {
                playTapSound();
                setManualModalVisible(true);
              }}
              style={s.dockIconBtn}
            >
              <Icon name="keyboard-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. MODAL NHẬP MÃ SKU BÀN PHÍM (DARK GLASS LIỀN MẠCH, KHÔNG BỊ TREO MÀN HÌNH) */}
        <Modal
          visible={manualModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setManualModalVisible(false)}
          statusBarTranslucent
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.manualOverlay}
          >
            {/* Chạm nền mờ tối bất kỳ chỗ nào để thoát */}
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFill}
              onPress={() => {
                playTapSound();
                setManualModalVisible(false);
              }}
            />

            <View style={s.manualCard}>
              <View style={s.manualHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={s.manualIconPill}>
                    <Icon name="keyboard-outline" size={18} color={theme.brand.accent} />
                  </View>
                  <AppText variant="sm" weight="medium" color="white">
                    Nhập mã món / Barcode
                  </AppText>
                </View>

                {/* Nút X Đóng Nhanh Không Bao Giờ Bị Treo */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng nhập mã"
                  onPress={() => {
                    playTapSound();
                    setManualModalVisible(false);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={s.manualCloseBtn}
                >
                  <Icon name="close" size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              </View>

              <AppText variant="xs" color="rgba(255, 255, 255, 0.65)" style={{ marginBottom: 14 }}>
                Dùng khi tem bị mờ, rách hoặc tem mã vạch barcode siêu nhỏ.
              </AppText>

              <TextInput
                style={s.manualInput}
                placeholder="Ví dụ: SKU-CF-01, 893456..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={manualCode}
                onChangeText={setManualCode}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleManualSubmit}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={s.manualCancelBtn}
                  onPress={() => {
                    playTapSound();
                    setManualModalVisible(false);
                  }}
                >
                  <AppText variant="xs" weight="medium" color="rgba(255, 255, 255, 0.8)">
                    Hủy
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[s.manualSubmitBtn, { backgroundColor: theme.brand.accent }]}
                  onPress={handleManualSubmit}
                >
                  <Icon name="plus" size={16} color="white" />
                  <AppText variant="xs" weight="medium" color="white" style={{ marginLeft: 4 }}>
                    Thêm Món
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
};

// -------------------------------------------------------------------
// STYLES: DARK GLASS IMMERSIVE DESIGN
// -------------------------------------------------------------------
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between',
  },
  cameraMaskCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  topBar: {
    alignItems: 'center',
    zIndex: 10,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' } as any)
      : { elevation: 6 }),
  },
  qrIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  webFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  reticleBox: {
    width: 240,
    height: 240,
    position: 'relative',
    borderRadius: 16,
  },
  reticleSuccessGlow: {
    boxShadow: '0 0 24px rgba(16, 185, 129, 0.75)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  laser: {
    width: '94%',
    left: '3%',
    height: 2.5,
    borderRadius: 1.5,
  },
  liveStripWrapper: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    zIndex: 10,
  },
  liveStripCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 10,
    gap: 8,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' } as any)
      : { elevation: 6 }),
  },
  liveStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  liveStripScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dockWrapper: {
    paddingHorizontal: 16,
    zIndex: 10,
  },
  floatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    gap: 10,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' } as any)
      : { elevation: 8 }),
  },
  dockIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCenterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
  },
  manualOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  manualCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' } as any)
      : { elevation: 12 }),
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  manualIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  manualCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
