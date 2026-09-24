import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
  const {
    addTable,
    updateTable,
    deleteTable,
    reorderTables,
    addArea,
    updateArea,
    deleteArea,
    reorderAreas,
    selectTable,
  } = usePOSActions();

  // Primary Tab: 'tables' (Danh sách bàn) | 'areas' (Thiết lập khu vực)
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

  // Sync selection when tables/areas update
  useEffect(() => {
    if (selectedTableDetail) {
      const found = tables.find((t) => t.id === selectedTableDetail.id);
      if (found) setSelectedTableDetail(found);
      else setSelectedTableDetail(null);
    }
  }, [tables]);

  useEffect(() => {
    if (selectedAreaDetail) {
      const found = areas.find((a) => a.id === selectedAreaDetail.id);
      if (found) setSelectedAreaDetail(found);
      else setSelectedAreaDetail(null);
    }
  }, [areas]);

  // Back handler for mobile sub-screens
  useEffect(() => {
    if (isWide || (!selectedTableDetail && !selectedAreaDetail)) return;
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
  }, [selectedTableDetail, selectedAreaDetail, isWide]);

  // Table Add / Edit Modal state
  const [tableModalVisible, setTableModalVisible] = useState(false);
  const [tableAddMode, setTableAddMode] = useState<'single' | 'batch'>('single');
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableAreaInput, setTableAreaInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState('4');
  const [batchPrefix, setBatchPrefix] = useState('Bàn ');
  const [batchStartNum, setBatchStartNum] = useState('1');
  const [batchEndNum, setBatchEndNum] = useState('10');

  // Area Add / Edit Modal state
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaItem | null>(null);
  const [areaNameInput, setAreaNameInput] = useState('');

  // Statistics
  const totalTablesCount = tables.length;
  const totalCapacityCount = useMemo(() => tables.reduce((sum, t) => sum + (t.capacity || 4), 0), [tables]);
  const occupiedCount = useMemo(() => tables.filter((t) => t.status === 'co_khach').length, [tables]);
  const reservedCount = useMemo(() => tables.filter((t) => t.status === 'da_dat').length, [tables]);
  const emptyCount = useMemo(() => tables.filter((t) => t.status === 'trong' || !t.status).length, [tables]);
  const totalFloorRevenue = useMemo(() => tables.reduce((sum, t) => sum + (t.totalAmount || 0), 0), [tables]);
  const occupancyPercent = totalTablesCount > 0 ? Math.round((occupiedCount / totalTablesCount) * 100) : 0;

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
    setTableAddMode('single');
    const defaultArea = selectedAreaFilter !== 'Tất Cả' ? selectedAreaFilter : (areas[0]?.name || 'Tầng Trệt');
    const nextTableNum = tables.length + 1;
    setTableNameInput(`Bàn ${nextTableNum < 10 ? '0' + nextTableNum : nextTableNum}`);
    setTableAreaInput(defaultArea);
    setTableCapacityInput('4');
    setBatchPrefix('Bàn ');
    setBatchStartNum(String(nextTableNum));
    setBatchEndNum(String(nextTableNum + 9));
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

  const handleSaveBatchTables = () => {
    playTapSound();
    const start = parseInt(batchStartNum.replace(/\D/g, ''), 10) || 1;
    const end = parseInt(batchEndNum.replace(/\D/g, ''), 10) || 1;
    if (end < start) {
      showToast({ title: 'Lỗi Dải Số', message: 'Số kết thúc phải lớn hơn hoặc bằng số bắt đầu', type: 'danger' });
      return;
    }
    const count = end - start + 1;
    if (count > 50) {
      showToast({ title: 'Vượt Giới Hạn', message: 'Tối đa tạo 50 bàn trong một lần', type: 'warning' });
      return;
    }
    const cap = parseInt(tableCapacityInput.replace(/\D/g, ''), 10) || 4;
    const padZeros = end >= 10;
    for (let i = start; i <= end; i++) {
      const numStr = padZeros && i < 10 ? `0${i}` : `${i}`;
      const name = `${batchPrefix.trim()} ${numStr}`.trim();
      addTable({
        name,
        area: tableAreaInput,
        capacity: cap,
      });
    }
    showToast({ title: 'Đã Tạo Bàn', message: `Đã tạo ${count} bàn vào khu vực "${tableAreaInput}"`, type: 'success' });
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
        if (selectedTableDetail?.id === table.id) {
          setSelectedTableDetail(null);
        }
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

  const handleOpenOrder = (table: TableItem) => {
    playTapSound();
    selectTable(table);
    if (!isWide) {
      setSelectedTableDetail(null);
    }
    router.push('/' as any);
  };

  // Reorder table handlers
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
      if (selectedAreaDetail?.id === area.id) {
        setSelectedAreaDetail(null);
      }
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

  // Floor KPI Summary Bar
  const renderFloorKPIBar = () => (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: isWide ? 16 : 12,
        paddingVertical: 10,
        backgroundColor: theme.surface.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border.subtle,
        gap: isWide ? 12 : 8,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.surface.header,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border.subtle,
        }}
      >
        <AppText variant="xxs" color={theme.text.muted} weight="medium">
          TỔNG BÀN & GHẾ
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
            {totalTablesCount}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums>
            ({totalCapacityCount} chỗ)
          </AppText>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: theme.surface.header,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border.subtle,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.brand.primary }} />
          <AppText variant="xxs" color={theme.text.muted} weight="medium">
            ĐANG PHỤC VỤ
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
            {occupiedCount}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} tabularNums>
            ({occupancyPercent}%)
          </AppText>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: theme.surface.header,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border.subtle,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.brand.success }} />
          <AppText variant="xxs" color={theme.text.muted} weight="medium">
            BÀN TRỐNG
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
            {emptyCount}
          </AppText>
          <AppText variant="xs" color={theme.text.muted}>
            sẵn sàng
          </AppText>
        </View>
      </View>

      <View
        style={{
          flex: 1.15,
          backgroundColor: theme.surface.header,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border.subtle,
        }}
      >
        <AppText variant="xxs" color={theme.text.muted} weight="medium">
          TẠM TÍNH TRÊN SÀN
        </AppText>
        <AppText
          variant="md"
          weight="bold"
          color={totalFloorRevenue > 0 ? theme.brand.accent : theme.text.muted}
          tabularNums
          style={{ marginTop: 2 }}
          numberOfLines={1}
        >
          {formatCurrency(totalFloorRevenue)} đ
        </AppText>
      </View>
    </View>
  );

  // Desktop Detail Panel for Table
  const renderTableDetailPanel = (table: TableItem) => {
    const isOccupied = table.status === 'co_khach';
    const isReserved = table.status === 'da_dat';
    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
              {table.name}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
              Khu Vực: {table.area || 'Chưa xếp'}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpenEditTable(table)}
              style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              accessibilityLabel="Sửa bàn"
            >
              <Icon name="pencil-outline" size={16} color={theme.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedTableDetail(null)}
              style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              accessibilityLabel="Đóng chi tiết"
            >
              <Icon name="close" size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* Status & Amount Hero */}
          <View
            style={{
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              padding: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={[
                    s.tableIconCircle,
                    {
                      backgroundColor: isOccupied ? theme.brand.primaryBg : theme.surface.card,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                    },
                  ]}
                >
                  <Icon
                    name={table.area === 'Mang Về' ? 'shopping-outline' : 'table-chair'}
                    size={22}
                    color={isOccupied ? theme.brand.primary : theme.text.primary}
                  />
                </View>
                <View>
                  <AppText variant="md" weight="bold" color={theme.text.primary}>
                    {table.name}
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted} tabularNums>
                    {table.capacity || 4} chỗ ngồi
                  </AppText>
                </View>
              </View>

              <StatusDotBadge
                status={isOccupied ? 'co_khach' : isReserved ? 'dat_truoc' : 'trong'}
                label={isOccupied ? 'Có khách' : isReserved ? 'Đã đặt' : 'Trống'}
                size="md"
              />
            </View>

            <View
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border.subtle,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <AppText variant="xs" color={theme.text.muted}>Tạm Tính Hiện Tại</AppText>
                <AppText
                  variant="xl"
                  weight="bold"
                  color={isOccupied ? theme.brand.accent : theme.text.muted}
                  tabularNums
                  style={{ marginTop: 2 }}
                >
                  {formatCurrency(table.totalAmount || 0)} đ
                </AppText>
              </View>
            </View>
          </View>

          {/* Quick Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenOrder(table)}
            style={{
              height: 48,
              backgroundColor: theme.brand.accent,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="silverware-fork-knife" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              {isOccupied ? 'Vào Đơn Bán Hàng' : 'Mở Bán Cho Bàn Này'}
            </AppText>
          </TouchableOpacity>

          {/* Table Config Details */}
          <View
            style={{
              backgroundColor: theme.surface.card,
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
              padding: 14,
            }}
          >
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 10 }}>
              THÔNG TIN CẤU HÌNH
            </AppText>
            <View style={s.financeDetailRow}>
              <AppText variant="sm" color={theme.text.muted}>Mã Định Danh</AppText>
              <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>{table.id}</AppText>
            </View>
            <View style={s.financeDetailRow}>
              <AppText variant="sm" color={theme.text.muted}>Tên Hiển Thị</AppText>
              <AppText variant="sm" weight="medium" color={theme.text.primary}>{table.name}</AppText>
            </View>
            <View style={s.financeDetailRow}>
              <AppText variant="sm" color={theme.text.muted}>Khu Vực Phân Bổ</AppText>
              <AppText variant="sm" weight="medium" color={theme.brand.primary}>{table.area}</AppText>
            </View>
            <View style={s.financeDetailRow}>
              <AppText variant="sm" color={theme.text.muted}>Sức Chứa Tối Đa</AppText>
              <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>{table.capacity || 4} chỗ</AppText>
            </View>
            <View style={[s.financeDetailRow, { borderBottomWidth: 0 }]}>
              <AppText variant="sm" color={theme.text.muted}>Trạng Thái</AppText>
              <AppText
                variant="sm"
                weight="medium"
                color={isOccupied ? theme.brand.primary : isReserved ? theme.brand.warning : theme.brand.success}
              >
                {isOccupied ? 'Đang phục vụ' : isReserved ? 'Khách hẹn trước' : 'Sẵn sàng đón khách'}
              </AppText>
            </View>
          </View>

          {/* Secondary Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleDeleteTable(table)}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                backgroundColor: theme.status.dangerBg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.brand.danger,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
              <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                Xóa Bàn
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenEditTable(table)}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                backgroundColor: theme.surface.header,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.default,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="pencil" size={16} color={theme.text.primary} />
              <AppText variant="sm" weight="bold" color={theme.text.primary}>
                Sửa Bàn
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Desktop Floor Overview Panel (when no table is selected)
  const renderFloorOverviewPanel = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          alignItems: 'center',
          paddingVertical: 18,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.brand.primaryBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Icon name="table-furniture" size={26} color={theme.brand.primary} />
        </View>
        <AppText variant="md" weight="bold" color={theme.text.primary}>
          Chi Tiết Bàn Ăn
        </AppText>
        <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 12 }}>
          Chạm vào một bàn ở danh sách bên trái để xem thông tin, chỉnh sửa hoặc vào đơn bán hàng.
        </AppText>
      </View>

      <View style={{ marginTop: 14, flex: 1 }}>
        <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 10 }}>
          PHÂN BỔ THEO KHU VỰC
        </AppText>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {areas.map((area) => {
            const areaTables = tables.filter((t) => t.area === area.name);
            const occ = areaTables.filter((t) => t.status === 'co_khach').length;
            const pct = areaTables.length > 0 ? Math.round((occ / areaTables.length) * 100) : 0;
            const isSel = selectedAreaFilter === area.name;
            return (
              <TouchableOpacity
                key={area.id}
                activeOpacity={0.7}
                onPress={() => setSelectedAreaFilter(area.name)}
                style={{
                  backgroundColor: isSel ? theme.brand.primaryBg : theme.surface.header,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    {area.name}
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted} tabularNums>
                    {areaTables.length} bàn
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <AppText variant="xs" color={occ > 0 ? theme.brand.primary : theme.text.muted} tabularNums>
                    {occ > 0 ? `${occ} có khách (${pct}%)` : 'Tất cả đang trống'}
                  </AppText>
                  <Icon name="chevron-right" size={14} color={theme.text.muted} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpenAddTable}
        style={{
          height: 46,
          backgroundColor: theme.brand.primary,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 10,
        }}
      >
        <Icon name="plus" size={18} color={theme.text.onBrand} />
        <AppText variant="md" weight="bold" color={theme.text.onBrand}>
          + Thêm Bàn Mới
        </AppText>
      </TouchableOpacity>
    </View>
  );

  // Desktop Detail Panel for Area
  const renderAreaDetailPanel = (area: AreaItem) => {
    const areaTables = tables.filter((t) => t.area === area.name);
    const tableCount = areaTables.length;
    const occupiedInArea = areaTables.filter((t) => t.status === 'co_khach').length;
    const vacantInArea = tableCount - occupiedInArea;
    const areaTotalAmount = areaTables.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
              {area.name}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
              Khu Vực Phục Vụ
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpenEditArea(area)}
              style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              accessibilityLabel="Sửa khu vực"
            >
              <Icon name="pencil-outline" size={16} color={theme.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedAreaDetail(null)}
              style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              accessibilityLabel="Đóng"
            >
              <Icon name="close" size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* Stats card */}
          <View
            style={{
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              padding: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={[s.tableIconCircle, { backgroundColor: theme.brand.primaryBg, width: 44, height: 44, borderRadius: 22 }]}>
                <Icon name="map-marker-radius-outline" size={22} color={theme.brand.primary} />
              </View>
              <View>
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  {area.name}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  {tableCount} bàn tổng cộng
                </AppText>
              </View>
            </View>

            <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle, paddingTop: 12 }]}>
              <View style={s.metaGridItem}>
                <AppText variant="xxs" color={theme.text.muted}>ĐANG PHỤC VỤ</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums style={{ marginTop: 2 }}>
                  {occupiedInArea} bàn
                </AppText>
              </View>
              <View style={s.metaGridItem}>
                <AppText variant="xxs" color={theme.text.muted}>BÀN TRỐNG</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums style={{ marginTop: 2 }}>
                  {vacantInArea} bàn
                </AppText>
              </View>
            </View>

            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
              <AppText variant="xxs" color={theme.text.muted}>TẠM TÍNH KHU VỰC</AppText>
              <AppText variant="lg" weight="bold" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
                {formatCurrency(areaTotalAmount)} đ
              </AppText>
            </View>
          </View>

          {/* CTA: + Thêm Bàn vào khu này */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setEditingTable(null);
              setTableAddMode('single');
              const nextNum = tables.length + 1;
              setTableNameInput(`Bàn ${nextNum < 10 ? '0' + nextNum : nextNum}`);
              setTableAreaInput(area.name);
              setTableCapacityInput('4');
              setTableModalVisible(true);
            }}
            style={{
              height: 44,
              backgroundColor: theme.brand.primary,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="plus" size={18} color={theme.text.onBrand} />
            <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
              + Thêm Bàn Vào Khu Này
            </AppText>
          </TouchableOpacity>

          {/* Danh sách bàn thuộc khu vực */}
          <View>
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 8 }}>
              BÀN THUỘC KHU VỰC ({areaTables.length})
            </AppText>
            {areaTables.length === 0 ? (
              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', paddingVertical: 12 }}>
                Chưa có bàn nào trong khu vực này
              </AppText>
            ) : (
              <View style={{ backgroundColor: theme.surface.card, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border.subtle, overflow: 'hidden' }}>
                {areaTables.map((t, idx) => {
                  const isTblOcc = t.status === 'co_khach';
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        setActiveTab('tables');
                        setSelectedTableDetail(t);
                      }}
                      style={[
                        s.financeDetailRow,
                        { borderBottomColor: theme.border.subtle, paddingHorizontal: 12 },
                        idx === areaTables.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="table-furniture" size={16} color={isTblOcc ? theme.brand.primary : theme.text.muted} />
                        <AppText variant="sm" weight="medium" color={theme.text.primary}>
                          {t.name}
                        </AppText>
                        <AppText variant="xxs" color={theme.text.muted} tabularNums>
                          ({t.capacity || 4} chỗ)
                        </AppText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isTblOcc && (
                          <AppText variant="xs" weight="medium" color={theme.brand.accent} tabularNums>
                            {formatCurrency(t.totalAmount || 0)} đ
                          </AppText>
                        )}
                        <StatusDotBadge
                          status={isTblOcc ? 'co_khach' : 'trong'}
                          label={isTblOcc ? 'Có khách' : 'Trống'}
                          size="sm"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Action: Sửa & Xóa khu vực */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleDeleteArea(area)}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                backgroundColor: theme.status.dangerBg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.brand.danger,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
              <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                Xóa Khu
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenEditArea(area)}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                backgroundColor: theme.surface.header,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.default,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="pencil" size={16} color={theme.text.primary} />
              <AppText variant="sm" weight="bold" color={theme.text.primary}>
                Sửa Khu
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Desktop Area Overview Panel (when no area is selected)
  const renderAreaOverviewPanel = () => (
    <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.brand.primaryBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Icon name="map-marker-radius-outline" size={26} color={theme.brand.primary} />
        </View>
        <AppText variant="md" weight="bold" color={theme.text.primary}>
          Quản Lý Khu Vực
        </AppText>
        <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
          Chọn một khu vực ở danh sách bên trái để xem các bàn thuộc khu vực, hoặc tạo khu vực phục vụ mới cho quán.
        </AppText>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpenAddArea}
        style={{
          height: 46,
          backgroundColor: theme.brand.primary,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Icon name="plus" size={18} color={theme.text.onBrand} />
        <AppText variant="md" weight="bold" color={theme.text.onBrand}>
          + Thêm Khu Vực Mới
        </AppText>
      </TouchableOpacity>
    </View>
  );

  // 🌟 MOBILE SUB-SCREEN FOR TABLE DETAIL (!isWide)
  if (!isWide && selectedTableDetail) {
    const isOccupied = selectedTableDetail.status === 'co_khach';
    const isReserved = selectedTableDetail.status === 'da_dat';
    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
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
          contentContainerStyle={{ padding: 0, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: theme.surface.card,
                borderRadius: 0,
                borderWidth: 0,
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
                      backgroundColor: isOccupied ? theme.brand.primaryBg : theme.surface.header,
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

              <StatusDotBadge
                status={isOccupied ? 'co_khach' : isReserved ? 'dat_truoc' : 'trong'}
                label={isOccupied ? 'Có khách' : isReserved ? 'Đã đặt' : 'Trống'}
                size="md"
              />
            </View>

            <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle, marginTop: 16, paddingTop: 14 }]}>
              <View style={s.metaGridItem}>
                <AppText variant="xs" color={theme.text.muted}>Tạm Tính Hiện Tại</AppText>
                <AppText
                  variant="md"
                  weight="medium"
                  color={isOccupied ? theme.brand.accent : theme.text.muted}
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

          <View
            style={[
              s.detailCard,
              {
                backgroundColor: theme.surface.card,
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border.subtle,
                paddingHorizontal: 16,
                marginTop: 10,
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
        </ScrollView>

        <View
          style={[
            s.fullPageBottomBar,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              handleDeleteTable(selectedTableDetail);
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
            onPress={() => handleOpenOrder(selectedTableDetail)}
            style={[s.fullPageBtnAction, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent, flex: 1.2 }]}
          >
            <Icon name="silverware-fork-knife" size={20} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
              {selectedTableDetail.status === 'co_khach' ? 'Vào Đơn' : 'Mở Bán'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 🌟 MOBILE SUB-SCREEN FOR AREA DETAIL (!isWide)
  if (!isWide && selectedAreaDetail) {
    const areaTables = tables.filter((t) => t.area === selectedAreaDetail.name);
    const tableCount = areaTables.length;
    const occupiedInArea = areaTables.filter((t) => t.status === 'co_khach').length;
    const vacantInArea = tableCount - occupiedInArea;
    const areaTotalAmount = areaTables.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
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
          contentContainerStyle={{ padding: 0, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: theme.surface.card,
                borderRadius: 0,
                borderWidth: 0,
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
                <AppText variant="md" weight="medium" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
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
                          <AppText variant="xs" weight="medium" color={theme.brand.accent} tabularNums>
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
        </ScrollView>

        <View
          style={[
            s.fullPageBottomBar,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              handleDeleteArea(selectedAreaDetail);
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
              setTableAddMode('single');
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
    );
  }

  // 🌟 MAIN SCREEN: MASTER-DETAIL ON WIDE (>= 1024px) / SINGLE-COLUMN ON MOBILE (< 1024px)
  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* Header Bar */}
      <AppHeader
        title="Quản Lý Bàn"
        subtitle={`${tables.length} bàn · ${areas.length} khu vực`}
        rightCustom={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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

      {/* Dãy 1: Primary Tabs */}
      <Tier1Tabs<'tables' | 'areas'>
        tabs={primaryTabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (isWide) {
            if (tab === 'tables') setSelectedAreaDetail(null);
            else setSelectedTableDetail(null);
          }
        }}
      />

      {/* Floor KPI Bar */}
      {renderFloorKPIBar()}

      {/* Master-Detail Container (Wide) or Single View (Mobile) */}
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* CỘT TRÁI: MASTER (65%) */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {activeTab === 'tables' ? (
              <View style={{ flex: 1 }}>
                {showSearch && (
                  <View style={[s.searchBarContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle }]}>
                    <View style={[s.searchBar, { backgroundColor: theme.surface.header, borderColor: theme.border.default, borderRadius: 10, borderWidth: 1 }]}>
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

                {isReorderMode && (
                  <View style={[s.reorderBanner, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
                    <Icon name="information-outline" size={16} color={theme.brand.primary} />
                    <AppText variant="xs" color={theme.brand.primary} style={{ flex: 1 }}>
                      Chế độ sắp xếp: Chạm vào mũi tên để đổi thứ tự hiển thị bàn
                    </AppText>
                  </View>
                )}

                <Tier2FilterChips
                  chips={tableAreaChips}
                  activeChip={selectedAreaFilter}
                  onChipChange={setSelectedAreaFilter}
                  activeColor="primary"
                />

                <ScrollView
                  contentContainerStyle={[
                    s.listScroll,
                    { padding: 16, gap: 12, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 32 },
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
                      const isSelected = selectedTableDetail?.id === table.id;

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
                            {
                              width: isDesktopLarge ? '23.8%' : '31.8%',
                              borderRadius: 14,
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected
                                ? theme.brand.accent
                                : isOccupied
                                ? theme.brand.primary
                                : isReserved
                                ? theme.brand.warning
                                : theme.border.subtle,
                              backgroundColor: isSelected
                                ? (isDark ? 'rgba(180, 83, 9, 0.14)' : 'rgba(254, 243, 199, 0.45)')
                                : theme.surface.card,
                              padding: 12,
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: 96,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              <View
                                style={[
                                  s.tableIconCircle,
                                  {
                                    backgroundColor: isOccupied
                                      ? theme.brand.primaryBg
                                      : isReserved
                                      ? (isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.10)')
                                      : theme.surface.header,
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                  },
                                ]}
                              >
                                <Icon
                                  name={table.area === 'Mang Về' ? 'shopping-outline' : 'table-furniture'}
                                  size={18}
                                  color={isOccupied ? theme.brand.primary : isReserved ? theme.brand.warning : theme.text.primary}
                                />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                                  {table.name}
                                </AppText>
                                <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                                  {table.area}
                                </AppText>
                              </View>
                            </View>

                            <StatusDotBadge
                              status={isOccupied ? 'co_khach' : isReserved ? 'dat_truoc' : 'trong'}
                              label={isOccupied ? 'Có khách' : isReserved ? 'Đã đặt' : 'Trống'}
                              size="sm"
                            />
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: 10,
                              paddingTop: 8,
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: theme.border.subtle,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="account-multiple-outline" size={14} color={theme.text.muted} />
                              <AppText variant="xs" color={theme.text.muted} tabularNums>
                                {table.capacity || 4} chỗ
                              </AppText>
                            </View>

                            {isOccupied && (table.totalAmount || 0) > 0 ? (
                              <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                                {formatCurrency(table.totalAmount || 0)} đ
                              </AppText>
                            ) : (
                              <AppText variant="xxs" color={theme.text.muted}>
                                {isOccupied ? 'Đang gọi món' : isReserved ? 'Khách hẹn' : 'Sẵn sàng'}
                              </AppText>
                            )}
                          </View>

                          {isReorderMode && (
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                disabled={isFirstTable}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleMoveTableUp(table);
                                }}
                                style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isFirstTable ? 0.25 : 1 }]}
                              >
                                <Icon name="chevron-up" size={16} color={theme.text.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                disabled={isLastTable}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleMoveTableDown(table);
                                }}
                                style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isLastTable ? 0.25 : 1 }]}
                              >
                                <Icon name="chevron-down" size={16} color={theme.text.primary} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {isReorderMode && (
                  <View style={[s.reorderBanner, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
                    <Icon name="information-outline" size={16} color={theme.brand.primary} />
                    <AppText variant="xs" color={theme.brand.primary} style={{ flex: 1 }}>
                      Chế độ sắp xếp: Chạm vào mũi tên để đổi thứ tự hiển thị khu vực
                    </AppText>
                  </View>
                )}

                <ScrollView
                  contentContainerStyle={[
                    s.listScroll,
                    { padding: 16, gap: 12, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 32 },
                  ]}
                  showsVerticalScrollIndicator={false}
                >
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
                      const isAreaSelected = selectedAreaDetail?.id === area.id;

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
                            {
                              width: isDesktopLarge ? '31.8%' : '48.5%',
                              borderRadius: 14,
                              borderWidth: isAreaSelected ? 2 : 1,
                              borderColor: isAreaSelected ? theme.brand.accent : theme.border.subtle,
                              backgroundColor: isAreaSelected
                                ? (isDark ? 'rgba(180, 83, 9, 0.14)' : 'rgba(254, 243, 199, 0.45)')
                                : theme.surface.card,
                              padding: 14,
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: 96,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[s.tableIconCircle, { backgroundColor: theme.brand.primaryBg }]}>
                                <Icon name="map-marker-radius-outline" size={20} color={theme.brand.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <AppText variant="md" weight="bold" color={theme.text.primary}>
                                  {area.name}
                                </AppText>
                                <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                                  {tableCount} bàn · {occupiedInArea} có khách
                                </AppText>
                              </View>
                            </View>

                            {isReorderMode ? (
                              <View style={{ flexDirection: 'row', gap: 4 }}>
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  disabled={isFirstArea}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleMoveAreaUp(area);
                                  }}
                                  style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isFirstArea ? 0.25 : 1 }]}
                                >
                                  <Icon name="chevron-up" size={16} color={theme.text.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  disabled={isLastArea}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleMoveAreaDown(area);
                                  }}
                                  style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isLastArea ? 0.25 : 1 }]}
                                >
                                  <Icon name="chevron-down" size={16} color={theme.text.primary} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <Icon name="chevron-right" size={18} color={theme.text.muted} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* CỘT PHẢI: DETAIL PANEL CỐ ĐỊNH (380px) */}
          <View
            style={{
              width: 380,
              borderLeftWidth: 1,
              borderLeftColor: theme.border.subtle,
              backgroundColor: theme.surface.card,
            }}
          >
            {activeTab === 'tables' ? (
              selectedTableDetail ? renderTableDetailPanel(selectedTableDetail) : renderFloorOverviewPanel()
            ) : (
              selectedAreaDetail ? renderAreaDetailPanel(selectedAreaDetail) : renderAreaOverviewPanel()
            )}
          </View>
        </View>
      ) : (
        /* 📱 MOBILE VIEW (< 1024px) */
        <View style={{ flex: 1 }}>
          {activeTab === 'tables' && (
            <View style={{ flex: 1 }}>
              {showSearch && (
                <View style={[s.searchBarContainer, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle }]}>
                  <View style={[s.searchBar, { backgroundColor: theme.surface.header, borderColor: theme.border.default, borderRadius: 10, borderWidth: 1 }]}>
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

              {isReorderMode && (
                <View style={[s.reorderBanner, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}>
                  <Icon name="information-outline" size={16} color={theme.brand.primary} />
                  <AppText variant="xs" color={theme.brand.primary} style={{ flex: 1 }}>
                    Chế độ sắp xếp: Chạm vào mũi tên để đổi thứ tự hiển thị bàn
                  </AppText>
                </View>
              )}

              <Tier2FilterChips
                chips={tableAreaChips}
                activeChip={selectedAreaFilter}
                onChipChange={setSelectedAreaFilter}
                activeColor="primary"
              />

              <ScrollView
                contentContainerStyle={[s.listScroll, { padding: 0, paddingBottom: 24 }]}
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
                          {
                            backgroundColor: theme.surface.card,
                            borderColor: isOccupied ? theme.brand.primary : isReserved ? theme.brand.warning : theme.border.subtle,
                            borderRadius: 0,
                            borderWidth: 0,
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
                                  <AppText variant="xs" weight="medium" color={theme.brand.accent} tabularNums>
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
                                  style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isFirstTable ? 0.25 : 1 }]}
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
                                  style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isLastTable ? 0.25 : 1 }]}
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
                                <Icon name="chevron-right" size={18} color={theme.text.muted} style={{ marginLeft: 4 }} />
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

          {activeTab === 'areas' && (
            <ScrollView
              contentContainerStyle={[s.listScroll, { padding: 0, paddingBottom: 24 }]}
              showsVerticalScrollIndicator={false}
            >
              {isReorderMode && (
                <View style={[s.reorderBanner, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary, marginHorizontal: 16 }]}>
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
                        {
                          backgroundColor: theme.surface.card,
                          borderColor: theme.border.subtle,
                          borderRadius: 0,
                          borderWidth: 0,
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
                                style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isFirstArea ? 0.25 : 1 }]}
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
                                style={[s.iconBtn, { backgroundColor: theme.surface.header, opacity: isLastArea ? 0.25 : 1 }]}
                              >
                                <Icon name="chevron-down" size={18} color={theme.text.primary} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Icon name="chevron-right" size={18} color={theme.text.muted} style={{ marginLeft: 2 }} />
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

      {/* Modal Add / Edit Table (Single + Batch support) */}
      <AppModal
        visible={tableModalVisible}
        title={editingTable ? 'Chỉnh Sửa Bàn' : (tableAddMode === 'batch' ? 'Tạo Bàn Hàng Loạt' : 'Thêm Bàn Mới')}
        subtitle={editingTable ? 'Cập nhật thông tin bàn ăn' : 'Quản lý bàn ăn và vị trí trong quán'}
        icon="table-chair"
        iconColor={theme.brand.primary}
        onClose={() => setTableModalVisible(false)}
        presentation="dialog"
        maxWidth={480}
        primaryAction={{
          label: editingTable
            ? 'Lưu Thay Đổi'
            : tableAddMode === 'batch'
            ? `Tạo ${Math.max(1, (parseInt(batchEndNum, 10) || 1) - (parseInt(batchStartNum, 10) || 1) + 1)} Bàn`
            : 'Tạo Bàn',
          variant: 'primary',
          onPress: tableAddMode === 'batch' && !editingTable ? handleSaveBatchTables : handleSaveTable,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setTableModalVisible(false),
        }}
      >
        <View style={{ gap: 12 }}>
          {/* Mode Switcher for New Table */}
          {!editingTable && (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.surface.header,
                borderRadius: 10,
                padding: 3,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: theme.border.subtle,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setTableAddMode('single');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: tableAddMode === 'single' ? theme.brand.primary : 'transparent',
                }}
              >
                <AppText
                  variant="sm"
                  weight={tableAddMode === 'single' ? 'bold' : 'normal'}
                  color={tableAddMode === 'single' ? theme.text.onBrand : theme.text.muted}
                >
                  Tạo 1 Bàn
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setTableAddMode('batch');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: tableAddMode === 'batch' ? theme.brand.primary : 'transparent',
                }}
              >
                <AppText
                  variant="sm"
                  weight={tableAddMode === 'batch' ? 'bold' : 'normal'}
                  color={tableAddMode === 'batch' ? theme.text.onBrand : theme.text.muted}
                >
                  Tạo Hàng Loạt
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {tableAddMode === 'single' || editingTable ? (
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
          ) : (
            <View style={{ gap: 10 }}>
              <View style={s.formField}>
                <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
                  Tiền Tố Tên Bàn (VD: Bàn, T1-, VIP-)
                </AppText>
                <TextInput
                  value={batchPrefix}
                  onChangeText={setBatchPrefix}
                  placeholder="VD: Bàn "
                  placeholderTextColor={theme.text.muted}
                  style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary }]}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.formField, { flex: 1 }]}>
                  <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
                    Từ Số
                  </AppText>
                  <TextInput
                    value={batchStartNum}
                    onChangeText={setBatchStartNum}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={theme.text.muted}
                    style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary, textAlign: 'center' }]}
                  />
                </View>
                <View style={[s.formField, { flex: 1 }]}>
                  <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
                    Đến Số
                  </AppText>
                  <TextInput
                    value={batchEndNum}
                    onChangeText={setBatchEndNum}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor={theme.text.muted}
                    style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary, textAlign: 'center' }]}
                  />
                </View>
              </View>

              <View
                style={{
                  backgroundColor: theme.brand.primaryBg,
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.brand.primary,
                }}
              >
                <AppText variant="xxs" color={theme.brand.primary} weight="medium">
                  {`Xem trước: Sẽ sinh tự động ${Math.max(1, (parseInt(batchEndNum, 10) || 1) - (parseInt(batchStartNum, 10) || 1) + 1)} bàn (${batchPrefix.trim()} ${batchStartNum.padStart(2, '0')} ... ${batchPrefix.trim()} ${batchEndNum.padStart(2, '0')}) vào khu vực "${tableAreaInput}"`}
                </AppText>
              </View>
            </View>
          )}

          {/* Trực thuộc khu vực */}
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

          {/* Sức chứa */}
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
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
  formField: {
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  btnDeleteModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
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
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
