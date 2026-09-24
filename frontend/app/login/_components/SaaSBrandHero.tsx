import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';
import { useAuthStore } from '../../../lib/store/useAuthStore';

export const SaaSBrandHero: React.FC = () => {
  const { theme, isDark } = useTheme();
  const tenant = useAuthStore((s) => s.tenant);
  const deviceBinding = useAuthStore((s) => s.deviceBinding);
  const isBound = Boolean(deviceBinding?.isBound);

  return (
    <View style={s.container}>
      {/* Background Poster Image */}
      <ExpoImage
        source={require('../../../assets/images/login_bg.jpg')}
        style={s.bgImage}
        contentFit="cover"
        priority="high"
      />

      {/* Dark Glass Scrim Overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(11, 15, 25, 0.88)'
              : 'rgba(15, 23, 42, 0.82)',
          },
        ]}
      />

      {/* Hero Content */}
      <View style={s.content}>
        {/* Brand Header */}
        <View style={s.brandHeader}>
          <ExpoImage
            source={require('../../../assets/logo_ongchu_clean.png')}
            style={s.brandLogoImage}
            contentFit="contain"
          />
          <View>
            <AppText variant="lg" weight="bold" color={theme.text.inverse}>
              OngChu Lean POS
            </AppText>
            <AppText variant="xs" color="rgba(255, 255, 255, 0.75)">
              Hệ Thống POS F&B Thực Chiến Vị Chủ Quán
            </AppText>
          </View>
        </View>

        {/* Core Pillars Feature Badges */}
        <View style={s.pillarsList}>
          <View style={s.pillarItem}>
            <View style={[s.pillarIcon, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
              <Icon name="lightning-bolt" size={20} color={theme.brand.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="medium" color={theme.text.inverse}>
                Bán Hàng Ngoại Tuyến 0ms
              </AppText>
              <AppText variant="xs" color="rgba(255, 255, 255, 0.75)" style={{ marginTop: 2 }}>
                Không sợ rớt mạng Internet, tự động đồng bộ khi có kết nối
              </AppText>
            </View>
          </View>

          <View style={s.pillarItem}>
            <View style={[s.pillarIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Icon name="printer" size={20} color={theme.brand.success} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="medium" color={theme.text.inverse}>
                In Nhiệt ESC/POS Trực Tiếp
              </AppText>
              <AppText variant="xs" color="rgba(255, 255, 255, 0.75)" style={{ marginTop: 2 }}>
                In bill K80/K58 cổng 9100, mở két RJ11 không cần driver Windows
              </AppText>
            </View>
          </View>

          <View style={s.pillarItem}>
            <View style={[s.pillarIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Icon name="cash-register" size={20} color={theme.brand.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="medium" color={theme.text.inverse}>
                Sổ Quỹ Chi Chợ 3 Giây
              </AppText>
              <AppText variant="xs" color="rgba(255, 255, 255, 0.75)" style={{ marginTop: 2 }}>
                Ghi chép tiền mặt thực tế, giao ca đếm két 30s chống thất thoát
              </AppText>
            </View>
          </View>
        </View>

        {/* SaaS Subscription License Card */}
        <View style={s.licenseCard}>
          <View style={s.licenseHeader}>
            <View style={s.licenseBadge}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' }} />
              <AppText variant="xs" weight="medium" color="rgba(255, 255, 255, 0.92)">
                {isBound ? 'BẢN QUYỀN SAAS CHÍNH THỨC' : 'HỆ THỐNG CLOUD POS SẴN SÀNG'}
              </AppText>
            </View>
            <AppText variant="xs" color="rgba(255, 255, 255, 0.6)" tabularNums>
              Gói {tenant?.subscriptionPlan ? tenant.subscriptionPlan.toUpperCase() : 'PRO'}
            </AppText>
          </View>

          <AppText variant="sm" weight="medium" color={theme.text.inverse} style={{ marginTop: 8 }}>
            {isBound && deviceBinding?.tenantName ? deviceBinding.tenantName : 'OngChu Lean POS Cloud'}
          </AppText>

          <View style={s.licenseFooter}>
            <AppText variant="xs" color="rgba(255, 255, 255, 0.75)" tabularNums>
              {isBound ? `Thời hạn còn: ${tenant?.licenseDaysLeft || 365} ngày` : 'Sẵn sàng kích hoạt điểm bán'}
            </AppText>
            <AppText variant="xs" color="rgba(255, 255, 255, 0.75)">
              Hotline 24/7: 1900 6868
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bgImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 40,
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  pillarsList: {
    gap: 14,
    marginVertical: 24,
  },
  pillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 14,
    padding: 14,
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  licenseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  licenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
});
