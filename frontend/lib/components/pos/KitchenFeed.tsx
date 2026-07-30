import React, { useState, useRef, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { shape } from '../../theme/shape';
import AppText from '../ui/AppText';
import type { KitchenItem } from '../../api/kitchen';

interface KitchenFeedProps {
  fetchFn?: () => Promise<{ items: KitchenItem[]; thresholdMinutes: number }>;
  pollInterval?: number;
}

type FilterTab = 'all' | 'done' | 'delayed';

export default function KitchenFeed({
  fetchFn,
  pollInterval = 15_000,
}: KitchenFeedProps) {
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(true);

  const load = useCallback(async () => {
    if (!fetchFn || !isFocusedRef.current) return;
    setLoading(true);
    try {
      const res = await fetchFn();
      setItems(res.items || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  // Only poll when this screen is focused
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      load();
      intervalRef.current = setInterval(load, pollInterval);
      return () => {
        isFocusedRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [load, pollInterval])
  );

  const filtered = items.filter((it) => {
    if (filter === 'done') return it.status === 'hoan_thanh';
    if (filter === 'delayed') return it.isDelayed;
    return true;
  });

  const counts = {
    all: items.length,
    done: items.filter((it) => it.status === 'hoan_thanh').length,
    delayed: items.filter((it) => it.isDelayed).length,
  };

  const filters: { key: FilterTab; label: string; icon: string }[] = [
    { key: 'all', label: `Tất cả (${counts.all})`, icon: 'bell-ring-outline' },
    { key: 'done', label: `Chờ trả (${counts.done})`, icon: 'check-circle-outline' },
    { key: 'delayed', label: `Trễ (${counts.delayed})`, icon: 'alert-circle-outline' },
  ];

  if (!fetchFn) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 40 }}>
        <Icon name="chef-hat" size={32} color={colors.icon.muted} />
        <AppText variant="md" color={colors.text.placeholder}>Bếp / Bar</AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 3, height: 16, borderRadius: 1.5, backgroundColor: colors.brand.primary }} />
          <AppText variant="md" color={colors.text.secondary}>Bếp / Bar</AppText>
          {loading && <AppText variant="md" color={colors.text.placeholder}>⋯</AppText>}
        </View>
        <AppText variant="md" color={colors.text.placeholder}>⏱ {pollInterval / 1000}s</AppText>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 8 }}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 4,
                borderRadius: shape.radius.sm,
                backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
              }}
            >
              <Icon name={f.icon as any} size={12} color={active ? '#fff' : colors.text.muted} />
              <AppText variant="md" color={active ? '#fff' : colors.text.muted}>
                {f.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Feed list */}
      <View style={{ gap: 6 }}>
        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
            <Icon name="check-all" size={24} color={colors.icon.muted} />
            <AppText variant="md" color={colors.text.placeholder}>
              {filter === 'all' ? 'Chưa có món nào' : filter === 'done' ? 'Không có món chờ trả' : 'Không có món trễ'}
            </AppText>
          </View>
        )}
        {filtered.map((it) => (
          <View
            key={it.id}
            style={{
              paddingVertical: 6, paddingHorizontal: 8,
              borderRadius: shape.radius.sm,
              borderWidth: 1,
              borderColor: it.isDelayed
                ? colors.border.danger
                : it.status === 'hoan_thanh'
                  ? colors.border.success
                  : colors.border.default,
              backgroundColor: it.isDelayed
                ? colors.surface.danger
                : it.status === 'hoan_thanh'
                  ? 'rgba(22,163,74,0.06)'
                  : colors.surface.card,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon
                  name={it.isDelayed ? 'alert-circle' : it.status === 'hoan_thanh' ? 'check-circle' : 'progress-clock'}
                  size={14}
                  color={it.isDelayed ? colors.status.danger : it.status === 'hoan_thanh' ? colors.status.success : colors.brand.primary}
                />
                <AppText variant="md" color={colors.text.primary} numberOfLines={1}>
                  {it.tableName}
                </AppText>
                <View style={{ width: 1, height: 10, backgroundColor: colors.border.light }} />
                {it.quantity > 1 && (
                  <AppText variant="md" color={colors.text.muted} numberOfLines={1}>
                    {it.quantity}x
                  </AppText>
                )}
                <AppText variant="md" color={colors.text.secondary} numberOfLines={1}>
                  {it.productName}
                </AppText>
              </View>
              <AppText variant="md" color={colors.text.muted}>
                {it.ageMinutes < 1 ? '<1' : Math.round(it.ageMinutes)}p
              </AppText>
            </View>
            {it.isDelayed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Icon name="clock-alert-outline" size={10} color={colors.status.danger} />
                <AppText variant="md" color={colors.status.danger}>
                  Chờ {Math.round(it.ageMinutes)}p!
                </AppText>
              </View>
            )}
            {it.note ? (
              <AppText variant="md" color={colors.text.placeholder} style={{ marginTop: 2 }}>
                📝 {it.note}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
