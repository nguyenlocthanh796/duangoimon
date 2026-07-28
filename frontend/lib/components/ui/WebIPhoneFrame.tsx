import React, { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WebIPhoneFrameProps {
  children: React.ReactNode;
}

export default function WebIPhoneFrame({ children }: WebIPhoneFrameProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* ─── Top Status Bar Overlay ─── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 999999,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingHorizontal: 22,
          paddingTop: 12,
        }}
      >
        {/* Left: Clock */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#000000',
            letterSpacing: -0.2,
          }}
        >
          {timeStr || '09:41'}
        </Text>

        {/* Right: Icons (Signal, Wifi, Battery) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="signal-cellular-3" size={15} color="#000000" />
          <MaterialCommunityIcons name="wifi" size={15} color="#000000" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#000000' }}>79%</Text>
            <MaterialCommunityIcons name="battery-80" size={18} color="#000000" />
          </View>
        </View>
      </View>

      {/* ─── Classic iPhone 11 Pro Max Notch ─── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: [{ translateX: -104.5 }],
          width: 209,
          height: 30,
          backgroundColor: '#000000',
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          zIndex: 1000000,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Speaker Grill */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            width: 48,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#222222',
          }}
        />
        {/* Camera Lens */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 36,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#0D1117',
            borderWidth: 1,
            borderColor: '#1F2937',
          }}
        />
      </View>

      {/* ─── App Main Content ─── */}
      {children}

      {/* ─── Bottom Home Indicator Bar (Streamlined) ─── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          transform: [{ translateX: -67 }],
          width: 134,
          height: 3,
          borderRadius: 2,
          backgroundColor: '#000000',
          opacity: 0.15,
          zIndex: 1000000,
        }}
      />
    </View>
  );
}
