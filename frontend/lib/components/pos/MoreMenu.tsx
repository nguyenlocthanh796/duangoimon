import React from 'react';
import { View, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { palette } from '../../theme/colors';
import { shape } from '../../theme/shape';
import AppText from '../ui/AppText';

interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  onSplitBill?: () => void;
  onMergeBill?: () => void;
  onMoveTable?: () => void;
  onSplitTable?: () => void;
  onMergeTable?: () => void;
}

export default function MoreMenu({
  visible,
  onClose,
  onSplitBill,
  onMergeBill,
  onMoveTable,
  onSplitTable,
  onMergeTable,
}: MoreMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: colors.surface.overlay }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={{
            position: 'absolute',
            top: 60,
            right: 8,
            backgroundColor: colors.surface.card,
            borderRadius: shape.radius.md,
            padding: 8,
            gap: 2,
            minWidth: 180,
            borderWidth: 1,
            borderColor: colors.border.default,
            ...shape.shadow.md,
          }}
        >
          <AppText
            variant="sm"
            color={colors.text.muted}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 6,
              paddingBottom: 4,
            }}
          >
            Nghiệp vụ
          </AppText>
          {onSplitBill && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onSplitBill();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: shape.radius.md,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: colors.brand.primaryBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="call-split" size={16} color={colors.brand.primary} />
              </View>
              <AppText variant="md" color={colors.text.primary}>Tách bill</AppText>
            </TouchableOpacity>
          )}
          {onMergeBill && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onMergeBill();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: shape.radius.md,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: colors.badge.info.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="call-merge" size={16} color={colors.status.info} />
              </View>
              <AppText variant="md" color={colors.text.primary}>Gộp bill</AppText>
            </TouchableOpacity>
          )}
          {onMoveTable && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onMoveTable();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: shape.radius.md,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: colors.badge.warning.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="tray-arrow-down" size={16} color={colors.status.warning} />
              </View>
              <AppText variant="md" color={colors.text.primary}>Chuyển bàn</AppText>
            </TouchableOpacity>
          )}
          {onSplitTable && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onSplitTable();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: shape.radius.md,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: colors.badge.danger.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="call-split" size={16} color={colors.status.danger} />
              </View>
              <AppText variant="md" color={colors.text.primary}>Tách bàn</AppText>
            </TouchableOpacity>
          )}
          {onMergeTable && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onMergeTable();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: shape.radius.md,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: colors.badge.success.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="compare-horizontal" size={16} color={colors.status.success} />
              </View>
              <AppText variant="md" color={colors.text.primary}>Gộp bàn</AppText>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
