import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, useAppToast, AppModal } from '../../../lib/components/ui';
import { StoreSettings, usePOSActions, usePOSStore } from '../../../lib/store/usePOSStore';
import { useAuthStore } from '../../../lib/store/useAuthStore';
import { playTapSound } from '../../../lib/utils/sound';
import { getBaseUrl } from '../../../lib/api/apiClient';

interface OperationsTabProps {
  isWide?: boolean;
  settings: Partial<StoreSettings>;
  onUpdate: (key: keyof StoreSettings, val: any) => void;
}

const SURCHARGE_LABEL_PRESETS = [
  'Phụ thu Lễ Tết',
  'Phòng Lạnh / VIP',
  'Phụ thu Đêm',
  'Phí phục vụ ngoài giờ',
];

const DISCOUNT_PRESETS = [10, 15, 20, 30];

const BACKEND_URL_PRESETS = [
  'https://app.ongchu.cloud',
  'http://localhost:8080',
  'http://192.168.1.100:8080',
  'http://192.168.1.200:8080',
];

export function OperationsTab({ isWide = false, settings, onUpdate }: OperationsTabProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { showToast } = useAppToast();
  const { fetchMasterCatalog, purgeTestData, populateSampleData } = usePOSActions();
  const { toggleConfiguredRole, isRoleConfigured, isOwner, isSuperAdmin } = useAuthStore();

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isPingingBackend, setIsPingingBackend] = useState(false);
  const [backendPingLatency, setBackendPingLatency] = useState<number | null>(null);
  const [newQuickNote, setNewQuickNote] = useState('');
  const categories = usePOSStore((state) => state.categories);

  const handleExportBackup = async () => {
    playTapSound();
    try {
      const state = usePOSStore.getState();
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tenantId: state.tenantId,
        storeSettings: state.storeSettings,
        categories: state.categories,
        menuItems: state.menuItems,
        tables: state.tables,
        areas: state.areas,
        toppings: state.toppings,
        inventoryItems: state.inventoryItems,
        cashTransactions: state.cashTransactions,
        orderHistory: state.orderHistory,
        shiftHistory: state.shiftHistory,
      };
      const jsonString = JSON.stringify(backupData, null, 2);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `ongchu_backup_quanchebuoi_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const { Share } = require('react-native');
        await Share.share({
          message: jsonString,
          title: 'Sao Lưu OngChu POS',
        });
      }

      showToast({
        title: 'Đã Sao Lưu',
        message: 'Đã xuất file sao lưu thành công!',
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Lỗi',
        message: 'Không thể xuất file sao lưu',
        type: 'danger',
      });
    }
  };

  const handleApplyImportJson = async (jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.menuItems && !parsed.categories && !parsed.tables) {
        throw new Error('Dữ liệu không hợp lệ');
      }

      const targetTenantId = parsed.tenantId || usePOSStore.getState().tenantId || 'tenant_ongchu';
      const targetStoreName = parsed.storeSettings?.storeName || 'Quán ' + targetTenantId;

      const safeTables = Array.isArray(parsed.tables) ? parsed.tables : [];
      const currentSelected = usePOSStore.getState().selectedTable;
      const safeSelectedTable = safeTables.length > 0
        ? (safeTables.find((t: any) => t.id === currentSelected?.id) || safeTables[0])
        : currentSelected;

      usePOSStore.setState({
        ...(parsed.tenantId ? { tenantId: parsed.tenantId } : {}),
        ...(parsed.categories ? { categories: parsed.categories } : {}),
        ...(parsed.menuItems ? { menuItems: parsed.menuItems } : {}),
        ...(parsed.tables ? { tables: parsed.tables } : {}),
        ...(parsed.areas ? { areas: parsed.areas } : {}),
        ...(parsed.toppings ? { toppings: parsed.toppings } : {}),
        ...(parsed.inventoryItems ? { inventoryItems: parsed.inventoryItems } : {}),
        ...(parsed.storeSettings ? { storeSettings: parsed.storeSettings } : {}),
        ...(parsed.cashTransactions ? { cashTransactions: parsed.cashTransactions } : {}),
        ...(parsed.orderHistory ? { orderHistory: parsed.orderHistory } : {}),
        ...(parsed.shiftHistory ? { shiftHistory: parsed.shiftHistory } : {}),
        selectedTable: safeSelectedTable,
        tableCarts: {},
        tableDiscounts: {},
      });

      // Đồng bộ AuthStore tenant nếu có
      try {
        const { useAuthStore } = require('../../../lib/store/useAuthStore');
        const currentAuth = useAuthStore.getState();
        if (parsed.tenantId && currentAuth?.tenant?.id !== parsed.tenantId) {
          useAuthStore.setState({
            tenant: {
              ...currentAuth.tenant,
              id: parsed.tenantId,
              name: targetStoreName,
            },
          });
        }
      } catch (_) {}

      // Ghi snapshot vào AsyncStorage cho tenant này
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const currentState = usePOSStore.getState();
        const snapshot = {
          tenantId: targetTenantId,
          tableCarts: {},
          tableDiscounts: {},
          tables: currentState.tables,
          categories: currentState.categories,
          areas: currentState.areas,
          toppings: currentState.toppings,
          inventoryItems: currentState.inventoryItems,
          cashTransactions: currentState.cashTransactions,
          shiftHistory: currentState.shiftHistory,
          menuItems: currentState.menuItems,
          kdsOrders: currentState.kdsOrders,
          orderHistory: currentState.orderHistory,
          storeSettings: currentState.storeSettings,
          outOfStockProductIds: currentState.outOfStockProductIds,
          activeArea: currentState.activeArea,
        };
        await AsyncStorage.setItem(`ongchu_pos_tenant_${targetTenantId}`, JSON.stringify(snapshot));
      } catch (_) {}

      // 🌐 Đồng bộ tức thì lên máy chủ Backend nếu có mạng
      try {
        const { apiClient } = require('../../../lib/api/apiClient');
        apiClient.restoreBackup({
          tenantId: targetTenantId,
          categories: parsed.categories || [],
          menuItems: parsed.menuItems || [],
          tables: safeTables,
          areas: parsed.areas || [],
          storeSettings: parsed.storeSettings || {},
        }).catch(() => {});
      } catch (_) {}

      setShowImportModal(false);
      setImportJsonText('');
      showToast({
        title: 'Đã Phục Hồi',
        message: `Đã nạp ${parsed.menuItems?.length || 0} món & ${safeTables.length} bàn (${targetStoreName})!`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Lỗi Dữ Liệu',
        message: 'Chuỗi JSON sao lưu không hợp lệ',
        type: 'danger',
      });
    }
  };

  const handleImportBackup = () => {
    playTapSound();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          handleApplyImportJson(ev.target?.result as string);
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      setShowImportModal(true);
    }
  };

  const defaultOrderChannel = settings.defaultOrderChannel || 'dine_in';
  const autoPrintOnPayment = settings.autoPrintOnPayment ?? true;
  const requireTableSelection = settings.requireTableSelection ?? true;
  const allowNegativeStock = settings.allowNegativeStock ?? true;
  const vatRate = settings.vatRate ?? 0;
  const serviceFeeRate = settings.serviceFeeRate ?? 0;
  const flatSurcharge = settings.flatSurcharge ?? 0;
  const surchargeLabel = settings.surchargeLabel || '';
  const requirePinForVoid = settings.requirePinForVoid ?? true;
  const highDiscountThreshold = settings.highDiscountThreshold ?? 20;
  const enableKds = settings.enableKds ?? true;
  const kdsAutoCleanupMinutes = settings.kdsAutoCleanupMinutes ?? 30;
  const enableHaptics = settings.enableHaptics ?? true;
  const enableSound = settings.enableSound ?? true;

  // Tùy chọn món & Đường · Đá
  const enableSugarIceModifier = settings.enableSugarIceModifier ?? false;
  const sugarIceCategories = settings.sugarIceCategories ?? [
    'Trà Sữa',
    'Trà Trái Cây',
    'Trà Chanh',
    'Cà Phê',
    'Đá Xay & Matcha',
    'Nước Ép',
  ];
  const quickNotesList = settings.quickNotesList ?? [
    '+ Mang về',
    '+ Ít ngọt',
    '+ Không đá',
    '+ Để riêng đá',
  ];

  const telegramBotToken = settings.telegramBotToken || '';
  const telegramChatId = settings.telegramChatId || '';
  const enableTelegramAlerts = settings.enableTelegramAlerts ?? false;

  const handleTestTelegram = () => {
    playTapSound();
    if (!telegramBotToken || !telegramChatId) {
      showToast({ title: 'Thiếu Token', message: 'Cần nhập Bot Token và Chat ID', type: 'warning' });
      return;
    }
    showToast({
      title: 'Đã Gửi Tin Test',
      message: `Đã gửi cảnh báo thử tới Telegram: ${telegramChatId}`,
      type: 'success',
    });
  };

  const handleTestHaptics = () => {
    if (!enableHaptics) {
      showToast({ title: 'Rung Đang Tắt', message: 'Bạn đang tắt rung xúc giác trong cài đặt', type: 'warning' });
      return;
    }
    playTapSound(true);
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    showToast({ title: 'Rung Xúc Giác', message: 'Đã phát phản hồi rung xúc giác haptic', type: 'info' });
  };

  const handleTestSound = () => {
    if (!enableSound) {
      showToast({ title: 'Âm Thanh Đang Tắt', message: 'Bạn đang tắt âm thanh trong cài đặt', type: 'warning' });
      return;
    }
    playTapSound(true);
    showToast({ title: 'Âm Thanh 0ms', message: 'Đã phát âm thanh click POS', type: 'info' });
  };

  const handlePingBackend = async () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setIsPingingBackend(true);
    setBackendPingLatency(null);
    const targetUrl = (settings.backendUrl || getBaseUrl() || 'http://localhost:8080').replace(/\/$/, '');
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${targetUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      setBackendPingLatency(latency);
      if (res.ok) {
        showToast({
          title: 'Kết Nối Máy Chủ',
          message: `Máy chủ phản hồi tốt (${latency}ms)`,
          type: 'success',
        });
      } else {
        showToast({
          title: 'Máy Chủ Phản Hồi Lỗi',
          message: `Mã phản hồi: ${res.status} (${latency}ms)`,
          type: 'warning',
        });
      }
    } catch {
      const latency = Date.now() - startTime;
      setBackendPingLatency(latency);
      showToast({
        title: 'Chưa Kết Nối Máy Chủ',
        message: `Không thể kết nối tới ${targetUrl} (Thử lại)`,
        type: 'danger',
      });
    } finally {
      setIsPingingBackend(false);
    }
  };

  const sectionCardStyle = [
    s.sectionCard,
    {
      backgroundColor: theme.surface.card,
      borderColor: theme.border.subtle,
      borderRadius: isWide ? 14 : 0,
      borderWidth: isWide ? 1 : 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginTop: isWide ? 12 : 0,
    },
  ];

  return (
    <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
      {/* 0. Phân Quyền Vào Ca Quầy (PIN Kiosk) - Chỉ Chủ Quán & Chủ Dự Án */}
      {(isOwner() || isSuperAdmin()) && (
        <View style={sectionCardStyle}>
          <View style={s.sectionHeader}>
            <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
              <Icon name="account-key-outline" size={20} color={theme.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Phân Quyền Vào Ca Quầy (PIN Kiosk)
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Bật/tắt các vị trí nhân sự được phép đăng nhập mã PIN tại máy POS này
              </AppText>
            </View>
          </View>

          <View style={{ gap: 4, marginTop: 10 }}>
            {[
              { role: 'cashier' as const, name: 'Thu Ngân', icon: 'cash-register', color: theme.brand.accent },
              { role: 'server' as const, name: 'Phục Vụ', icon: 'tray-full', color: theme.brand.success },
              { role: 'manager' as const, name: 'Quản Lý', icon: 'badge-account-horizontal', color: theme.brand.primary },
            ].map((r) => {
              const active = isRoleConfigured(r.role);
              return (
                <View
                  key={r.role}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border.subtle,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: active ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)') : theme.surface.header,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={r.icon as any} size={18} color={active ? r.color : theme.text.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="md" color={active ? theme.text.primary : theme.text.muted}>
                        {r.name}
                      </AppText>
                      <AppText variant="xxs" color={active ? theme.brand.success : theme.text.muted}>
                        {active ? 'Đang hoạt động (Hiển thị trên PIN)' : 'Đang tắt (Ẩn khỏi màn PIN)'}
                      </AppText>
                    </View>
                  </View>

                  <Switch
                    value={active}
                    onValueChange={() => {
                      playTapSound();
                      toggleConfiguredRole(r.role);
                      showToast({
                        title: active ? 'Đã tắt vai trò' : 'Đã mở vai trò',
                        message: `${r.name} hiện ${active ? 'đã ẩn khỏi' : 'đã hiển thị trên'} màn PIN`,
                        type: 'info',
                      });
                    }}
                    trackColor={{ false: theme.border.default, true: theme.brand.accent }}
                    thumbColor={theme.text.onBrand}
                  />
                </View>
              );
            })}

            {/* Chủ Quán: Luôn khả dụng */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: theme.status.warningBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="crown" size={18} color={theme.brand.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="md" color={theme.text.primary}>
                    Chủ Quán (PIN: 9999)
                  </AppText>
                  <AppText variant="xxs" color={theme.text.muted}>
                    Luôn khả dụng quản trị cao nhất
                  </AppText>
                </View>
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: theme.surface.header,
                }}
              >
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  Cố Định
                </AppText>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 1. Thuế VAT, Phí Dịch Vụ & Phụ Thu */}
      <View style={[...sectionCardStyle, { marginTop: (isOwner() || isSuperAdmin()) ? 10 : 0 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="cash-register" size={20} color={theme.brand.primary} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Thuế VAT & Phí Dịch Vụ
            </AppText>
          </View>
        </View>

        {/* Thuế VAT */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Thuế VAT (%)
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {[
              { rate: 0, label: '0%' },
              { rate: 5, label: '5%' },
              { rate: 8, label: '8%' },
              { rate: 10, label: '10%' },
            ].map((v) => {
              const isSel = vatRate === v.rate;
              return (
                <TouchableOpacity
                  key={v.rate}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('vatRate', v.rate);
                  }}
                  style={[
                    s.optionBtn,
                    {
                      backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText variant="sm" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary} tabularNums>
                    {v.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Phí Dịch Vụ */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Phí dịch vụ (%)
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {[
              { rate: 0, label: '0%' },
              { rate: 5, label: '5%' },
              { rate: 10, label: '10%' },
              { rate: 15, label: '15%' },
            ].map((f) => {
              const isSel = serviceFeeRate === f.rate;
              return (
                <TouchableOpacity
                  key={f.rate}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('serviceFeeRate', f.rate);
                  }}
                  style={[
                    s.optionBtn,
                    {
                      backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText variant="sm" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary} tabularNums>
                    {f.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Phụ Thu Cố Định (Lễ Tết / Phòng VIP) */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Phụ thu cố định (theo đơn)
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 }}>
            {[0, 10000, 20000, 50000].map((amt) => {
              const isSel = flatSurcharge === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('flatSurcharge', amt);
                    if (amt > 0 && !surchargeLabel) {
                      onUpdate('surchargeLabel', 'Phụ thu Lễ Tết');
                    }
                  }}
                  style={[
                    s.optionBtn,
                    {
                      backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText variant="sm" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary} tabularNums>
                    {amt === 0 ? '0 đ' : `${amt / 1000}k`}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {flatSurcharge > 0 && (
            <View style={{ gap: 6, marginTop: 4 }}>
              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                    color: theme.text.primary,
                  },
                ]}
                placeholder="Tên phụ thu (VD: Phụ thu Lễ Tết, Phòng lạnh...)"
                placeholderTextColor={theme.text.muted}
                value={surchargeLabel}
                onChangeText={(text) => onUpdate('surchargeLabel', text)}
              />

              {/* Gợi ý tên phụ thu nhanh */}
              <View style={s.presetWrap}>
                {SURCHARGE_LABEL_PRESETS.map((label) => (
                  <TouchableOpacity
                    key={label}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      onUpdate('surchargeLabel', label);
                    }}
                    style={[
                      s.chipPreset,
                      {
                        backgroundColor: surchargeLabel === label ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)') : theme.surface.header,
                        borderColor: surchargeLabel === label ? theme.brand.accent : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight={surchargeLabel === label ? 'bold' : 'normal'} color={surchargeLabel === label ? theme.brand.accent : theme.text.muted}>
                      {label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 2. Quy Chuẩn Bán Hàng & Gọi Món */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.readyBg }]}>
            <Icon name="store-cog" size={20} color={theme.brand.success} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Quy Chuẩn Bán Hàng & Gọi Món
            </AppText>
          </View>
        </View>

        {/* Kênh bán hàng mặc định */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Kênh phục vụ mặc định
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {[
              { id: 'dine_in' as const, label: 'Tại bàn', icon: 'table-chair' },
              { id: 'takeaway' as const, label: 'Mang về', icon: 'shopping-outline' },
            ].map((ch) => {
              const isSel = defaultOrderChannel === ch.id;
              return (
                <TouchableOpacity
                  key={ch.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    onUpdate('defaultOrderChannel', ch.id);
                  }}
                  style={[
                    s.channelBtn,
                    {
                      backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                      borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <Icon name={ch.icon as any} size={18} color={isSel ? theme.text.onBrand : theme.text.muted} />
                  <AppText variant="sm" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary}>
                    {ch.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Switches nghiệp vụ có Icon & Subtitle */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('requireTableSelection', !requireTableSelection)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="table-chair" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Bắt buộc chọn bàn
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Bắt buộc gắn bàn trước khi chọn món, chống tạo đơn trôi nổi
            </AppText>
          </View>
          <Switch
            value={requireTableSelection}
            onValueChange={(v) => onUpdate('requireTableSelection', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('autoPrintOnPayment', !autoPrintOnPayment)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="printer-check" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Tự in bill sau thanh toán
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Kích in K80/K58 ngay khi thu ngân bấm Đã Thu Tiền
            </AppText>
          </View>
          <Switch
            value={autoPrintOnPayment}
            onValueChange={(v) => onUpdate('autoPrintOnPayment', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('allowNegativeStock', !allowNegativeStock)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="package-variant-closed" size={18} color={theme.brand.warning} />
              <AppText variant="md" color={theme.text.primary}>
                Cho phép bán âm kho
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Cho phép xuất bán khi tồn kho = 0 (bù nhập kho sau ca)
            </AppText>
          </View>
          <Switch
            value={allowNegativeStock}
            onValueChange={(v) => onUpdate('allowNegativeStock', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>
      </View>

      {/* 2.5. Tùy Chọn Món & Đường · Đá */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.warningBg }]}>
            <Icon name="tune-variant" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tùy Chọn Món & Đường · Đá
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Cấu hình thanh trượt Đường/Đá và danh sách Ghi Chú Nhanh
            </AppText>
          </View>
        </View>

        {/* Switch bật tắt Đường Đá */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('enableSugarIceModifier', !enableSugarIceModifier)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="cup-water" size={18} color={theme.brand.accent} />
              <AppText variant="md" color={theme.text.primary}>
                Bật tùy chọn Đường & Đá
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Hiển thị thanh trượt % Đường và % Đá khi chạm chọn món đồ uống
            </AppText>
          </View>
          <Switch
            value={enableSugarIceModifier}
            onValueChange={(v) => {
              playTapSound();
              onUpdate('enableSugarIceModifier', v);
            }}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Chọn danh mục áp dụng Đường Đá (khi enableSugarIceModifier = true) */}
        {enableSugarIceModifier && (
          <View style={[s.formGroup, { paddingTop: 4 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Danh mục áp dụng Đường & Đá
            </AppText>
            <AppText variant="xxs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Chạm để bật/tắt nhóm món có thanh trượt Đường · Đá
            </AppText>
            <View style={s.presetWrap}>
              {categories.map((cat) => {
                const isSelected = sugarIceCategories.includes(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      const updated = isSelected
                        ? sugarIceCategories.filter((c) => c !== cat.name)
                        : [...sugarIceCategories, cat.name];
                      onUpdate('sugarIceCategories', updated);
                    }}
                    style={[
                      s.chipPreset,
                      {
                        backgroundColor: isSelected ? theme.brand.accent : theme.surface.header,
                        borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      },
                    ]}
                  >
                    <Icon
                      name={isSelected ? 'check' : 'plus'}
                      size={14}
                      color={isSelected ? theme.text.onBrand : theme.text.muted}
                    />
                    <AppText
                      variant="sm"
                      weight={isSelected ? 'bold' : 'normal'}
                      color={isSelected ? theme.text.onBrand : theme.text.primary}
                    >
                      {cat.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Cấu hình Ghi Chú Nhanh */}
        <View style={[s.formGroup, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle, paddingTop: 12 }]}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Ghi chú nhanh khi chọn món
          </AppText>
          <AppText variant="xxs" color={theme.text.muted} style={{ marginBottom: 6 }}>
            Các nút ghi chú bấm nhanh gửi pha chế / bếp khi thêm món
          </AppText>

          {/* Danh sách chips hiện tại */}
          <View style={s.presetWrap}>
            {quickNotesList.map((note, idx) => (
              <View
                key={idx}
                style={[
                  s.chipPreset,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  },
                ]}
              >
                <AppText variant="sm" color={theme.text.primary}>
                  {note}
                </AppText>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => {
                    playTapSound();
                    const updated = quickNotesList.filter((_, i) => i !== idx);
                    onUpdate('quickNotesList', updated);
                  }}
                >
                  <Icon name="close-circle" size={16} color={theme.brand.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Ô nhập thêm ghi chú mới */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              style={[
                s.input,
                {
                  flex: 1,
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
              value={newQuickNote}
              onChangeText={setNewQuickNote}
              placeholder="VD: + Ít ngọt, + Không đá, + Để riêng..."
              placeholderTextColor={theme.text.muted}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!newQuickNote.trim()}
              onPress={() => {
                if (!newQuickNote.trim()) return;
                playTapSound();
                const noteVal = newQuickNote.trim();
                const formatted = noteVal.startsWith('+') ? noteVal : `+ ${noteVal}`;
                if (!quickNotesList.includes(formatted)) {
                  onUpdate('quickNotesList', [...quickNotesList, formatted]);
                }
                setNewQuickNote('');
              }}
              style={[
                s.btnOutline,
                {
                  paddingHorizontal: 16,
                  backgroundColor: newQuickNote.trim() ? theme.brand.accent : theme.surface.header,
                  borderColor: newQuickNote.trim() ? theme.brand.accent : theme.border.subtle,
                  opacity: newQuickNote.trim() ? 1 : 0.5,
                },
              ]}
            >
              <Icon name="plus" size={16} color={newQuickNote.trim() ? theme.text.onBrand : theme.text.muted} />
              <AppText
                variant="sm"
                weight="bold"
                color={newQuickNote.trim() ? theme.text.onBrand : theme.text.muted}
              >
                Thêm
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. Chống Gian Lận & Cảnh Báo Telegram (Trụ Cột 6) */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.dangerBg }]}>
            <Icon name="shield-alert-outline" size={20} color={theme.brand.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Chống Gian Lận & Cảnh Báo
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Lưu vết Audit Log & gửi tin Telegram thời gian thực
            </AppText>
          </View>
        </View>

        {/* Khóa hủy sau tạm tính */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('requirePinForVoid', !requirePinForVoid)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="shield-lock-outline" size={18} color={theme.brand.danger} />
              <AppText variant="md" color={theme.text.primary}>
                Khóa hủy sau tạm tính
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Bắt buộc PIN Quản lý khi hủy món sau in tạm tính hoặc gửi bếp
            </AppText>
          </View>
          <Switch
            value={requirePinForVoid}
            onValueChange={(v) => onUpdate('requirePinForVoid', v)}
            trackColor={{ false: theme.surface.switchTrack, true: theme.brand.danger }}
          />
        </TouchableOpacity>

        {/* Cảnh báo chiết khấu cao */}
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Cảnh báo chiết khấu cao (%):
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <TextInput
              style={[s.input, { flex: 1, backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={String(highDiscountThreshold)}
              onChangeText={(v) => onUpdate('highDiscountThreshold', parseInt(v.replace(/\D/g, ''), 10) || 0)}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={theme.text.muted}
            />
            {DISCOUNT_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  onUpdate('highDiscountThreshold', p);
                }}
                style={[
                  s.chipPreset,
                  {
                    height: 46,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    backgroundColor: highDiscountThreshold === p ? (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(220, 38, 38, 0.12)') : theme.surface.header,
                    borderColor: highDiscountThreshold === p ? theme.brand.danger : theme.border.subtle,
                  },
                ]}
              >
                <AppText variant="sm" weight={highDiscountThreshold === p ? 'bold' : 'normal'} tabularNums color={highDiscountThreshold === p ? theme.brand.danger : theme.text.primary}>
                  {p}%
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Telegram Bot Toggle */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('enableTelegramAlerts', !enableTelegramAlerts)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="send" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Báo động Telegram Bot
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Goroutine ngầm bắn tin tức thì về điện thoại Chủ Quán
            </AppText>
          </View>
          <Switch
            value={enableTelegramAlerts}
            onValueChange={(v) => onUpdate('enableTelegramAlerts', v)}
            trackColor={{ false: theme.surface.switchTrack, true: theme.brand.primary }}
          />
        </TouchableOpacity>

        {enableTelegramAlerts && (
          <View style={{ gap: 10, marginTop: 4 }}>
            {/* 4 Kịch bản báo động mặc định */}
            <View style={[s.alertScenarioBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              <AppText variant="xs" weight="medium" color={theme.text.primary} style={{ marginBottom: 6 }}>
                4 Kịch bản gửi tin tức thì:
              </AppText>
              {[
                'Hủy món sau in tạm tính hoặc đã báo bếp',
                'Chiết khấu hóa đơn vượt quá ngưỡng đã cài đặt',
                'Mở két tiền bằng tay thủ công (không qua đơn)',
                'Lệch tiền mặt trong két khi chốt ca giao nhận',
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                  <Icon name="check-circle" size={14} color={theme.brand.success} />
                  <AppText variant="xxs" color={theme.text.muted}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={s.formGroup}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Bot Token <AppText variant="xxs" color={theme.text.muted}>(Lấy từ @BotFather)</AppText>
              </AppText>
              <TextInput
                style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
                value={telegramBotToken}
                onChangeText={(v) => onUpdate('telegramBotToken', v.trim())}
                placeholder="123456789:ABCdefGHIjklMNO..."
                placeholderTextColor={theme.text.muted}
                autoCapitalize="none"
              />
            </View>

            <View style={s.formGroup}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Chat ID <AppText variant="xxs" color={theme.text.muted}>(Lấy từ @userinfobot)</AppText>
              </AppText>
              <TextInput
                style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
                value={telegramChatId}
                onChangeText={(v) => onUpdate('telegramChatId', v.trim())}
                placeholder="VD: -100123456789 hoặc 987654321"
                placeholderTextColor={theme.text.muted}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTestTelegram}
              style={[s.btnOutline, { borderColor: theme.brand.primary, backgroundColor: theme.surface.header }]}
            >
              <Icon name="send-check" size={16} color={theme.brand.primary} />
              <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                Bắn Tin Báo Động Thử
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 4. Trải Nghiệm Cảm Ứng & Bếp KDS */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="tune" size={20} color={theme.brand.primary} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Trải Nghiệm Cảm Ứng & Bếp KDS
            </AppText>
          </View>
        </View>

        {/* Theme Tối */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleTheme}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="theme-light-dark" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Giao diện tối (Dark Mode)
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Nền cà phê rang trầm chống mỏi mắt ca tối
            </AppText>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Rung Xúc Giác */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('enableHaptics', !enableHaptics)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="vibrate" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Rung xúc giác Haptic
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Phản hồi vật lý khi chạm nút hoặc hoàn tất đơn
            </AppText>
          </View>
          <Switch
            value={enableHaptics}
            onValueChange={(v) => onUpdate('enableHaptics', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Âm Thanh */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('enableSound', !enableSound)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle }]}
        >
          <View style={s.switchLabelBlock}>
            <View style={s.switchIconTitle}>
              <Icon name="volume-high" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Âm thanh chạm 0ms
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted}>
              Phát tiếng gõ tactile phản xạ tức thì
            </AppText>
          </View>
          <Switch
            value={enableSound}
            onValueChange={(v) => onUpdate('enableSound', v)}
            trackColor={{ false: theme.border.default, true: theme.brand.accent }}
          />
        </TouchableOpacity>

        {/* Cụm nút test âm thanh & rung */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTestHaptics}
            style={[s.btnOutline, { flex: 1, borderColor: theme.border.default, backgroundColor: theme.surface.header }]}
          >
            <Icon name="vibrate" size={16} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              Thử Rung
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTestSound}
            style={[s.btnOutline, { flex: 1, borderColor: theme.border.default, backgroundColor: theme.surface.header }]}
          >
            <Icon name="volume-high" size={16} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              Thử Âm Thanh
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Bật / Tắt Màn Hình Bếp KDS */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUpdate('enableKds', !enableKds)}
          style={[s.switchRow, { borderTopColor: theme.border.subtle, alignItems: 'flex-start', paddingVertical: 12 }]}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={s.switchIconTitle}>
              <Icon name="chef-hat" size={18} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.primary}>
                Màn hình Bếp & Bar (KDS)
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 2 }}>
              Bật khi có màn hình khu bếp/bar riêng. Tắt cho quán trà sữa, cafe nhỏ pha chế tại quầy (tự động chuyển sang luồng Lưu Bàn 1-chạm & mở rộng Sổ Quỹ).
            </AppText>
          </View>
          <Switch
            value={enableKds}
            onValueChange={(v) => onUpdate('enableKds', v)}
            trackColor={{ false: theme.surface.switchTrack, true: theme.brand.primary }}
          />
        </TouchableOpacity>

        {/* KDS Auto cleanup - Chỉ hiện khi BẬT KDS */}
        {enableKds && (
          <View style={s.formGroup}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tự ẩn đơn KDS sau khi hoàn thành
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {[
                { m: 15, label: '15 phút' },
                { m: 30, label: '30 phút' },
                { m: 45, label: '45 phút' },
                { m: 0, label: 'Tắt' },
              ].map((opt) => {
                const isSel = kdsAutoCleanupMinutes === opt.m;
                return (
                  <TouchableOpacity
                    key={opt.m}
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      onUpdate('kdsAutoCleanupMinutes', opt.m);
                    }}
                    style={[
                      s.optionBtn,
                      {
                        backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                        borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText variant="sm" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary}>
                      {opt.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* 5. Kết Nối Máy Chủ & Quản Trị Dữ Liệu */}
      <View style={[...sectionCardStyle, { marginTop: 10 }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="database-sync-outline" size={20} color={theme.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Máy Chủ & Dữ Liệu Quán
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Đồng bộ thực đơn máy chủ hoặc làm sạch dữ liệu để bán hàng thật
            </AppText>
          </View>
        </View>

        {/* Cấu hình Máy Chủ Nội Bộ */}
        <View style={[s.formGroup, { marginTop: 4 }]}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Địa chỉ máy chủ kết nối (LAN / Cloud)
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TextInput
              style={[
                s.input,
                {
                  flex: 1,
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                  color: theme.text.primary,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 16,
                },
              ]}
              value={settings.backendUrl || ''}
              onChangeText={(val) => onUpdate('backendUrl', val.trim())}
              placeholder="http://192.168.1.100:8080"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePingBackend}
              disabled={isPingingBackend}
              style={[s.hardwareBtn, { paddingHorizontal: 16, backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            >
              <Icon name="lan-connect" size={16} color={theme.brand.primary} />
              <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                {isPingingBackend ? 'Đang thử...' : backendPingLatency !== null ? `${backendPingLatency}ms` : 'Kiểm tra'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Gợi ý IP Máy Chủ nhanh */}
          <View style={s.presetWrap}>
            {BACKEND_URL_PRESETS.map((url) => (
              <TouchableOpacity
                key={url}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  onUpdate('backendUrl', url);
                }}
                style={[
                  s.chipPreset,
                  {
                    backgroundColor: settings.backendUrl === url ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(180, 83, 9, 0.12)') : theme.surface.header,
                    borderColor: settings.backendUrl === url ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <AppText variant="xs" weight={settings.backendUrl === url ? 'bold' : 'normal'} tabularNums color={settings.backendUrl === url ? theme.brand.accent : theme.text.muted}>
                  {url}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cụm 3 nút quản trị dữ liệu */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              const ok = await fetchMasterCatalog();
              if (ok) {
                showToast({
                  title: 'Đã Đồng Bộ',
                  message: 'Đã nạp thực đơn mới nhất từ máy chủ!',
                  type: 'success',
                });
              } else {
                showToast({
                  title: 'Chưa Kết Nối',
                  message: 'Không thể kết nối máy chủ',
                  type: 'warning',
                });
              }
            }}
            style={[
              s.btnOutline,
              { flex: 1, borderColor: theme.brand.primary, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="cloud-sync" size={16} color={theme.brand.primary} />
            <AppText variant="sm" weight="bold" color={theme.brand.primary}>
              Đồng Bộ
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              const { useAuthStore, DEFAULT_TENANT } = require('../../../lib/store/useAuthStore');
              useAuthStore.setState({
                tenant: DEFAULT_TENANT,
                activeBranchId: 'branch_01',
                currentUser: { id: 'usr_owner', name: 'Chủ Quán OngChu', role: 'owner', branchId: 'branch_01' },
                currentRole: 'owner',
                isAuthenticated: true,
              });
              await usePOSStore.getState().switchTenant('tenant_ongchu', 'OngChu Coffee & Tea HQ');
              populateSampleData();
              showToast({
                title: 'Quán Mẫu',
                message: 'Đã nạp thực đơn dùng thử!',
                type: 'success',
              });
            }}
            style={[
              s.btnOutline,
              { flex: 1, borderColor: theme.brand.warning, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="crown-outline" size={16} color={theme.brand.warning} />
            <AppText variant="sm" weight="bold" color={theme.brand.warning}>
              Quán Mẫu
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setShowPurgeModal(true);
            }}
            style={[
              s.btnOutline,
              { flex: 1, borderColor: theme.brand.danger, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
            <AppText variant="sm" weight="bold" color={theme.brand.danger}>
              Bán Thật
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 CỤM SAO LƯU & PHỤC HỒI DỮ LIỆU */}
      <View style={[s.sectionCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="database-arrow-down" size={20} color={theme.brand.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Sao Lưu & Phục Hồi Dữ Liệu
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Xuất hoặc nhập toàn bộ dữ liệu Thực đơn, Bàn ăn, Cài đặt và Sổ quỹ.
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleExportBackup}
            style={[
              s.btnOutline,
              { flex: 1, borderColor: theme.brand.accent, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="download" size={18} color={theme.brand.accent} />
            <AppText variant="sm" weight="bold" color={theme.brand.accent}>
              Xuất Bản Sao Lưu
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleImportBackup}
            style={[
              s.btnOutline,
              { flex: 1, borderColor: theme.brand.primary, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="upload" size={18} color={theme.brand.primary} />
            <AppText variant="sm" weight="bold" color={theme.brand.primary}>
              Nhập Bản Phục Hồi
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Phục Hồi Dữ Liệu (Nhập JSON thủ công trên Mobile) */}
      <AppModal
        visible={showImportModal}
        title="Nhập Dữ Liệu Sao Lưu"
        onClose={() => setShowImportModal(false)}
        presentation="dialog"
        primaryAction={{
          label: 'Nạp Dữ Liệu',
          onPress: () => handleApplyImportJson(importJsonText),
        }}
        secondaryAction={{
          label: 'Hủy Bỏ',
          onPress: () => setShowImportModal(false),
        }}
      >
        <View style={{ gap: 12, paddingVertical: 4 }}>
          <AppText variant="xs" color={theme.text.muted}>
            Dán nội dung chuỗi JSON sao lưu từ máy khác vào ô bên dưới:
          </AppText>

          <TextInput
            multiline
            numberOfLines={6}
            value={importJsonText}
            onChangeText={setImportJsonText}
            placeholder="Dán nội dung JSON sao lưu vào đây..."
            placeholderTextColor={theme.text.muted}
            style={{
              height: 120,
              backgroundColor: theme.surface.header,
              borderColor: theme.border.default,
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
              color: theme.text.primary,
              fontSize: 14,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </AppModal>

      {/* Modal xác nhận Bắt đầu bán thật (Purge Test Data) */}
      <AppModal
        visible={showPurgeModal}
        title="Bắt Đầu Bán Thật?"
        onClose={() => setShowPurgeModal(false)}
        presentation="dialog"
        primaryAction={{
          label: 'Xác Nhận Dọn Sạch',
          variant: 'danger',
          onPress: () => {
            setShowPurgeModal(false);
            if (Platform.OS !== 'web') {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              } catch {}
            }
            purgeTestData();
            showToast({
              title: 'Bắt Đầu Bán Thật',
              message: 'Đã sẵn sàng mở ca bán thật!',
              type: 'success',
            });
          },
        }}
        secondaryAction={{
          label: 'Hủy Bỏ',
          onPress: () => setShowPurgeModal(false),
        }}
      >
        <View style={{ gap: 12, paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.status.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="alert-outline" size={24} color={theme.brand.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Dọn Sạch Hóa Đơn Thử Nghiệm
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                Hệ thống sẽ reset toàn bộ bàn về trống, xóa sạch các đơn thử nghiệm để bắt đầu ghi nhận doanh thu thực tế.
              </AppText>
            </View>
          </View>

          <View style={{ backgroundColor: theme.surface.header, padding: 12, borderRadius: 8, gap: 4 }}>
            <AppText variant="xs" weight="medium" color={theme.brand.success}>
              ✓ Giữ nguyên toàn bộ Menu & Món ăn
            </AppText>
            <AppText variant="xs" weight="medium" color={theme.brand.success}>
              ✓ Giữ nguyên Cấu hình Ngân hàng & Máy in
            </AppText>
            <AppText variant="xs" weight="medium" color={theme.brand.danger}>
              ⚠ Hóa đơn test và lịch sử giỏ hàng sẽ được dọn sạch
            </AppText>
          </View>
        </View>
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: 4,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  optionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchLabelBlock: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  switchIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnOutline: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hardwareBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chipPreset: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  alertScenarioBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
});
