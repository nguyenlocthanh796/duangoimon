import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Độ rộng tối thiểu cho mỗi cột trên iPad (dùng để tính toán số cột). Mặc định: 180 */
  minColWidth?: number;
  /** Số cột cố định trên Mobile (iPhone). Mặc định: 2 */
  mobileCols?: number;
  /** Khoảng cách giữa các phần tử. Mặc định: 8 */
  gap?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function ResponsiveGrid({ 
  children, 
  minColWidth = 180, 
  mobileCols = 2,
  gap = 8, 
  style 
}: ResponsiveGridProps) {
  const { isWide, columns } = useResponsive();
  
  // Tính số lượng cột
  const colCount = isWide ? columns(minColWidth) : mobileCols;
  const colWidth = `${100 / colCount}%`;

  return (
    <View style={[styles.grid, { marginHorizontal: -gap / 2, marginTop: -gap / 2 }, style]}>
      {React.Children.map(children, (child) => {
        if (!child) return null;
        return (
          <View style={{ width: colWidth as any, paddingHorizontal: gap / 2, paddingTop: gap }}>
            {child}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
