import React, { useState } from 'react';
import { View, ScrollView, TextInput, Switch, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import { usePOSSettings, POSSettings } from '../../lib/hooks/usePOSSettings';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import AppText from '../../lib/components/ui/AppText';

type TabType = 'in_an' | 'van_hanh' | 'thanh_toan' | 'giao_dien';

export default function POSSettingsScreen() {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const { settings, updateSettings, resetToDefaults } = usePOSSettings();
  const [activeTab, setActiveTab] = useState<TabType>('in_an');
  const [localSettings, setLocalSettings] = useState<POSSettings>(settings);
  const [savedToast, setSavedToast] = useState(false);

  // Sync state when settings are loaded
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      router.push('/ban-hang');
    }, 1200);
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <UnifiedHeader
        title="Cài Đặt Bán Hàng"
        subtitle="Cấu hình in ấn, gọi món, VAT, thanh toán & giao diện"
        onMenuPress={openSidebar}
        onBack={() => router.push('/ban-hang')}
      />

      <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
        {/* Navigation Tabs Bar */}
        <View
          style={{
            width: isWide ? 260 : '100%',
            backgroundColor: colors.surface.card,
            borderRightWidth: isWide ? 1 : 0,
            borderBottomWidth: isWide ? 0 : 1,
            borderColor: colors.border.default,
            paddingVertical: 12,
          }}
        >
          <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: isWide ? 'column' : 'row', gap: 6, paddingHorizontal: 12 }}>
              {TABS.map((t) => {
                const active = activeTab === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setActiveTab(t.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: shape.radius.md,
                      backgroundColor: active ? colors.brand.primaryBg : 'transparent',
                      borderLeftWidth: isWide && active ? 4 : 0,
                      borderLeftColor: colors.brand.primary,
                    }}
                  >
                    <Icon name={t.icon as any} size={22} color={active ? colors.brand.primary : colors.icon.muted} />
                    <AppText
                      variant="md"
                      weight={active ? 'bold' : 'normal'}
                      color={active ? colors.brand.primary : colors.text.primary}
                    >
                      {t.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
          <ScrollView contentContainerStyle={{ padding: isWide ? 24 : 16, gap: 20 }}>
            {activeTab === 'in_an' && (
              <View style={{ gap: 20 }}>
                <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
                  <AppText variant="lg" weight="bold" color={colors.text.primary}>
                    Cấu hình In ấn & Mẫu Hóa đơn
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Tùy chỉnh tự động in, khổ giấy in và nội dung tiêu đề/lời chúc hóa đơn
                  </AppText>
                </View>

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color={colors.text.primary}>Tự động in hóa đơn khi thanh toán</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự động bật cửa sổ in khi hoàn thành đơn hàng</AppText>
                    </View>
                    <Switch
                      value={localSettings.autoPrintReceipt}
                      onValueChange={(val) => updateLocal('autoPrintReceipt', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color={colors.text.primary}>Tự động in phiếu bếp khi gửi bếp</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự động in phiếu order các món mới xuống nhà bếp</AppText>
                    </View>
                    <Switch
                      value={localSettings.autoPrintKitchenTicket}
                      onValueChange={(val) => updateLocal('autoPrintKitchenTicket', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Khổ giấy in mặc định:</AppText>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {(['K80', 'K57'] as const).map((paper) => {
                      const sel = localSettings.paperSize === paper;
                      return (
                        <TouchableOpacity
                          key={paper}
                          onPress={() => updateLocal('paperSize', paper)}
                          style={{
                            flex: 1,
                            paddingVertical: 14,
                            paddingHorizontal: 12,
                            borderRadius: shape.radius.md,
                            borderWidth: 1.5,
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

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Nội dung hiển thị Hóa đơn:</AppText>
                  
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
                        paddingHorizontal: 14,
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
                        paddingHorizontal: 14,
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
                      numberOfLines={3}
                      style={{
                        backgroundColor: colors.surface.app,
                        borderWidth: 1,
                        borderColor: colors.border.default,
                        borderRadius: shape.radius.md,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        ...font.md,
                        color: colors.text.primary,
                        height: 70,
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'van_hanh' && (
              <View style={{ gap: 20 }}>
                <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
                  <AppText variant="lg" weight="bold" color={colors.text.primary}>
                    Quy trình Gọi món & Vận hành
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Cài đặt thuế VAT, phụ thu dịch vụ và hình thức phục vụ mặc định
                  </AppText>
                </View>

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Hình thức phục vụ mặc định khi mở giỏ hàng:</AppText>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
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
                            paddingVertical: 14,
                            borderRadius: shape.radius.md,
                            borderWidth: 1.5,
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

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Thuế VAT mặc định (%):</AppText>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[0, 8, 10].map((rate) => {
                      const sel = localSettings.defaultVatRate === rate;
                      return (
                        <TouchableOpacity
                          key={rate}
                          onPress={() => updateLocal('defaultVatRate', rate)}
                          style={{
                            flex: 1,
                            paddingVertical: 14,
                            borderRadius: shape.radius.md,
                            borderWidth: 1.5,
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

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color={colors.text.primary}>Cho phép sửa giá món trực tiếp khi gọi món</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Thu ngân có thể nhập giá tùy chỉnh cho món ăn trên giỏ hàng</AppText>
                    </View>
                    <Switch
                      value={localSettings.allowPriceEdit}
                      onValueChange={(val) => updateLocal('allowPriceEdit', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'thanh_toan' && (
              <View style={{ gap: 20 }}>
                <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
                  <AppText variant="lg" weight="bold" color={colors.text.primary}>
                    Thanh toán & Phím Tiền mặt
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Cài đặt phương thức ưu tiên và tích hợp VietQR
                  </AppText>
                </View>

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <AppText variant="md" weight="bold" color={colors.text.primary}>Phương thức thanh toán ưu tiên mặc định:</AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
                            paddingVertical: 14,
                            borderRadius: shape.radius.md,
                            borderWidth: 1.5,
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

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color={colors.text.primary}>Bật VietQR Động</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Tự tạo mã QR có sẵn số tiền thanh toán chính xác</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableDynamicQR}
                      onValueChange={(val) => updateLocal('enableDynamicQR', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'giao_dien' && (
              <View style={{ gap: 20 }}>
                <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
                  <AppText variant="lg" weight="bold" color={colors.text.primary}>
                    Giao diện & Hiệu ứng Phản hồi
                  </AppText>
                  <AppText variant="sm" color={colors.text.muted}>
                    Tùy chỉnh âm thanh bíp và hiệu ứng rung Haptics
                  </AppText>
                </View>

                <View style={{ backgroundColor: colors.surface.card, padding: 16, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.default, gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color={colors.text.primary}>Âm thanh phản hồi (Sound Effects)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Phát tiếng bíp nhẹ khi thêm món hoặc thanh toán</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableSoundEffects}
                      onValueChange={(val) => updateLocal('enableSoundEffects', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>

                  <View style={{ height: 1, backgroundColor: colors.border.light }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <AppText variant="md" weight="bold" color={colors.text.primary}>Hiệu ứng rung (Haptics Feedback)</AppText>
                      <AppText variant="sm" color={colors.text.muted}>Rung nhẹ khi thao tác trên các thiết bị di động</AppText>
                    </View>
                    <Switch
                      value={localSettings.enableHaptics}
                      onValueChange={(val) => updateLocal('enableHaptics', val)}
                      trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Bottom Action Footer */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.surface.card,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={resetToDefaults}>
          <AppText variant="md" weight="bold" color={colors.status.danger}>
            Khôi phục mặc định
          </AppText>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/ban-hang')}
            style={{
              paddingHorizontal: 20,
              height: 48,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: colors.border.default,
              backgroundColor: colors.surface.app,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="md" color={colors.text.secondary}>Thoát</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            style={{
              paddingHorizontal: 28,
              height: 48,
              borderRadius: shape.radius.md,
              backgroundColor: colors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="md" weight="bold" color={colors.text.inverse}>
              {savedToast ? 'Đã Lưu Thành Công ✓' : 'Lưu Cài Đặt'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
