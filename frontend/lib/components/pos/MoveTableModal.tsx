import React from 'react';
import { View, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api';
import { colors, font } from '../../theme';
import AppText from '../ui/AppText';

interface MoveTableModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTable: (tableId: string, tableName: string) => void;
  title?: string;
  excludeTableId?: string;
  filterOccupied?: boolean;
}

export default function MoveTableModal({
  visible,
  onClose,
  onSelectTable,
  title = 'Chọn bàn',
  excludeTableId,
  filterOccupied,
}: MoveTableModalProps) {
  const [tables, setTables] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!visible) return;
    setSearch('');
    (async () => {
      setLoading(true);
      try {
        const data = await api.getTables();
        setTables(data?.filter ? data.filter((t: any) => t.id !== excludeTableId) : []);
      } catch {
        setTables([]);
      }
      setLoading(false);
    })();
  }, [visible, excludeTableId]);

  const filtered = tables.filter((t: any) => {
    const matchesSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    if (filterOccupied) return matchesSearch && t.status === 'co_khach';
    return matchesSearch;
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70%',
            padding: 16,
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <AppText variant="lg" color={colors.text.primary} weight="bold">{title}</AppText>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: colors.surface.disabled,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.icon.default} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              height: 40,
              borderRadius: 8,
              backgroundColor: colors.surface.app,
              borderWidth: 1,
              borderColor: colors.border.default,
              marginBottom: 8,
            }}
          >
            <MaterialCommunityIcons name="magnify" size={18} color={colors.icon.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm bàn..."
              placeholderTextColor={colors.text.muted}
              style={{ flex: 1, ...font.md, color: colors.text.primary, marginLeft: 6 }}
            />
          </View>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <View style={{ gap: 4, maxHeight: 350 }}>
              {filtered.map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    onSelectTable(t.id, t.name);
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: t.status === 'co_khach' ? '#f0f9ff' : '#f0fdf4',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="table-furniture"
                      size={18}
                      color={t.status === 'co_khach' ? '#0284c7' : '#16a34a'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" color={colors.text.primary}>{t.name}</AppText>
                    <AppText variant="sm" color={colors.text.secondary}>
                      {t.status === 'co_khach' ? 'Có khách' : 'Trống'} · {t.area || 'Không khu vực'}
                    </AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.icon.muted} />
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <AppText
                  variant="sm"
                  color={colors.text.muted}
                  style={{
                    paddingVertical: 30,
                    textAlign: 'center',
                  }}
                >
                  {filterOccupied ? 'Không có bàn có khách phù hợp' : 'Không tìm thấy bàn'}
                </AppText>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
