import { useState } from 'react';
import { View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import ScreenHeader from '../../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../../lib/components/quan-ly/ModuleTabs';

interface PageShellProps {
  title: string;
  subtitle: string;
  tabs: ModuleTab[];
  searchableTabIds: string[];
  renderContent: (activeTab: string, isSearchOpen: boolean) => React.ReactNode;
}

export default function PageShell({ title, subtitle, tabs, searchableTabIds, renderContent }: PageShellProps) {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isSearchable = searchableTabIds.includes(activeTab);
  const toggleSearch = () => { if (isSearchable) setIsSearchOpen(!isSearchOpen); };

  return (
    <SafeAreaView style={styles.container} edges={isWide ? ['top', 'bottom', 'left', 'right'] : ['left', 'right']}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onMenuPress={openSidebar}
        compact={!isWide}
        right={
          <TouchableOpacity
            onPress={toggleSearch}
            disabled={!isSearchable}
            style={{ padding: 8, opacity: isSearchable ? 1 : 0.3 }}
          >
            <Icon name={isSearchOpen ? 'close' : 'magnify'} size={22} color={colors.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.contentWrap}>
        <ModuleTabs
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={(tab) => { setActiveTab(tab); setIsSearchOpen(false); }}
        />
        <View style={styles.content}>
          {renderContent(activeTab, isSearchOpen)}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentWrap: { flex: 1, position: 'relative' },
  content: { flex: 1, position: 'relative', zIndex: 10 },
});
