import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme';
import { playTapSound } from '../../../utils/sound';
import { PressableScale } from '../../ui/PressableScale';
import { TableCardProps } from './types';
import { areTableCardPropsEqual } from './areTableCardPropsEqual';
import { TableCardHeader } from './TableCardHeader';
import { TableCardCenter } from './TableCardCenter';
import { TableCardFooter } from './TableCardFooter';

const TableCardComponent: React.FC<TableCardProps> = (props) => {
  if (!props || !props.table) return null;
  const {
    table,
    selected = false,
    itemCount = 0,
    onPress,
    onLongPress,
    width,
  } = props;
  const { theme, isDark } = useTheme();

  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const handlePress = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (onPressRef.current) {
      onPressRef.current();
    }
  };

  const handleLongPress = () => {
    if (!onLongPressRef.current) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }
    onLongPressRef.current();
  };

  const activeItemCount = itemCount || table.itemCount || 0;
  const isPrePrinted = table.status === 'da_in_tam_tinh';
  const isOccupied = table.status === 'co_khach' || table.status === 'dang_su_dung' || activeItemCount > 0;
  const isReserved = table.status === 'da_dat';
  const isEmpty = !isOccupied && !isReserved && !isPrePrinted;

  // Tính số phút đã ngồi
  const elapsedMin = useMemo(() => {
    if (!table.createdAt) return 0;
    const time = new Date(table.createdAt).getTime();
    if (isNaN(time)) return 0;
    const diffMs = Date.now() - time;
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / 60000);
  }, [table.createdAt]);

  // Màu sắc thẻ bàn phẳng xúc giác (Indochine Heritage F&B)
  const cardBg = isPrePrinted
    ? theme.status.warningBg
    : isOccupied
    ? (isDark ? 'rgba(180, 83, 9, 0.18)' : 'rgba(180, 83, 9, 0.08)')
    : isReserved
    ? (isDark ? 'rgba(126, 34, 206, 0.12)' : 'rgba(126, 34, 206, 0.06)')
    : theme.surface.card;

  const cardBorder = selected
    ? theme.brand.accent
    : isPrePrinted
    ? theme.brand.warning
    : isOccupied
    ? theme.brand.accent
    : isReserved
    ? theme.brand.purple
    : theme.border.subtle;

  return (
    <View
      style={[
        s.container,
        {
          width: width || '48%',
        },
      ]}
    >
      <PressableScale
        activeScale={0.96}
        haptic="none"
        playSound={false}
        delayLongPress={350}
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${table.name}, khu vực ${table.area}, trạng thái ${
          isPrePrinted
            ? 'đã in tạm tính'
            : isOccupied
            ? `đang có ${activeItemCount} món`
            : isReserved
            ? 'đã đặt trước'
            : 'bàn trống'
        }`}
        containerStyle={{ flex: 1 }}
        style={[
          s.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            borderWidth: selected ? 2.5 : (isOccupied || isPrePrinted ? 1.8 : StyleSheet.hairlineWidth),
            borderStyle: 'solid',
            ...(Platform.OS === 'web'
              ? ({
                  boxShadow: selected
                    ? (isDark ? '0 0 0 3px rgba(0, 102, 238, 0.4)' : '0 0 0 3px rgba(0, 102, 238, 0.25)')
                    : isOccupied
                    ? (isDark ? '0 2px 8px rgba(234, 88, 12, 0.25)' : '0 2px 6px rgba(234, 88, 12, 0.12)')
                    : undefined,
                } as any)
              : {
                  elevation: selected ? 3 : isOccupied ? 1.5 : 0,
                  shadowColor: 'black',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isOccupied ? 0.12 : 0.02,
                  shadowRadius: 3,
                }),
          },
        ]}
      >
        {/* 🌟 TẦNG 1: TÊN BÀN & SỐ KHÁCH */}
        <TableCardHeader
          name={table.name}
          area={table.area}
          guestCount={table.guestCount}
          capacity={table.capacity}
          isOccupied={isOccupied}
          isReserved={isReserved}
          isPrePrinted={isPrePrinted}
          activeItemCount={activeItemCount}
        />

        {/* 🌟 TẦNG 2: TRUNG TÂM THẺ (TÊN BÀN TO RÕ & SỐ TIỀN THAY VỊ TRÍ THỜI GIAN) */}
        <TableCardCenter
          name={table.name}
          totalAmount={table.totalAmount}
          isOccupied={isOccupied}
          isEmpty={isEmpty}
          isReserved={isReserved}
          isPrePrinted={isPrePrinted}
          elapsedMin={elapsedMin}
          activeItemCount={activeItemCount}
          note={table.note}
        />

        {/* 🌟 TẦNG 3: ĐÁY THẺ - THỜI GIAN NGỒI & CTA ĐIỀU HƯỚNG */}
        <TableCardFooter
          totalAmount={table.totalAmount}
          isOccupied={isOccupied}
          isEmpty={isEmpty}
          isReserved={isReserved}
          isPrePrinted={isPrePrinted}
          elapsedMin={elapsedMin}
        />
      </PressableScale>
    </View>
  );
};

export const TableCard = React.memo(TableCardComponent, areTableCardPropsEqual);

const s = StyleSheet.create({
  container: {
    minHeight: 136,
    aspectRatio: 1.25,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
});
