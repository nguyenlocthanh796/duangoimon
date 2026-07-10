import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { NUMPAD_KEYS } from '../../hooks/usePayment';

interface NumpadProps {
  method: string;
  onKey: (key: typeof NUMPAD_KEYS[number]) => void;
}

export default function Numpad({ method, onKey }: NumpadProps) {
  const isCash = method === 'tien_mat';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', opacity: isCash ? 1 : 0.25 }}>
      {NUMPAD_KEYS.map((key, i) => {
        const isClear = key.type === 'clear';
        const isBack = key.type === 'back';
        return (
          <TouchableOpacity
            key={i}
            disabled={!isCash}
            onPress={() => onKey(key)}
            style={{
              width: '30%', height: 48, borderRadius: 4,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: isClear ? colors.surface.danger : isBack ? colors.surface.disabled : colors.surface.app,
              borderWidth: 1,
              borderColor: isClear ? colors.border.danger : colors.border.default,
            }}
          >
            {isBack
              ? <Icon name="backspace-outline" size={20} color={colors.text.secondary} />
              : <Text style={{ ...font.button, color: isClear ? colors.status.danger : colors.text.primary }}>
                  {key.label}
                </Text>
            }
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
