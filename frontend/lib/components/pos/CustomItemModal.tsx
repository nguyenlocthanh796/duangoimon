import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, AppModal, Button } from '../ui';
import { playTapSound } from '../../utils/sound';

export interface CustomItemModalProps {
  visible: boolean;
  tableName: string;
  onClose: () => void;
  onConfirm: (name: string, price: number, qty: number, note?: string) => void;
}

const pricePresets = [10000, 20000, 30000, 50000, 100000];

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  visible,
  tableName,
  onClose,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('30000');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setPriceStr('30000');
      setQty(1);
      setNote('');
    }
  }, [visible]);

  const numPrice = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

  const handleSubmit = () => {
    const finalName = name.trim() || 'Món khác';
    const numPriceVal = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    onConfirm(finalName, numPriceVal, qty, note);
    onClose();
  };

  if (!visible) return null;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="+ Món khác"
      subtitle={`Thêm trực tiếp vào ${tableName}`}
      icon={<Icon name="plus-box-outline" size={20} color={theme.brand.accent} />}
      width={420}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Button
            title="HỦY"
            variant="outline"
            style={{ flex: 1, height: 48, borderRadius: 12 }}
            onPress={() => {
              playTapSound();
              onClose();
            }}
          />
          <Button
            title={`+ THÊM (${(numPrice * qty).toLocaleString('vi-VN')} đ)`}
            variant="accent"
            style={{ flex: 1.8, height: 48, borderRadius: 12 }}
            onPress={handleSubmit}
          />
        </View>
      }
    >
      <View style={s.body}>
        {/* Tên món */}
        <View style={s.fieldGroup}>
          <AppText variant="xs" weight="normal" color={theme.text.muted}>
            TÊN MÓN:
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus={true}
            placeholder="Tên món ngoài menu..."
            placeholderTextColor={theme.text.muted}
            style={[
              s.input,
              {
                backgroundColor: theme.surface.app,
                color: theme.text.primary,
                borderColor: theme.border.default,
              },
            ]}
          />
        </View>

        {/* Giá tiền */}
        <View style={s.fieldGroup}>
          <AppText variant="xs" weight="normal" color={theme.text.muted}>
            ĐƠN GIÁ:
          </AppText>
          <TextInput
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.text.muted}
            style={[
              s.input,
              {
                backgroundColor: theme.surface.app,
                color: theme.brand.primary,
                borderColor: theme.border.default,
                fontSize: 22,
                fontWeight: '500',
              },
            ]}
          />

          {/* Price Preset Chips */}
          <View style={s.presetRow}>
            {pricePresets.map((p) => {
              const isSelected = numPrice === p;
              return (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Giá ${(p / 1000).toLocaleString('vi-VN')} nghìn đồng`}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    setPriceStr(p.toString());
                  }}
                  style={[
                    s.presetChip,
                    {
                      backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.header,
                      borderColor: isSelected ? theme.brand.primary : theme.border.default,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight={isSelected ? 'medium' : 'normal'}
                    color={isSelected ? theme.brand.primary : theme.text.primary}
                    tabularNums
                  >
                    {(p / 1000).toLocaleString('vi-VN')}k
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Số lượng */}
        <View style={[s.fieldGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <AppText variant="xs" weight="normal" color={theme.text.muted}>
            SỐ LƯỢNG:
          </AppText>
          <View style={s.qtyStepper}>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Bớt 1 phần"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setQty(Math.max(1, qty - 1));
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[s.stepBtn, { backgroundColor: theme.surface.header }]}
            >
              <Icon name="minus" size={16} color={theme.text.primary} />
            </TouchableOpacity>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ width: 36, textAlign: 'center' }}>
              {qty}
            </AppText>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Thêm 1 phần"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setQty(qty + 1);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[s.stepBtn, { backgroundColor: theme.brand.primaryBg }]}
            >
              <Icon name="plus" size={16} color={theme.brand.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AppModal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)' } as any)
      : { elevation: 8 }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
