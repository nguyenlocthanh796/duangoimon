// Mock expo-asset module
export const Asset = { fromModule: jest.fn().mockReturnValue({ uri: 'mock://' }) };
export const useAssets = jest.fn().mockReturnValue([[], null]);
export default { Asset, useAssets };
