import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, useAppToast, StatusDotBadge } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';

const OPENING_HOURS_PRESETS = [
  '06:30 - 22:00',
  '07:00 - 22:30',
  '08:00 - 23:00',
  '24/7 Cả Ngày',
];

interface StoreInfoTabProps {
  isWide?: boolean;
  storeName: string;
  setStoreName: (v: string) => void;
  slogan: string;
  setSlogan: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  taxCode?: string;
  setTaxCode?: (v: string) => void;
  businessRegistrationName?: string;
  setBusinessRegistrationName?: (v: string) => void;
  openingHours: string;
  setOpeningHours: (v: string) => void;
  wifiName: string;
  setWifiName: (v: string) => void;
  wifiPassword: string;
  setWifiPassword: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  facebookPage: string;
  setFacebookPage: (v: string) => void;
}

export function StoreInfoTab({
  isWide: propIsWide,
  storeName,
  setStoreName,
  slogan,
  setSlogan,
  address,
  setAddress,
  phone,
  setPhone,
  taxCode = '',
  setTaxCode,
  businessRegistrationName = '',
  setBusinessRegistrationName,
  openingHours,
  setOpeningHours,
  wifiName,
  setWifiName,
  wifiPassword,
  setWifiPassword,
  website,
  setWebsite,
  facebookPage,
  setFacebookPage,
}: StoreInfoTabProps) {
  const { theme, isDark } = useTheme();
  const { isWide: responsiveWide } = useResponsive();
  const isWide = propIsWide ?? responsiveWide;
  const { showToast } = useAppToast();

  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Tính toán trạng thái quán mở hay đóng theo giờ hiện tại
  const isOpenNow = useMemo(() => {
    if (!openingHours || openingHours.includes('24/7')) return true;
    const parts = openingHours.split('-');
    if (parts.length !== 2) return true;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = parts[0].trim().split(':').map(Number);
      const [endH, endM] = parts[1].trim().split(':').map(Number);

      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return true;
    }
  }, [openingHours]);

  const handleCopy = (text: string, label: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    showToast({
      title: 'Đã sao chép',
      message: `Đã lưu ${label} vào bộ nhớ tạm`,
      type: 'success',
    });
  };

  const handlePrintWifiStandee = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    showToast({
      title: 'In Standee WiFi',
      message: `Đang gửi lệnh in thẻ bàn WiFi: ${wifiName}`,
      type: 'info',
    });
  };

  return (
    <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
      {/* 🌟 THẺ NHẬN DIỆN THƯƠNG HIỆU (BRAND PREVIEW CARD) */}
      <View
        style={[
          s.brandCard,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 14 : 0,
            borderWidth: isWide ? 1 : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <View style={s.brandCardHeader}>
          <View style={[s.brandAvatar, { backgroundColor: theme.status.readyBg }]}>
            <Icon name="storefront" size={26} color={theme.brand.accent} />
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <View style={s.brandTitleRow}>
              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                {storeName || 'Tên Quán Chưa Đặt'}
              </AppText>
              <StatusDotBadge
                status={isOpenNow ? 'active' : 'inactive'}
                label={isOpenNow ? 'Đang mở' : 'Đã đóng'}
              />
            </View>
            <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
              {slogan || 'Chưa thiết lập slogan thương hiệu'}
            </AppText>
          </View>
        </View>

        <View style={[s.brandInfoRow, { borderTopColor: theme.border.subtle }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleCopy(address, 'địa chỉ')}
            style={s.infoChip}
          >
            <Icon name="map-marker-outline" size={15} color={theme.brand.accent} />
            <AppText variant="xs" color={theme.text.primary} numberOfLines={1} style={{ flex: 1 }}>
              {address || 'Chưa nhập địa chỉ'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleCopy(phone, 'hotline')}
            style={[s.infoChip, { flex: 0.55 }]}
          >
            <Icon name="phone-outline" size={15} color={theme.brand.accent} />
            <AppText variant="xs" tabularNums color={theme.text.primary} numberOfLines={1}>
              {phone || 'Chưa nhập SĐT'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. THƯƠNG HIỆU & PHÁP NHÂN */}
      <View
        style={[
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
          },
        ]}
      >
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="shield-account-outline" size={20} color={theme.brand.primary} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Thương Hiệu & Pháp Nhân
            </AppText>
          </View>
        </View>

        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Tên thương hiệu / quán *
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={storeName}
            onChangeText={setStoreName}
            placeholder="VD: Quán Chè Bưởi & Trà Sữa An Giang"
            placeholderTextColor={theme.text.muted}
          />
        </View>

        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Slogan / Thông điệp
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={slogan}
            onChangeText={setSlogan}
            placeholder="VD: Trọn vị thanh mát — Đậm đà bản sắc!"
            placeholderTextColor={theme.text.muted}
          />
        </View>

        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Địa chỉ kinh doanh *
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={address}
            onChangeText={setAddress}
            placeholder="VD: 128 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM"
            placeholderTextColor={theme.text.muted}
          />
        </View>

        <View style={[s.rowTwo, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Hotline liên hệ *
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0392 387 165"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mã số thuế (MST / MTT)
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={taxCode}
              onChangeText={(v) => setTaxCode && setTaxCode(v)}
              keyboardType="numeric"
              placeholder="VD: 0317899888"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        </View>

        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Tên đơn vị đăng ký kinh doanh (Hóa đơn điện tử)
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={businessRegistrationName}
            onChangeText={(v) => setBusinessRegistrationName && setBusinessRegistrationName(v)}
            placeholder="VD: HỘ KINH DOANH CHÈ BƯỞI AN GIANG"
            placeholderTextColor={theme.text.muted}
          />
        </View>
      </View>

      {/* 2. GIỜ HOẠT ĐỘNG & VẬN HÀNH */}
      <View
        style={[
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
            marginTop: 10,
          },
        ]}
      >
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.readyBg }]}>
            <Icon name="clock-outline" size={20} color={theme.brand.accent} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Giờ Hoạt Động & Phục Vụ
            </AppText>
          </View>
        </View>

        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary}>
            Khung giờ mở cửa hàng ngày
          </AppText>
          <TextInput
            style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
            value={openingHours}
            onChangeText={setOpeningHours}
            placeholder="07:00 - 22:30"
            placeholderTextColor={theme.text.muted}
          />
        </View>

        {/* Chip 1-Chạm Giờ Mở Cửa */}
        <View style={s.presetsWrap}>
          {OPENING_HOURS_PRESETS.map((preset) => {
            const isSelected = openingHours === preset;
            return (
              <TouchableOpacity
                key={preset}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setOpeningHours(preset);
                }}
                style={[
                  s.presetChip,
                  {
                    backgroundColor: isSelected ? theme.brand.accent : theme.surface.header,
                    borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="sm"
                  tabularNums
                  weight={isSelected ? 'bold' : 'normal'}
                  color={isSelected ? theme.text.onBrand : theme.text.primary}
                >
                  {preset}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. MẠNG WIFI & KÊNH LIÊN HỆ */}
      <View
        style={[
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
            marginTop: 10,
          },
        ]}
      >
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.readyBg }]}>
            <Icon name="wifi" size={20} color={theme.brand.accent} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              WiFi & Kênh Khách Hàng
            </AppText>
          </View>
        </View>

        <View style={[s.rowTwo, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tên sóng WiFi (SSID)
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={wifiName}
              onChangeText={setWifiName}
              placeholder="OngChu_Tea_FreeWiFi"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mật khẩu WiFi
            </AppText>
            <View style={s.passwordInputWrap}>
              <TextInput
                style={[
                  s.input,
                  {
                    flex: 1,
                    backgroundColor: theme.surface.header,
                    color: theme.text.primary,
                    borderColor: theme.border.subtle,
                    paddingRight: 40,
                  },
                ]}
                value={wifiPassword}
                onChangeText={setWifiPassword}
                secureTextEntry={!showWifiPassword}
                placeholder="chebuoian giang"
                placeholderTextColor={theme.text.muted}
              />
              <TouchableOpacity
                onPress={() => setShowWifiPassword(!showWifiPassword)}
                style={s.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={showWifiPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.text.muted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Cụm Action WiFi: In Standee & Sao chép Pass */}
        <View style={s.wifiActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePrintWifiStandee}
            style={[s.wifiActionBtn, { backgroundColor: theme.brand.accent }]}
          >
            <Icon name="printer-pos" size={17} color={theme.text.onBrand} />
            <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
              In Standee WiFi
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleCopy(wifiPassword, 'mật khẩu WiFi')}
            style={[
              s.wifiActionBtn,
              { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Icon name="content-copy" size={16} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              Copy Pass WiFi
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={[s.rowTwo, { flexDirection: isWide ? 'row' : 'column', marginTop: 6 }]}>
          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Website Quán
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://ongchupos.vn"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          <View style={[s.formGroup, { flex: 1 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Fanpage / Zalo
            </AppText>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]}
              value={facebookPage}
              onChangeText={setFacebookPage}
              placeholder="fb.com/chebuoian giang"
              placeholderTextColor={theme.text.muted}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  brandCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  brandCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  passwordInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 34,
    justifyContent: 'center',
  },
  wifiActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  wifiActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
});
