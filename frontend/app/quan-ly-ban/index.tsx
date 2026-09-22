import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import {
  AppText,
  useAppToast,
  AppHeader,
  Tier1Tabs,
  Tier1TabItem,
  Tier2FilterChips,
  StatusDotBadge,
  EmptyState,
  AppModal,
} from '../../lib/components/ui';
import {
  useTableList,
  useAreas,
  usePOSActions,
  TableItem,
  AreaItem,
} from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';

export default function TableManagementScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const tables = useTableList();
  const areas = useAreas();
  const { addTable, updateTable, deleteTable, reorderTables, addArea, updateArea, deleteArea, reorderAreas } = usePOSActions();

  // Reorder area handlers
  const handleMoveAreaUp = (area: AreaItem) => {
    const idx = areas.findIndex((a) => a.id === area.id);
    if (idx <= 0) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...areas];
    const temp = copy[idx - 1];
    copy[idx - 1] = copy[idx];
    copy[idx] = temp;
    reorderAreas(copy);
    showToast({ title: 'Đã di chuyển', message: `Đẩy khu vực "${area.name}" lên trước`, type: 'info' });
  };

  const handleMoveAreaDown = (area: AreaItem) => {
    const idx = areas.findIndex((a) => a.id === area.id);
    if (idx < 0 || idx >= areas.length - 1) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...areas];
    const temp = copy[idx + 1];
    copy[idx + 1] = copy[idx];
    copy[idx] = temp;
    reorderAreas(copy);
    showToast({ title: 'Đã di chuyển', message: `Hạ khu vực "${area.name}" xuống`, type: 'info' });
  };

  // Top Tab: 'tables' (Danh sách bàn) | 'areas' (Thiết lập khu vực)
  const [activeTab, setActiveTab] = useState<'tables' | 'areas'>('tables');

  const primaryTabs = useMemo<Tier1TabItem<'tables' | 'areas'>[]>(
    () => [
      { id: 'tables', label: 'Danh Sách Bàn', icon: 'table-chair', badge: tables.length },
      { id: 'areas', label: 'Khu Vực', icon: 'map-marker-radius-outline', badge: areas.length },
    ],
    [tables.length, areas.length]
  );

  // Filter state for tables
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('Tất Cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [selectedTableDetail, setSelectedTableDetail] = useState<TableItem | null>(null);
  const [selectedAreaDetail, setSelectedAreaDetail] = useState<AreaItem | null>(null);

  useEffect(() => {
    if (!selectedTableDetail && !selectedAreaDetail) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedTableDetail) {
        setSelectedTableDetail(null);
        return true;
      }
      if (selectedAreaDetail) {
        setSelectedAreaDetail(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedTableDetail, selectedAreaDetail]);

  // Table Add / Edit Modal state
  const [tableModalVisible, setTableModalVisible] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableAreaInput, setTableAreaInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState('4');

  // Area Add / Edit Modal state
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaItem | null>(null);
  const [areaNameInput, setAreaNameInput] = useState('');

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (selectedAreaFilter !== 'Tất Cả' && t.area !== selectedAreaFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchArea = (t.area || '').toLowerCase().includes(q);
        if (!matchName && !matchArea) return false;
      }
      return true;
    });
  }, [tables, selectedAreaFilter, searchQuery]);

  // Reorder table handlers (hoán đổi chuẩn theo filteredTables hiển thị trên màn)
  const handleMoveTableUp = (table: TableItem) => {
    const fIdx = filteredTables.findIndex((t) => t.id === table.id);
    if (fIdx <= 0) return;
    const prevTable = filteredTables[fIdx - 1];

    const curIdx = tables.findIndex((t) => t.id === table.id);
    const prevIdx = tables.findIndex((t) => t.id === prevTable.id);
    if (curIdx === -1 || prevIdx === -1) return;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...tables];
    const temp = copy[curIdx];
    copy[curIdx] = copy[prevIdx];
    copy[prevIdx] = temp;
    reorderTables(copy);
    showToast({ title: 'Đã di chuyển', message: `Đẩy "${table.name}" lên trước`, type: 'info' });
  };

  const handleMoveTableDown = (table: TableItem) => {
    const fIdx = filteredTables.findIndex((t) => t.id === table.id);
    if (fIdx < 0 || fIdx >= filteredTables.length - 1) return;
    const nextTable = filteredTables[fIdx + 1];

    const curIdx = tables.findIndex((t) => t.id === table.id);
    const nextIdx = tables.findIndex((t) => t.id === nextTable.id);
    if (curIdx === -1 || nextIdx === -1) return;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...tables];
    const temp = copy[curIdx];
    copy[curIdx] = copy[nextIdx];
    copy[nextIdx] = temp;
    reorderTables(copy);
    showToast({ title: 'Đã di chuyển', message: `Hạ "${table.name}" xuống`, type: 'info' });
  };

  // Statistics
  const occupiedCount = tables.filter((t) => t.status === 'co_khach').length;
  const emptyCount = tables.filter((t) => t.status === 'trong' || !t.status).length;

  // Filter chips for areas
  const tableAreaChips = useMemo(() => [
    { id: 'Tất Cả', label: 'Tất Cả', count: tables.length },
    ...areas.map((a) => ({
      id: a.name,
      label: a.name,
      count: tables.filter((t) => t.area === a.name).length,
    })),
  ], [tables, areas]);

  // Handlers for Tables
  const handleOpenAddTable = () => {
    playTapSound();
    setEditingTable(null);
    const defaultArea = areas[0]?.name || 'Tầng Trệt';
    const nextTableNum = tables.length + 1;
    setTableNameInput(`Bàn ${nextTableNum < 10 ? '0' + nextTableNum : nextTableNum}`);
    setTableAreaInput(defaultArea);
    setTableCapacityInput('4');
    setTableModalVisible(true);
  };

  const handleOpenEditTable = (table: TableItem) => {
    playTapSound();
    setEditingTable(table);
    setTableNameInput(table.name);
    setTableAreaInput(table.area || areas[0]?.name || 'Tầng Trệt');
    setTableCapacityInput(String(table.capacity || 4));
    setTableModalVisible(true);
  };

  const handleSaveTable = () => {
    playTapSound();
    const trimmed = tableNameInput.trim();
    if (!trimmed) {
      showToast({ title: 'Lỗi', message: 'Tên bàn không được để trống', type: 'danger' });
      return;
    }
    const cap = parseInt(tableCapacityInput.replace(/\D/g, ''), 10) || 4;

    if (editingTable) {
      updateTable(editingTable.id, {
        name: trimmed,
        area: tableAreaInput,
        capacity: cap,
      });
      showToast({ title: 'Đã Cập Nhật', message: `Đã lưu thông tin ${trimmed}`, type: 'success' });
    } else {
      addTable({
        name: trimmed,
        area: tableAreaInput,
        capacity: cap,
      });
      showToast({ title: 'Đã Thêm Bàn', message: `Đã tạo ${trimmed} (${tableAreaInput})`, type: 'success' });
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    setTableModalVisible(false);
  };

  const handleDeleteTable = (table: TableItem) => {
    playTapSound();
    const executeDelete = () => {
      const result = deleteTable(table.id);
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        showToast({ title: 'Đã Xóa Bàn', message: `Đã xóa ${table.name}`, type: 'success' });
      } else {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
        }
        showToast({ title: 'Không Thể Xóa', message: result.message || 'Lỗi xóa bàn', type: 'danger' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Xóa "${table.name}"?`)) {
        executeDelete();
      }
    } else {
      Alert.alert('Xóa Bàn', `Xóa "${table.name}"?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa Bàn', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };

  // Handlers for Areas
  const handleOpenAddArea = () => {
    playTapSound();
    setEditingArea(null);
    setAreaNameInput('');
    setAreaModalVisible(true);
  };

  const handleOpenEditArea = (area: AreaItem) => {
    playTapSound();
    setEditingArea(area);
    setAreaNameInput(area.name);
    setAreaModalVisible(true);
  };

  const handleSaveArea = () => {
    playTapSound();
    const trimmed = areaNameInput.trim();
    if (!trimmed) {
      showToast({ title: 'Lỗi', message: 'Tên khu vực không được để trống', type: 'danger' });
      return;
    }

    if (editingArea) {
      updateArea(editingArea.id, trimmed);
      showToast({ title: 'Đã Cập Nhật', message: `Khu vực "${trimmed}" đã được sửa`, type: 'success' });
    } else {
      addArea(trimmed);
      showToast({ title: 'Đã Thêm Khu Vực', message: `Khu vực "${trimmed}" đã được tạo`, type: 'success' });
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    setAreaModalVisible(false);
  };

  const handleDeleteArea = (area: AreaItem) => {
    playTapSound();
    const result = deleteArea(area.id);
    if (result.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({ title: 'Đã Xóa', message: `Đã xóa khu vực "${area.name}"`, type: 'success' });
    } else {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
      showToast({ title: 'Không Thể Xóa', message: result.message || 'Lỗi xóa khu vực', type: 'danger' });
    }
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {selectedTableDetail ? (
        <View style={{ flex: 1 }}>
          <AppHeader
            title={selectedTableDetail.name}
            subtitle={`Khu Vực: ${selectedTableDetail.area || 'Chưa xếp'}`}
            showBack
            onBack={() => {
              playTapSound();
              setSelectedTableDetail(null);
            }}
            rightCustom={
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenEditTable(selectedTableDetail)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              >
                <Icon name="pencil-outline" size={18} color={theme.text.primary} />
              </TouchableOpacity>
            }
          />
          <ScrollView
            contentContainerStyle={[
              { padding: isWide ? 16 : 0, paddingBottom: 110 },
              isWide && { maxWidth: 760, width: '100%', alignSelf: 'center' },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              const isOccupied = selectedTableDetail.status === 'co_khach';
              const isReserved = selectedTableDetail.status === 'da_dat';
              return (
                <>
                  {/* Hero Table Status Card */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={[
                            s.tableIconCircle,
                            {
                              backgroundColor: isOccupied
                                ? theme.brand.primaryBg
                                : isReserved
                                ? theme.surface.header
                                : theme.surface.header,
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                            },
                          ]}
                        >
                          <Icon
                            name={selectedTableDetail.area === 'Mang Về' ? 'shopping-outline' : 'table-chair'}
                            size={24}
                            color={isOccupied ? theme.brand.primary : theme.text.primary}
                          />
                        </View>
                        <View>
                          <AppText variant="md" weight="bold" color={theme.text.primary}>
                            {selectedTableDetail.name}
                          </AppText>
                          <AppText variant="xs" color={theme.text.muted}>
                            {selectedTableDetail.area} · {selectedTableDetail.capacity || 4} chỗ ngồi
                          </AppText>
                        </View>
                      </View>

                      <View
                        style={[
                          s.statusBadgePill,
                          {
                            backgroundColor: isOccupied
                              ? theme.brand.primaryBg
                              : isReserved
                              ? (isDark ? 'rgba(234, 179, 8, 0.20)' : 'rgba(234, 179, 8, 0.12)')
                              : (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)'),
                            borderColor: isOccupied
                              ? theme.brand.primary
                              : isReserved
                              ? theme.brand.warning
                              : theme.brand.success,
                          },
                        ]}
                      >
                        <View
                          style={[
                            s.statusDot,
                            {
                              backgroundColor: isOccupied
                                ? theme.brand.primary
                                : isReserved
                                ? theme.brand.warning
                                : theme.brand.success,
                            },
                          ]}
                        />
                        <AppText
                          variant="xs"
                          weight="medium"
                          color={isOccupied ? theme.brand.primary : isReserved ? theme.brand.warning : theme.brand.success}
                        >
                          {isOccupied ? 'Có Khách' : isReserved ? 'Đã Đặt' : 'Trống'}
                        </AppText>
                      </View>
                    </View>

                    <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle, marginTop: 16, paddingTop: 14 }]}>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Tạm Tính Hiện Tại</AppText>
                        <AppText
                          variant="md"
                          weight="medium"
                          color={isOccupied ? theme.brand.success : theme.text.muted}
                          tabularNums
                          style={{ marginTop: 2 }}
                        >
                          {formatCurrency(selectedTableDetail.totalAmount || 0)} đ
                        </AppText>
                      </View>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Sức Chứa Bàn</AppText>
                        <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                          {selectedTableDetail.capacity || 4} khách
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Chi tiết thông tin cấu hình bàn */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                        marginTop: isWide ? 12 : 10,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 12 }}>
                      THÔNG TIN CẤU HÌNH BÀN
                    </AppText>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" color={theme.text.muted}>Mã Định Danh</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>{selectedTableDetail.id}</AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" color={theme.text.muted}>Tên Hiển Thị</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary}>{selectedTableDetail.name}</AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" color={theme.text.muted}>Khu Vực Phân Bổ</AppText>
                      <AppText variant="md" weight="medium" color={theme.brand.primary}>{selectedTableDetail.area}</AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" color={theme.text.muted}>Sức Chứa Tối Đa</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>{selectedTableDetail.capacity || 4} chỗ</AppText>
                    </View>
                    <View style={[s.financeDetailRow, { borderBottomWidth: 0 }]}>
                      <AppText variant="md" color={theme.text.muted}>Trạng Thái Bán Hàng</AppText>
                      <AppText
                        variant="md"
                        weight="medium"
                        color={isOccupied ? theme.brand.primary : isReserved ? theme.brand.warning : theme.brand.success}
                      >
                        {isOccupied ? 'Đang phục vụ thực khách' : isReserved ? 'Khách đã hẹn trước' : 'Sẵn sàng đón khách mới'}
                      </AppText>
                    </View>
                  </View>
                </>
              );
            })()}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View
            style={[
              s.fullPageBottomBar,
              {
                backgroundColor: theme.surface.card,
                borderTopColor: theme.border.subtle,
                paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
                paddingLeft: Math.max(insets.left, 16),
                paddingRight: Math.max(insets.right, 16),
                maxWidth: isWide ? 680 : undefined,
                alignSelf: isWide ? 'center' : undefined,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleDeleteTable(selectedTableDetail);
                setSelectedTableDetail(null);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger, flex: 1 }]}
            >
              <Icon name="trash-can-outline" size={20} color={theme.brand.danger} />
              <AppText variant="md" weight="bold" color={theme.brand.danger} numberOfLines={1}>
                Xóa Bàn
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleOpenEditTable(selectedTableDetail);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.surface.header, borderColor: theme.border.default, flex: 1 }]}
            >
              <Icon name="pencil" size={20} color={theme.text.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                Sửa Bàn
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setSelectedTableDetail(null);
                router.push('/' as any);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent, flex: 1.2 }]}
            >
              <Icon name="silverware-fork-knife" size={20} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                {selectedTableDetail.status === 'co_khach' ? 'Vào Đơn' : 'Mở Bán'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : selectedAreaDetail ? (
        <View style={{ flex: 1 }}>
          <AppHeader
            title={selectedAreaDetail.name}
            subtitle="Khu Vực Phục Vụ"
            showBack
            onBack={() => {
              playTapSound();
              setSelectedAreaDetail(null);
            }}
            rightCustom={
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenEditArea(selectedAreaDetail)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              >
                <Icon name="pencil-outline" size={18} color={theme.text.primary} />
              </TouchableOpacity>
            }
          />
          <ScrollView
            contentContainerStyle={[
              { padding: isWide ? 16 : 0, paddingBottom: 110 },
              isWide && { maxWidth: 760, width: '100%', alignSelf: 'center' },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              const areaTables = tables.filter((t) => t.area === selectedAreaDetail.name);
              const tableCount = areaTables.length;
              const occupiedInArea = areaTables.filter((t) => t.status === 'co_khach').length;
              const vacantInArea = tableCount - occupiedInArea;
              const areaTotalAmount = areaTables.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
              return (
                <>
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[s.tableIconCircle, { backgroundColor: theme.brand.primaryBg, width: 48, height: 48, borderRadius: 24 }]}>
                          <Icon name="map-marker-radius-outline" size={24} color={theme.brand.primary} />
                        </View>
                        <View>
                          <AppText variant="md" weight="bold" color={theme.text.primary}>
                            {selectedAreaDetail.name}
                          </AppText>
                          <AppText variant="xs" color={theme.text.muted} tabularNums>
                            {tableCount} bàn tổng cộng
                          </AppText>
                        </View>
                      </View>
                    </View>

                    <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle, marginTop: 16, paddingTop: 14 }]}>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Đang Có Khách</AppText>
                        <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums style={{ marginTop: 2 }}>
                          {occupiedInArea} bàn
                        </AppText>
                      </View>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Bàn Đang Trống</AppText>
                        <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums style={{ marginTop: 2 }}>
                          {vacantInArea} bàn
                        </AppText>
                      </View>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Tạm Tính Khu Vực</AppText>
                        <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums style={{ marginTop: 2 }}>
                          {formatCurrency(areaTotalAmount)} đ
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Danh sách bàn thuộc khu vực */}
                  <View style={{ marginTop: 16 }}>
                    <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 10, paddingHorizontal: 16 }}>
                      DANH SÁCH BÀN THUỘC KHU VỰC ({areaTables.length})
                    </AppText>
                    {areaTables.length === 0 ? (
                      <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', paddingVertical: 16 }}>
                        Chưa có bàn nào được phân bổ vào khu vực này
                      </AppText>
                    ) : (
                      <View style={[s.seamlessListContainer, { borderTopColor: theme.border.subtle, borderBottomColor: theme.border.subtle, backgroundColor: theme.surface.card }]}>
                        {areaTables.map((t, idx) => {
                          const isTblOcc = t.status === 'co_khach';
                          return (
                            <TouchableOpacity
                              key={t.id}
                              activeOpacity={0.7}
                              onPress={() => {
                                playTapSound();
                                setSelectedAreaDetail(null);
                                setSelectedTableDetail(t);
                              }}
                              style={[
                                s.financeDetailRow,
                                { borderBottomColor: theme.border.subtle, paddingHorizontal: 16 },
                                idx === areaTables.length - 1 && { borderBottomWidth: 0 },
                              ]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Icon
                                  name="table-furniture"
                                  size={18}
                                  color={isTblOcc ? theme.brand.primary : theme.text.muted}
                                />
                                <View>
                                  <AppText variant="md" weight="medium" color={theme.text.primary}>
                                    {t.name}
                                  </AppText>
                                  <AppText variant="xs" color={theme.text.muted} tabularNums>
                                    {t.capacity || 4} chỗ ngồi · {isTblOcc ? 'Có khách' : 'Trống'}
                                  </AppText>
                                </View>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {isTblOcc && (t.totalAmount || 0) > 0 && (
                                  <AppText variant="xs" weight="medium" color={theme.brand.success} tabularNums>
                                    {formatCurrency(t.totalAmount || 0)} đ
                                  </AppText>
                                )}
                                <Icon name="chevron-right" size={16} color={theme.text.muted} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </>
              );
            })()}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View
            style={[
              s.fullPageBottomBar,
              {
                backgroundColor: theme.surface.card,
                borderTopColor: theme.border.subtle,
                paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
                paddingLeft: Math.max(insets.left, 16),
                paddingRight: Math.max(insets.right, 16),
                maxWidth: isWide ? 680 : undefined,
                alignSelf: isWide ? 'center' : undefined,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleDeleteArea(selectedAreaDetail);
                setSelectedAreaDetail(null);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger, flex: 1 }]}
            >
              <Icon name="trash-can-outline" size={20} color={theme.brand.danger} />
              <AppText variant="md" weight="bold" color={theme.brand.danger} numberOfLines={1}>
                Xóa Khu
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleOpenEditArea(selectedAreaDetail);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.surface.header, borderColor: theme.border.default, flex: 1 }]}
            >
              <Icon name="pencil" size={20} color={theme.text.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                Sửa Khu
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setEditingTable(null);
                setTableNameInput(`Bàn ${tables.length + 1 < 10 ? '0' + (tables.length + 1) : tables.length + 1}`);
                setTableAreaInput(selectedAreaDetail.name);
                setTableCapacityInput('4');
                setTableModalVisible(true);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary, flex: 1.2 }]}
            >
              <Icon name="plus" size={20} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                + Thêm Bàn
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Header Bar: Hamburger Sidebar Menu on Mobile + Title + Actions */}
          <AppHeader
            title="Quản Lý Bàn"
            subtitle={`${tables.length} bàn · ${areas.length} khu vực`}
            rightCustom={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Search Toggle */}
                {activeTab === 'tables' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setShowSearch((prev) => !prev);
                      if (showSearch) setSearchQuery('');
                    }}
                    style={[
                      s.iconHeaderBtn,
                      {
                        backgroundColor: showSearch ? theme.brand.primary : theme.surface.header,
                        borderColor: showSearch ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Tìm kiếm bàn"
                  >
                    <Icon name="magnify" size={18} color={showSearch ? theme.text.onBrand : theme.text.primary} />
                  </TouchableOpacity>
                )}

                {/* Sort / Reorder Toggle */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    setIsReorderMode((prev) => !prev);
                  }}
                  style={[
                    s.iconHeaderBtn,
                    {
                      backgroundColor: isReorderMode ? theme.brand.primary : theme.surface.header,
                      borderColor: isReorderMode ? theme.brand.primary : theme.border.default,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Chế độ sắp xếp"
                >
                  <Icon name="swap-vertical" size={18} color={isReorderMode ? theme.text.onBrand : theme.text.primary} />
                </TouchableOpacity>

                {/* Quick Add CTA */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={activeTab === 'tables' ? handleOpenAddTable : handleOpenAddArea}
                  style={[s.iconHeaderBtn, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={activeTab === 'tables' ? 'Thêm bàn' : 'Thêm khu vực'}
                >
                  <Icon name="plus" size={20} color={theme.text.onBrand} />
                </TouchableOpacity>
              </View>
            }
          />

          {/* 🌟 DÃY 1: PRIMARY UNDERLINE TAB BAR */}
          <Tier1Tabs<'tables' | 'areas'>
            tabs={primaryTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* TAB 1: DANH SÁCH BÀN */}
          {activeTab === 'tables' && (
            <View style={{ flex: 1 }}>
              {/* Search Expanded Bar */}
              {showSearch && (
                <View
                  style={[
                    s.searchBarContainer,
                    {
                      backgroundColor: theme.surface.card,
                      borderBottomColor: theme.border.subtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.searchBar,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.default,
                        borderRadius: 10,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Icon name="magnify" size={18} color={theme.text.muted} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Tìm tên bàn, khu vực..."
                      placeholderTextColor={theme.text.muted}
                      style={[s.searchInput, { color: theme.text.primary }]}
                      autoFocus
                    />
                    {searchQuery !== '' && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={16} color={theme.text.muted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Reorder Mode Helper Banner */}
              {isReorderMode && (
                <View style={[s.reorderBanner, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
                  <Icon name="information-outline" size={16} color={theme.brand.primary} />
                  <AppText variant="xs" color={theme.brand.primary} style={{ flex: 1 }}>
                    Chế độ sắp xếp: Chạm vào mũi tên để đổi thứ tự hiển thị bàn
                  </AppText>
                </View>
              )}

              {/* Apple HIG Filter Pills */}
              <Tier2FilterChips
                chips={tableAreaChips}
                activeChip={selectedAreaFilter}
                onChipChange={setSelectedAreaFilter}
                activeColor="primary"
              />

              {/* Table List Scroll */}
              <ScrollView
                contentContainerStyle={[
                  s.listScroll,
                  {
                    padding: isWide ? 16 : 0,
                    gap: isWide ? 12 : 0,
                    paddingBottom: isWide ? 24 : 16,
                  },
                  isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {filteredTables.length === 0 ? (
                  <EmptyState
                    icon="table-chair"
                    message={searchQuery ? 'Không tìm thấy bàn phù hợp' : 'Chưa có bàn ăn nào'}
                    description={searchQuery ? 'Thử tìm từ khóa khác' : 'Tạo bàn ăn mới hoặc phân chia theo khu vực phục vụ'}
                    actionText={!searchQuery ? '+ Thêm Bàn' : undefined}
                    onAction={!searchQuery ? handleOpenAddTable : undefined}
                  />
                ) : (
                  filteredTables.map((table, index) => {
                    const isOccupied = table.status === 'co_khach';
                    const isReserved = table.status === 'da_dat';
                    const isFirstTable = index === 0;
                    const isLastTable = index === filteredTables.length - 1;

                    return (
                      <TouchableOpacity
                        key={table.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          playTapSound();
                          setSelectedTableDetail(table);
                        }}
                        style={[
                          s.tableCard,
                          isWide && { width: isDesktopLarge ? '24.2%' : '49.2%' },
                          {
                            backgroundColor: theme.surface.card,
                            borderColor: isOccupied
                              ? theme.brand.primary
                              : isReserved
                              ? theme.brand.warning
                              : theme.border.subtle,
                            borderRadius: isWide ? 14 : 0,
                            borderWidth: isWide ? 1 : 0,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.border.subtle,
                            flexDirection: 'column',
                            alignItems: 'stretch',
                          },
                        ]}
                      >
                        <View style={s.cardTopLine}>
                          <View style={s.cardLeft}>
                            <View
                              style={[
                                s.tableIconCircle,
                                {
                                  backgroundColor: isOccupied
                                    ? theme.brand.primaryBg
                                    : isReserved
                                    ? (isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.10)')
                                    : theme.surface.header,
                                },
                              ]}
                            >
                              <Icon
                                name={table.area === 'Mang Về' ? 'shopping-outline' : 'table-furniture'}
                                size={20}
                                color={isOccupied ? theme.brand.primary : isReserved ? theme.brand.warning : theme.text.primary}
                              />
                            </View>

                            <View style={{ marginLeft: 12, flex: 1 }}>
                              <AppText variant="md" weight="medium" color={theme.text.primary}>
                                {table.name}
                              </AppText>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <AppText variant="xs" color={theme.text.muted}>
                                  {table.area} · {table.capacity || 4} chỗ
                                </AppText>
                                {isOccupied && (table.totalAmount || 0) > 0 && (
                                  <AppText variant="xs" weight="medium" color={theme.brand.success} tabularNums>
                                    · {formatCurrency(table.totalAmount || 0)} đ
                                  </AppText>
                                )}
                              </View>
                            </View>
                          </View>

                          <View style={s.cardActions}>
                            {isReorderMode ? (
                              <>
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  disabled={isFirstTable}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleMoveTableUp(table);
                                  }}
                                  style={[
                                    s.iconBtn,
                                    {
                                      backgroundColor: theme.surface.header,
                                      opacity: isFirstTable ? 0.25 : 1,
                                    },
                                  ]}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityLabel="Di chuyển lên"
                                >
                                  <Icon name="chevron-up" size={18} color={theme.text.primary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  disabled={isLastTable}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleMoveTableDown(table);
                                  }}
                                  style={[
                                    s.iconBtn,
                                    {
                                      backgroundColor: theme.surface.header,
                                      opacity: isLastTable ? 0.25 : 1,
                                    },
                                  ]}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityLabel="Di chuyển xuống"
                                >
                                  <Icon name="chevron-down" size={18} color={theme.text.primary} />
                                </TouchableOpacity>
                              </>
                            ) : (
                              <>
                                <StatusDotBadge
                                  status={isOccupied ? 'co_khach' : isReserved ? 'dat_truoc' : 'trong'}
                                  label={isOccupied ? 'Có khách' : isReserved ? 'Đã đặt' : 'Trống'}
                                  size="sm"
                                />
                                <Icon
                                  name="chevron-right"
                                  size={18}
                                  color={theme.text.muted}
                                  style={{ marginLeft: 2 }}
                                />
                              </>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {/* TAB 2: QUẢN LÝ KHU VỰC */}
          {activeTab === 'areas' && (
            <ScrollView
              contentContainerStyle={[
                s.listScroll,
                {
                  padding: isWide ? 16 : 0,
                  gap: isWide ? 12 : 0,
                  paddingBottom: isWide ? 24 : 16,
                },
                isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Reorder Mode Helper Banner for Areas */}
              {isReorderMode && (
                <View style={[s.reorderBanner, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary, marginHorizontal: isWide ? 0 : 16 }]}>
                  <Icon name="information-outline" size={16} color={theme.brand.primary} />
                  <AppText variant="xs" color={theme.brand.primary} style={{ flex: 1 }}>
                    Chế độ sắp xếp: Chạm vào mũi tên để đổi thứ tự hiển thị khu vực
                  </AppText>
                </View>
              )}

              {areas.length === 0 ? (
                <EmptyState
                  icon="map-marker-radius-outline"
                  message="Chưa có khu vực phục vụ nào"
                  description="Tạo các khu vực như Tầng 1, Tầng 2, Sân Vườn, Phòng Lạnh để dễ quản lý"
                  actionText="+ Thêm Khu"
                  onAction={handleOpenAddArea}
                />
              ) : (
                areas.map((area, index) => {
                  const areaTables = tables.filter((t) => t.area === area.name);
                  const tableCount = areaTables.length;
                  const occupiedInArea = areaTables.filter((t) => t.status === 'co_khach').length;
                  const isFirstArea = index === 0;
                  const isLastArea = index === areas.length - 1;

                  return (
                    <TouchableOpacity
                      key={area.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        setSelectedAreaDetail(area);
                      }}
                      style={[
                        s.tableCard,
                        isWide && { width: isDesktopLarge ? '32.4%' : '49.2%' },
                        {
                          backgroundColor: theme.surface.card,
                          borderColor: theme.border.subtle,
                          borderRadius: isWide ? 14 : 0,
                          borderWidth: isWide ? 1 : 0,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.border.subtle,
                          flexDirection: 'column',
                          alignItems: 'stretch',
                        },
                      ]}
                    >
                      <View style={s.cardTopLine}>
                        <View style={s.cardLeft}>
                          <View style={[s.tableIconCircle, { backgroundColor: theme.brand.primaryBg }]}>
                            <Icon name="map-marker-radius-outline" size={20} color={theme.brand.primary} />
                          </View>

                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <AppText variant="md" weight="medium" color={theme.text.primary}>
                              {area.name}
                            </AppText>
                            <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                              {tableCount} bàn · {occupiedInArea} có khách
                            </AppText>
                          </View>
                        </View>

                        <View style={s.cardActions}>
                          {isReorderMode ? (
                            <>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                disabled={isFirstArea}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleMoveAreaUp(area);
                                }}
                                style={[
                                  s.iconBtn,
                                  {
                                    backgroundColor: theme.surface.header,
                                    opacity: isFirstArea ? 0.25 : 1,
                                  },
                                ]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Di chuyển lên"
                              >
                                <Icon name="chevron-up" size={18} color={theme.text.primary} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                activeOpacity={0.7}
                                disabled={isLastArea}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleMoveAreaDown(area);
                                }}
                                style={[
                                  s.iconBtn,
                                  {
                                    backgroundColor: theme.surface.header,
                                    opacity: isLastArea ? 0.25 : 1,
                                  },
                                ]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Di chuyển xuống"
                              >
                                <Icon name="chevron-down" size={18} color={theme.text.primary} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Icon
                              name="chevron-right"
                              size={18}
                              color={theme.text.muted}
                              style={{ marginLeft: 2 }}
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Modal Add / Edit Table */}
      <AppModal
        visible={tableModalVisible}
        title={editingTable ? 'Chỉnh Sửa Bàn' : 'Thêm Bàn Mới'}
        subtitle="Quản lý bàn ăn và vị trí trong quán"
        icon="table-chair"
        iconColor={theme.brand.primary}
        onClose={() => setTableModalVisible(false)}
        presentation="dialog"
        maxWidth={460}
        primaryAction={{
          label: editingTable ? 'Lưu Thay Đổi' : 'Tạo Bàn',
          variant: 'primary',
          onPress: handleSaveTable,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setTableModalVisible(false),
        }}
      >
        <View style={{ gap: 12 }}>
          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Tên Bàn (VD: Bàn 09, VIP 02, Sân Vườn 01)
            </AppText>
            <TextInput
              value={tableNameInput}
              onChangeText={setTableNameInput}
              placeholder="VD: Bàn 09"
              placeholderTextColor={theme.text.muted}
              style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary }]}
            />
          </View>

          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Trực Thuộc Khu Vực
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {areas.map((a) => {
                const isSel = tableAreaInput === a.name;
                return (
                  <TouchableOpacity
                    key={a.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setTableAreaInput(a.name);
                    }}
                    style={[
                      s.chipPill,
                      {
                        backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                        borderColor: isSel ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSel ? 'medium' : 'normal'}
                      color={isSel ? theme.text.onBrand : theme.text.primary}
                    >
                      {a.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Sức Chứa / Số Lượng Ghế
            </AppText>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[2, 4, 6, 8, 10].map((capNum) => {
                const isSel = String(capNum) === tableCapacityInput;
                return (
                  <TouchableOpacity
                    key={capNum}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setTableCapacityInput(String(capNum));
                    }}
                    style={[
                      s.capPill,
                      {
                        backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                        borderColor: isSel ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSel ? 'medium' : 'normal'}
                      color={isSel ? theme.text.onBrand : theme.text.primary}
                      tabularNums
                    >
                      {capNum} ghế
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {editingTable && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setTableModalVisible(false);
                handleDeleteTable(editingTable);
              }}
              style={[
                s.btnDeleteModal,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: theme.brand.danger,
                },
              ]}
            >
              <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
              <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                Xóa Bàn Này
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </AppModal>

      {/* Modal Add / Edit Area */}
      <AppModal
        visible={areaModalVisible}
        title={editingArea ? 'Sửa Tên Khu Vực' : 'Thêm Khu Vực Mới'}
        subtitle="Quản lý khu vực / tầng phục vụ"
        icon="map-marker-radius-outline"
        iconColor={theme.brand.primary}
        onClose={() => setAreaModalVisible(false)}
        presentation="dialog"
        maxWidth={440}
        primaryAction={{
          label: editingArea ? 'Cập Nhật' : 'Tạo Khu Vực',
          variant: 'primary',
          onPress: handleSaveArea,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setAreaModalVisible(false),
        }}
      >
        <View style={{ gap: 12 }}>
          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Tên Khu Vực (VD: Tầng Trệt, Ban Công, VIP 1)
            </AppText>
            <TextInput
              value={areaNameInput}
              onChangeText={setAreaNameInput}
              placeholder="VD: Ban Công Sân Thượng"
              placeholderTextColor={theme.text.muted}
              style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary }]}
              autoFocus
            />
          </View>

          {editingArea && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setAreaModalVisible(false);
                handleDeleteArea(editingArea);
              }}
              style={[
                s.btnDeleteModal,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: theme.brand.danger,
                },
              ]}
            >
              <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
              <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                Xóa Khu Vực Này
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  reorderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterSection: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chipPill: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    paddingVertical: 4,
  },
  tableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  formField: {
    marginBottom: 14,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnCancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmit: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  cardTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  detailCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  seamlessListContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaGridBox: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaGridItem: {
    flex: 1,
  },
  financeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  fullPageBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fullPageBtnAction: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

