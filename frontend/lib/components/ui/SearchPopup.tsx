import { View, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import AppText from './AppText';

interface SearchPopupProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export default function SearchPopup({ visible, value, onChangeText, onClose, placeholder, children }: SearchPopupProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.popup} onStartShouldSetResponder={() => true}>
          {/* Orange accent line */}
          <View style={styles.accent} />

          {/* Header: icon + title */}
          <View style={styles.headerRow}>
            <Icon name="magnify" size={18} color={colors.brand.primary} />
            <View style={styles.headerText}>
              <AppText variant="md" color={colors.text.primary} weight="bold">Tìm kiếm</AppText>
              <AppText variant="sm" color={colors.text.muted}>Gõ để tìm kiếm, bấm filter để lọc</AppText>
            </View>
          </View>

          {/* Search input */}
          <View style={styles.inputContainer}>
            <Icon name="magnify" size={16} color={colors.text.muted} />
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder || 'Tìm kiếm...'}
              placeholderTextColor={colors.text.placeholder}
              style={styles.input}
              autoFocus
            />
            {value.length > 0 && (
              <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={18} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Optional filter chips */}
          {children && (
            <View style={styles.filtersSection}>
              <View style={styles.divider} />
              <View style={styles.filterLabel}>
                <Icon name="filter-variant" size={13} color={colors.text.muted} />
                <AppText variant="sm" color={colors.text.secondary}>Bộ lọc</AppText>
              </View>
              {children}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  popup: {
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  accent: {
    height: 2,
    backgroundColor: colors.brand.primary,
    width: 44,
    marginLeft: 16,
    marginTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  headerText: {
    gap: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: colors.surface.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: 0,
    fontSize: 15,
  },
  filtersSection: {
    paddingBottom: 8,
  },
  filterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: 10,
    marginHorizontal: 16,
  },
});


