import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape, palette } from '../../theme';

export interface TicketOrder {
  id: string;
  table_name: string;
  table_id: string;
  created_at: string;
  note?: string;
  items: TicketItem[];
  status: string;
}

export interface TicketItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options?: Record<string, string>;
}

export type KanbanStatus = 'cho_xu_ly' | 'dang_lam' | 'hoan_thanh';

interface TicketCardProps {
  order: TicketOrder;
  colStatus: KanbanStatus;
  onMarkDone: (orderId: string) => void;
  onMoveForward: (orderId: string) => void;
}

const getElapsed = (createdAt: string) => {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
};

export default function TicketCard({ order, colStatus, onMarkDone, onMoveForward }: TicketCardProps) {
  const elapsed  = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const isUrgent = elapsed > 15 && colStatus !== 'hoan_thanh';
  const isDone   = colStatus === 'hoan_thanh';

  return (
    <View style={{
      backgroundColor: colors.surface.card,
      borderRadius: 16, marginBottom: 12,
      borderWidth: 1.5,
      borderColor: isUrgent ? palette.red[300] : isDone ? colors.border.success : colors.border.default,
      overflow: 'hidden',
      shadowColor: palette.slate[900], shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDone ? 0.03 : 0.08, shadowRadius: 8, elevation: isDone ? 1 : 3,
      opacity: isDone ? 0.75 : 1,
    }}>
      {/* Urgency top stripe */}
      {isUrgent && <View style={{ height: 3, backgroundColor: colors.status.danger }} />}
      {!isUrgent && isDone  && <View style={{ height: 3, backgroundColor: colors.status.success }} />}
      {!isUrgent && !isDone && <View style={{ height: 3, backgroundColor: colors.brand.primary }} />}

      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: isUrgent ? colors.surface.danger : isDone ? palette.green[50] : colors.surface.app,
        borderBottomWidth: 1, borderBottomColor: isUrgent ? colors.border.danger : isDone ? palette.green[250] : colors.surface.disabled,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 34, height: 34, borderRadius: 10,
            backgroundColor: isUrgent ? colors.status.danger : isDone ? colors.status.success : colors.brand.primary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="table-furniture" size={16} color={colors.text.inverse} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ ...font.h3, color: colors.text.primary }}>{order.table_name}</Text>
            <Text style={{ ...font.badge, color: colors.text.muted }}>
              #{order.id.slice(-6).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
            backgroundColor: isUrgent ? palette.red[100] : isDone ? colors.border.success : colors.brand.primaryBg,
          }}>
            <Text style={{ ...font.caption, color: isUrgent ? colors.status.danger : isDone ? colors.status.success : colors.brand.primary }}>
              {getElapsed(order.created_at)}
            </Text>
          </View>
          {isUrgent && (
            <Text style={{ ...font.micro, fontWeight: '800', color: colors.status.danger, marginTop: 2, letterSpacing: 1 }}>QUÁ HẠN</Text>
          )}
        </View>
      </View>

      {/* Items list */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        {order.items.filter(i => i.quantity > 0).map(item => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Text style={{ ...font.caption, color: colors.brand.primary }}>×{item.quantity}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...font.bodySmall, color: colors.text.primary }}>{item.product_name}</Text>
              {item.note && (
                <Text style={{ ...font.caption, color: palette.amber[600], marginTop: 2 }}>📝 {item.note}</Text>
              )}
              {item.options && Object.keys(item.options).length > 0 && (
                <Text style={{ ...font.badge, color: colors.text.muted, marginTop: 1 }}>
                  {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Order note */}
      {order.note && (
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.status.warningBg, borderTopWidth: 1, borderTopColor: palette.amber[200] }}>
          <Text style={{ ...font.caption, color: palette.amber[800] }}>📋 {order.note}</Text>
        </View>
      )}

      {/* Actions */}
      {!isDone && (
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.surface.disabled }}>
          {colStatus === 'cho_xu_ly' && (
            <TouchableOpacity
              onPress={() => onMoveForward(order.id)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primaryBg, borderWidth: 1, borderColor: colors.border.brand }}
            >
              <Icon name="play" size={16} color={colors.brand.primary} />
              <Text style={{ ...font.tab, color: colors.brand.primary }}>Bắt đầu làm</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onMarkDone(order.id)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.status.successBg, borderWidth: 1, borderColor: palette.green[350] }}
          >
            <Icon name="check" size={16} color={colors.status.success} />
            <Text style={{ ...font.tab, color: colors.status.success }}>Xong</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
