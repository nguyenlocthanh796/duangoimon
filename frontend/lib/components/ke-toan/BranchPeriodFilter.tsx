import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';
import { api } from '../../api';
import type { Branch } from '../../api/management';
import FormModal from '../ui/FormModal';
import { useAuth } from '../../context/AuthContext';

export interface BranchPeriodFilterProps {
  branchId: string | null;
  onBranchChange?: (id: string) => void;
  period?: string;
  onPeriodChange?: (p: string) => void;
  form?: string;
  onFormChange?: (f: string) => void;
  formOptions?: { key: string; label: string }[];
}

const BOTTOM_SHEET_BRANCH = '__BRANCH_PICKER__';

export default function BranchPeriodFilter({
  branchId,
  onBranchChange,
  period,
  onPeriodChange,
  form,
  onFormChange,
  formOptions,
}: BranchPeriodFilterProps) {
  const { branchId: userBranch, userRole } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // P4.3 — accountant is scoped to their branch: lock the selector.
  const locked = useMemo(() => {
    if (!userBranch) return false;
    const r = (userRole || '').toLowerCase();
    return r !== 'admin' && r !== 'manager';
  }, [userBranch, userRole]);

  useEffect(() => {
    if (locked && branchId !== userBranch) onBranchChange?.(userBranch as string);
  }, [locked, userBranch, branchId, onBranchChange]);

  useEffect(() => {
    let active = true;
    setLoadingBranches(true);
    api
      .getBranches()
      .then((b) => {
        if (active) setBranches(b);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingBranches(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = branches.find((b) => b.id === branchId);

  return (
    <View style={styles.bar}>
      {/* Branch dropdown (locked for scoped accountant) */}
      <TouchableOpacity
        style={[styles.branchBtn, locked && styles.branchBtnLocked]}
        onPress={() => !locked && setPickerOpen(true)}
        activeOpacity={locked ? 1 : 0.7}
        disabled={locked}
      >
        {loadingBranches ? (
          <ActivityIndicator size="small" color={colors.icon.muted} />
        ) : (
          <Icon
            name={locked ? 'lock-outline' : 'store-outline'}
            size={18}
            color={colors.icon.muted}
          />
        )}
        <Text style={[styles.branchText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.name : branchId ? branchId : 'Chọn chi nhánh'}
        </Text>
        {!locked && <Icon name="chevron-down" size={18} color={colors.icon.muted} />}
      </TouchableOpacity>

      {/* Period input */}
      {period !== undefined && (
        <View style={[styles.inputWrap, { width: 110 }]}>
          <TextInput
            style={styles.input}
            value={period}
            onChangeText={(t) => onPeriodChange?.(t.trim())}
            placeholder="YYYY-MM"
            placeholderTextColor={colors.text.placeholder}
          />
        </View>
      )}

      {/* Form picker */}
      {formOptions && formOptions.length > 0 && (
        <View style={styles.formRow}>
          {formOptions.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[styles.formChip, form === o.key && styles.formChipActive]}
              onPress={() => onFormChange?.(o.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.formChipText, form === o.key && styles.formChipTextActive]}
                numberOfLines={1}
              >
                {o.label.split('—')[0].trim()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!locked && (
        <FormModal visible={pickerOpen} title="Chọn chi nhánh" onClose={() => setPickerOpen(false)}>
          {loadingBranches ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : branches.length === 0 ? (
            <View style={styles.centerBox}>
              <Icon name="store-outline" size={48} color={colors.text.muted} />
              <Text
                style={[font.body, { color: colors.text.muted, marginTop: 8, textAlign: 'center' }]}
              >
                Không có chi nhánh nào
              </Text>
            </View>
          ) : (
            branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.branchItem, b.id === branchId && styles.branchItemActive]}
                onPress={() => {
                  onBranchChange?.(b.id);
                  setPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.branchItemIcon}>
                  <Icon
                    name="store-outline"
                    size={20}
                    color={b.id === branchId ? colors.text.inverse : colors.brand.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.branchItemName,
                      b.id === branchId && styles.branchItemNameActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                  {b.tax_code ? (
                    <Text style={[font.caption, { color: colors.text.muted }]}>
                      MST: {b.tax_code}
                    </Text>
                  ) : null}
                </View>
                {b.id === branchId && <Icon name="check" size={20} color={colors.brand.primary} />}
              </TouchableOpacity>
            ))
          )}
        </FormModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    flexWrap: 'wrap',
  },
  branchBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.app,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    height: 44,
  },
  branchBtnLocked: { opacity: 0.85, backgroundColor: colors.surface.disabled },
  branchText: { ...font.body, color: colors.text.primary, flex: 1 },
  placeholder: { color: colors.text.placeholder },
  inputWrap: {
    backgroundColor: colors.surface.app,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
  },
  input: { height: 44, ...font.body, color: colors.text.primary },
  formRow: { flexDirection: 'row', gap: 6, width: '100%', marginTop: 4 },
  formChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  formChipActive: { backgroundColor: colors.brand.primaryBg, borderColor: colors.border.brand },
  formChipText: { ...font.caption, color: colors.text.muted, fontWeight: '600' },
  formChipTextActive: { color: colors.brand.primary },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 8,
    backgroundColor: colors.surface.card,
  },
  branchItemActive: { borderColor: colors.border.brand, backgroundColor: colors.brand.primaryBg },
  branchItemIcon: {
    width: 38,
    height: 38,
    borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchItemName: { ...font.body, fontWeight: '600', color: colors.text.primary },
  branchItemNameActive: { color: colors.brand.primary },
});
