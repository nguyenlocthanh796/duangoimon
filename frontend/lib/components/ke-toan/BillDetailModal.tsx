import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { logger } from '../../logger';

interface BillDetailModalProps {
  visible: boolean;
  orderId: string | null;
  onClose: () => void;
}

export default function BillDetailModal({ visible, orderId, onClose }: BillDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  useEffect(() => {
    if (visible && orderId) {
      setLoading(true);
      setOrder(null);
      api
        .getOrder(orderId)
        .then((data) => {
          setOrder(data);
        })
        .catch((err) => {
          logger.error('bill-detail', 'Lỗi tải chi tiết đơn hàng: ', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, orderId]);

  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('vi-VN') + '₫';
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleString('vi-VN');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
        </View>
      );
    }

    if (!order) {
      return (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={48} color={colors.text.danger} />
          <Text style={[styles.loadingText, { color: colors.text.danger, marginTop: 8 }]}>
            Không tìm thấy dữ liệu hóa đơn này.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isWide ? styles.billWrapper : styles.billWrapperMobile}
      >
        <View style={isWide ? styles.receipt : styles.receiptMobile}>
          <Text style={styles.shopName}>POS PRO F&B</Text>
          <Text style={styles.shopSub}>Đ/c: 123 Đường Số 1, Phường 4, Quận 3</Text>
          <Text style={styles.shopSub}>SĐT: 028.9999.8888</Text>
          <View style={styles.dividerDotted} />
          <Text style={styles.receiptTitle}>HÓA ĐƠN THANH TOÁN</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bàn:</Text>
            <Text style={styles.infoVal}>
              {order.table_name || `Bàn ${(order.table_id || '').slice(0, 4)}`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoVal}>{formatDate(order.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn:</Text>
            <Text style={styles.infoVal}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          {order.token ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tra cứu:</Text>
              <Text style={styles.infoVal}>{order.token}</Text>
            </View>
          ) : null}
          <View style={styles.dividerDotted} />
          <View style={styles.tableHead}>
            <Text style={[styles.headCell, { flex: 2 }]}>Tên món</Text>
            <Text style={[styles.headCell, { flex: 0.5, textAlign: 'center' }]}>SL</Text>
            <Text style={[styles.headCell, { flex: 1.2, textAlign: 'right' }]}>Đơn giá</Text>
            <Text style={[styles.headCell, { flex: 1.3, textAlign: 'right' }]}>T.Tiền</Text>
          </View>
          {order.items?.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                {item.options?.size || item.options?.toppings?.length > 0 ? (
                  <Text style={styles.itemOps}>
                    {item.options.size ? `${item.options.size} ` : ''}
                    {item.options.toppings ? `(+${item.options.toppings.join(', ')})` : ''}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.cellText, { flex: 0.5, textAlign: 'center' }]}>
                {item.quantity}
              </Text>
              <Text style={[styles.cellText, { flex: 1.2, textAlign: 'right' }]}>
                {formatPrice(item.unit_price)}
              </Text>
              <Text style={[styles.cellText, { flex: 1.3, textAlign: 'right', fontWeight: '600' }]}>
                {formatPrice(item.unit_price * item.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.dividerDotted} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính:</Text>
            <Text style={styles.summaryVal}>{formatPrice(order.total_amount)}</Text>
          </View>
          {order.tax_amount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thuế VAT (gộp):</Text>
              <Text style={styles.summaryVal}>{formatPrice(order.tax_amount)}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Text style={[styles.summaryLabel, { fontSize: 16, fontWeight: '600' }]}>
              TỔNG CỘNG:
            </Text>
            <Text
              style={[
                styles.summaryVal,
                { fontSize: 16, fontWeight: '600', color: colors.brand.primary },
              ]}
            >
              {formatPrice(order.total_amount)}
            </Text>
          </View>
          <View style={styles.dividerDotted} />
          <Text style={styles.thankyou}>CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</Text>
        </View>
      </ScrollView>
    );
  };

  if (isWide) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Chi tiết hóa đơn</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="close" size={20} color={colors.icon.muted} />
              </TouchableOpacity>
            </View>
            {renderContent()}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.mobileScreenContainer} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={onClose} style={styles.mobileBackBtn}>
            <Icon name="arrow-left" size={22} color={colors.brand.primary} />
          </TouchableOpacity>
          <View style={styles.mobileHeaderTitleBlock}>
            <Text style={styles.mobileTitle}>Chi tiết hóa đơn</Text>
            {order ? (
              <Text style={styles.mobileSubtitle}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            ) : null}
          </View>
          <View style={{ width: 38 }} />
        </View>
        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    maxHeight: '90%',
    boxShadow: '0px 10px 20px rgba(15,23,42,0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    ...font.mdBold,
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.disabled,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...font.sm,
    color: colors.text.muted,
    marginTop: 12,
  },
  billWrapper: {
    padding: 16,
  },
  billWrapperMobile: {
    padding: 8,
  },
  receipt: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    borderRadius: 4,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.15)',
  },
  receiptMobile: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    borderRadius: shape.radius.md,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
  },
  shopSub: {
    fontSize: 13,
    color: '#737373',
    textAlign: 'center',
    marginTop: 2,
  },
  dividerDotted: {
    height: 1,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  receiptTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#737373',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  tableHead: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  headCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#404040',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  itemOps: {
    fontSize: 13,
    color: colors.text.brand,
    marginTop: 2,
  },
  cellText: {
    fontSize: 13,
    color: '#171717',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#404040',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  thankyou: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
    textAlign: 'center',
    marginTop: 10,
  },

  /* Mobile Full Screen Styles */
  mobileScreenContainer: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  mobileBackBtn: {
    width: 44,
    height: 44,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderTitleBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTitle: {
    ...font.lg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  mobileSubtitle: {
    ...font.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 1,
  },
});
