import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Tìm kiếm...' }: SearchBarProps) {
  return (
    <View style={styles.box}>
      <Icon name="magnify" size={16} color={colors.text.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        style={styles.input}
      />
      {value !== '' && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={16} color={colors.text.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: shape.spacing.xs,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.md,
    paddingHorizontal: shape.spacing.sm,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  input: {
    flex: 1,
    ...font.sm,
    color: colors.text.primary,
    paddingVertical: 0,
  },
});
