import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';
import PickerItem from './PickerItem';

interface Props {
  total: number;
  splits: { method: string; amount: number }[];
  onChange: (s: { method: string; amount: number }[]) => void;
  onPay: () => void;
  onCancel: () => void;
  paying: boolean;
  canPay: boolean;
}

function formatPriceFull(v: number) {
  return (
    Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ'
  );
}

export default function SplitBillPanel({
  total,
  splits,
  onChange,
  onPay,
  onCancel,
  paying,
  canPay,
}: Props) {
  const addSplit = () => {
    const remaining = total - splits.reduce((s, p) => s + p.amount, 0);
    onChange([...splits, { method: 'tien_mat', amount: Math.max(0, remaining) }]);
  };
  const updateSplit = (idx: number, field: 'method' | 'amount', value: string | number) => {
    onChange(
      splits.map((s, i) =>
        i === idx ? { ...s, [field]: typeof value === 'string' ? value : Math.max(0, value) } : s
      )
    );
  };
  const removeSplit = (idx: number) => onChange(splits.filter((_, i) => i !== idx));
  const sumPaid = splits.reduce((s, p) => s + p.amount, 0);
  const ok = Math.abs(sumPaid - total) <= 100;

  return (
    <View
      style={{
        padding: 12,
        backgroundColor: colors.surface.card,
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...font.h3, color: colors.text.primary }}>Chia hóa đơn</Text>
        <TouchableOpacity onPress={onCancel}>
          <Icon name="close" size={20} color={colors.icon.muted} />
        </TouchableOpacity>
      </View>
      {splits.map((sp, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flex: 1 }}>
            <PickerItem value={sp.method} onChange={(v) => updateSplit(idx, 'method', v)} />
          </View>
          <TextInput
            value={String(sp.amount)}
            onChangeText={(v) => updateSplit(idx, 'amount', parseFloat(v) || 0)}
            keyboardType="decimal-pad"
            style={{
              borderWidth: 1,
              borderColor: colors.border.default,
              borderRadius: 8,
              padding: 6,
              ...font.caption,
              color: colors.text.primary,
              width: 90,
              textAlign: 'center',
            }}
          />
          <TouchableOpacity onPress={() => removeSplit(idx)}>
            <Icon name="close-circle" size={18} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        onPress={addSplit}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Icon name="plus-circle" size={16} color={colors.brand.primary} />
        <Text style={{ ...font.tab, color: colors.brand.primary }}>Thêm phương thức</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...font.caption, color: ok ? colors.status.success : colors.status.danger }}>
          Đã chia: {formatPriceFull(sumPaid)} / {formatPriceFull(total)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPay}
        disabled={!ok || paying}
        style={{
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: ok && !paying ? colors.status.success : colors.surface.disabled,
        }}
      >
        <Text
          style={{ ...font.h3, color: !ok || paying ? colors.text.muted : colors.text.inverse }}
        >
          {paying ? 'Đang xử lý...' : `Thanh toán (${formatPriceFull(sumPaid)})`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
