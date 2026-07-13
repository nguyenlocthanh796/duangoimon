import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';
import SplitBillPanel from './SplitBillPanel';

interface Props {
  showSplitter: boolean;
  setShowSplitter: (v: boolean) => void;
  splits: { method: string; amount: number }[];
  setSplits: (s: { method: string; amount: number }[]) => void;
  handlePay: (splits?: { method: string; amount: number }[]) => void;
  paying: boolean;
  canPay: boolean;
  total: number;
}

export default function SplitBillToggle({
  showSplitter,
  setShowSplitter,
  splits,
  setSplits,
  handlePay,
  paying,
  canPay,
  total,
}: Props) {
  return showSplitter ? (
    <SplitBillPanel
      total={total}
      splits={splits}
      onChange={setSplits}
      onPay={() => {
        setShowSplitter(false);
        handlePay(splits.length > 0 ? splits : undefined);
      }}
      onCancel={() => setShowSplitter(false)}
      paying={paying}
      canPay={canPay}
    />
  ) : (
    <TouchableOpacity
      onPress={() => setShowSplitter(true)}
      style={{
        alignItems: 'center',
        padding: 6,
        marginTop: 4,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <Icon name="content-copy" size={14} color={colors.brand.primary} />
      <Text style={{ ...font.tab, color: colors.brand.primary }}>Chia hóa đơn (Split bill)</Text>
    </TouchableOpacity>
  );
}
