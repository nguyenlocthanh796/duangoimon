// Mock react-native-safe-area-context
export const SafeAreaProvider = ({ children }: any) => children;
export const SafeAreaView = 'SafeAreaView';
export const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
export default { SafeAreaProvider, SafeAreaView, useSafeAreaInsets };
