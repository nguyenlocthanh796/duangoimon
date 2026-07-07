import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';

function formatPriceFull(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

export default function OrderItemsList({ items }: { items: any[] }) {
  return (
    <View style={{ backgroundColor: colors.surface.card, borderRadius: 4, padding: 10, borderWidth: 1, borderColor: colors.border.default, maxHeight: 150 }}>
      <Text style={{ ...font.badge, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.text.muted, marginBottom: 6 }}>Hóa đơn</Text>
      <ScrollView>
        {items.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: colors.text.primary, flex: 1 }}>{item.quantity}x {item.product_name}</Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary }}>{formatPriceFull(item.unit_price * item.quantity)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
