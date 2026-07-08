import { Stack } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import Sidebar from '../../lib/components/Sidebar';

export default function KeToanLayout() {
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Sidebar isWide={isWide} />
    </>
  );
}
