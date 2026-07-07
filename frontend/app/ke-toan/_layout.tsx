import { Stack } from 'expo-router';
import Sidebar from '../../lib/components/Sidebar';
import { SidebarProvider } from '../../lib/context/SidebarContext';

export default function KeToanLayout() {
  return (
    <SidebarProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <Sidebar />
    </SidebarProvider>
  );
}
