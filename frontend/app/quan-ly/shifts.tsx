"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';

const API = '/api/v1/quan-ly';

function formatVND(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

export default function ShiftsScreen() {
  const { openSidebar } = useSidebar();
  const [shifts, setShifts] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [cashEnd, setCashEnd] = useState('0');
  const [expenseTotal, setExpenseTotal] = useState('0');
  const [endNote, setEndNote] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [shiftData, allData] = await Promise.all([
        request<any>(API + '/shifts/active'),
        request<any[]>(API + '/shifts?limit=30'),
      ]);
      setActive(shiftData);
      setShifts(allData);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startShift = async () => {
    try {
      await request(API + '/shifts/start', {
        method: 'POST',
        body: JSON.stringify({ opening_balance: parseFloat(openingBalance) || 0 }),
      });
      setShowStart(false);
      load();
    } catch { console.error('Start shift failed'); }
  };

  const endShift = async () => {
    if (!active) return;
    try {
      await request(`${API}/shifts/${active.id}/end`, {
        method: 'POST',
        body: JSON.stringify({ cash_end: parseFloat(cashEnd) || 0, expense_total: parseFloat(expenseTotal) || 0, note: endNote }),
      });
      setShowEnd(false);
      load();
    } catch { console.error('End shift failed'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <View>
            <Text style={{ ...font.h1, color: colors.text.primary }}>Ca Làm Việc ⏰</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{shifts.length} ca</Text>
          </View>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          ListHeaderComponent={
            active ? (
              <View style={styles.activeCard}>
                <Icon name="clock-outline" size={28} color={colors.status.success} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.h2, color: colors.text.primary }}>Ca đang làm</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>{active.shift_code} · bắt đầu {new Date(active.start_at).toLocaleTimeString('vi-VN')}</Text>
                  <Text style={{ ...font.body, color: colors.text.primary, marginTop: 4 }}>Đầu quỹ: {formatVND(active.opening_balance)}</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowEnd(true); setCashEnd(String(active.opening_balance)); }} style={{ backgroundColor: colors.status.warning, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
                  <Text style={{ ...font.tab, color: colors.text.inverse }}>Kết ca</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.activeCard}>
                <Icon name="sleep" size={24} color={colors.text.muted} />
                <Text style={{ ...font.h2, color: colors.text.muted, flex: 1 }}>Chưa mở ca</Text>
                <TouchableOpacity onPress={() => setShowStart(true)} style={{ backgroundColor: colors.brand.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
                  <Text style={{ ...font.tab, color: colors.text.inverse }}>Mở ca</Text>
                </TouchableOpacity>
              </View>
            )
          }
          data={shifts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.shift_code}</Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'dang_lam' ? '#DCFCE7' : '#F1F5F9' }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'dang_lam' ? '#16A34A' : '#64748B' }]}>
                    {item.status === 'dang_lam' ? 'Đang làm' : 'Đã kết thúc'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.caption, color: colors.text.muted }}>DT: {formatVND(item.total_revenue || 0)}</Text>
                <Text style={{ ...font.caption, color: colors.text.muted }}>Chênh: {item.difference != null ? formatVND(item.difference) : '—'}</Text>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showStart} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStart(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>Mở ca mới</Text>
            <TouchableOpacity onPress={startShift}><Text style={{ ...font.button, color: colors.brand.primary }}>Bắt đầu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 6 }}>Số dư đầu quỹ</Text>
            <TextInput value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad"
              style={{ borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10, padding: 12, fontSize: 24, fontWeight: '700', color: colors.text.primary, backgroundColor: colors.surface.app }} />
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showEnd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEnd(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>Kết ca</Text>
            <TouchableOpacity onPress={endShift}><Text style={{ ...font.button, color: colors.brand.primary }}>Kết thúc</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 16 }}>
            <View>
              <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 6 }}>Tiền mặt cuối ca</Text>
              <TextInput value={cashEnd} onChangeText={setCashEnd} keyboardType="decimal-pad"
                style={{ borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10, padding: 12, fontSize: 24, fontWeight: '700', color: colors.text.primary, backgroundColor: colors.surface.app }} />
            </View>
            <View>
              <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 6 }}>Tổng chi trong ca (optional)</Text>
              <TextInput value={expenseTotal} onChangeText={setExpenseTotal} keyboardType="decimal-pad"
                style={{ borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app }} />
            </View>
            <View>
              <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 6 }}>Ghi chú</Text>
              <TextInput value={endNote} onChangeText={setEndNote} multiline
                style={{ borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app, minHeight: 80 }} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border.default },
  card: { backgroundColor: colors.surface.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { ...font.badge, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});
