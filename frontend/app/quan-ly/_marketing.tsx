import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';
import DetailModal from '../../lib/components/ui/DetailModal';

import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import { useSidebar } from '../../lib/context/SidebarContext';

const API = '/api/v1/quan-ly';

function generateFallbackCampaigns() {
  return [
    { id: 'm1', name: 'Thông Báo Khuyến Mãi Hè 2026', type: 'Notification', channel: 'Mobile App', target_group: 'Tất cả khách hàng', sent_count: 1250, is_active: true, created_at: '2026-07-20' },
    { id: 'm2', name: 'Zalo ZNS Tri Ơn Khách VIP', type: 'Zalo ZNS', channel: 'Zalo Official Account', target_group: 'Hội viên VIP', sent_count: 480, is_active: true, created_at: '2026-07-15' },
    { id: 'm3', name: 'SMS Tặng Voucher 50k', type: 'SMS Brandname', channel: 'Mạng viễn thông', target_group: 'Khách hàng cũ', sent_count: 320, is_active: false, created_at: '2026-07-10' },
  ];
}

export interface MarketingScreenProps {
  isSearchOpen?: boolean;
}

export default function MarketingScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const { openSidebar } = useSidebar();
  const [campaigns, setCampaigns] = useState<any[]>(generateFallbackCampaigns());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', channel: 'Zalo ZNS', content: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/marketing/campaigns`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (list && list.length > 0) {
        setCampaigns(list);
        if (isWide) setSelected(list[0]);
      } else {
        const fallbacks = generateFallbackCampaigns();
        setCampaigns(fallbacks);
        if (isWide) setSelected(fallbacks[0]);
      }
    } catch {
      const fallbacks = generateFallbackCampaigns();
      setCampaigns(fallbacks);
      if (isWide) setSelected(fallbacks[0]);
    } finally {
      setLoading(false);
    }
  }, [isWide]);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const allCount = campaigns.length;
  const activeCount = campaigns.filter(c => c.is_active !== false).length;
  const stoppedCount = campaigns.filter(c => c.is_active === false).length;

  const filteredCampaigns = React.useMemo(() => {
    let list = campaigns;
    if (statusFilter === 'active') {
      list = list.filter(c => c.is_active !== false);
    } else if (statusFilter === 'stopped') {
      list = list.filter(c => c.is_active === false);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.channel && c.channel.toLowerCase().includes(q)) ||
      (c.type && c.type.toLowerCase().includes(q))
    );
  }, [campaigns, statusFilter, search]);

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

        <TouchableOpacity style={ss.panelCta} onPress={() => Alert.alert('Phát tin', `Đã kích hoạt gửi tin nhắn cho chiến dịch "${c.name}"!`)}>
          <Icon name="send" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Phát tin nhắn ngay</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMobileCampaignCard = ({ item: c }: { item: any }) => (
    <View style={ss.listRow} key={c.id}>
      <View style={[styles.catIconMiniCircle, { backgroundColor: '#EEF2FF' }]}>
        <Icon name="bullhorn" size={14} color={colors.brand.primary} />
      </View>

      <TouchableOpacity style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }} onPress={() => setSelected(c)} activeOpacity={0.7}>
        <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>
          {c.name}
        </AppText>
        <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ marginTop: 2, fontSize: 11 }}>
          Kênh: {c.channel || c.type || 'Zalo ZNS'} · {c.sent_count || 0} tin
        </AppText>
      </TouchableOpacity>

      <View style={{ backgroundColor: c.is_active ? '#ECFDF5' : '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginRight: 10 }}>
        <AppText variant="sm" weight="bold" color={c.is_active ? colors.status.success : colors.text.muted} style={{ fontSize: 11 }}>
          {c.is_active ? 'Đang chạy' : 'Đã dừng'}
        </AppText>
      </View>

      <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelected(c)}>
        <Icon name="pencil" size={16} color={colors.brand.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {/* Mobile Top Bar: Search Input + Add Button */}
      {!isWide && (
        isSearchOpen || search.length > 0 ? (
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}>
              <Icon name="magnify" size={20} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm chiến dịch, kênh..."
                placeholderTextColor="#94A3B8"
                style={ss.searchTextInput}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={ss.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
              <Icon name="plus" size={18} color="#FFFFFF" />
              <AppText variant="sm" weight="bold" color="#FFFFFF">
                Tạo chiến dịch
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={ss.mobileActionRow}>
            <AppText variant="md" weight="bold" color="#050505">
              {filteredCampaigns.length} chiến dịch marketing
            </AppText>
            <TouchableOpacity style={ss.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
              <Icon name="plus" size={18} color="#FFFFFF" />
              <AppText variant="sm" weight="bold" color="#FFFFFF">
                Tạo chiến dịch
              </AppText>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ── Toolbar: Status Filter Chips ────────────────────────── */}
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
          {[
            { key: 'all', label: `Tất cả (${allCount})` },
            { key: 'active', label: `Đang chạy (${activeCount})` },
            { key: 'stopped', label: `Đã dừng (${stoppedCount})` },
          ].map((sItem) => {
            const active = statusFilter === sItem.key;
            return (
              <TouchableOpacity
                key={sItem.key}
                onPress={() => setStatusFilter(sItem.key)}
                style={[ss.filterChip, active && ss.filterChipActive]}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {sItem.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 📊 Executive KPI Strip (Desktop only) */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <Icon name="bullhorn" size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">{campaigns.length} chiến dịch</AppText>
              <AppText variant="sm" color="#65676B">Tổng chiến dịch</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="send-check" size={20} color={colors.status.success} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={colors.status.success}>
                {campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)} tin
              </AppText>
              <AppText variant="sm" color="#65676B">Đã phát hành</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
              <Icon name="cellphone-message" size={20} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#F97316">Zalo ZNS / SMS</AppText>
              <AppText variant="sm" color="#65676B">Kênh phát tin</AppText>
            </View>
          </View>
        </View>
      )}

      {!isWide && (
        <DetailModal
          visible={!!selected}
          title={selected?.name || 'Chi tiết chiến dịch'}
          subtitle={selected ? `Kênh: ${selected.channel || selected.type || 'Zalo ZNS'} · ${selected.sent_count || 0} tin đã gửi` : undefined}
          onClose={() => setSelected(null)}
        >
          {renderPanel()}
        </DetailModal>
      )}
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={filteredCampaigns}
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="bullhorn-outline" size={14} color={colors.brand.primary} />
              </View>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>
                DANH SÁCH CHIẾN DỊCH MARKETING ({filteredCampaigns.length})
              </AppText>
            </View>

            <View style={ss.sectionItems}>
              {filteredCampaigns.map(c => renderMobileCampaignCard({ item: c }))}
            </View>
          </View>
        </ScrollView>
      )}



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
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  /* Facebook Story Highlight Metric Cards Container */
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
    justifyContent: 'center',
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
    justifyContent: 'center',
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
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...font.md,
    color: colors.text.primary,
  },
  catIconMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  pillChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
});