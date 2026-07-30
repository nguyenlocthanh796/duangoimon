import React from 'react';
import { View, TextInput, TouchableOpacity, Modal } from 'react-native';
import { colors, font } from '../../theme';
import AppText from '../ui/AppText';
import { haptic } from '../../haptic';

interface NoteEditorProps {
  visible: boolean;
  noteText: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function NoteEditor({
  visible,
  noteText,
  onChangeText,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const handleSave = () => {
    haptic.impact('light');
    onSave();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
        <View
          style={{
            backgroundColor: colors.surface.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 24,
            gap: 12,
          }}
        >
          {/* iOS Grabber Bar */}
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 4 }} />
          <AppText variant="md" color={colors.text.primary}>Ghi chú món</AppText>
          <TextInput
            value={noteText}
            onChangeText={onChangeText}
            placeholder="Nhập ghi chú..."
            placeholderTextColor={colors.text.muted}
            multiline
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: colors.surface.disabled,
              ...font.md,
              color: colors.text.primary,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 8,
                backgroundColor: colors.surface.disabled,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="md" color={colors.text.secondary}>Huỷ</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 8,
                backgroundColor: colors.brand.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="md" color={colors.text.inverse}>Lưu</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
