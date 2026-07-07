"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
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

function shortId(id: string) {
  return id ? '#' + id.slice(-6).toUpperCase() : '—';
}

export default function AuditScreen() {
  const { openSidebar } = useSidebar();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request<any[]>(API + '/audit-logs?limit=100');
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ACTION_ICONS: Record<string, string> = {
    create: 'plus-circle', update: 'pencil', delete: 'delete-circle',
    login: 'login', logout: 'logout',
  };
  const ACTION_COLORS: Record<string, string> = {
    create: '#16A34A', update: '#D97706', delete: '#DC2626',
    login: '#3B82F6', logout: '#64748B',
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = ACTION_ICONS[item.action] || 'information';
    const color = ACTION_COLORS[item.action] || '#64748B';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
            <Icon name={icon as any} size={16} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ ...font.h3, color: colors.text.primary, textTransform: 'capitalize' }}>{item.action}</Text>
              <Text style={{ ...font.badge, color: colors.text.muted }}>{item.resource}</Text>
            </View>
            <Text style={{ ...font.caption, color: colors.text.muted }}>
              {item.user_name} · {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''}
            </Text>
          </View>
          {item.resource_id && (
            <Text style={{ ...font.badge, color: colors.text.muted }}>{shortId(item.resource_id)}</Text>
          )}
        </View>
        {(item.old_value || item.new_value) && (
          <View style={styles.valueRow}>
            {item.old_value && (
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.badge, color: colors.text.muted, marginBottom: 2 }}>Trước</Text>
                <Text style={{ ...font.caption, color: colors.text.secondary }} numberOfLines={3}>
                  {typeof item.old_value === 'string' ? item.old_value : JSON.stringify(item.old_value)}
                </Text>
              </View>
            )}
            {item.new_value && (
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.badge, color: colors.text.muted, marginBottom: 2 }}>Sau</Text>
                <Text style={{ ...font.caption, color: colors.text.primary }} numberOfLines={3}>
                  {typeof item.new_value === 'string' ? item.new_value : JSON.stringify(item.new_value)}
                </Text>
              </View>
            )}
          </View>
        )}
        {item.ip_address && (
          <Text style={{ ...font.badge, color: colors.text.muted, marginTop: 4 }}>IP: {item.ip_address}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}>
            <Icon name="menu" size={22} color={colors.icon.default} />
          </TouchableOpacity>
          <View>
            <Text style={{ ...font.h1, color: colors.text.primary }}>Audit Log 📋</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{logs.length} logs gần nhất</Text>
          </View>
        </View>
        <TouchableOpacity onPress={load} style={styles.iconBtn}>
          <Icon name="refresh" size={20} color={colors.icon.default} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="clipboard-text-off" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có log nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border.default,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  iconBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.surface.disabled },
});
