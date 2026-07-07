import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';

const METHODS = ['tien_mat', 'card', 'qr', 'chuyen_khoan'];

export default function PickerItem({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {METHODS.map(m => (
        <TouchableOpacity key={m} onPress={() => onChange(m)}
          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: value === m ? colors.brand.primaryBg : colors.surface.app, borderWidth: 1, borderColor: value === m ? colors.brand.primary : colors.border.default }}>
          <Text style={{ ...font.micro, fontWeight: '700', color: value === m ? colors.brand.primary : colors.text.muted }}>{m}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
