import React, { useCallback } from 'react';
import { Animated, View, StyleSheet, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { TableCard, TableItem } from './TableCard';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);

interface TableGridFlashListProps {
  data: TableItem[];
  selectedTableId: string;
  numColumns: number;
  onSelectTable: (table: TableItem) => void;
  onLongPressTable?: (table: TableItem) => void;
  onScroll?: any;
  contentContainerStyle?: any;
}

const TableGridItem = React.memo<{
  item: TableItem;
  selected: boolean;
  itemCount: number;
  onSelectTable: (table: TableItem) => void;
  onLongPressTable?: (table: TableItem) => void;
}>(({ item, selected, itemCount, onSelectTable, onLongPressTable }) => {
  const handlePress = useCallback(() => {
    onSelectTable(item);
  }, [onSelectTable, item]);

  const handleLongPress = useCallback(() => {
    if (onLongPressTable) {
      onLongPressTable(item);
    }
  }, [onLongPressTable, item]);

  return (
    <View style={s.itemWrapper}>
      <TableCard
        table={item}
        itemCount={itemCount}
        selected={selected}
        width="100%"
        onPress={handlePress}
        onLongPress={onLongPressTable ? handleLongPress : undefined}
      />
    </View>
  );
}, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.itemCount === next.itemCount &&
    prev.item.id === next.item.id &&
    prev.item.status === next.item.status &&
    prev.item.totalAmount === next.item.totalAmount &&
    prev.item.name === next.item.name &&
    prev.onSelectTable === next.onSelectTable &&
    prev.onLongPressTable === next.onLongPressTable
  );
});

export const TableGridFlashList: React.FC<TableGridFlashListProps> = React.memo(({
  data,
  selectedTableId,
  numColumns,
  onSelectTable,
  onLongPressTable,
  onScroll,
  contentContainerStyle,
}) => {
  const { theme } = useTheme();

  const renderItem = useCallback(({ item }: { item: TableItem }) => {
    return (
      <TableGridItem
        item={item}
        selected={item.id === selectedTableId}
        itemCount={item.itemCount || 0}
        onSelectTable={onSelectTable}
        onLongPressTable={onLongPressTable}
      />
    );
  }, [selectedTableId, onSelectTable, onLongPressTable]);

  const renderEmpty = useCallback(() => {
    return (
      <View style={s.emptyContainer}>
        <View style={[s.emptyIconCircle, { backgroundColor: theme.surface.header }]}>
          <Icon name="table-chair" size={32} color={theme.text.muted} />
        </View>
        <AppText variant="sm" weight="medium" color={theme.text.primary} style={{ marginTop: 12 }}>
          Chưa có bàn ăn nào
        </AppText>
        <AppText variant="xs" color={theme.text.muted} style={s.emptySubtext}>
          Thêm bàn ăn trong Cài Đặt hoặc tạo nhanh khu vực bàn
        </AppText>
      </View>
    );
  }, [theme]);

  const keyExtractor = useCallback((item: TableItem) => item.id, []);

  return (
    <View style={s.container}>
      <AnimatedFlashList
        key={`tables_${numColumns}`}
        data={data}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        estimatedItemSize={130}
        estimatedListSize={{ height: 800, width: 400 }}
        drawDistance={350}
        contentContainerStyle={contentContainerStyle ? { ...s.listContent, ...contentContainerStyle } : s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraData={selectedTableId}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      />
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 8,
    paddingBottom: 16,
  },
  itemWrapper: {
    flex: 1,
    padding: 5,
    minHeight: 126,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    textAlign: 'center',
  },
});
