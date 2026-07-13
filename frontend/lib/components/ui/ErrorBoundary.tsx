import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <Icon name="alert-circle-outline" size={48} color={colors.status.danger} />
          <Text style={styles.title}>Có lỗi xảy ra</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Ứng dụng gặp sự cố không mong muốn.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.8}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.buttonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.surface.app,
    gap: 12,
  },
  title: {
    ...font.h3,
    color: colors.text.primary,
    marginTop: 8,
  },
  message: {
    ...font.bodySmall,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: shape.radius.md,
  },
  buttonText: {
    ...font.button,
    color: '#fff',
  },
});
