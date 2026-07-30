import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';
import { shape } from '../../theme/shape';

interface Props {
  cashInput: boolean;
  cash: number;
  change: number;
  total: number;
  setCashInput: (v: string) => void;
}

function formatPriceFull(v: number) {
  return (
    Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ'
  );
}

export default function CashInputPanel({ cashInput, cash, change, total, setCashInput }: Props) {
  const changeBg = change >= 0 ? colors.status.successBg : colors.surface.danger;
  const changeBorder = change >= 0 ? colors.border.success : colors.border.danger;
  const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000];
  const suggestions = [total, ...QUICK_AMOUNTS].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          ...font.md,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: colors.text.muted,
          marginBottom: 2,
        }}
      >
        Nhập tiền khách đưa
      </Text>
      <View
        style={{
          backgroundColor: colors.surface.app,
          borderRadius: shape.radius.xl,
          paddingVertical: 10,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border.default,
        }}
      >
        <Text
          style={{ ...font.lg, color: cashInput ? colors.text.primary : colors.text.placeholder }}
        >
          {cashInput ? formatPriceFull(cash) : '0đ'}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: shape.radius.md,
          backgroundColor: changeBg,
          borderWidth: 1,
          borderColor: changeBorder,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon
            name={change >= 0 ? 'check-circle' : 'alert-circle'}
            size={14}
            color={change >= 0 ? colors.status.success : colors.status.danger}
          />
          <Text
            style={{
              ...font.md,
              color: change >= 0 ? colors.status.successText : colors.status.danger,
            }}
          >
            Tiền thối:
          </Text>
        </View>
        <Text
          style={{
            ...font.md,
            color: change >= 0 ? colors.status.success : colors.status.danger,
          }}
        >
          {change >= 0 ? formatPriceFull(change) : `Thiếu ${formatPriceFull(Math.abs(change))}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {suggestions.map((amt) => (
          <TouchableOpacity
            key={amt}
            onPress={() => setCashInput(String(amt))}
            style={{
              flex: 1,
              height: 44,
              borderRadius: shape.radius.md,
              backgroundColor: cash === amt ? colors.brand.primaryBg : colors.surface.card,
              borderWidth: cash === amt ? 1.5 : 1,
              borderColor: cash === amt ? colors.brand.primary : colors.border.default,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                ...font.md,
                color: cash === amt ? colors.brand.primary : colors.text.primary,
              }}
            >
              {formatPriceFull(amt)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
