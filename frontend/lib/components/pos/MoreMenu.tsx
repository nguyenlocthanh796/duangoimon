import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { palette } from '../../theme/colors';
import { shape } from '../../theme/shape';

interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  onSplitBill?: () => void;
  onMergeBill?: () => void;
  onMoveTable?: () => void;
  onSplitTable?: () => void;
  onMergeTable?: () => void;
}

export default function MoreMenu({ visible, onClose, onSplitBill, onMergeBill, onMoveTable, onSplitTable, onMergeTable }: MoreMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{ position: 'absolute', top: 60, right: 8, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 8, gap: 2, minWidth: 180, borderWidth: 1, borderColor: colors.border.default, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <Text style={{ ...font.label, color: colors.text.muted, paddingHorizontal: 8, paddingVertical: 6, paddingBottom: 4 }}>Nghiệp vụ</Text>
          {onSplitBill && (
            <TouchableOpacity onPress={() => { onClose(); onSplitBill(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: shape.radius.md }}>
              <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="call-split" size={16} color={colors.brand.primary} />
              </View>
              <Text style={{ ...font.body, color: colors.text.primary }}>Tách bill</Text>
            </TouchableOpacity>
          )}
          {onMergeBill && (
            <TouchableOpacity onPress={() => { onClose(); onMergeBill(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: shape.radius.md }}>
              <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="merge-type" size={16} color="#0284c7" />
              </View>
              <Text style={{ ...font.body, color: colors.text.primary }}>Gộp bill</Text>
            </TouchableOpacity>
          )}
          {onMoveTable && (
            <TouchableOpacity onPress={() => { onClose(); onMoveTable(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: shape.radius.md }}>
              <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="move-to-inbox" size={16} color="#d97706" />
              </View>
              <Text style={{ ...font.body, color: colors.text.primary }}>Chuyển bàn</Text>
            </TouchableOpacity>
          )}
          {onSplitTable && (
            <TouchableOpacity onPress={() => { onClose(); onSplitTable(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: shape.radius.md }}>
              <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#fce4ec', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="call-split" size={16} color="#e53935" />
              </View>
              <Text style={{ ...font.body, color: colors.text.primary }}>Tách bàn</Text>
            </TouchableOpacity>
          )}
          {onMergeTable && (
            <TouchableOpacity onPress={() => { onClose(); onMergeTable(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: shape.radius.md }}>
              <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="compare-arrows" size={16} color="#43a047" />
              </View>
              <Text style={{ ...font.body, color: colors.text.primary }}>Gộp bàn</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
