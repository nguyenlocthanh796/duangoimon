// Mock expo-splash-screen
export const preventAutoHideAsync = jest.fn().mockResolvedValue(undefined);
export const hideAsync = jest.fn().mockResolvedValue(undefined);
export default { preventAutoHideAsync, hideAsync };
