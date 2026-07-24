import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, TextInput, Switch, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import AppText from '../ui/AppText';
import { usePOSSettings, POSSettings } from '../../hooks/usePOSSettings';

interface POSSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'in_an' | 'van_hanh' | 'thanh_toan' | 'giao_dien';

export default function POSSettingsModal({ visible, onClose }: POSSettingsModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const { settings, updateSettings, resetToDefaults } = usePOSSettings();
  const [activeTab, setActiveTab] = useState<TabType>('in_an');
  const [localSettings, setLocalSettings] = useState<POSSettings>(settings);

  // Sync state on open
  React.useEffect(() => {
    if (visible) {
      setLocalSettings(settings);
    }
  }, [visible, settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const updateLocal = (key: keyof POSSettings, val: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: val }));
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'in_an', label: 'In ấn & Hóa đơn', icon: 'printer' },
    { id: 'van_hanh', label: 'Gọi món & Vận hành', icon: 'clipboard-list-outline' },
    { id: 'thanh_toan', label: 'Thanh toán & Tiền', icon: 'cash-register' },
    { id: 'giao_dien', label: 'Giao diện & Âm thanh', icon: 'tune-vertical' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface.overlay,
          justifyContent: isWide ? 'center' : 'flex-end',
          alignItems: isWide ? 'center' : 'stretch',
          padding: isWide ? 20 : 0,
        }}
      >
        <View
          style={{
            width: isWide ? 720 : '100%',
            height: isWide ? 620 : '90%',
            backgroundColor: colors.surface.card,
            borderRadius: isWide ? shape.radius.xl : 0,
            borderTopLeftRadius: shape.radius.xl,
            borderTopRightRadius: shape.radius.xl,
            overflow: 'hidden',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: colors.surface.app,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.brand.primaryBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="cog-outline" size={22} color={colors.brand.primary} />
              </View>
              <View>
                <AppText variant="md" weight="bold" color={colors.text.primary}>
                  Cài Đặt Mô-đun Bán Hàng
                </AppText>
                <AppText variant="sm" color={colors.text.muted}>
                  Tùy chỉnh thông số in ấn, VAT, vận hành & giao diện
                </AppText>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Icon name="close" size={24} color={colors.icon.muted} />
            </TouchableOpacity>
          </View>

          {/* Body with TabBar */}
          <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
            {/* Tab items */}
            <View
              style={{
                width: isWide ? 220 : '100%',
                backgroundColor: colors.surface.app,
                borderRightWidth: isWide ? 1 : 0,
                borderBottomWidth: isWide ? 0 : 1,
                borderColor: colors.border.default,
                paddingVertical: 8,
              }}
            >
              <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: isWide ? 'column' : 'row', gap: 4, paddingHorizontal: 8 }}>
                  {TABS.map((t) => {
                    const active = activeTab === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setActiveTab(t.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderRadius: shape.radius.md,
                          backgroundColor: active ? colors.surface.card : 'transparent',
                          borderLeftWidth: isWide && active ? 3 : 0,
                          borderLeftColor: colors.brand.primary,
                        }}
                      >
                        <Icon name={t.icon as any} size={20} color={active ? colors.brand.primary : colors.icon.muted} />
                        <AppText variant="sm" weight={active ? 'bold' : 'normal'} color={active ? colors.brand.primary : colors.text.secondary}>
                          {t.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Tab content */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              {activeTab === 'in_an' && (
                <View style={{ gap: 20 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Cấu hình In ấn & Mẫu Hóa đơn</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Tự động in hóa đơn khi thanh toán</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự động bật cửa sổ in khi hoàn thành đơn</AppText>
                    </View>
                    <Switch
                      value={localSettings.autoPrintReceipt}
                      onValueChange={(val) => updateLocal('autoPrintReceipt', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Tự động in phiếu bếp khi gửi bếp</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự động in danh sách món mới gửi xuống nhà bếp</AppText>
                    </View>
                    <Switch
                      value={localSettings.autoPrintKitchenTicket}
                      onValueChange={(val) => updateLocal('autoPrintKitchenTicket', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 8 }}>
                      Khổ giấy in mặc định:
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {(['K80', 'K57'] as const).map((paper) => {
                        const sel = localSettings.paperSize === paper;
                        return (
                          <TouchableOpacity
                            key={paper}
                            onPress={() => updateLocal('paperSize', paper)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: shape.radius.md,
                              borderWidth: 1,
                              borderColor: sel ? colors.brand.primary : colors.border.default,
                              backgroundColor: sel ? colors.brand.primaryBg : colors.surface.app,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="md" weight="bold" color={sel ? colors.brand.primary : colors.text.primary}>
                              Khổ {paper} {paper === 'K80' ? '(80mm - Phổ biến)' : '(57mm - Nhỏ gọn)'}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 6 }}>
                      Tên nhà hàng / Tiêu đề hóa đơn:
                    </AppText>
                    <TextInput
                      value={localSettings.receiptHeaderTitle}
                      onChangeText={(val) => updateLocal('receiptHeaderTitle', val)}
                      style={{
                        backgroundColor: colors.surface.app,
                        borderWidth: 1,
                        borderColor: colors.border.default,
                        borderRadius: shape.radius.md,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        ...font.md,
                        color: colors.text.primary,
                      }}
                    />
                  </View>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 6 }}>
                      Địa chỉ hiển thị trên hóa đơn:
                    </AppText>
                    <TextInput
                      value={localSettings.receiptHeaderAddress}
                      onChangeText={(val) => updateLocal('receiptHeaderAddress', val)}
                      style={{
                        backgroundColor: colors.surface.app,
                        borderWidth: 1,
                        borderColor: colors.border.default,
                        borderRadius: shape.radius.md,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        ...font.md,
                        color: colors.text.primary,
                      }}
                    />
                  </View>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 6 }}>
                      Lời chúc chân hóa đơn (Footer):
                    </AppText>
                    <TextInput
                      value={localSettings.receiptFooterText}
                      onChangeText={(val) => updateLocal('receiptFooterText', val)}
                      multiline={true}
                      numberOfLines={2}
                      style={{
                        backgroundColor: colors.surface.app,
                        borderWidth: 1,
                        borderColor: colors.border.default,
                        borderRadius: shape.radius.md,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        ...font.md,
                        color: colors.text.primary,
                        height: 60,
                      }}
                    />
                  </View>
                </View>
              )}

              {activeTab === 'van_hanh' && (
                <View style={{ gap: 20 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Quy trình Gọi món & Vận hành</AppText>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 8 }}>
                      Hình thức phục vụ mặc định:
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {[
                        { id: 'dine_in', label: 'Tại bàn (Dine-in)' },
                        { id: 'takeaway', label: 'Mang về (Takeaway)' },
                      ].map((st) => {
                        const sel = localSettings.defaultServiceType === st.id;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            onPress={() => updateLocal('defaultServiceType', st.id)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: shape.radius.md,
                              borderWidth: 1,
                              borderColor: sel ? colors.brand.primary : colors.border.default,
                              backgroundColor: sel ? colors.brand.primaryBg : colors.surface.app,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="md" weight="bold" color={sel ? colors.brand.primary : colors.text.primary}>
                              {st.label}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 8 }}>
                      Thuế VAT mặc định (%):
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {[0, 8, 10].map((rate) => {
                        const sel = localSettings.defaultVatRate === rate;
                        return (
                          <TouchableOpacity
                            key={rate}
                            onPress={() => updateLocal('defaultVatRate', rate)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: shape.radius.md,
                              borderWidth: 1,
                              borderColor: sel ? colors.brand.primary : colors.border.default,
                              backgroundColor: sel ? colors.brand.primaryBg : colors.surface.app,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="md" weight="bold" color={sel ? colors.brand.primary : colors.text.primary}>
                              {rate}% VAT
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Cho phép sửa giá món trực tiếp</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Cho phép thu ngân nhập giá tùy chỉnh khi gọi món</AppText>
                    </View>
                    <Switch
                      value={localSettings.allowPriceEdit}
                      onValueChange={(val) => updateLocal('allowPriceEdit', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Tự động đóng giỏ hàng sau khi thêm món (Mobile)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Ẩn Bottom Sheet sau mỗi lần bấm chọn món</AppText>
                    </View>
                    <Switch
                      value={localSettings.autoCloseCartMobile}
                      onValueChange={(val) => updateLocal('autoCloseCartMobile', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              )}

              {activeTab === 'thanh_toan' && (
                <View style={{ gap: 20 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Thanh toán & Phím Tiền mặt</AppText>

                  <View>
                    <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ marginBottom: 8 }}>
                      Phương thức thanh toán ưu tiên:
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { id: 'tien_mat', label: 'Tiền mặt' },
                        { id: 'qr', label: 'Mã VietQR' },
                        { id: 'card', label: 'Quẹt thẻ' },
                        { id: 'chuyen_khoan', label: 'Chuyển khoản' },
                      ].map((pm) => {
                        const sel = localSettings.defaultPaymentMethod === pm.id;
                        return (
                          <TouchableOpacity
                            key={pm.id}
                            onPress={() => updateLocal('defaultPaymentMethod', pm.id)}
                            style={{
                              width: '48%',
                              paddingVertical: 10,
                              borderRadius: shape.radius.md,
                              borderWidth: 1,
                              borderColor: sel ? colors.brand.primary : colors.border.default,
                              backgroundColor: sel ? colors.brand.primaryBg : colors.surface.app,
                              alignItems: 'center',
                            }}
                          >
                            <AppText variant="md" weight="bold" color={sel ? colors.brand.primary : colors.text.primary}>
                              {pm.label}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Bật VietQR Động</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự tạo mã QR ngân hàng khớp chính xác số tiền đơn hàng</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableDynamicQR}
                      onValueChange={(val) => updateLocal('enableDynamicQR', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              )}

              {activeTab === 'giao_dien' && (
                <View style={{ gap: 20 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Giao diện & Hiệu ứng Cảm giác</AppText>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Âm thanh phản hồi (Sound Effects)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Phát tiếng bíp nhẹ khi thêm món hoặc hoàn thành đơn</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableSoundEffects}
                      onValueChange={(val) => updateLocal('enableSoundEffects', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, pr: 12 }}>
                      <AppText variant="md" color={colors.text.primary}>Hiệu ứng rung (Haptics Feedback)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Rung nhẹ khi chạm phím trên thiết bị di động</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableHaptics}
                      onValueChange={(val) => updateLocal('enableHaptics', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Footer Actions */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: colors.surface.app,
              borderTopWidth: 1,
              borderTopColor: colors.border.default,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity onPress={resetToDefaults}>
              <AppText variant="md" color={colors.status.danger}>
                Khôi phục mặc định
              </AppText>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 18,
                  height: 44,
                  borderRadius: shape.radius.md,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="md" color={colors.text.secondary}>Hủy</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={{
                  paddingHorizontal: 24,
                  height: 44,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.brand.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="md" weight="bold" color={colors.text.inverse}>
                  Lưu Cài Đặt
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
