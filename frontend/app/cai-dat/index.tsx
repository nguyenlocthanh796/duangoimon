import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { AppText, useAppToast, AppHeader, BottomNavBar, Tier1Tabs } from '../../lib/components/ui';
import { useStoreSettings, usePOSActions, StoreSettings } from '../../lib/store/usePOSStore';
import { playTapSound } from '../../lib/utils/sound';
import {
  StoreInfoTab,
  BankVietQRTab,
  BillReceiptTab,
  LiveBillPreview,
  OwnerAccountTab,
  BranchesTab,
} from './_components';
import { OperationsTab } from './_components/OperationsTab';

const SETTINGS_TABS = [
  { id: 'store' as const, label: 'Cửa Hàng', icon: 'storefront-outline' },
  { id: 'branches' as const, label: 'Chi Nhánh', icon: 'source-branch' },
  { id: 'account' as const, label: 'Tài Khoản & PIN', icon: 'shield-key-outline' },
  { id: 'bank' as const, label: 'Ngân Hàng & QR', icon: 'qrcode-scan' },
  { id: 'bill' as const, label: 'Mẫu In Bill', icon: 'receipt' },
  { id: 'ops' as const, label: 'Vận Hành', icon: 'shield-check-outline' },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const { showToast } = useAppToast();

  const storeSettings = useStoreSettings();
  const { updateStoreSettings } = usePOSActions();

  // 4 Tabs: store | bank | bill | ops
  const [activeTab, setActiveTab] = useState<SettingsTabId>('store');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleTabChange = (tab: SettingsTabId) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Form State
  const [formSettings, setFormSettings] = useState<StoreSettings>({
    ...storeSettings,
  });

  // 🔄 Kéo ngay cấu hình tươi mới từ CSDL Máy Chủ khi mở màn hình Cài Đặt
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { apiClient } = await import('../../lib/api/apiClient');
        const { mapBackendToStoreSettings } = await import('../../lib/store/settingsMapper');
        const { usePOSStore } = await import('../../lib/store/usePOSStore');
        const res = await apiClient.getSettings();
        if (isMounted && res.success && res.data) {
          const freshSettings = mapBackendToStoreSettings(res.data, usePOSStore.getState().storeSettings);
          usePOSStore.setState({ storeSettings: freshSettings });
          setFormSettings({ ...freshSettings });
        }
      } catch (_) {}
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setFormSettings({ ...storeSettings });
  }, [storeSettings]);

  const handleUpdate = (key: keyof StoreSettings, val: any) => {
    setFormSettings((prev) => ({ ...prev, [key]: val }));
    if (key === 'enableSound' || key === 'enableHaptics') {
      updateStoreSettings({ [key]: val });
    }
  };

  const handleSave = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    updateStoreSettings(formSettings);

    showToast({
      title: 'Đã lưu',
      message: 'Đã cập nhật cài đặt',
      type: 'success',
    });
  };

  // ⌨️ Phím tắt Ctrl+S (Command+S) lưu cài đặt trên Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formSettings, handleSave]);

  const handleTestPrint = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    showToast({
      title: 'In thử bill',
      message: `Đang in thử qua cổng ${formSettings.printerPort}`,
      type: 'info',
    });
  };

  const handleKickDrawer = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
    showToast({
      title: 'Đã mở két',
      message: 'Đã kích mở két RJ11',
      type: 'success',
    });
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* App Header */}
      <AppHeader
        title="Cài Đặt"
        subtitle={isWide ? `${formSettings.storeName} · Khổ ${formSettings.paperSize}` : (SETTINGS_TABS.find(t => t.id === activeTab)?.label || 'Cửa Hàng')}
        rightCustom={
          ['store', 'bank', 'bill', 'ops'].includes(activeTab) ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[s.headerSaveBtn, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="content-save-outline" size={16} color={theme.text.onBrand} />
              <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                Lưu Cài Đặt
              </AppText>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Floating Overlay Drawer */}
      
      {/* 🌟 DÃY 1: PRIMARY UNDERLINE TAB BAR (Cấp 1 - Underline Tabs 46px chuẩn Invariant 3.13) */}
      <Tier1Tabs
        tabs={SETTINGS_TABS as any}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        backgroundColor={theme.status.warningBg}
      />

      {/* Main Content Area */}
      <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
        {/* Left Column: Settings Form */}
        <ScrollView
          ref={scrollViewRef}
          key={activeTab}
          style={{ flex: isWide ? (isDesktopLarge ? 1.6 : 1.4) : 1 }}
          contentContainerStyle={[
            s.scrollContent,
            {
              padding: isWide ? 16 : 0,
              paddingBottom: isWide ? 40 : 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'store' && (
            <StoreInfoTab
              isWide={isWide}
              storeName={formSettings.storeName}
              setStoreName={(v) => handleUpdate('storeName', v)}
              slogan={formSettings.slogan}
              setSlogan={(v) => handleUpdate('slogan', v)}
              address={formSettings.address}
              setAddress={(v) => handleUpdate('address', v)}
              phone={formSettings.phone}
              setPhone={(v) => handleUpdate('phone', v)}
              taxCode={formSettings.taxCode || ''}
              setTaxCode={(v) => handleUpdate('taxCode', v)}
              businessRegistrationName={formSettings.businessRegistrationName || ''}
              setBusinessRegistrationName={(v) => handleUpdate('businessRegistrationName', v)}
              openingHours={formSettings.openingHours || ''}
              setOpeningHours={(v) => handleUpdate('openingHours', v)}
              wifiName={formSettings.wifiName}
              setWifiName={(v) => handleUpdate('wifiName', v)}
              wifiPassword={formSettings.wifiPassword}
              setWifiPassword={(v) => handleUpdate('wifiPassword', v)}
              website={formSettings.website || ''}
              setWebsite={(v) => handleUpdate('website', v)}
              facebookPage={formSettings.facebookPage || ''}
              setFacebookPage={(v) => handleUpdate('facebookPage', v)}
            />
          )}

          {activeTab === 'branches' && (
            <BranchesTab isWide={isWide} />
          )}

          {activeTab === 'account' && (
            <OwnerAccountTab isWide={isWide} />
          )}

          {activeTab === 'bank' && (
            <BankVietQRTab
              isWide={isWide}
              bankCode={formSettings.bankCode}
              setBankCode={(v) => handleUpdate('bankCode', v)}
              accountNumber={formSettings.accountNumber}
              setAccountNumber={(v) => handleUpdate('accountNumber', v)}
              accountHolder={formSettings.accountHolder}
              setAccountHolder={(v) => handleUpdate('accountHolder', v)}
              bankBranch={formSettings.bankBranch || ''}
              setBankBranch={(v) => handleUpdate('bankBranch', v)}
              transferSyntax={formSettings.transferSyntax || '[MA_DON]'}
              setTransferSyntax={(v) => handleUpdate('transferSyntax', v)}
              qrTemplate={formSettings.qrPaymentTemplate || 'compact2'}
              setQrTemplate={(v) => handleUpdate('qrPaymentTemplate', v)}
              enableVoiceAlert={formSettings.enableVoiceAlert ?? true}
              setEnableVoiceAlert={(v) => handleUpdate('enableVoiceAlert', v)}
              autoCompleteOrderOnTransfer={formSettings.autoCompleteOrderOnTransfer ?? true}
              setAutoCompleteOrderOnTransfer={(v) => handleUpdate('autoCompleteOrderOnTransfer', v)}
              autoPrintBillOnTransfer={formSettings.autoPrintBillOnTransfer ?? true}
              setAutoPrintBillOnTransfer={(v) => handleUpdate('autoPrintBillOnTransfer', v)}
              webhookApiKey={formSettings.webhookApiKey || ''}
              setWebhookApiKey={(v) => handleUpdate('webhookApiKey', v)}
              soundboxProvider={formSettings.soundboxProvider || 'mbbank'}
              setSoundboxProvider={(v) => handleUpdate('soundboxProvider', v)}
              mbSoundboxEnabled={formSettings.mbSoundboxEnabled ?? false}
              setMbSoundboxEnabled={(v) => handleUpdate('mbSoundboxEnabled', v)}
              mbSoundboxId={formSettings.mbSoundboxId || ''}
              setMbSoundboxId={(v) => handleUpdate('mbSoundboxId', v)}
              mbMerchantId={formSettings.mbMerchantId || ''}
              setMbMerchantId={(v) => handleUpdate('mbMerchantId', v)}
              mbRefPrefix={formSettings.mbRefPrefix || 'HD'}
              setMbRefPrefix={(v) => handleUpdate('mbRefPrefix', v)}
              mbRawQrString={formSettings.mbRawQrString || ''}
              setMbRawQrString={(v) => handleUpdate('mbRawQrString', v)}
            />
          )}

          {activeTab === 'bill' && (
            <BillReceiptTab
              isWide={isWide}
              settings={formSettings}
              onUpdate={handleUpdate}
              onTestPrint={handleTestPrint}
              onKickDrawer={handleKickDrawer}
            />
          )}

          {activeTab === 'ops' && (
            <OperationsTab
              isWide={isWide}
              settings={formSettings}
              onUpdate={handleUpdate}
            />
          )}
        </ScrollView>

        {/* Right Column on Tablet/Desktop: Live Bill Preview Pane */}
        {isWide && (
          <ScrollView
            style={[
              s.previewPane,
              isDesktopLarge && { width: 480, flex: undefined },
              {
                backgroundColor: theme.surface.card,
                borderLeftColor: theme.border.subtle,
                borderLeftWidth: StyleSheet.hairlineWidth,
              },
            ]}
            contentContainerStyle={{ padding: isDesktopLarge ? 24 : 16, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.previewHeader}>
              <Icon name="printer-eye" size={20} color={theme.brand.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Xem Trước Hóa Đơn
              </AppText>
            </View>
            <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', marginBottom: 12 }}>
              Khổ: {formSettings.paperSize} · Tự đồng bộ theo cài đặt
            </AppText>
            <LiveBillPreview settings={formSettings} />
          </ScrollView>
        )}
      </View>

      {/* Bottom Nav Bar on Mobile */}
      {!isWide && <BottomNavBar activeTab="cai-dat" />}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomSaveBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewPane: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
});
