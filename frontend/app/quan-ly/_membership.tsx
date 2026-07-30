import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import AppText from '../../lib/components/ui/AppText';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import { useCrud } from '../../lib/hooks/useCrud';

const API = '/api/v1/quan-ly';

interface Tier { id: string; name: string; min_spend: number; discount_pct: number; }
type FormState = { name: string; min_spend: string; discount_pct: string; };

function fallbackTiers(): Tier[] {
  return [
    { id: 't1', name: 'Bạc', min_spend: 0, discount_pct: 0 },
    { id: 't2', name: 'Vàng', min_spend: 1000000, discount_pct: 5 },
    { id: 't3', name: 'Bạch Kim', min_spend: 5000000, discount_pct: 10 },
    { id: 't4', name: 'Kim Cương', min_spend: 20000000, discount_pct: 15 },
  ];
}

const TIER_COLORS = ['#64748B', '#F59E0B', '#1EA1F1', '#8B5CF6'];

export default function MembershipScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();

  const { data: tiers, loading, showForm, setShowForm, editingId, form, setForm,
    selectedItem: selected, setSelectedId: setSelected,
    loadData, handleSave, handleDelete, openAdd, openEdit } = useCrud<Tier, FormState>({
    fetchFn: () => request(`${API}/membership-tiers`).then((d: any) => Array.isArray(d) ? d : (d?.items || [])),
    createFn: (p) => request(`${API}/membership-tiers`, { method: 'POST', body: JSON.stringify(p) }),
    updateFn: (id, p) => request(`${API}/membership-tiers/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
    deleteFn: (id) => request(`${API}/membership-tiers/${id}`, { method: 'DELETE' }),
    fallbackData: fallbackTiers(),
    formState: { name: '', min_spend: '', discount_pct: '' },
    formFromItem: (t: Tier) => ({ name: t.name, min_spend: String(t.min_spend || ''), discount_pct: String(t.discount_pct || '') }),
    buildPayload: (f) => ({ name: f.name, min_spend: parseFloat(f.min_spend) || 0, discount_pct: parseFloat(f.discount_pct) || 0 }),
    nameLabel: 'thẻ hạng',
  });

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.min_spend - b.min_spend), [tiers]);

  const renderDetailPanel = () => {
    if (!selected) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" color="#050505">Chi Tiết Thẻ Hạng</AppText>
          <AppText variant="md" color="#65676B" style={{ textAlign: 'center' }}>Chọn thẻ để xem chi tiết</AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openAdd}><Icon name="plus" size={18} color="#FFF" /><AppText variant="md" color="#FFF">Thêm thẻ mới</AppText></TouchableOpacity>
        </View>
      );
    }
    const idx = sorted.findIndex(t => t.id === selected.id);
    const color = TIER_COLORS[idx % TIER_COLORS.length] || '#64748B';
    return (
      <ScrollView style={ss.detailPanel} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="crown" size={32} color="#FFF" />
          </View>
          <AppText variant="md" color="#050505">{selected.name}</AppText>
          <View style={{ width: '100%', backgroundColor: colors.surface.app, borderRadius: 12, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Hạng</AppText><AppText variant="md" color="#050505">#{idx + 1}</AppText></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Chi tiêu tối thiểu</AppText><AppText variant="md" color={colors.brand.primary}>{formatVND(selected.min_spend)}</AppText></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Giảm giá</AppText><AppText variant="md" color={colors.status.success}>{selected.discount_pct}%</AppText></View>
          </View>
          <TouchableOpacity style={ss.panelCta} onPress={() => openEdit(selected)}><Icon name="pencil" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Chỉnh sửa</AppText></TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      <View style={ss.topActionBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={ss.addBtn} onPress={openAdd}><Icon name="plus" size={18} color="#FFF" /><AppText variant="md" color="#FFF">Thêm thẻ</AppText></TouchableOpacity>
      </View>

      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}><View style={[ss.metricIcon, { backgroundColor: '#FEF3C7' }]}><Icon name="crown" size={16} color="#D97706" /></View><View><AppText variant="md" color="#050505">{sorted.length} hạng</AppText><AppText variant="md" color="#64748B">Thẻ hạng</AppText></View></View>
          <View style={ss.metricCard}><View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}><Icon name="percent" size={16} color={colors.status.success} /></View><View><AppText variant="md" color={colors.status.success}>{Math.max(...sorted.map(t => t.discount_pct), 0)}%</AppText><AppText variant="md" color="#64748B">Giảm tối đa</AppText></View></View>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {sorted.map((tier, idx) => {
                const color = TIER_COLORS[idx % TIER_COLORS.length] || '#64748B';
                const isSel = selected?.id === tier.id;
                return (
                  <TouchableOpacity key={tier.id} onPress={() => setSelected(isSel ? null : tier.id)}
                    style={{ backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: isSel ? color : '#E2E8F0', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="crown" size={22} color="#FFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="md" color="#050505">Hạng {tier.name}</AppText>
                        <AppText variant="md" color="#64748B">Giảm {tier.discount_pct}% · Chi tiêu từ {formatVND(tier.min_spend)}</AppText>
                      </View>
                      <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                        <AppText variant="md" color="#0F172A">#{idx + 1}</AppText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>THẺ HẠNG ({sorted.length})</AppText></View>
            <View style={ss.sectionItems}>
              {sorted.map((tier, idx) => {
                const color = TIER_COLORS[idx % TIER_COLORS.length] || '#64748B';
                return (
                  <View key={tier.id} style={ss.listRow}>
                    <View style={[ss.iconCircleSm, { backgroundColor: color }]}><Icon name="crown" size={16} color="#FFF" /></View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <AppText variant="md" color="#0F172A">{tier.name}</AppText>
                      <AppText variant="md" color="#64748B">Giảm {tier.discount_pct}% · từ {formatVND(tier.min_spend)}</AppText>
                    </View>
                    <TouchableOpacity style={ss.miniActionBtn} onPress={() => { setSelected(tier.id); }}><Icon name="eye-outline" size={16} color={colors.brand.primary} /></TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <FormModal visible={showForm} title={editingId ? 'Sửa thẻ hạng' : 'Thêm thẻ hạng'}
        onClose={() => setShowForm(false)}
        onSave={() => handleSave(() => !form.name ? 'Tên thẻ bắt buộc' : null)}>
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Tên thẻ (*)" value={form.name} onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="Chi tiêu tối thiểu (VNĐ)" keyboardType="numeric" value={form.min_spend} onChangeText={(v) => setForm((f: any) => ({ ...f, min_spend: v }))} />
          <TextInput style={s.input} placeholder="Giảm giá (%)" keyboardType="numeric" value={form.discount_pct} onChangeText={(v) => setForm((f: any) => ({ ...f, discount_pct: v }))} />
        </View>
      </FormModal>

      {!isWide && (
        <DetailModal visible={!!selected} title={selected?.name || 'Chi tiết'}
          subtitle={selected ? `Hạng thẻ thành viên` : undefined}
          onClose={() => setSelected(null)}
          onEdit={selected ? () => { openEdit(selected); setSelected(null); } : undefined}
          onDelete={selected ? () => { handleDelete(selected.id, selected.name); } : undefined}>
          {renderDetailPanel()}
        </DetailModal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  input: { height: 44, borderWidth: 1, borderColor: colors.border.default, borderRadius: 8, paddingHorizontal: 12, color: colors.text.primary },
});