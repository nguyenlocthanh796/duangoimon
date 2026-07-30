import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape, formatPrice } from '../../theme';
import AppText from '../ui/AppText';
import type { Table } from './TableCard';

interface VisualTablePickerProps {
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (table: Table) => void;
  excludeTableId?: string;
  filterStatus?: 'all' | 'co_khach' | 'trong';
  containerHeight?: number;
  layoutMode?: 'grid' | 'list'; // Dạng ô vuông (grid) vs dạng danh sách (list)
}

export default function VisualTablePicker({
  tables,
  selectedTableId,
  onSelectTable,
  excludeTableId,
  filterStatus = 'all',
  containerHeight = 360,
  layoutMode = 'grid',
}: VisualTablePickerProps) {
  const [selectedArea, setSelectedArea] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  const abbreviateArea = (areaName?: string) => {
    if (!areaName) return '';
    const lower = areaName.toLowerCase();
    if (lower.includes('trong nhà') || lower.includes('trong nha')) return 'T.Nhà';
    if (lower.includes('ngoài trời') || lower.includes('ngoai troi')) return 'N.Trời';
    if (lower.includes('vip')) return 'VIP';
    return areaName;
  };

  // Unique areas
  const areas = ['Tất cả', ...Array.from(new Set(tables.map((t) => t.area).filter(Boolean) as string[]))];

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    if (excludeTableId && t.id === excludeTableId) return false;
    if (filterStatus === 'co_khach' && t.status !== 'co_khach') return false;
    if (filterStatus === 'trong' && t.status === 'co_khach') return false;
    if (selectedArea !== 'Tất cả' && t.area !== selectedArea) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return t.name.toLowerCase().includes(q) || (t.area && t.area.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <View style={{ flex: 1, gap: 12 }}>
      {/* Search & Area Filter Bar */}
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface.app,
            borderRadius: shape.radius.md,
            paddingHorizontal: 10,
            height: 38,
            borderWidth: 1,
            borderColor: colors.border.default,
          }}
        >
          <Icon name="magnify" size={18} color={colors.icon.muted} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Tìm tên bàn hoặc khu vực..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              ...font.sm,
              color: colors.text.primary,
              padding: 0,
            }}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={16} color={colors.icon.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Area Tabs */}
        {areas.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {areas.map((area) => {
              const active = selectedArea === area;
              return (
                <TouchableOpacity
                  key={area}
                  onPress={() => setSelectedArea(area)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: shape.radius.full,
                    backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
                    borderWidth: 1,
                    borderColor: active ? colors.brand.primary : colors.border.default,
                  }}
                >
                  <AppText
                    variant="md"
                    weight={active ? 'bold' : 'normal'}
                    color={active ? colors.text.inverse : colors.text.secondary}
                  >
                    {area}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Table List / Grid Content */}
      <ScrollView
        style={{ maxHeight: containerHeight }}
        contentContainerStyle={{
          flexDirection: layoutMode === 'list' ? 'column' : 'row',
          flexWrap: layoutMode === 'list' ? 'nowrap' : 'wrap',
          gap: 10,
          paddingBottom: 8,
        }}
        showsVerticalScrollIndicator={true}
      >
        {filteredTables.length === 0 ? (
          <View style={{ flex: 1, width: '100%', alignItems: 'center', paddingVertical: 32, gap: 8 }}>
            <Icon name="table-off" size={36} color={colors.icon.muted} />
            <AppText variant="md" color={colors.text.muted}>
              Không tìm thấy bàn phù hợp
            </AppText>
          </View>
        ) : (
          filteredTables.map((table) => {
            const isOccupied = table.status === 'co_khach';
            const isSelected = selectedTableId === table.id;

            if (layoutMode === 'list') {
              // 📜 List View Row Style
              return (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => onSelectTable(table)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: shape.radius.md,
                    backgroundColor: isSelected
                      ? colors.brand.primaryBg
                      : isOccupied
                      ? '#FEF2F2'
                      : colors.surface.card,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected
                      ? colors.brand.primary
                      : isOccupied
                      ? '#FECACA'
                      : '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: isOccupied ? colors.status.dangerBg : colors.status.successBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={isOccupied ? 'silverware-fork-knife' : 'table-chair'}
                        size={18}
                        color={isOccupied ? colors.status.danger : colors.status.success}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText variant="md" color={colors.text.primary}>
                          {table.name}
                        </AppText>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                            backgroundColor: isOccupied ? '#FEE2E2' : '#DCFCE7',
                          }}
                        >
                          <AppText
                            variant="md"
                           
                            color={isOccupied ? colors.status.danger : colors.status.success}
                          >
                            {isOccupied ? 'Có khách' : 'Bàn trống'}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="md" color={colors.text.muted}>
                        {table.area || 'Chung'} · {table.capacity || 4} ghế
                      </AppText>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    {isOccupied && table.orderTotal ? (
                      <AppText variant="md" color={colors.status.danger}>
                        {formatPrice(table.orderTotal)}
                      </AppText>
                    ) : (
                      <AppText variant="md" color={colors.status.success}>
                        Sẵn sàng
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }

            // 🔳 Grid Card View Style (Default)
            return (
              <TouchableOpacity
                key={table.id}
                onPress={() => onSelectTable(table)}
                activeOpacity={0.8}
                style={{
                  width: '31%',
                  minWidth: 100,
                  padding: 10,
                  borderRadius: shape.radius.md,
                  backgroundColor: isSelected
                    ? colors.brand.primaryBg
                    : isOccupied
                    ? colors.status.dangerBg
                    : colors.status.successBg,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected
                    ? colors.brand.primary
                    : isOccupied
                    ? colors.border.danger
                    : colors.border.success,
                  gap: 4,
                  position: 'relative',
                }}
              >
                {/* Header row: Status Icon + Table Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText
                    variant="md"
                   
                    color={isSelected ? colors.brand.primary : isOccupied ? colors.status.danger : colors.status.success}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {table.name}
                  </AppText>

                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isOccupied ? colors.status.danger : colors.status.success,
                    }}
                  />
                </View>

                {/* Subtitle: Area / Capacity */}
                <AppText variant="md" color={colors.text.muted} numberOfLines={1}>
                  {abbreviateArea(table.area) || 'Khu vực chung'} · {table.capacity || 4} chỗ
                </AppText>

                {/* Order total if occupied */}
                {isOccupied && table.orderTotal ? (
                  <AppText
                    variant="md"
                   
                    color={colors.status.danger}
                    style={{ marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {formatPrice(table.orderTotal)}
                  </AppText>
                ) : (
                  <AppText variant="md" color={colors.status.success} style={{ marginTop: 2 }}>
                    Trống
                  </AppText>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
