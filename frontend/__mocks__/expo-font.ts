// Mock expo-font module
export const loadAsync = jest.fn().mockResolvedValue(undefined);
export const useFonts = jest.fn().mockReturnValue([true, null]);
export const isLoaded = jest.fn().mockReturnValue(true);
export default { loadAsync, useFonts, isLoaded };
