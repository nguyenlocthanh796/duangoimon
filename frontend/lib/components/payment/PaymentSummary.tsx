import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, formatPrice, formatPriceFull } from '../../theme';

export interface ReceiptItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options?: Record<string, string>;
}

interface PaymentSummaryProps {
  items: ReceiptItem[];
  total: number;
  tableName: string;
  orderId: string;
}

export default function PaymentSummary({ items, total, tableName, orderId }: PaymentSummaryProps) {
  return (
    <View style={{ gap: 4 }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingVertical: 4,
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ ...font.bodySmall, color: '#1f2937' }}>{item.product_name}</Text>
            {item.note && <Text style={{ ...font.caption, color: '#d97706' }}>* {item.note}</Text>}
          </View>
          <Text style={{ ...font.bodySmall, color: '#6b7280' }}>
            {item.quantity} x {formatPrice(item.unit_price)}
          </Text>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8, paddingTop: 8 }} />
    </View>
  );
}
