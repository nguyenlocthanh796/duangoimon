import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import POSSettingsModal from '../../lib/components/pos/POSSettingsModal';

export default function POSSettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <UnifiedHeader
        title="Cài đặt Bán Hàng"
        onBack={() => router.back()}
      />
      <POSSettingsModal
        visible={true}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}
