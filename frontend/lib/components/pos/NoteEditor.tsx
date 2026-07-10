import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { colors, font } from '../../theme';

interface NoteEditorProps {
  visible: boolean;
  noteText: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function NoteEditor({ visible, noteText, onChangeText, onSave, onCancel }: NoteEditorProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 12 }}>
          <Text style={{ ...font.h4, color: colors.text.primary }}>Ghi chú món</Text>
          <TextInput
            value={noteText}
            onChangeText={onChangeText}
            placeholder="Nhập ghi chú..."
            placeholderTextColor={colors.text.muted}
            multiline
            style={{ padding: 12, borderRadius: 8, backgroundColor: colors.surface.disabled, ...font.body, color: colors.text.primary, minHeight: 80, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...font.buttonSmall, color: colors.text.secondary }}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSave} style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...font.buttonSmall, color: colors.text.inverse }}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
