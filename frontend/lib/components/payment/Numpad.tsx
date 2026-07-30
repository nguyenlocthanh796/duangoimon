import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NUMPAD_KEYS } from '../../hooks/usePayment';
import AppText from '../ui/AppText';

interface NumpadProps {
  method: string;
  onKey: (key: (typeof NUMPAD_KEYS)[number]) => void;
}

export default function Numpad({ method, onKey }: NumpadProps) {
  const isCash = method === 'tien_mat';
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
        opacity: isCash ? 1 : 0.25,
      }}
    >
      {NUMPAD_KEYS.map((key, i) => {
        const isClear = key.type === 'clear';
        const isBack = key.type === 'back';
        
        // iOS-style flat color palette
        const bg = isClear 
          ? '#FEF2F2' 
          : isBack 
            ? '#E2E8F0' 
            : '#F1F5F9';
        const border = isClear 
          ? '#FECACA' 
          : isBack 
            ? '#CBD5E1' 
            : '#E2E8F0';
        const textColor = isClear 
          ? '#DC2626' 
          : '#0F172A';

        return (
          <TouchableOpacity
            key={i}
            disabled={!isCash}
            onPress={() => onKey(key)}
            delayPressIn={0}
            activeOpacity={0.65}
            style={{
              width: '30%',
              height: 46, // iOS guideline optimized touch height
              borderRadius: 8, // Fixed 8px border radius
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            {isBack ? (
              <Icon name="backspace-outline" size={20} color="#0F172A" />
            ) : (
              <AppText
                variant="md"
                weight="normal"
                color={textColor}
              >
                {key.label}
              </AppText>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
