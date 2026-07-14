import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';

export interface SwipeAction {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
  onPress: () => void;
}

interface SwipeableRowProps {
  /** Actions revealed when swiping the row from the RIGHT edge (swipe left). */
  rightActions?: SwipeAction[];
  children: React.ReactNode;
}

/**
 * Standardized swipeable row for iPhone/iPad list items.
 * Wraps content in a `Swipeable` so users can reveal contextual actions
 * (e.g. export an invoice) by swiping left. Tap on the content still works.
 */
export default function SwipeableRow({ rightActions = [], children }: SwipeableRowProps) {
  const renderRight = () => {
    const actions = rightActions.filter((a) => !a.disabled);
    if (actions.length === 0) return null;
    return (
      <View style={styles.actionContainer}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[styles.action, { backgroundColor: a.color ?? colors.brand.primary }]}
            onPress={a.onPress}
            activeOpacity={0.85}
          >
            {a.icon ? <Icon name={a.icon as any} size={20} color="#fff" /> : null}
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (Platform.OS === 'web' || rightActions.length === 0) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      renderRightActions={renderRight}
      overshootRight={false}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionContainer: { flexDirection: 'row', alignItems: 'stretch' },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    gap: 4,
  },
  actionText: { ...font.micro, color: '#fff', fontWeight: '600' },
});
