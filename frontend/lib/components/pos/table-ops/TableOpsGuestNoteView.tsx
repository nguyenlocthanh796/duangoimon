import React from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';

interface TableOpsGuestNoteViewProps {
  guestCount: number;
  onSetGuestCount: (count: number) => void;
  tableNote: string;
  onSetTableNote: (note: string) => void;
  insetsBottom: number;
  onSaveGuestNote: () => void;
}

export const TableOpsGuestNoteView: React.FC<TableOpsGuestNoteViewProps> = ({
  guestCount,
  onSetGuestCount,
  tableNote,
  onSetTableNote,
  insetsBottom,
  onSaveGuestNote,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stepper Số Khách */}
        <View>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ paddingHorizontal: 4, marginBottom: 8 }}>
            SỐ LƯỢNG KHÁCH NGỒI TẠI BÀN:
          </AppText>

          <View style={[s.guestStepperContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Bớt 1 khách"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                if (guestCount > 1) {
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  onSetGuestCount(guestCount - 1);
                }
              }}
              style={[s.guestStepBtn, { backgroundColor: theme.surface.header }]}
            >
              <Icon name="minus" size={24} color={theme.text.primary} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <AppText variant="xl" weight="medium" color={theme.brand.primary} tabularNums>
                {guestCount}
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Khách
              </AppText>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Thêm 1 khách"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                if (guestCount < 50) {
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  onSetGuestCount(guestCount + 1);
                }
              }}
              style={[s.guestStepBtn, { backgroundColor: theme.surface.header }]}
            >
              <Icon name="plus" size={24} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ghi chú phục vụ */}
        <View>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ paddingHorizontal: 4, marginBottom: 8 }}>
            GHI CHÚ PHỤC VỤ CHO BÀN:
          </AppText>

          <TextInput
            value={tableNote}
            onChangeText={onSetTableNote}
            placeholder="Ghi chú (VIP, chờ bạn...)"
            placeholderTextColor={theme.text.muted}
            multiline
            numberOfLines={3}
            style={[
              s.tableNoteInput,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>
      </ScrollView>

      {/* Bottom Dock Action */}
      <View
        style={[
          s.fixedBottomDock,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.default,
            paddingBottom: Math.max(insetsBottom, 16),
          },
        ]}
      >
        <Button
          variant="default"
          size="lg"
          title="Lưu Ghi Chú"
          leadingIcon={<Icon name="check" size={20} color={theme.text.onBrand} />}
          onPress={onSaveGuestNote}
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  guestStepperContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  guestStepBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tableNoteInput: { height: 90, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, textAlignVertical: 'top', fontSize: 16 },
  fixedBottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
