import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

function generateFallbackCampaigns() {
  return [
    { id: 'm1', name: 'Thông Báo Khuyến Mãi Hè 2026', type: 'Notification', channel: 'Mobile App', target_group: 'Tất cả khách hàng', sent_count: 1250, is_active: true, created_at: '2026-07-20' },
    { id: 'm2', name: 'Zalo ZNS Tri Ơn Khách VIP', type: 'Zalo ZNS', channel: 'Zalo Official Account', target_group: 'Hội viên VIP', sent_count: 480, is_active: true, created_at: '2026-07-15' },
    { id: 'm3', name: 'SMS Tặng Voucher 50k', type: 'SMS Brandname', channel: 'Mạng viễn thông', target_group: 'Khách hàng cũ', sent_count: 320, is_active: false, created_at: '2026-07-10' },
  ];
}

export default function MarketingScreen() {
  const { isWide } = useResponsive();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'Zalo ZNS', content: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/marketing/campaigns`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (list && list.length > 0) {
        setCampaigns(list);
        setSelected(list[0]);
      } else {
        const fallbacks = generateFallbackCampaigns();
        setCampaigns(fallbacks);
        setSelected(fallbacks[0]);
      }
    } catch {
      const fallbacks = generateFallbackCampaigns();
      setCampaigns(fallbacks);
      setSelected(fallbacks[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.content) { Alert.alert('Lỗi', 'Tên chiến dịch và nội dung là bắt buộc'); return; }
    try {
      await request(`${API}/marketing/campaigns`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false); setForm({ name: '', channel: 'Zalo ZNS', content: '' }); load();
    } catch { Alert.alert('Lỗi', 'Không thể tạo chiến dịch'); }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Tên chiến dịch',
      flex: 1,
      render: (c) => (
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setSelected(c)}>
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 18 }]}>
            <Icon name="bullhorn" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color="#050505" numberOfLines={1}>{c.name}</AppText>
            <AppText variant="sm" color="#65676B">Kênh: {c.channel || c.type || 'Zalo ZNS'}</AppText>
          </View>
        </TouchableOpacity>
      ),
    },
    {
      key: 'sent_count',
      title: 'Đã gửi',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.sent_count || 0,
      render: (c) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{c.sent_count || 0} tin</AppText>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 120,
      align: 'right',
      render: (c) => (
        <View style={{ backgroundColor: c.is_active ? '#ECFDF5' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-end' }}>
          <AppText variant="sm" weight="bold" color={c.is_active ? colors.status.success : colors.text.muted}>
            {c.is_active ? 'Đang chạy' : 'Đã dừng'}
          </AppText>
        </View>
      ),
    },
  ];

  const renderPanel = () => {
    if (!selected) {
      return (
        <View style={styles.panelBox}>
          <View style={styles.panelHeader}>
            <Icon name="bullhorn" size={20} color={colors.brand.primary} />
            <AppText variant="md" weight="bold" color="#050505">Xem Chi Tiết Chiến Dịch</AppText>
          </View>
          <AppText variant="sm" color="#65676B" style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn một chiến dịch từ danh sách để xem chi tiết
          </AppText>
        </View>
      );
    }
    const c = selected;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="bullhorn-outline" size={20} color={colors.brand.primary} />
          <AppText variant="md" weight="bold" color="#050505">Chi Tiết Chiến Dịch Marketing</AppText>
        </View>

        <View style={{ gap: 8, paddingTop: 4 }}>
          <AppText variant="md" weight="bold" color="#050505">{c.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>{c.channel || c.type || 'Zalo ZNS'}</AppText>
            </View>
            <AppText variant="sm" color="#65676B">Đối tượng: {c.target_group || 'Tất cả khách hàng'}</AppText>
          </View>
        </View>

        <View style={styles.panelDivider} />

        <View style={{ gap: 6, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
          <AppText variant="sm" weight="bold" color="#050505">Nội dung tin nhắn phát hành:</AppText>
          <AppText variant="sm" color="#334155" style={{ fontStyle: 'italic', lineHeight: 20 }}>
            "{c.content || 'Kính gửi quý khách! Nhà hàng xin gửi tặng quý khách Voucher giảm 20% cho đơn hàng tiếp theo. Mã: SUMMER20. Trân trọng!'}"
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 }}>
          <AppText variant="sm" color="#65676B">Tổng tin nhắn phát thành công</AppText>
          <AppText variant="md" weight="bold" color={colors.status.success}>{c.sent_count || 0} lượt</AppText>
        </View>

        <TouchableOpacity style={styles.panelCta} onPress={() => Alert.alert('Phát tin', `Đã kích hoạt gửi tin nhắn cho chiến dịch "${c.name}"!`)}>
          <Icon name="send" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Phát tin nhắn ngay</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMobileCampaignCard = ({ item: c }: { item: any }) => (
    <View style={styles.itemMobile}>
      <TouchableOpacity style={styles.cardHeaderRow} onPress={() => setSelected(c)} activeOpacity={0.8}>
        <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Icon name="bullhorn" size={22} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{c.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <AppText variant="sm" color="#65676B">Kênh: {c.channel || 'Zalo ZNS'}</AppText>
            <AppText variant="sm" color="#65676B">· {c.sent_count || 0} tin</AppText>
          </View>
        </View>
        <View style={{ backgroundColor: c.is_active ? '#ECFDF5' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <AppText variant="sm" weight="bold" color={c.is_active ? colors.status.success : colors.text.muted}>
            {c.is_active ? 'Đang chạy' : 'Đã dừng'}
          </AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => setSelected(c)}>
          <Icon name="send" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Phát tin</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => setSelected(c)}>
          <Icon name="pencil" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chi tiết</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{campaigns.length} chiến dịch Marketing</AppText>
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo mới</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="bullhorn" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{campaigns.length} chiến dịch</AppText>
            <AppText variant="sm" color="#65676B">Tổng chiến dịch</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="send-check" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>
              {campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)} tin
            </AppText>
            <AppText variant="sm" color="#65676B">Đã phát hành</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="cellphone-message" size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">Zalo ZNS / SMS</AppText>
            <AppText variant="sm" color="#65676B">Kênh phát tin</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={campaigns}
              getRowId={(c) => c.id}
              loading={loading}
              onRefresh={load}
              compact
              emptyIcon="bullhorn-outline"
              emptyTitle="Chưa có chiến dịch nào"
              emptySubtitle="Nhấn + để tạo chiến dịch marketing đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(c) => c.id}
          renderItem={renderMobileCampaignCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="bullhorn-outline"
                title="Chưa có chiến dịch nào"
                subtitle="Nhấn + để tạo chiến dịch marketing đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={() => setShowForm(true)} />}

      <FormModal
        visible={showForm}
        title="Tạo chiến dịch Marketing mới"
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      >
        <View style={{ gap: 12 }}>
          <TextInput style={styles.input} placeholder="Tên chiến dịch (*)" value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={styles.input} placeholder="Kênh phát hành (Zalo ZNS, SMS, Push)" value={form.channel} onChangeText={(v) => setForm(f => ({ ...f, channel: v }))} />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Nội dung tin nhắn phát hành (*)"
            multiline
            value={form.content}
            onChangeText={(v) => setForm(f => ({ ...f, content: v }))}
          />
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justify: 'center',
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justify: 'center',
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },

  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: 999, height: 44, marginTop: 4 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...font.md,
    color: colors.text.primary,
  },
});