import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import AppText from '../../lib/components/ui/AppText';
import DetailModal from '../../lib/components/ui/DetailModal';

const API = '/api/v1/quan-ly';

const FB = [
  { id: 'm1', name: 'Thông Báo Khuyến Mãi Hè', channel: 'Mobile Push', sent_count: 1250, is_active: true },
  { id: 'm2', name: 'Zalo ZNS Tri Ân KH VIP', channel: 'Zalo ZNS', sent_count: 480, is_active: true },
  { id: 'm3', name: 'SMS Tặng Voucher 50k', channel: 'SMS', sent_count: 320, is_active: false },
];

export default function MarketingScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', channel: 'Zalo ZNS', content: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/marketing/campaigns`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setItems(list.length ? list : FB);
      if (isWide) setSelected(list?.[0] || FB[0]);
    } catch {
      setItems(FB);
      if (isWide) setSelected(FB[0]);
    } finally {
      setLoading(false);
    }
  }, [isWide]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = { total: items.length, active: items.filter((c) => c.is_active !== false).length };

  const filtered = useMemo(() => {
    let list = items;
    if (filter === 'active') list = list.filter((c) => c.is_active !== false);
    else if (filter === 'stopped') list = list.filter((c) => c.is_active === false);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, search]);

  const handleSave = async () => {
    if (!form.name || !form.content) {
      Alert.alert('Lỗi', 'Tên và nội dung bắt buộc');
      return;
    }
    try {
      await request(`${API}/marketing/campaigns`, { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ name: '', channel: 'Zalo ZNS', content: '' });
      load();
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo');
    }
  };

  // Columns for Desktop Master-Detail View (With standard 28px icon circle)
  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Chiến dịch',
      flex: 1,
      render: (c) => (
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
          onPress={() => setSelected(c)}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#FFF7ED',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="bullhorn" size={14} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#0F172A" numberOfLines={1}>
              {c.name}
            </AppText>
            <AppText variant="sm" color="#64748B" style={{ marginTop: 1 }}>
              Đã gửi: {c.sent_count || 0} tin
            </AppText>
          </View>
        </TouchableOpacity>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 100,
      align: 'right' as const,
      render: (c) => (
        <View
          style={{
            backgroundColor: c.is_active ? '#ECFDF5' : '#FEE2E2',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <AppText variant="md" color={c.is_active ? '#059669' : '#DC2626'}>
            {c.is_active ? 'Đang chạy' : 'Dừng'}
          </AppText>
        </View>
      ),
    },
  ];

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={s.panel}>
        <View style={s.panelHdr}>
          <AppText variant="md" weight="bold" color="#1E293B">
            Chi Tiết Chiến Dịch
          </AppText>
        </View>
        <View style={{ gap: 10 }}>
          <AppText variant="md" weight="bold" color="#0F172A">
            {selected.name}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="md" color="#64748B">Đã phát tin</AppText>
            <AppText variant="md" color="#0F172A">{selected.sent_count || 0} tin</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="md" color="#64748B">Trạng thái</AppText>
            <View
              style={{
                backgroundColor: selected.is_active ? '#ECFDF5' : '#FEE2E2',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <AppText variant="md" color={selected.is_active ? '#059669' : '#DC2626'}>
                {selected.is_active ? 'Đang chạy' : 'Dừng'}
              </AppText>
            </View>
          </View>

          <TouchableOpacity
            style={[ss.panelCta, { marginTop: 12 }]}
            onPress={() => Alert.alert('Phát tin', `Đã phát tin chiến dịch "${selected.name}"!`)}
          >
            <Icon name="send" size={16} color={colors.text.inverse} />
            <AppText variant="md" color={colors.text.inverse}>
              Phát tin ngay
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {!isWide && (
        <View style={ss.topActionBar}>
          <View style={ss.searchInputWrap}>
            <Icon name="magnify" size={20} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm chiến dịch..."
              placeholderTextColor="#94A3B8"
              style={ss.searchTextInput}
            />
          </View>
          <TouchableOpacity style={ss.addBtn} onPress={() => setShowForm(true)}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="md" color="#FFF">
              Tạo
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Chips Bar */}
      <View style={{ maxHeight: 44, flexGrow: 0, marginBottom: 4 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 6 }}
        >
          {[
            { key: 'all', label: `Tất cả (${stats.total})` },
            { key: 'active', label: `Đang chạy (${stats.active})` },
            { key: 'stopped', label: `Dừng (${stats.total - stats.active})` },
          ].map((sItem) => (
            <TouchableOpacity
              key={sItem.key}
              onPress={() => setFilter(sItem.key)}
              style={[ss.filterChip, filter === sItem.key && ss.filterChipActive]}
            >
              <AppText
                variant="md"
                color={filter === sItem.key ? colors.brand.primary : '#334155'}
              >
                {sItem.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isWide ? (
        <View style={{ flex: 1, paddingHorizontal: 12, gap: 12 }}>
          <View style={ss.metricContainer}>
            <View style={ss.metricCard}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="bullhorn" size={14} color="#F97316" />
              </View>
              <View>
                <AppText variant="md" weight="bold" color="#0F172A">
                  {stats.total}
                </AppText>
                <AppText variant="sm" color="#64748B">
                  Tổng chiến dịch
                </AppText>
              </View>
            </View>
            <View style={ss.metricCard}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="send-check" size={14} color="#059669" />
              </View>
              <View>
                <AppText variant="md" weight="bold" color="#059669">
                  {stats.active}
                </AppText>
                <AppText variant="sm" color="#64748B">
                  Đang chạy
                </AppText>
              </View>
            </View>
            <View style={ss.metricCard}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="message-text-outline" size={14} color="#2563EB" />
              </View>
              <View>
                <AppText variant="md" weight="bold" color="#2563EB">
                  {items.reduce((s: number, c: any) => s + (c.sent_count || 0), 0)}
                </AppText>
                <AppText variant="sm" color="#64748B">
                  Tổng tin đã gửi
                </AppText>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 0.55 }}>
              <DataTable<any>
                columns={columns}
                data={filtered}
                getRowId={(c: any) => c.id}
                loading={loading}
                onRefresh={load}
                compact
                emptyIcon="bullhorn-outline"
                emptyTitle="Chưa có chiến dịch"
                emptySubtitle=""
              />
            </View>
            <View style={{ flex: 0.45 }}>{renderPanel()}</View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="md" weight="bold" color="#1E293B">
                Danh Sách Chiến Dịch ({filtered.length})
              </AppText>
            </View>
            {filtered.map((c, idx) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelected(c)}
                activeOpacity={0.7}
                style={[ss.listRow, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#FFF7ED',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Icon name="bullhorn" size={14} color="#F97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="md" color="#0F172A" numberOfLines={1}>
                    {c.name}
                  </AppText>
                  <AppText variant="sm" color="#64748B" style={{ marginTop: 1 }}>
                    Đã gửi: {c.sent_count || 0} tin
                  </AppText>
                </View>
                <View
                  style={{
                    backgroundColor: c.is_active ? '#ECFDF5' : '#FEE2E2',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <AppText
                    variant="md"
                    color={c.is_active ? '#059669' : '#DC2626'}
                  >
                    {c.is_active ? 'Đang chạy' : 'Dừng'}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <DetailModal
          visible={!!selected}
          title={selected?.name || 'Chi tiết chiến dịch'}
          subtitle={selected ? `Đã gửi: ${selected.sent_count || 0} tin` : undefined}
          onClose={() => setSelected(null)}
        >
          {renderPanel()}
        </DetailModal>
      )}

      <FormModal
        visible={showForm}
        title="Tạo chiến dịch"
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      >
        <View style={{ gap: 12 }}>
          <TextInput
            style={s.inp}
            placeholder="Tên chiến dịch (*)"
            value={form.name}
            onChangeText={(v: string) => setForm((f) => ({ ...f, name: v }))}
          />
          <TextInput
            style={s.inp}
            placeholder="Kênh phát hành (Zalo ZNS / Push / SMS)"
            value={form.channel}
            onChangeText={(v: string) => setForm((f: any) => ({ ...f, channel: v }))}
          />
          <TextInput
            style={[s.inp, { height: 80 }]}
            placeholder="Nội dung (*)"
            multiline
            value={form.content}
            onChangeText={(v: string) => setForm((f) => ({ ...f, content: v }))}
          />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  inp: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text.primary,
  },
  panel: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    padding: 16,
    gap: 12,
  },
  panelHdr: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});