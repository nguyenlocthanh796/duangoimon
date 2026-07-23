import { View, Text } from 'react-native';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

function formatPriceFull(v: number) {
  return (
    Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ'
  );
}

export default function OrderItemsList({ items }: { items: any[] }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface.card,
        borderRadius: shape.radius.md,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border.default,
      }}
    >
      <Text
        style={{
          ...font.smBold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: colors.text.muted,
          marginBottom: 8,
        }}
      >
        Hóa đơn
      </Text>
      <View>
        {items.map((item, idx) => (
          <View
            key={idx}
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}
          >
            <Text style={{ ...font.sm, color: colors.text.primary, flex: 1 }}>
              {item.quantity}x {item.product_name}
            </Text>
            <Text style={{ ...font.sm, color: colors.text.secondary }}>
              {formatPriceFull(item.unit_price * item.quantity)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
